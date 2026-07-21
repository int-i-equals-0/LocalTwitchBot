// server/index.js

const tmi = require("tmi.js");
const WebSocket = require("ws");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = require("./auth");

// ========== OBS WEBSOCKET ==========
let OBSWebSocket;
try {
  OBSWebSocket = require("obs-websocket-js").default;
} catch (e) {
  // obs-websocket-js не установлен — фича будет недоступна
  OBSWebSocket = null;
}

// ========== УТИЛИТЫ ==========
function getLocalIP() {
  const interfaces = require("os").networkInterfaces();
  for (const name of Object.keys(interfaces))
    for (const iface of interfaces[name])
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
  return "127.0.0.1";
}

// ========== КОНСТАНТЫ ==========
const CONFIG_PATH = path.join(__dirname, "config.json");
const SHOUTOUT_COOLDOWN_MS = 125000;
const VIEWERS_CACHE_TTL = 60000;
const MAX_RECENT = 200;
const SERVER_START_TIME = Date.now();
const OVERLAY_STARTUP_CHECK_DELAY_MS = 15000;
const OVERLAY_MONITOR_INTERVAL_MS = 15000;
const OBS_REFRESH_RETRY_INTERVAL_MS = 30000;
const OBS_MAX_REFRESH_ATTEMPTS = 5;

// ========== ЛОГИРОВАНИЕ В ФАЙЛЫ ==========
const LOGS_DIR = path.join(__dirname, "logs");
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

function getLogFileName() {
  const now = new Date();
  const dateStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  // Ищем следующий свободный номер для этой даты
  let num = 1;
  while (true) {
    const name = `${dateStr}_log${String(num).padStart(3, "0")}.txt`;
    const fullPath = path.join(LOGS_DIR, name);
    if (!fs.existsSync(fullPath)) return fullPath;
    num++;
  }
}

const LOG_FILE_PATH = getLogFileName();
const logFileStream = fs.createWriteStream(LOG_FILE_PATH, {
  flags: "a",
  encoding: "utf8",
});

logFileStream.on("error", (err) => {
  process.stderr.write(`[LOG FILE ERROR] ${err.message}\n`);
});

function writeToLogFile(level, message) {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    "-",
    String(now.getMonth() + 1).padStart(2, "0"),
    "-",
    String(now.getDate()).padStart(2, "0"),
    " ",
    String(now.getHours()).padStart(2, "0"),
    ":",
    String(now.getMinutes()).padStart(2, "0"),
    ":",
    String(now.getSeconds()).padStart(2, "0"),
    ".",
    String(now.getMilliseconds()).padStart(3, "0"),
  ].join("");

  logFileStream.write(`[${timestamp}] [${level}] ${message}\n`);
}

// Записываем заголовок лог-файла
logFileStream.write(`${"=".repeat(60)}\n`);
logFileStream.write(`  Лог-файл сервера\n`);
logFileStream.write(`  Запуск: ${new Date().toISOString()}\n`);
logFileStream.write(`  Файл: ${path.basename(LOG_FILE_PATH)}\n`);
logFileStream.write(`${"=".repeat(60)}\n\n`);

// ========== НАСТРОЙКИ EVENTSUB ==========
const EVENTSUB_SETTINGS = {
  KEEPALIVE_TIMEOUT: 45, // 45 секунд (вместо 10)
  RECONNECT_DELAY: 10000, // 10 секунд (вместо 5)
  BUFFER_TIMEOUT: 30000, // 30 секунд для буфера наград
  MAX_BUFFER_SIZE: 50, // Максимум 50 наград в буфере
};

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let CHANNEL_NAME = "";
let BOT_USERNAME = "";
let OAUTH_TOKEN = "";
let BROADCASTER_TOKEN = "";

let channelId = null;
let botId = null;
let twitchClient = null;

let viewersCache = [];
let viewersCacheTime = 0;
const recentChatters = new Set();

const activeTimers = new Map();

let eventSubWs = null;
let eventSubSessionId = null;
let eventSubKeepaliveTimeout = null;
let eventSubReconnectTimeout = null;
let eventSubSubscriptionIds = [];

// ========== БУФЕР НАГРАД ==========
let rewardBuffer = [];
let isEventSubConnecting = false;

// Функция для добавления награды в буфер
function bufferReward(rewardId, username, userMessage, eventId = null) {
  rewardBuffer.push({
    rewardId,
    username,
    userMessage,
    eventId,
    timestamp: Date.now(),
  });
  console.log(
    `[INFO] Награда ${rewardId} от ${username} добавлена в буфер (${rewardBuffer.length} в очереди)`,
  );

  // Очищаем старые записи, если буфер слишком большой
  if (rewardBuffer.length > EVENTSUB_SETTINGS.MAX_BUFFER_SIZE) {
    const removed = rewardBuffer.splice(
      0,
      rewardBuffer.length - EVENTSUB_SETTINGS.MAX_BUFFER_SIZE,
    );
    console.log(
      `[INFO] Буфер наград очищен: удалено ${removed.length} старых записей`,
    );
  }
}

// Функция для обработки буфера
async function processRewardBuffer() {
  if (rewardBuffer.length === 0) return;
  if (!eventSubWs || eventSubWs.readyState !== WebSocket.OPEN) {
    console.log("[INFO] EventSub не готов, откладываем обработку буфера...");
    return;
  }

  console.log(
    `[INFO] Обрабатываем буфер наград (${rewardBuffer.length} шт)...`,
  );
  const bufferCopy = [...rewardBuffer];
  rewardBuffer = [];

  let processedCount = 0;
  let skippedCount = 0;

  for (const reward of bufferCopy) {
    // Проверяем, не слишком ли старая награда
    if (Date.now() - reward.timestamp < EVENTSUB_SETTINGS.BUFFER_TIMEOUT) {
      await handleReward(reward.rewardId, reward.username, reward.userMessage);
      processedCount++;
    } else {
      console.log(
        `[INFO] Награда ${reward.rewardId} от ${reward.username} слишком старая (${Math.floor((Date.now() - reward.timestamp) / 1000)} сек), пропускаем`,
      );
      skippedCount++;
    }
  }

  console.log(
    `[INFO] Буфер обработан: ${processedCount} обработано, ${skippedCount} пропущено`,
  );
}

const shoutoutDone = new Set();
const shoutoutQueue = [];
let shoutoutCooldownUntil = 0;
let shoutoutProcessing = false;

let botTokenRefreshTimer = null;
let broadcasterTokenRefreshTimer = null;
let overlayMonitorStarted = false;
let overlayMonitorTimer = null;
let overlayReadyLogged = false;
let overlayStartupWarningLogged = false;
let overlayDeliveryHintLogged = false;
let obsRefreshAttempts = 0;
let obsRefreshTimer = null;
let obsAutoRefreshDone = false;

// ========== ЛОГИРОВАНИЕ ==========
const logWss = new WebSocket.Server({ port: 8081 });
const logClients = new Set();

logWss.on("connection", (ws) => {
  logClients.add(ws);
  ws.on("close", () => logClients.delete(ws));
});

function sendLogToClients(msg) {
  const d = JSON.stringify({ timestamp: Date.now(), message: msg });
  logClients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(d);
  });
}

const origLog = console.log,
  origErr = console.error,
  origWarn = console.warn;

console.log = function (...a) {
  const m = a
    .map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x)))
    .join(" ");
  sendLogToClients(m);
  writeToLogFile("LOG", m);
  origLog.apply(console, a);
};

console.error = function (...a) {
  const m = a
    .map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x)))
    .join(" ");
  sendLogToClients(m);
  writeToLogFile("ERROR", m);
  origErr.apply(console, a);
};

console.warn = function (...a) {
  const m = a
    .map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x)))
    .join(" ");
  sendLogToClients(m);
  writeToLogFile("WARN", m);
  origWarn.apply(console, a);
};

// ========== РАБОТА С КОНФИГОМ ==========
let botFullyReady = false;
let tokensValid = false;
const startupTasks = new Set();
const completedTasks = new Set();

function registerStartupTask(task) {
  startupTasks.add(task);
}
function completeStartupTask(task) {
  completedTasks.add(task);
  if (
    !botFullyReady &&
    startupTasks.size > 0 &&
    [...startupTasks].every((t) => completedTasks.has(t))
  ) {
    botFullyReady = true;
    if (tokensValid) {
      const { expected, missing } = getOverlayConnectionStatus();

      if (expected.length === 0 || missing.length === 0) {
        // Оверлеев нет в конфиге, или все уже подключены
        console.log("[START] ========================================");
        console.log("[START] Бот полностью готов к работе!");
        if (expected.length > 0) {
          console.log(
            `[START] Оверлеи подключены: ${formatOverlayList(expected)}`,
          );
        }
        console.log("[START] ========================================");
        overlayReadyLogged = true;
      } else {
        // Есть неподключённые оверлеи — запускаем мониторинг
        console.log("[START] ========================================");
        console.log("[START] Ядро бота готово: IRC, EventSub, таймеры, API.");
        console.log("[START] Ожидание подключения оверлеев...");
        console.log("[START] ========================================");
        startOverlayStartupMonitor();
      }
    } else {
      console.log("[START] ========================================");
      console.log("[START] Сервер запущен в режиме ожидания настройки");
      console.log("[START] ========================================");
    }
  }
}

function loadFullConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const configData = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      if (!configData.tokens) configData.tokens = {};
      if (!configData.commands) configData.commands = {};
      if (!configData.banwords) configData.banwords = { words: [] };
      if (!configData.periodicEvents) configData.periodicEvents = {};
      if (!configData.overlays) configData.overlays = [];
      if (!configData.rewards) configData.rewards = {};
      if (!configData.autoshoutout) configData.autoshoutout = [];
      if (!configData.events) configData.events = {};
      if (!configData.obs)
        configData.obs = {
          enabled: false,
          url: "ws://127.0.0.1:4455",
          password: "",
          autoRefresh: true,
          browserSources: [],
        };
      return configData;
    }
  } catch (error) {
    console.error("[ERROR] Ошибка загрузки конфига:", error);
  }
  return {
    tokens: {},
    commands: {},
    banwords: { words: [] },
    periodicEvents: {},
    overlays: [],
    rewards: {},
    autoshoutout: [],
    events: {},
    obs: {
      enabled: false,
      url: "ws://127.0.0.1:4455",
      password: "",
      autoRefresh: true,
      browserSources: [],
    },
  };
}

async function saveFullConfig(configData) {
  try {
    await fsPromises.writeFile(
      CONFIG_PATH,
      JSON.stringify(configData, null, 2),
    );
    return true;
  } catch (error) {
    console.error("[ERROR] Ошибка сохранения конфига:", error);
    return false;
  }
}

let FULL_CONFIG = loadFullConfig();

function updateFromConfig() {
  if (FULL_CONFIG.tokens) {
    if (FULL_CONFIG.tokens.channelName)
      CONFIG.channel = FULL_CONFIG.tokens.channelName;
    if (FULL_CONFIG.tokens.botUsername)
      CONFIG.botUsername = FULL_CONFIG.tokens.botUsername;
    if (FULL_CONFIG.tokens.clientId)
      CONFIG.clientId = FULL_CONFIG.tokens.clientId;
    if (FULL_CONFIG.tokens.clientSecret)
      CLIENT_SECRET = FULL_CONFIG.tokens.clientSecret;

    if (FULL_CONFIG.tokens.accessToken) {
      const token = FULL_CONFIG.tokens.accessToken.replace("oauth:", "");
      CONFIG.oauthToken = `oauth:${token}`;
      OAUTH_TOKEN = token;
    }

    if (FULL_CONFIG.tokens.broadcasterAccessToken) {
      BROADCASTER_TOKEN = FULL_CONFIG.tokens.broadcasterAccessToken.replace(
        "oauth:",
        "",
      );
    }

    CHANNEL_NAME = CONFIG.channel;
    BOT_USERNAME = CONFIG.botUsername;
  }
}

let CONFIG = {
  channel: "",
  botUsername: "",
  oauthToken: "",
  clientId: "",
  port: 3001,
  wsPort: 8080,
  host: "0.0.0.0",
};

updateFromConfig();

function hasRequiredTokens() {
  const tokens = FULL_CONFIG.tokens || {};
  const missing = [];
  if (!tokens.channelName) missing.push("channelName");
  if (!tokens.botUsername) missing.push("botUsername");
  if (!tokens.accessToken) missing.push("accessToken (токен бота)");
  if (!tokens.broadcasterAccessToken)
    missing.push("broadcasterAccessToken (токен стримера)");
  return { valid: missing.length === 0, missing };
}

// ========== УПРАВЛЕНИЕ ТОКЕНАМИ ==========
async function refreshTwitchToken(type) {
  const config = loadFullConfig();
  const tokens = config.tokens || {};

  const refreshToken =
    type === "bot" ? tokens.refreshToken : tokens.broadcasterRefreshToken;

  if (!refreshToken) {
    console.warn(`[WARN] Нет refresh_token для ${type}, невозможно обновить`);
    return false;
  }

  try {
    console.log(`[INFO] Обновление токена ${type}...`);

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[ERROR] Ошибка обновления токена ${type}:`, data);
      return false;
    }

    if (type === "bot") {
      tokens.accessToken = data.access_token;
      if (data.refresh_token) tokens.refreshToken = data.refresh_token;
      OAUTH_TOKEN = data.access_token;
      CONFIG.oauthToken = `oauth:${data.access_token}`;

      // Обновляем IRC клиент если активен
      if (twitchClient) {
        twitchClient.opts.identity.password = `oauth:${data.access_token}`;
      }
    } else {
      tokens.broadcasterAccessToken = data.access_token;
      if (data.refresh_token)
        tokens.broadcasterRefreshToken = data.refresh_token;
      BROADCASTER_TOKEN = data.access_token;
    }

    await saveFullConfig(config);
    console.log(`[INFO] Токен ${type} успешно обновлён`);
    return true;
  } catch (error) {
    console.error(
      `[ERROR] Ошибка при обновлении токена ${type}:`,
      error.message,
    );
    return false;
  }
}

async function validateToken(token) {
  if (!token) return { valid: false };

  try {
    const response = await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: { Authorization: `Bearer ${token.replace("oauth:", "")}` },
    });

    if (response.ok) {
      const data = await response.json();
      return { valid: true, expiresIn: data.expires_in };
    }

    return { valid: false };
  } catch (error) {
    console.error("[ERROR] Ошибка валидации токена:", error.message);
    return { valid: false };
  }
}

async function scheduleTokenRefresh() {
  if (botTokenRefreshTimer) clearTimeout(botTokenRefreshTimer);
  if (broadcasterTokenRefreshTimer) clearTimeout(broadcasterTokenRefreshTimer);

  if (OAUTH_TOKEN) {
    const { valid, expiresIn } = await validateToken(OAUTH_TOKEN);

    if (!valid) {
      console.log("[INFO] Токен бота невалиден, пробуем обновить...");
      const refreshed = await refreshTwitchToken("bot");
      if (refreshed) scheduleTokenRefresh();
    } else if (expiresIn) {
      const refreshIn = Math.max(expiresIn - 300, 60) * 1000;
      console.log(
        `[INFO] Токен бота истекает через ${Math.floor(expiresIn / 60)} мин. Обновление через ${Math.floor(refreshIn / 60000)} мин.`,
      );

      botTokenRefreshTimer = setTimeout(async () => {
        console.log("[INFO] Плановое обновление токена бота...");
        await refreshTwitchToken("bot");
        scheduleTokenRefresh();
      }, refreshIn);
    } else {
      console.log("[INFO] Токен бота: плановое обновление через 1 час");
      botTokenRefreshTimer = setTimeout(
        async () => {
          await refreshTwitchToken("bot");
          scheduleTokenRefresh();
        },
        60 * 60 * 1000,
      );
    }
  }

  if (BROADCASTER_TOKEN) {
    const { valid, expiresIn } = await validateToken(BROADCASTER_TOKEN);

    if (!valid) {
      console.log("[INFO] Токен стримера невалиден, пробуем обновить...");
      const refreshed = await refreshTwitchToken("broadcaster");
      if (refreshed) scheduleTokenRefresh();
    } else if (expiresIn) {
      const refreshIn = Math.max(expiresIn - 300, 60) * 1000;
      console.log(
        `[INFO] Токен стримера истекает через ${Math.floor(expiresIn / 60)} мин. Обновление через ${Math.floor(refreshIn / 60000)} мин.`,
      );

      broadcasterTokenRefreshTimer = setTimeout(async () => {
        console.log("[INFO] Плановое обновление токена стримера...");
        await refreshTwitchToken("broadcaster");
        scheduleTokenRefresh();
      }, refreshIn);
    } else {
      console.log("[INFO] Токен стримера: плановое обновление через 1 час");
      broadcasterTokenRefreshTimer = setTimeout(
        async () => {
          await refreshTwitchToken("broadcaster");
          scheduleTokenRefresh();
        },
        60 * 60 * 1000,
      );
    }
  }
}

// ========== ПРОВЕРКА НАЛИЧИЯ ТОКЕНОВ ==========
if (!fs.existsSync(CONFIG_PATH)) {
  console.warn("[WARN] Файл config.json не найден");
} else {
  console.log("[START] Конфигурация загружена из config.json");
}

const tokenCheck = hasRequiredTokens();
tokensValid = tokenCheck.valid;

if (!tokensValid) {
  console.warn("[WARN] ========================================");
  console.warn("[WARN] Отсутствуют обязательные токены:");
  tokenCheck.missing.forEach((t) => console.warn(`[WARN]   - ${t}`));
  console.warn("[WARN] ----------------------------------------");
  console.warn("[WARN] Авторизуйтесь через веб-интерфейс:");
  console.warn(`[WARN]   http://${getLocalIP()}:3001`);
  console.warn("[WARN] ========================================");
  registerStartupTask("server");
} else {
  registerStartupTask("server");
  registerStartupTask("irc");
  registerStartupTask("ids");
  registerStartupTask("eventsub");
  registerStartupTask("timers");
}

// ========== ВЕБСОКЕТ ДЛЯ ОВЕРЛЕЕВ ==========
const wss = new WebSocket.Server({ port: CONFIG.wsPort, host: CONFIG.host });
console.log(
  `[START] Вебсокет для оверлеев: ws://${getLocalIP()}:${CONFIG.wsPort}`,
);

const connectedOverlays = new Map();
const pendingOverlayMessages = new Map();
const PENDING_OVERLAY_TTL_MS = 30000;
const MAX_PENDING_OVERLAY_MESSAGES = 20;

wss.on("headers", (headers) => {
  headers.push("Access-Control-Allow-Origin: *");
});

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const overlayId = url.searchParams.get("overlayId") || "default";
  const overlayPath = url.searchParams.get("overlayPath") || "default";
  const overlayInfo = { overlayId, overlayPath };
  connectedOverlays.set(ws, overlayInfo);
  console.log(
    `[INFO] Оверлей подключился: id=${overlayId}, path=${overlayPath}`,
  );
  flushOverlayQueueForClient(ws, overlayInfo);
  maybeLogOverlayReady();

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (data.command === "register") {
        const regInfo = {
          overlayId: data.overlayId || overlayId,
          overlayPath: data.overlayPath || overlayPath,
        };
        connectedOverlays.set(ws, regInfo);
        flushOverlayQueueForClient(ws, regInfo);
        maybeLogOverlayReady();
      }
    } catch (e) {}
  });

  ws.on("close", () => {
    const info = connectedOverlays.get(ws);
    connectedOverlays.delete(ws);
    console.log(
      `[INFO] Оверлей отключился: id=${info?.overlayId || "unknown"}`,
    );
    overlayReadyLogged = false;
  });
});

function resolveOverlayMatchValues(targetOverlay) {
  const target = (targetOverlay || "").trim();
  const values = new Set();

  if (!target) return values;

  values.add(target.toLowerCase());
  values.add(target.replace(/^\/overlay\//, "").toLowerCase());

  const config = loadFullConfig();
  const overlayConfig = (config.overlays || []).find(
    (o) => o.id === target || o.path === target || o.name === target,
  );

  if (overlayConfig?.id) values.add(String(overlayConfig.id).toLowerCase());
  if (overlayConfig?.path) values.add(String(overlayConfig.path).toLowerCase());
  if (overlayConfig?.name) values.add(String(overlayConfig.name).toLowerCase());

  return values;
}

function resolveOverlayQueueKey(targetOverlay) {
  const target = (targetOverlay || "").trim();
  if (!target) return null;

  const config = loadFullConfig();
  const overlayConfig = (config.overlays || []).find(
    (o) => o.id === target || o.path === target || o.name === target,
  );

  return String(
    overlayConfig?.path ||
      overlayConfig?.id ||
      target.replace(/^\/overlay\//, "") ||
      target,
  ).toLowerCase();
}

function getClientOverlayKeys(info) {
  const keys = new Set();

  if (info?.overlayId) keys.add(String(info.overlayId).toLowerCase());
  if (info?.overlayPath) keys.add(String(info.overlayPath).toLowerCase());

  const config = loadFullConfig();
  const overlayConfig = (config.overlays || []).find(
    (o) =>
      o.id === info?.overlayId ||
      o.path === info?.overlayPath ||
      o.name === info?.overlayId ||
      o.name === info?.overlayPath,
  );

  if (overlayConfig?.id) keys.add(String(overlayConfig.id).toLowerCase());
  if (overlayConfig?.path) keys.add(String(overlayConfig.path).toLowerCase());
  if (overlayConfig?.name) keys.add(String(overlayConfig.name).toLowerCase());

  return keys;
}

function queueOverlayMessage(targetOverlay, message) {
  const queueKey = resolveOverlayQueueKey(targetOverlay);
  if (!queueKey) return;

  const now = Date.now();
  const existing = (pendingOverlayMessages.get(queueKey) || []).filter(
    (item) => now - item.timestamp < PENDING_OVERLAY_TTL_MS,
  );

  existing.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${now}_${Math.random()}`,
    message,
    timestamp: now,
  });

  pendingOverlayMessages.set(
    queueKey,
    existing.slice(-MAX_PENDING_OVERLAY_MESSAGES),
  );

  console.log(
    `[INFO] Сообщение для оверлея "${queueKey}" поставлено в очередь (${existing.length})`,
  );
}

function flushOverlayQueueForClient(ws, info) {
  if (!ws || ws.readyState !== WebSocket.OPEN || !info) return;

  const keys = [...getClientOverlayKeys(info)];
  const now = Date.now();
  const sentIds = new Set();
  let sentCount = 0;

  for (const key of keys) {
    const items = pendingOverlayMessages.get(key);
    if (!items?.length) continue;

    pendingOverlayMessages.delete(key);

    for (const item of items) {
      if (now - item.timestamp > PENDING_OVERLAY_TTL_MS) continue;
      if (sentIds.has(item.id)) continue;

      ws.send(item.message);
      sentIds.add(item.id);
      sentCount++;
    }
  }

  if (sentCount > 0) {
    console.log(
      `[INFO] Оверлею ${info.overlayPath || info.overlayId} отправлено ${sentCount} отложенных событий`,
    );
  }
}

function notifyOverlay(command, data, targetOverlay) {
  const message = JSON.stringify({ command, ...data });

  if (targetOverlay && targetOverlay.trim() !== "") {
    const target = targetOverlay.trim();
    const matchValues = resolveOverlayMatchValues(target);

    let sent = false;
    connectedOverlays.forEach((info, client) => {
      if (client.readyState === WebSocket.OPEN) {
        const clientId = (info.overlayId || "").toLowerCase();
        const clientPath = (info.overlayPath || "").toLowerCase();
        if (matchValues.has(clientId) || matchValues.has(clientPath)) {
          client.send(message);
          sent = true;
        }
      }
    });

    if (!sent) {
      queueOverlayMessage(target, message);
      console.warn(
        `[WARN] Оверлей ${getOverlayUrl(target)} не подключен. Событие поставлено в очередь.`,
      );
    }
    return sent;
  }

  let sent = false;
  connectedOverlays.forEach((info, client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent = true;
    }
  });
  return sent;
}

function getOverlayUrl(overlayTarget) {
  if (!overlayTarget || overlayTarget.trim() === "") return "все оверлеи";
  const config = loadFullConfig();
  const overlay = (config.overlays || []).find(
    (o) =>
      o.id === overlayTarget ||
      o.path === overlayTarget ||
      o.name === overlayTarget,
  );
  if (overlay) {
    return `http://${getLocalIP()}:${CONFIG.port}/overlay/${overlay.path}`;
  }
  return overlayTarget;
}

// ========== OVERLAY CONNECTION MONITORING ==========
function getConfiguredOverlays() {
  return (loadFullConfig().overlays || [])
    .map((o) => ({
      id: String(o.id || "").toLowerCase(),
      path: String(o.path || "").toLowerCase(),
      name: o.name || o.path || o.id || "unknown",
    }))
    .filter((o) => o.id || o.path);
}

function getConnectedOverlayKeys() {
  const keys = new Set();
  connectedOverlays.forEach((info, ws) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (info?.overlayId) keys.add(String(info.overlayId).toLowerCase());
    if (info?.overlayPath) keys.add(String(info.overlayPath).toLowerCase());
  });
  return keys;
}

function getOverlayConnectionStatus() {
  const expected = getConfiguredOverlays();
  const connectedKeys = getConnectedOverlayKeys();
  const connected = [];
  const missing = [];

  for (const overlay of expected) {
    const isConnected =
      (overlay.id && connectedKeys.has(overlay.id)) ||
      (overlay.path && connectedKeys.has(overlay.path));
    if (isConnected) connected.push(overlay);
    else missing.push(overlay);
  }

  return { expected, connected, missing };
}

function formatOverlayList(list) {
  if (!list.length) return "нет";
  return list
    .map((o) => `${o.name}${o.path ? ` (${o.path})` : ""}`)
    .join(", ");
}

function maybeLogOverlayReady() {
  const { expected, missing, connected } = getOverlayConnectionStatus();
  if (expected.length === 0) return;

  if (missing.length === 0 && !overlayReadyLogged) {
    // Если до этого было предупреждение — показываем полный баннер
    if (overlayStartupWarningLogged) {
      console.log("[INFO] ========================================");
      console.log("[INFO] Бот полностью готов к работе!");
      console.log(
        `[INFO] Оверлеи подключены: ${formatOverlayList(connected)}`,
      );
      console.log("[INFO] ========================================");
    } else {
      console.log(
        `[INFO] ✅ Все оверлеи подключены: ${formatOverlayList(connected)}. Медиа-доставка готова.`,
      );
    }

    overlayReadyLogged = true;
    overlayStartupWarningLogged = false;
    overlayDeliveryHintLogged = false;

    // Останавливаем OBS retry если всё подключилось
    if (obsRefreshTimer) {
      clearTimeout(obsRefreshTimer);
      obsRefreshTimer = null;
    }
  }

  if (missing.length > 0) {
    overlayReadyLogged = false;
  }
}

function logOverlayStartupWarning() {
  const { expected, connected, missing } = getOverlayConnectionStatus();
  if (expected.length === 0 || missing.length === 0) return;
  if (overlayStartupWarningLogged) return;

  console.warn("[WARN] ========================================");
  console.warn(
    "[WARN] Ядро бота готово, но оверлеи не подключены!",
  );
  console.warn(`[WARN]   Ожидаются:    ${formatOverlayList(expected)}`);
  console.warn(`[WARN]   Подключены:   ${formatOverlayList(connected)}`);
  console.warn(`[WARN]   Не подключены: ${formatOverlayList(missing)}`);

  const obsConfig = loadFullConfig().obs;
  if (obsConfig?.enabled) {
    console.warn(
      "[WARN] Попытка автоматического обновления Browser Source через OBS WebSocket...",
    );
  } else {
    console.warn(
      "[WARN] Если OBS/Streamlabs был запущен раньше бота — перезапустите Browser Source.",
    );
    console.warn(
      "[WARN] Совет: включите интеграцию с OBS WebSocket в настройках бота",
    );
    console.warn(
      '[WARN] для автоматического решения этой проблемы (секция "obs" в конфиге).',
    );
  }
  console.warn(
    "[WARN] Медиа ставится в очередь и будет доставлено при подключении оверлея.",
  );
  console.warn("[WARN] ========================================");

  overlayStartupWarningLogged = true;
}

function warnOverlayDeliveryProblemOnce() {
  if (overlayDeliveryHintLogged) return;

  const { expected, connected } = getOverlayConnectionStatus();
  if (expected.length === 0) return;
  if (connected.length > 0) return;

  overlayDeliveryHintLogged = true;

  console.warn(
    "[WARN] Ни один оверлей не подключён. Медиа поставлено в очередь.",
  );

  const obsConfig = loadFullConfig().obs;
  if (!obsConfig?.enabled) {
    console.warn(
      "[WARN] Перезапустите Browser Source в OBS/Streamlabs или включите OBS WebSocket интеграцию.",
    );
  }
}

// ========== OBS WEBSOCKET INTEGRATION ==========
function getObsConfig() {
  const config = loadFullConfig();
  const obs = config.obs;

  if (!obs || !obs.enabled) return null;

  return {
    url: obs.url || "ws://127.0.0.1:4455",
    password: obs.password || "",
    browserSources: obs.browserSources || [],
    autoRefresh: obs.autoRefresh !== false,
  };
}

async function refreshObsBrowserSources() {
  if (!OBSWebSocket) {
    console.warn(
      "[WARN] obs-websocket-js не установлен. Выполните: npm install obs-websocket-js",
    );
    return false;
  }

  const obsConfig = getObsConfig();
  if (!obsConfig) return false;
  if (!obsConfig.autoRefresh) return false;

  const { missing } = getOverlayConnectionStatus();
  if (missing.length === 0) return false;

  // Определяем какие browser source нужно обновить
  const sourcesToRefresh = [];
  for (const overlay of missing) {
    const sourceCfg = obsConfig.browserSources.find(
      (s) =>
        String(s.overlayPath || "").toLowerCase() === overlay.path ||
        String(s.overlayPath || "").toLowerCase() === overlay.id,
    );

    if (sourceCfg?.inputName) {
      sourcesToRefresh.push({
        inputName: sourceCfg.inputName,
        overlay: overlay,
      });
    }
  }

  if (sourcesToRefresh.length === 0) {
    // Нет маппинга browser source для отсутствующих оверлеев
    if (obsRefreshAttempts === 0) {
      console.warn(
        "[WARN] OBS: Нет маппинга browserSources для отсутствующих оверлеев.",
      );
      console.warn(
        '[WARN] Добавьте в config.json -> obs -> browserSources записи с inputName и overlayPath.',
      );
    }
    return false;
  }

  const obs = new OBSWebSocket();

  try {
    console.log(
      `[INFO] OBS: Подключение к ${obsConfig.url}...`,
    );

    await obs.connect(obsConfig.url, obsConfig.password || undefined);
    console.log("[INFO] OBS: Подключено");

    let refreshedCount = 0;

    for (const { inputName, overlay } of sourcesToRefresh) {
      try {
        // Получаем текущие настройки
        const { inputSettings } = await obs.call("GetInputSettings", {
          inputName: inputName,
        });

        const currentUrl = inputSettings.url;
        if (!currentUrl) {
          console.warn(
            `[WARN] OBS: "${inputName}" — нет URL, пропускаем`,
          );
          continue;
        }

        // Добавляем/обновляем cachebuster параметр
        let newUrl;
        try {
          const urlObj = new URL(currentUrl);
          urlObj.searchParams.set("_botReload", Date.now().toString());
          newUrl = urlObj.toString();
        } catch {
          // Если URL не парсится, добавляем как query string
          const separator = currentUrl.includes("?") ? "&" : "?";
          newUrl = `${currentUrl}${separator}_botReload=${Date.now()}`;
        }

        await obs.call("SetInputSettings", {
          inputName: inputName,
          inputSettings: { url: newUrl },
          overlay: true,
        });

        console.log(
          `[INFO] OBS: Browser Source "${inputName}" обновлён для оверлея "${overlay.name}"`,
        );
        refreshedCount++;
      } catch (sourceError) {
        const msg = sourceError.message || String(sourceError);
        if (
          msg.includes("No source was found") ||
          msg.includes("not found") ||
          msg.includes("600")
        ) {
          console.warn(
            `[WARN] OBS: Источник "${inputName}" не найден в OBS. Проверьте имя в настройках.`,
          );
        } else {
          console.error(
            `[ERROR] OBS: Ошибка обновления "${inputName}":`,
            msg,
          );
        }
      }
    }

    if (refreshedCount > 0) {
      console.log(
        `[INFO] OBS: Обновлено ${refreshedCount} Browser Source. Ожидаем переподключения оверлеев...`,
      );
    }

    return refreshedCount > 0;
  } catch (error) {
    const msg = error.message || String(error);

    if (msg.includes("ECONNREFUSED") || msg.includes("connect")) {
      if (obsRefreshAttempts === 0) {
        console.warn(
          `[WARN] OBS: Не удалось подключиться к ${obsConfig.url}`,
        );
        console.warn(
          "[WARN] OBS: Убедитесь, что OBS/Streamlabs запущен и WebSocket Server включён.",
        );
        console.warn(
          "[WARN] OBS: Настройки -> Инструменты -> Настройки WebSocket-сервера",
        );
      }
    } else if (msg.includes("authentication") || msg.includes("4009")) {
      console.error(
        "[ERROR] OBS: Неверный пароль WebSocket. Проверьте obs.password в конфиге.",
      );
    } else {
      console.error("[ERROR] OBS: Ошибка подключения:", msg);
    }

    return false;
  } finally {
    try {
      await obs.disconnect();
    } catch {}
  }
}

async function startObsRefreshRetry() {
  const obsConfig = getObsConfig();
  if (!obsConfig || !obsConfig.autoRefresh) return;
  if (obsAutoRefreshDone) return;

  obsRefreshAttempts++;

  if (obsRefreshAttempts > OBS_MAX_REFRESH_ATTEMPTS) {
    console.warn(
      `[WARN] OBS: Достигнуто максимальное количество попыток (${OBS_MAX_REFRESH_ATTEMPTS}).`,
    );
    console.warn(
      "[WARN] OBS: Перезапустите Browser Source в OBS вручную.",
    );
    obsAutoRefreshDone = true;
    return;
  }

  console.log(
    `[INFO] OBS: Попытка обновления Browser Source (${obsRefreshAttempts}/${OBS_MAX_REFRESH_ATTEMPTS})...`,
  );

  const success = await refreshObsBrowserSources();

  if (success) {
    // Ждём немного и проверяем, подключились ли оверлеи
    obsRefreshTimer = setTimeout(async () => {
      obsRefreshTimer = null;
      const { missing } = getOverlayConnectionStatus();

      if (missing.length === 0) {
        console.log(
          "[INFO] OBS: Все оверлеи подключились после обновления Browser Source!",
        );
        obsAutoRefreshDone = true;
      } else {
        console.log(
          `[INFO] OBS: Ещё не все оверлеи подключились (не подключены: ${formatOverlayList(missing)}). Повторная попытка...`,
        );
        await startObsRefreshRetry();
      }
    }, OBS_REFRESH_RETRY_INTERVAL_MS);
  } else {
    // Не удалось подключиться к OBS — пробуем позже
    obsRefreshTimer = setTimeout(async () => {
      obsRefreshTimer = null;
      const { missing } = getOverlayConnectionStatus();
      if (missing.length > 0 && !obsAutoRefreshDone) {
        await startObsRefreshRetry();
      }
    }, OBS_REFRESH_RETRY_INTERVAL_MS);
  }
}

function startOverlayStartupMonitor() {
  if (overlayMonitorStarted) return;
  overlayMonitorStarted = true;

  setTimeout(async () => {
    const { expected, missing } = getOverlayConnectionStatus();
    if (expected.length === 0) {
      console.log("[INFO] Оверлеи не настроены в конфиге, мониторинг не нужен.");
      return;
    }

    if (missing.length === 0) {
      maybeLogOverlayReady();
      return;
    }

    // Оверлеи не подключены
    logOverlayStartupWarning();

    // Пробуем автоматически обновить через OBS
    const obsConfig = getObsConfig();
    if (obsConfig?.autoRefresh) {
      await startObsRefreshRetry();
    }

    // Периодически проверяем статус
    overlayMonitorTimer = setInterval(() => {
      const { expected: exp, missing: mis } = getOverlayConnectionStatus();

      if (exp.length === 0) {
        clearInterval(overlayMonitorTimer);
        overlayMonitorTimer = null;
        return;
      }

      if (mis.length === 0) {
        clearInterval(overlayMonitorTimer);
        overlayMonitorTimer = null;
        maybeLogOverlayReady();
        return;
      }
    }, OVERLAY_MONITOR_INTERVAL_MS);
  }, OVERLAY_STARTUP_CHECK_DELAY_MS);
}

// ========== API ДЛЯ ПОЛУЧЕНИЯ ЗРИТЕЛЕЙ ==========
async function fetchViewersFromAPI() {
  if (!tokensValid) return [];
  try {
    const accessToken = OAUTH_TOKEN;
    const channelName = CHANNEL_NAME.toLowerCase().replace("#", "");
    const userResponse = await fetch(
      `https://api.twitch.tv/helix/users?login=${channelName}`,
      {
        headers: {
          "Client-Id": CLIENT_ID,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    if (!userResponse.ok) throw new Error(`HTTP ${userResponse.status}`);
    const userData = await userResponse.json();
    const broadcasterId = userData.data[0]?.id;
    if (!broadcasterId) throw new Error("ID канала не найден");
    const chatResponse = await fetch(
      `https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}&first=100`,
      {
        headers: {
          "Client-Id": CLIENT_ID,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    if (!chatResponse.ok)
      return await fetchViewersViaOldAPI(broadcasterId, accessToken);
    const chatData = await chatResponse.json();
    if (chatData.data?.length > 0)
      return chatData.data
        .map((c) => c.user_name)
        .filter((n) => n.toLowerCase() !== BOT_USERNAME.toLowerCase());
    return [];
  } catch (error) {
    console.error("[ERROR] Ошибка API зрителей:", error.message || error);
    return [];
  }
}

async function fetchViewersViaOldAPI(broadcasterId, accessToken) {
  try {
    const [modsResp, vipsResp] = await Promise.all([
      fetch(
        `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}&first=100`,
        {
          headers: {
            "Client-Id": CLIENT_ID,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      ),
      fetch(
        `https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}&first=100`,
        {
          headers: {
            "Client-Id": CLIENT_ID,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      ),
    ]);
    const mods = await modsResp.json();
    const vips = await vipsResp.json();
    return [
      ...new Set([
        ...(mods.data?.map((m) => m.user_name) || []),
        ...(vips.data?.map((v) => v.user_name) || []),
      ]),
    ];
  } catch (error) {
    return [];
  }
}

async function getRandomViewer() {
  try {
    const now = Date.now();
    if (now - viewersCacheTime > VIEWERS_CACHE_TTL) {
      viewersCache = await fetchViewersFromAPI();
      viewersCacheTime = now;
    }
    if (viewersCache.length > 0)
      return viewersCache[Math.floor(Math.random() * viewersCache.length)];
    if (recentChatters.size > 0) {
      const arr = Array.from(recentChatters);
      return arr[Math.floor(Math.random() * arr.length)];
    }
    const fb = ["friend", "viewer", "chatter", "follower", "subscriber"];
    return fb[Math.floor(Math.random() * fb.length)];
  } catch (error) {
    return "someone";
  }
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadCommands() {
  try {
    return loadFullConfig().commands || {};
  } catch (e) {
    return {};
  }
}
function loadRewards() {
  try {
    return loadFullConfig().rewards || {};
  } catch (e) {
    return {};
  }
}
async function loadBanWords() {
  try {
    return loadFullConfig().banwords || { words: [] };
  } catch (e) {
    return { words: [] };
  }
}
function loadEvents() {
  try {
    return loadFullConfig().events || {};
  } catch (e) {
    return {};
  }
}
function loadAutoShoutout() {
  try {
    return loadFullConfig().autoshoutout || [];
  } catch (e) {
    return [];
  }
}
function loadPeriodicEvents() {
  try {
    return loadFullConfig().periodicEvents || {};
  } catch (e) {
    return {};
  }
}

// ========== БАНВОРДЫ ==========
function generateAliases(word) {
  if (!word) return [];
  const CHAR_MAP = {
    а: ["a"],
    б: ["6"],
    в: ["b"],
    г: ["r"],
    е: ["e"],
    к: ["k"],
    м: ["m"],
    н: ["h"],
    о: ["o"],
    р: ["p"],
    с: ["c"],
    т: ["t"],
    у: ["y"],
    х: ["x"],
    ь: ["b"],
    a: ["а"],
    b: ["в", "ь"],
    c: ["с"],
    e: ["е"],
    h: ["н"],
    k: ["к"],
    m: ["м"],
    o: ["о"],
    p: ["р"],
    t: ["т"],
    r: ["г"],
    x: ["х"],
    y: ["у"],
  };
  const original = word.toLowerCase();
  const aliases = new Set([original]);
  const chars = original.split("");
  const positions = [];
  chars.forEach((char, i) => {
    if (CHAR_MAP[char])
      positions.push({ index: i, replacements: CHAR_MAP[char] });
  });
  if (positions.length === 0) return Array.from(aliases);
  function gen(current, pos) {
    if (pos === positions.length) {
      aliases.add(current.join(""));
      return;
    }
    const p = positions[pos];
    gen([...current], pos + 1);
    for (const r of p.replacements) {
      const n = [...current];
      n[p.index] = r;
      gen(n, pos + 1);
    }
  }
  gen([...chars], 0);
  return Array.from(aliases);
}

function containsBannedWord(message, banWords) {
  if (!message || !banWords || !Array.isArray(banWords))
    return { found: false };
  const ml = message.toLowerCase();
  const variants = [
    ...new Set([
      ml,
      normalizeMessage(ml),
      removeRepeatedChars(ml),
      replaceSimilarChars(ml),
    ]),
  ];
  for (const item of banWords) {
    if (!item?.word) continue;
    const words = [item.word.toLowerCase()];
    if (item.aliases?.length)
      words.push(...item.aliases.map((a) => a.toLowerCase()));
    else {
      const a = generateAliases(item.word);
      words.push(...a);
      item.aliases = a;
    }
    for (const v of variants) {
      for (const w of [...new Set(words)]) {
        if (item.type === "hard") {
          if (v.includes(w))
            return { found: true, word: item.word, type: "hard" };
        } else {
          if (
            new RegExp(
              `(^|[\\s.,!?;:()\\[\\]{}"'_])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s.,!?;:()\\[\\]{}"'_]|$)`,
              "i",
            ).test(v)
          )
            return { found: true, word: item.word, type: "soft" };
        }
      }
    }
  }
  return { found: false };
}

function normalizeMessage(m) {
  const map = {
    "@": "а",
    a: "а",
    b: "в",
    6: "б",
    c: "с",
    e: "е",
    3: "е",
    h: "н",
    x: "х",
    i: "и",
    1: "и",
    o: "о",
    0: "о",
    p: "р",
    y: "у",
  };
  let r = m;
  for (const [f, t] of Object.entries(map))
    r = r.replace(new RegExp(f, "g"), t);
  return r;
}
function removeRepeatedChars(m) {
  return m.replace(/(.)\1+/g, "$1");
}
function replaceSimilarChars(m) {
  const map = {
    a: "а",
    b: "в",
    c: "с",
    e: "е",
    h: "н",
    i: "и",
    k: "к",
    m: "м",
    o: "о",
    p: "р",
    t: "т",
    x: "х",
    y: "у",
  };
  let r = m;
  for (const [l, c] of Object.entries(map))
    r = r.replace(new RegExp(l, "g"), c);
  return r;
}

async function logDeletedMessage(username, message, word, type) {
  try {
    await fsPromises.appendFile(
      path.join(__dirname, "deleted_messages.log"),
      `[${new Date().toISOString()}] Удалено от ${username}: "${message}" (слово: "${word}", тип: ${type})\n`,
    );
  } catch (e) {}
}

// ========== ПРОВЕРКА ПРАВ ==========
async function checkBotPermissions() {
  try {
    console.log("[START] Проверка прав бота...");
    const v = await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: { Authorization: `Bearer ${OAUTH_TOKEN}` },
    });
    if (v.ok) {
      const d = await v.json();
      console.log("[START] Токен бота валиден");
      console.log("[START] Права бота: " + d.scopes.join(", "));

      const requiredBotScopes = [
        "chat:read",
        "chat:edit",
        "user:read:chat",
        "user:write:chat",
        "channel:moderate",
        "moderator:manage:chat_messages",
        "moderator:manage:shoutouts",
      ];

      console.log("[START] Проверка прав бота:");
      requiredBotScopes.forEach((scope) => {
        if (d.scopes.includes(scope)) {
          console.log(`[START]   ${scope} - OK`);
        } else {
          console.warn(`[WARN]    ${scope} - ОТСУТСТВУЕТ`);
        }
      });

      const missingScopes = requiredBotScopes.filter(
        (scope) => !d.scopes.includes(scope),
      );
      if (missingScopes.length > 0) {
        console.warn(
          `[WARN] Боту не хватает прав: ${missingScopes.join(", ")}`,
        );
      } else {
        console.log("[START] У бота есть все необходимые права");
      }
    } else {
      console.error("[ERROR] Токен бота невалиден");
    }

    if (BROADCASTER_TOKEN) {
      console.log("[START] Проверка прав стримера...");
      const bv = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: { Authorization: `Bearer ${BROADCASTER_TOKEN}` },
      });
      if (bv.ok) {
        const bd = await bv.json();
        console.log("[START] Токен стримера валиден");
        console.log("[START] Права стримера: " + bd.scopes.join(", "));

        const requiredBroadcasterScopes = [
          "moderator:read:followers",
          "channel:read:subscriptions",
          "channel:read:redemptions",
          "moderator:read:shoutouts",
          "moderator:manage:shoutouts",
        ];

        console.log("[START] Проверка прав стримера:");
        requiredBroadcasterScopes.forEach((scope) => {
          if (bd.scopes.includes(scope)) {
            console.log(`[START]   ${scope} - OK`);
          } else {
            console.warn(`[WARN]    ${scope} - ОТСУТСТВУЕТ`);
          }
        });

        const missingScopes = requiredBroadcasterScopes.filter(
          (scope) => !bd.scopes.includes(scope),
        );
        if (missingScopes.length > 0) {
          console.warn(
            `[WARN] Стримеру не хватает прав: ${missingScopes.join(", ")}`,
          );
        } else {
          console.log("[START] У стримера есть все необходимые права");
        }
      } else {
        console.error("[ERROR] Токен стримера невалиден");
      }
    } else {
      console.warn("[WARN] Токен стримера не задан");
    }
  } catch (e) {
    console.error("[ERROR] Ошибка проверки прав:", e.message || e);
  }
}

// ========== СБОРКА СООБЩЕНИЙ ==========
async function buildMessageFromComponents(
  components,
  author,
  target,
  extraVars,
) {
  if (!components || !Array.isArray(components)) return "";
  let result = "";
  for (const comp of components) {
    switch (comp.type) {
      case "author":
        result += `@${author}`;
        break;
      case "target":
        if (!target || target === "someone")
          result += `@${await getRandomViewer()}`;
        else result += target;
        break;
      case "randomViewer":
        result += `@${await getRandomViewer()}`;
        break;
      case "static":
        let val = comp.value || "";
        if (extraVars) {
          for (const [key, value] of Object.entries(extraVars)) {
            val = val.replace(new RegExp(`\\{${key}\\}`, "g"), value);
          }
        }
        result += val;
        break;
      case "space":
        result += " ";
        break;
      case "random":
        result +=
          Math.floor(
            Math.random() * ((comp.max || 100) - (comp.min || 0) + 1),
          ) + (comp.min || 0);
        break;
      case "phrase":
        if (comp.phrases?.length > 0) {
          const valid = comp.phrases.filter((p) => p.trim());
          if (valid.length)
            result += valid[Math.floor(Math.random() * valid.length)];
        }
        break;
      case "variable":
        if (extraVars && comp.name && extraVars[comp.name]) {
          result += extraVars[comp.name];
        }
        break;
    }
  }
  return result;
}

function hasPermission(userTags, perms) {
  if (!perms || perms.length === 0) return true;

  const isBroadcaster =
    userTags.username?.toLowerCase() === CHANNEL_NAME?.toLowerCase();

  for (const p of perms) {
    if (p === "everyone") return true;
    if (p === "broadcaster" && isBroadcaster) return true;
    if (p === "moderators" && userTags.mod) return true;
    if (p === "vips" && userTags.vip) return true;
    if (p === "subscribers" && userTags.subscriber) return true;
    if (
      p.startsWith("user:") &&
      p.replace("user:", "").toLowerCase() === userTags.username?.toLowerCase()
    )
      return true;
  }
  return false;
}

// ========== ВЫПОЛНЕНИЕ ДЕЙСТВИЯ ==========
async function executeAction(
  config,
  channel,
  author,
  target,
  extraVars,
  sourceName,
) {
  if (!config || config.enabled === false) return undefined;

  let chatSent = false;
  let mediaSent = false;

  if (config.response?.chat?.enabled && config.response.chat.components) {
    const response = await buildMessageFromComponents(
      config.response.chat.components,
      author,
      target,
      extraVars,
    );
    if (response && channel) {
      if (twitchClient) {
        twitchClient.say(channel, response);
        console.log(`[INFO] Чат: ${response}`);
        chatSent = true;
      } else {
        console.warn("[WARN] IRC-клиент не подключен, сообщение не отправлено");
      }
    }
  }

  if (config.response?.media?.enabled && config.response.media.file) {
    const media = config.response.media;
    const overlayTarget = media.overlay?.id || media.overlay || null;
    const anim = media.animation || {};

    const mediaData = {
      videoFile: media.file,
      secondaryFile: media.secondaryFile || null, // <-- НОВОЕ
      volume: media.volume || 100,
      animation: {
        enter: anim.enter || "none",
        exit: anim.exit || "none",
        enterDuration: anim.enterDuration || 0.5,
        exitDuration: anim.exitDuration || 0.5,
      },
      queueMode: media.queueMode || "queue",
      chromakey: media.chromakey || "none",
    };

    if (media.text?.enabled) {
      let textContent = media.text.content || "";
      if (extraVars) {
        for (const [key, value] of Object.entries(extraVars)) {
          textContent = textContent.replace(
            new RegExp(`\\{${key}\\}`, "g"),
            value,
          );
        }
      }
      textContent = textContent.replace(/\{user\}/g, author || "");
      textContent = textContent.replace(/\{target\}/g, target || "");
      mediaData.text = {
        enabled: true,
        content: textContent,
        position: media.text.position || "overlay",
        animation: media.text.animation || "none",
        animationAmplitude: media.text.animationAmplitude || 1,
        font: media.text.font || {},
      };
    }

    const sent = notifyOverlay("playVideo", mediaData, overlayTarget);
    const label = sourceName || media.file;
    const overlayUrl = getOverlayUrl(overlayTarget);

    if (sent) {
      console.log(`[INFO] Медиа: "${label}" -> ${overlayUrl}`);
      mediaSent = true;
    } else {
      console.warn(
        `[WARN] Медиа НЕ доставлено: "${label}" -> ${overlayUrl} (оверлей не подключен)`,
      );
      warnOverlayDeliveryProblemOnce();
    }
  }

  return chatSent || mediaSent;
}

// ========== ОБРАБОТКА НАГРАДЫ ==========
const handledRewards = new Map();

function getDeduplicationKey(rewardId, username, timestamp) {
  // Округляем до десятых долей секунды (100 мс)
  const roundedTime = Math.floor(timestamp / 100) * 100;
  return `${rewardId}:${username}:${roundedTime}`;
}

// Периодическая очистка старых записей (каждые 10 секунд)
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, time] of handledRewards.entries()) {
    if (now - time > 30000) {
      // 30 секунд
      handledRewards.delete(key);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(
      `[INFO] Очистка кэша наград: удалено ${cleanedCount} записей (осталось ${handledRewards.size})`,
    );
  }
}, 10000); // Проверяем каждые 10 секунд

async function handleReward(rewardId, username, userMessage) {
  const now = Date.now();
  const dedupKey = getDeduplicationKey(rewardId, username, now);

  // Проверка на дубликат (мёртвая зона 150 мс)
  const lastHandled = handledRewards.get(dedupKey);
  if (lastHandled && now - lastHandled < 150) {
    console.log(
      `[INFO] Награда ${rewardId} от ${username} — дубликат (${now - lastHandled}ms), пропуск`,
    );
    return true;
  }

  // Сохраняем запись о обработке
  handledRewards.set(dedupKey, now);

  // Дополнительная очистка: если записей слишком много, принудительно чистим старые
  if (handledRewards.size > 500) {
    const threshold = now - 30000;
    let cleanedCount = 0;
    for (const [key, time] of handledRewards.entries()) {
      if (time < threshold) {
        handledRewards.delete(key);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(
        `[INFO] Принудительная очистка кэша наград: удалено ${cleanedCount} записей (осталось ${handledRewards.size})`,
      );
    }
  }

  const rewards = loadRewards();
  let rewardConfig = null;
  for (const [key, config] of Object.entries(rewards)) {
    if (config.rewardId === rewardId) {
      rewardConfig = config;
      break;
    }
  }
  if (!rewardConfig) {
    console.log(`[INFO] Награда ${rewardId} от ${username} — нет конфигурации`);
    return false;
  }
  if (rewardConfig.enabled === false) {
    console.log(`[INFO] Награда "${rewardConfig.rewardTitle}" отключена`);
    return false;
  }

  console.log(`[INFO] Награда: "${rewardConfig.rewardTitle}" от ${username}`);

  const extraVars = { user: username, message: userMessage || "" };
  const result = await executeAction(
    rewardConfig,
    `#${CHANNEL_NAME}`,
    username,
    userMessage || undefined,
    extraVars,
    rewardConfig.rewardTitle,
  );

  if (result === false) {
    console.warn(
      `[WARN] Награда "${rewardConfig.rewardTitle}" — медиа не доставлено (оверлей не подключен)`,
    );
  }

  return true;
}

// ========== ОБРАБОТКА НАГРАД С БУФЕРОМ ==========
async function handleRewardWithBuffer(
  rewardId,
  username,
  userMessage,
  eventId = null,
) {
  if (!eventSubWs || eventSubWs.readyState !== WebSocket.OPEN) {
    console.log(
      `[INFO] EventSub не готов (state: ${eventSubWs?.readyState || "null"}), буферизируем награду от ${username}`,
    );
    bufferReward(rewardId, username, userMessage, eventId);
    return true;
  }

  return await handleReward(rewardId, username, userMessage);
}

// ========== ОБРАБОТКА СОБЫТИЙ ==========
async function handleEvent(eventType, eventData) {
  const events = loadEvents();
  const eventConfig = events[eventType];
  if (!eventConfig || eventConfig.enabled === false) {
    console.log(`[INFO] Событие "${eventType}" не настроено или отключено`);
    return;
  }

  const channel = `#${CHANNEL_NAME}`;
  const username = eventData.username || "someone";
  const extraVars = { ...eventData };

  console.log(`[INFO] Событие "${eventType}": ${JSON.stringify(eventData)}`);
  await executeAction(
    eventConfig,
    channel,
    username,
    undefined,
    extraVars,
    `Событие: ${eventType}`,
  );
}

// ========== AUTO SHOUTOUT ==========
async function getUserIdByName(username) {
  try {
    const token = BROADCASTER_TOKEN || OAUTH_TOKEN;
    const resp = await fetch(
      `https://api.twitch.tv/helix/users?login=${username.toLowerCase()}`,
      {
        headers: { "Client-Id": CLIENT_ID, Authorization: `Bearer ${token}` },
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.data?.[0]?.id || null;
  } catch (e) {
    console.error(
      `[ERROR] Ошибка получения ID для ${username}:`,
      e.message || e,
    );
    return null;
  }
}

async function sendShoutout(username) {
  try {
    if (!channelId) {
      console.error("[ERROR] Shoutout: channelId не определён");
      return false;
    }
    let token, moderatorId;

    if (BROADCASTER_TOKEN) {
      token = BROADCASTER_TOKEN;
      moderatorId = channelId;
    } else {
      token = OAUTH_TOKEN;
      moderatorId = botId;
    }

    if (!moderatorId) {
      console.error("[ERROR] Shoutout: moderatorId не определён");
      return false;
    }

    const toUserId = await getUserIdByName(username);
    if (!toUserId) {
      console.error(`[ERROR] Shoutout: не удалось получить ID для ${username}`);
      return false;
    }

    const resp = await fetch(
      `https://api.twitch.tv/helix/chat/shoutouts?from_broadcaster_id=${channelId}&to_broadcaster_id=${toUserId}&moderator_id=${moderatorId}`,
      {
        method: "POST",
        headers: { "Client-Id": CLIENT_ID, Authorization: `Bearer ${token}` },
      },
    );

    if (resp.status === 204) {
      console.log(`[INFO] Shoutout выполнен для ${username}`);
      return true;
    } else if (resp.status === 429) {
      console.warn(`[WARN] Shoutout: кулдаун ещё не прошёл для ${username}`);
      return false;
    } else {
      const errData = await resp.json().catch(() => ({}));
      console.error(`[ERROR] Shoutout ошибка (${resp.status}):`, errData);
      if (
        resp.status === 429 ||
        errData?.message?.includes("already been sent")
      ) {
        return false;
      }
      return true;
    }
  } catch (e) {
    console.error(`[ERROR] Shoutout ошибка для ${username}:`, e.message || e);
    return false;
  }
}

async function processShoutoutQueue() {
  if (shoutoutProcessing) return;
  if (shoutoutQueue.length === 0) return;

  shoutoutProcessing = true;

  while (shoutoutQueue.length > 0) {
    const now = Date.now();

    if (now < shoutoutCooldownUntil) {
      const waitMs = shoutoutCooldownUntil - now;
      console.log(
        `[INFO] Shoutout: ожидание ${Math.ceil(waitMs / 1000)} сек до следующего...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs + 500));
    }

    const username = shoutoutQueue[0];

    console.log(`[INFO] Shoutout: отправка для ${username}...`);
    const success = await sendShoutout(username);

    if (success) {
      shoutoutQueue.shift();
      shoutoutCooldownUntil = Date.now() + SHOUTOUT_COOLDOWN_MS;
      console.log(
        `[INFO] Shoutout для ${username} выполнен. В очереди: ${shoutoutQueue.length}`,
      );
    } else {
      console.warn(
        `[WARN] Shoutout для ${username} не удался, повтор через 30 сек`,
      );
      shoutoutCooldownUntil = Date.now() + 30000;
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
  }

  shoutoutProcessing = false;
  console.log("[INFO] Очередь shoutout пуста");
}

function queueShoutout(username) {
  const lowerUsername = username.toLowerCase();
  if (shoutoutDone.has(lowerUsername)) return;

  const autoList = loadAutoShoutout();
  const isInList = autoList.some(
    (name) => name.toLowerCase() === lowerUsername,
  );
  if (!isInList) return;

  shoutoutDone.add(lowerUsername);

  if (shoutoutQueue.some((name) => name.toLowerCase() === lowerUsername))
    return;

  shoutoutQueue.push(username);
  console.log(
    `[INFO] ${username} добавлен в очередь shoutout (позиция: ${shoutoutQueue.length})`,
  );

  processShoutoutQueue();
}

// ========== TWITCH EVENTSUB WEBSOCKET ==========
function connectEventSub() {
  if (!channelId || !OAUTH_TOKEN) {
    console.warn("[WARN] EventSub: нет channelId или токена, пропускаем");
    completeStartupTask("eventsub");
    return;
  }

  const tag = botFullyReady ? "[INFO]" : "[START]";
  console.log(`${tag} Подключение к Twitch EventSub WebSocket...`);

  eventSubWs = new WebSocket("wss://eventsub.wss.twitch.tv/ws");

  eventSubWs.on("open", () => {
    const t = botFullyReady ? "[INFO]" : "[START]";
    console.log(`${t} EventSub WebSocket подключен, ожидание welcome...`);
    isEventSubConnecting = false;

    // Обрабатываем буфер наград через 2 секунды после подключения
    setTimeout(() => processRewardBuffer(), 2000);
  });

  eventSubWs.on("message", async (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());
      const messageType = data.metadata?.message_type;

      if (messageType === "session_welcome") {
        eventSubSessionId = data.payload.session.id;
        const keepaliveSeconds =
          data.payload.session.keepalive_timeout_seconds ||
          EVENTSUB_SETTINGS.KEEPALIVE_TIMEOUT;

        const t = botFullyReady ? "[INFO]" : "[START]";
        console.log(`${t} EventSub session: ${eventSubSessionId}`);
        console.log(
          `${t} EventSub keepalive timeout: ${EVENTSUB_SETTINGS.KEEPALIVE_TIMEOUT} сек`,
        );

        resetKeepaliveTimeout(keepaliveSeconds);
        await subscribeToAllEvents();
      } else if (messageType === "session_keepalive") {
        resetKeepaliveTimeout(EVENTSUB_SETTINGS.KEEPALIVE_TIMEOUT);
      } else if (messageType === "session_reconnect") {
        const reconnectUrl = data.payload.session.reconnect_url;
        console.log(
          `[INFO] EventSub: сервер просит переподключиться к ${reconnectUrl}`,
        );
        reconnectEventSub(reconnectUrl);
      } else if (messageType === "notification") {
        await handleEventSubNotification(data);
      } else if (messageType === "revocation") {
        const sub = data.payload.subscription;
        console.warn(
          `[WARN] EventSub: подписка отозвана. Тип: ${sub.type}, причина: ${sub.status}`,
        );
      }
    } catch (error) {
      console.error(
        "[ERROR] EventSub ошибка обработки:",
        error.message || error,
      );
    }
  });

  eventSubWs.on("error", (error) => {
    console.error("[ERROR] EventSub WebSocket ошибка:", error.message);
  });

  eventSubWs.on("close", (code, reason) => {
    console.log(`[INFO] EventSub WebSocket закрыт (код: ${code})`);
    eventSubSessionId = null;

    if (eventSubKeepaliveTimeout) {
      clearTimeout(eventSubKeepaliveTimeout);
      eventSubKeepaliveTimeout = null;
    }

    if (!eventSubReconnectTimeout) {
      eventSubReconnectTimeout = setTimeout(() => {
        eventSubReconnectTimeout = null;
        connectEventSub();
      }, EVENTSUB_SETTINGS.RECONNECT_DELAY);
    }
  });
}

function resetKeepaliveTimeout(keepaliveSeconds) {
  if (eventSubKeepaliveTimeout) clearTimeout(eventSubKeepaliveTimeout);
  // Используем увеличенный таймаут
  const timeoutMs =
    (Math.max(keepaliveSeconds, EVENTSUB_SETTINGS.KEEPALIVE_TIMEOUT) + 5) *
    1000;
  eventSubKeepaliveTimeout = setTimeout(() => {
    console.warn("[WARN] EventSub: keepalive таймаут, переподключение...");
    reconnectEventSub();
  }, timeoutMs);
}

async function handleEventSubNotification(data) {
  const subscriptionType = data.metadata.subscription_type;
  const event = data.payload.event;

  if (
    subscriptionType === "channel.channel_points_custom_reward_redemption.add"
  ) {
    const rewardId = event.reward.id;
    const rewardTitle = event.reward.title;
    const username = event.user_name;
    const userInput = event.user_input || "";
    const redemptionId = event.id;

    console.log(
      `[INFO] EventSub: Награда "${rewardTitle}" (${rewardId}) от ${username}${userInput ? `: "${userInput}"` : ""}`,
    );
    await handleRewardWithBuffer(rewardId, username, userInput, redemptionId);
  } else if (subscriptionType === "channel.follow") {
    const username = event.user_name;
    console.log(`[INFO] Новый фолловер: ${username}`);
    await handleEvent("follow", {
      username: username,
      userId: event.user_id,
      user: username,
    });
  } else if (subscriptionType === "channel.subscribe") {
    const username = event.user_name;
    const tier = event.tier;
    const isGift = event.is_gift;
    const tierName =
      tier === "1000"
        ? "Tier 1"
        : tier === "2000"
          ? "Tier 2"
          : tier === "3000"
            ? "Tier 3"
            : tier;
    console.log(
      `[INFO] Новая подписка: ${username} (${tierName}${isGift ? ", подарок" : ""})`,
    );
    await handleEvent("subscribe", {
      username,
      userId: event.user_id,
      user: username,
      tier: tierName,
      tierRaw: tier,
      isGift: isGift ? "true" : "false",
    });
  } else if (subscriptionType === "channel.subscription.message") {
    const username = event.user_name;
    const tier = event.tier;
    const months = event.cumulative_months || 1;
    const streakMonths = event.streak_months || 0;
    const message = event.message?.text || "";
    const tierName =
      tier === "1000"
        ? "Tier 1"
        : tier === "2000"
          ? "Tier 2"
          : tier === "3000"
            ? "Tier 3"
            : tier;
    console.log(
      `[INFO] Переподписка: ${username} (${tierName}, ${months} мес.)`,
    );
    await handleEvent("resubscribe", {
      username,
      user: username,
      tier: tierName,
      tierRaw: tier,
      months: String(months),
      streakMonths: String(streakMonths),
      message,
    });
  } else if (subscriptionType === "channel.subscription.gift") {
    const gifterName = event.user_name || "Аноним";
    const total = event.total;
    const tier = event.tier;
    const tierName =
      tier === "1000"
        ? "Tier 1"
        : tier === "2000"
          ? "Tier 2"
          : tier === "3000"
            ? "Tier 3"
            : tier;
    console.log(
      `[INFO] Подарочные подписки: ${gifterName} подарил ${total} x ${tierName}`,
    );
    await handleEvent("giftSub", {
      username: gifterName,
      user: gifterName,
      tier: tierName,
      tierRaw: tier,
      total: String(total),
      isAnonymous: event.is_anonymous ? "true" : "false",
    });
  } else if (subscriptionType === "channel.raid") {
    const fromUser = event.from_broadcaster_user_name;
    const viewers = event.viewers;
    console.log(`[INFO] Рейд от ${fromUser} с ${viewers} зрителями`);
    await handleEvent("raid", {
      username: fromUser,
      user: fromUser,
      viewers: String(viewers),
      fromUserId: event.from_broadcaster_user_id,
    });
  }
}

async function subscribeToAllEvents() {
  const broadcasterToken = BROADCASTER_TOKEN;

  if (!broadcasterToken) {
    console.error("[ERROR] EventSub: broadcasterAccessToken не задан");
    console.error("[ERROR] Подписки на follow/sub/reward не будут работать");
    completeStartupTask("eventsub");
    return;
  }

  const tag = botFullyReady ? "[INFO]" : "[START]";

  const subscriptions = [
    {
      type: "channel.channel_points_custom_reward_redemption.add",
      version: "1",
      condition: { broadcaster_user_id: channelId },
      token: broadcasterToken,
    },
    {
      type: "channel.follow",
      version: "2",
      condition: {
        broadcaster_user_id: channelId,
        moderator_user_id: channelId,
      },
      token: broadcasterToken,
    },
    {
      type: "channel.subscribe",
      version: "1",
      condition: { broadcaster_user_id: channelId },
      token: broadcasterToken,
    },
    {
      type: "channel.subscription.message",
      version: "1",
      condition: { broadcaster_user_id: channelId },
      token: broadcasterToken,
    },
    {
      type: "channel.subscription.gift",
      version: "1",
      condition: { broadcaster_user_id: channelId },
      token: broadcasterToken,
    },
    {
      type: "channel.raid",
      version: "1",
      condition: { to_broadcaster_user_id: channelId },
      token: broadcasterToken,
    },
  ];

  let successCount = 0,
    failCount = 0;

  for (const sub of subscriptions) {
    try {
      const body = {
        type: sub.type,
        version: sub.version,
        condition: sub.condition,
        transport: { method: "websocket", session_id: eventSubSessionId },
      };

      const response = await fetch(
        "https://api.twitch.tv/helix/eventsub/subscriptions",
        {
          method: "POST",
          headers: {
            "Client-Id": CLIENT_ID,
            Authorization: `Bearer ${sub.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const result = await response.json();

      if (response.status === 202) {
        successCount++;
        const subId = result.data?.[0]?.id;
        if (subId) eventSubSubscriptionIds.push(subId);
        console.log(`${tag} EventSub: "${sub.type}" — подписка создана`);
      } else if (response.status === 409) {
        console.log(`${tag} EventSub: "${sub.type}" — уже существует`);
      } else if (response.status === 403) {
        failCount++;
        console.error(
          `[ERROR] EventSub: "${sub.type}" — нет прав (403). Проверьте scope токена`,
        );
      } else if (response.status === 401) {
        failCount++;
        console.error(
          `[ERROR] EventSub: "${sub.type}" — токен невалиден (401). Обновите токен`,
        );
      } else {
        failCount++;
        console.error(
          `[ERROR] EventSub: "${sub.type}" (${response.status}):`,
          result.message || result,
        );
      }
    } catch (error) {
      failCount++;
      console.error(`[ERROR] EventSub: ошибка "${sub.type}":`, error.message);
    }
  }

  console.log(
    `${tag} EventSub итого: ${successCount} успешно, ${failCount} ошибок`,
  );
  if (failCount > 0) {
    console.warn(
      "[WARN] Убедитесь, что broadcasterAccessToken имеет все необходимые scope",
    );
  }

  completeStartupTask("eventsub");
}

function reconnectEventSub(reconnectUrl) {
  if (eventSubWs) {
    eventSubWs.removeAllListeners();
    eventSubWs.close();
    eventSubWs = null;
  }

  if (eventSubKeepaliveTimeout) {
    clearTimeout(eventSubKeepaliveTimeout);
    eventSubKeepaliveTimeout = null;
  }
  if (eventSubReconnectTimeout) {
    clearTimeout(eventSubReconnectTimeout);
    eventSubReconnectTimeout = null;
  }

  eventSubSessionId = null;
  eventSubSubscriptionIds = [];

  if (reconnectUrl) {
    console.log(`[INFO] EventSub: переподключение к ${reconnectUrl}...`);
    eventSubWs = new WebSocket(reconnectUrl);
    setupEventSubHandlers();
  } else {
    // Используем увеличенную задержку
    eventSubReconnectTimeout = setTimeout(() => {
      eventSubReconnectTimeout = null;
      connectEventSub();
    }, EVENTSUB_SETTINGS.RECONNECT_DELAY);
  }
}

function setupEventSubHandlers() {
  if (!eventSubWs) return;

  eventSubWs.on("open", () => {
    console.log("[INFO] EventSub переподключен, ожидание welcome...");
    setTimeout(() => processRewardBuffer(), 2000);
  });

  eventSubWs.on("message", async (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());
      const messageType = data.metadata?.message_type;

      if (messageType === "session_welcome") {
        eventSubSessionId = data.payload.session.id;
        const keepaliveSeconds =
          data.payload.session.keepalive_timeout_seconds ||
          EVENTSUB_SETTINGS.KEEPALIVE_TIMEOUT;
        console.log(`[INFO] EventSub reconnect session: ${eventSubSessionId}`);
        resetKeepaliveTimeout(keepaliveSeconds);
        await subscribeToAllEvents();
      } else if (messageType === "session_keepalive") {
        resetKeepaliveTimeout(EVENTSUB_SETTINGS.KEEPALIVE_TIMEOUT);
      } else if (messageType === "session_reconnect") {
        reconnectEventSub(data.payload.session.reconnect_url);
      } else if (messageType === "notification") {
        await handleEventSubNotification(data);
      } else if (messageType === "revocation") {
        console.warn(
          `[WARN] EventSub: подписка отозвана: ${data.payload.subscription.status}`,
        );
      }
    } catch (error) {
      console.error("[ERROR] EventSub ошибка:", error.message || error);
    }
  });

  eventSubWs.on("error", (error) => {
    console.error("[ERROR] EventSub ошибка:", error.message);
  });

  eventSubWs.on("close", (code) => {
    console.log(`[INFO] EventSub закрыт (${code})`);
    eventSubSessionId = null;
    if (eventSubKeepaliveTimeout) {
      clearTimeout(eventSubKeepaliveTimeout);
      eventSubKeepaliveTimeout = null;
    }
    if (!eventSubReconnectTimeout) {
      eventSubReconnectTimeout = setTimeout(() => {
        eventSubReconnectTimeout = null;
        connectEventSub();
      }, EVENTSUB_SETTINGS.RECONNECT_DELAY);
    }
  });
}

function disconnectEventSub() {
  if (eventSubWs) {
    eventSubWs.removeAllListeners();
    eventSubWs.close();
    eventSubWs = null;
  }
  if (eventSubKeepaliveTimeout) {
    clearTimeout(eventSubKeepaliveTimeout);
    eventSubKeepaliveTimeout = null;
  }
  if (eventSubReconnectTimeout) {
    clearTimeout(eventSubReconnectTimeout);
    eventSubReconnectTimeout = null;
  }
  eventSubSessionId = null;
  eventSubSubscriptionIds = [];
}

// ========== ПЕРИОДИЧЕСКИЕ СОБЫТИЯ ==========
function stopAllTimers() {
  activeTimers.forEach((id, name) => {
    clearInterval(id);
    console.log(`[INFO] Таймер остановлен: ${name}`);
  });
  activeTimers.clear();
}

function startTimer(name, event) {
  if (activeTimers.has(name)) {
    clearInterval(activeTimers.get(name));
    activeTimers.delete(name);
  }
  if (!event.enabled) return;
  const ms = (event.interval || 60) * 1000;
  const tag = botFullyReady ? "[INFO]" : "[START]";
  console.log(`${tag} Таймер "${name}": интервал ${event.interval} сек`);
  const id = setInterval(async () => {
    try {
      const fresh = loadPeriodicEvents()[name];
      if (!fresh || !fresh.enabled) {
        clearInterval(id);
        activeTimers.delete(name);
        return;
      }
      await executePeriodicEvent(name, fresh);
    } catch (e) {
      console.error(`[ERROR] Событие "${name}":`, e.message || e);
    }
  }, ms);
  activeTimers.set(name, id);
}

async function executePeriodicEvent(name, event) {
  const channel = `#${CHANNEL_NAME}`;
  await executeAction(
    event,
    channel,
    BOT_USERNAME,
    undefined,
    {},
    `Таймер: ${name}`,
  );
}

function startAllTimers() {
  stopAllTimers();
  const events = loadPeriodicEvents();
  const tag = botFullyReady ? "[INFO]" : "[START]";
  if (Object.keys(events).length === 0) {
    console.log(`${tag} Периодических событий нет`);
  } else {
    for (const [n, e] of Object.entries(events)) startTimer(n, e);
  }
  completeStartupTask("timers");
}

function restartTimers() {
  console.log("[INFO] Перезапуск таймеров...");
  startAllTimers();
}

// ========== ПОДКЛЮЧЕНИЕ К TWITCH IRC ==========
async function initializeBot() {
  console.log("[START] Проверка валидности токенов перед подключением...");

  const botValidation = await validateToken(OAUTH_TOKEN);
  if (!botValidation.valid) {
    console.log("[START] Токен бота истёк, обновляем...");
    const refreshed = await refreshTwitchToken("bot");
    if (!refreshed) {
      console.error("[ERROR] Не удалось обновить токен бота. IRC не будет подключён.");
      completeStartupTask("irc");
      completeStartupTask("ids");
      completeStartupTask("eventsub");
      completeStartupTask("timers");
      return;
    }
    FULL_CONFIG = loadFullConfig();
    updateFromConfig();
  } else {
    console.log("[START] Токен бота валиден");
  }

  if (BROADCASTER_TOKEN) {
    const broadcasterValidation = await validateToken(BROADCASTER_TOKEN);
    if (!broadcasterValidation.valid) {
      console.log("[START] Токен стримера истёк, обновляем...");
      const refreshed = await refreshTwitchToken("broadcaster");
      if (!refreshed) {
        console.warn("[WARN] Не удалось обновить токен стримера");
      } else {
        FULL_CONFIG = loadFullConfig();
        updateFromConfig();
      }
    } else {
      console.log("[START] Токен стримера валиден");
    }
  }

  scheduleTokenRefresh();

  twitchClient = new tmi.Client({
    options: { debug: false },
    identity: { username: CONFIG.botUsername, password: CONFIG.oauthToken },
    channels: [CONFIG.channel],
  });

  console.log("[START] Подключение к Twitch IRC...");

  try {
    await twitchClient.connect();
    console.log(`[START] Бот подключился к каналу ${CONFIG.channel}`);
    completeStartupTask("irc");
    setInterval(async () => {
      try {
        viewersCache = await fetchViewersFromAPI();
        viewersCacheTime = Date.now();
      } catch (e) {}
    }, VIEWERS_CACHE_TTL);

    checkBotPermissions();

    try {
      const channelResp = await fetch(
        `https://api.twitch.tv/helix/users?login=${CHANNEL_NAME}`,
        {
          headers: {
            "Client-Id": CLIENT_ID,
            Authorization: `Bearer ${OAUTH_TOKEN}`,
          },
        },
      );
      const channelData = await channelResp.json();
      if (channelData.data?.[0]) {
        channelId = channelData.data[0].id;
        console.log(`[START] ID канала: ${channelId}`);
      } else {
        console.error("[ERROR] Не удалось получить ID канала");
      }
    } catch (e) {
      console.error("[ERROR] Ошибка получения ID канала:", e.message || e);
    }

    try {
      const botResp = await fetch(
        `https://api.twitch.tv/helix/users?login=${BOT_USERNAME}`,
        {
          headers: {
            "Client-Id": CLIENT_ID,
            Authorization: `Bearer ${OAUTH_TOKEN}`,
          },
        },
      );
      const botData = await botResp.json();
      if (botData.data?.[0]) {
        botId = botData.data[0].id;
        console.log(`[START] ID бота: ${botId}`);
      } else {
        console.warn("[WARN] Не удалось получить ID бота");
      }
    } catch (e) {
      console.error("[ERROR] Ошибка получения ID бота:", e.message || e);
    }

    completeStartupTask("ids");

    if (channelId) {
      setTimeout(() => connectEventSub(), 2000);
    } else {
      console.error("[ERROR] channelId не получен, EventSub не будет подключен");
      completeStartupTask("eventsub");
    }

    setTimeout(() => startAllTimers(), 5000);
  } catch (err) {
    console.error("[ERROR] Не удалось подключиться к Twitch IRC:", err.message || err);
    completeStartupTask("irc");
    completeStartupTask("ids");
    completeStartupTask("eventsub");
    completeStartupTask("timers");
  }

  if (twitchClient) {
    twitchClient.on("message", async (channel, tags, message, self) => {
      if (self) return;

      const displayName = tags["display-name"] || tags.username;

      if (displayName) {
        recentChatters.add(displayName);
        if (recentChatters.size > MAX_RECENT)
          recentChatters.delete(recentChatters.values().next().value);
        queueShoutout(displayName);
      }

      try {
        if (!message) return;

        const customRewardId = tags["custom-reward-id"];
        if (customRewardId) {
          console.log(
            `[INFO] IRC: Награда ${customRewardId} от ${displayName}: "${message}"`,
          );
          await handleReward(customRewardId, displayName, message);
          return;
        }

        const banData = await loadBanWords();
        const banned = containsBannedWord(message, banData.words);
        if (banned.found) {
          console.log(
            `[INFO] Запрещённое слово "${banned.word}" от ${displayName}`,
          );
          if (channelId && botId && tags.id) {
            try {
              const resp = await fetch(
                `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${channelId}&moderator_id=${botId}&message_id=${tags.id}`,
                {
                  method: "DELETE",
                  headers: {
                    "Client-Id": CLIENT_ID,
                    Authorization: `Bearer ${OAUTH_TOKEN}`,
                  },
                },
              );
              if (resp.status === 204) {
                console.log("[INFO] Сообщение удалено");
                await logDeletedMessage(
                  displayName,
                  message,
                  banned.word,
                  banned.type,
                );
              }
            } catch (e) {}
          }
          return;
        }
      } catch (e) {
        console.error("[ERROR] Ошибка обработки банвордов:", e.message || e);
      }

      if (!message.startsWith("!")) return;
      const args = message.slice(1).split(" ");
      const cmdName = args.shift().toLowerCase();
      const fullCmd = `!${cmdName}`;
      const commands = await loadCommands();

      let config = commands[fullCmd];

      if (!config) {
        for (const [key, cmd] of Object.entries(commands)) {
          if (cmd.aliases && cmd.aliases.includes(fullCmd)) {
            config = cmd;
            break;
          }
        }
      }

      if (!config || config.enabled === false) return;
      if (!hasPermission(tags, config.permissions)) return;

      const extraVars = { user: displayName, message: args.join(" ") };
      await executeAction(
        config,
        channel,
        displayName,
        args[0] || undefined,
        extraVars,
        config.name || fullCmd,
      );
    });
  }
}

if (tokensValid) {
  initializeBot();
} else {
  console.log(
    "[INFO] IRC, EventSub и таймеры не запущены (токены не настроены)",
  );
}

// ========== ВЕБ-СЕРВЕР ==========
const app = express();
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(express.json());

const publicDir = path.join(__dirname, "public");
const mediaDir = path.join(__dirname, "public", "media");
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

app.use(express.static(publicDir));
app.use(
  "/media",
  express.static(mediaDir, {
    maxAge: "1d",
    immutable: true,
    setHeaders: (res, p) => {
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      if (p.endsWith(".mp4")) res.setHeader("Content-Type", "video/mp4");
      if (p.endsWith(".webm")) res.setHeader("Content-Type", "video/webm");
      if (p.endsWith(".mp3")) res.setHeader("Content-Type", "audio/mpeg");
      if (p.endsWith(".wav")) res.setHeader("Content-Type", "audio/wav");
    },
  }),
);

const storage = multer.diskStorage({
  destination: (r, f, cb) => cb(null, mediaDir),
  filename: (r, f, cb) =>
    cb(
      null,
      Date.now() +
        "-" +
        crypto.randomBytes(6).readUInt32LE(0).toString(36) +
        path.extname(f.originalname),
    ),
});
const upload = multer({
  storage,
  fileFilter: (r, f, cb) => {
    const ok = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/mp4",
      "audio/flac",
    ];
    cb(null, ok.includes(f.mimetype));
  },
  limits: { fileSize: 100 * 1024 * 1024 },
});

function generateState() {
  return crypto.randomBytes(16).toString("hex");
}

// ========== OAuth РОУТЫ ==========
app.get("/api/auth/twitch/broadcaster", (req, res) => {
  const state = generateState();
  if (!global.oauthStates) global.oauthStates = new Map();
  global.oauthStates.set(state, { type: "broadcaster", createdAt: Date.now() });

  const authUrl =
    `https://id.twitch.tv/oauth2/authorize?` +
    `client_id=${CLIENT_ID}` +
    `&redirect_uri=${REDIRECT_URI}` +
    `&response_type=code` +
    `&force_verify=true` +
    `&scope=moderator:read:followers%20channel:read:subscriptions%20channel:read:redemptions%20moderator:read:shoutouts%20moderator:manage:shoutouts` +
    `&state=${state}`;

  res.json({ url: authUrl });
});

app.get("/api/auth/twitch/bot", (req, res) => {
  const state = generateState();
  if (!global.oauthStates) global.oauthStates = new Map();
  global.oauthStates.set(state, { type: "bot", createdAt: Date.now() });

  const authUrl =
    `https://id.twitch.tv/oauth2/authorize?` +
    `client_id=${CLIENT_ID}` +
    `&redirect_uri=${REDIRECT_URI}` +
    `&response_type=code` +
    `&force_verify=true` +
    `&scope=chat:read%20chat:edit%20user:read:chat%20user:write:chat%20channel:moderate%20moderator:manage:chat_messages%20moderator:manage:shoutouts` +
    `&state=${state}`;

  res.json({ url: authUrl });
});

app.get("/api/auth/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error("[OAuth] Ошибка от Twitch:", error, error_description);
    return res.status(400).send(`
            <html>
                <body style="background:#0d0d0d;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
                    <h2 style="color:#dc3545;">❌ Ошибка авторизации</h2>
                    <p>${error_description || error}</p>
                    <p>Можете закрыть это окно и попробовать снова.</p>
                </body>
            </html>
        `);
  }

  if (!state) {
    console.error("[OAuth] Нет state параметра");
    return res.status(400).send(`
            <html>
                <body style="background:#0d0d0d;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
                    <h2 style="color:#dc3545;">❌ Ошибка авторизации</h2>
                    <p>Отсутствует параметр безопасности</p>
                </body>
            </html>
        `);
  }

  if (!global.oauthStates || !global.oauthStates.has(state)) {
    console.error("[OAuth] Неверный state:", state);
    return res.status(400).send(`
            <html>
                <body style="background:#0d0d0d;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
                    <h2 style="color:#dc3545;">❌ Ошибка авторизации</h2>
                    <p>Неверный параметр безопасности. Возможно, сессия истекла.</p>
                    <p>Попробуйте авторизоваться снова.</p>
                </body>
            </html>
        `);
  }

  const stateData = global.oauthStates.get(state);
  const isBroadcaster = stateData.type === "broadcaster";
  global.oauthStates.delete(state);

  if (!code) {
    console.error("[OAuth] Нет code параметра");
    return res.status(400).send("Код авторизации не получен");
  }

  try {
    console.log("[OAuth] Обмен кода на токены...");

    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("[OAuth] Ошибка обмена кода:", tokenData);
      return res.status(500).send(`
                <html>
                    <body style="background:#0d0d0d;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
                        <h2 style="color:#dc3545;">❌ Ошибка авторизации</h2>
                        <p>${tokenData.message || "Не удалось получить токен"}</p>
                    </body>
                </html>
            `);
    }

    console.log(
      "[OAuth] Токен успешно получен для",
      isBroadcaster ? "стримера" : "бота",
    );

    const config = loadFullConfig();
    if (!config.tokens) config.tokens = {};

    if (isBroadcaster) {
      config.tokens.broadcasterAccessToken = tokenData.access_token;
      config.tokens.broadcasterRefreshToken = tokenData.refresh_token;
    } else {
      config.tokens.accessToken = tokenData.access_token;
      config.tokens.refreshToken = tokenData.refresh_token;
    }

    await saveFullConfig(config);
    updateFromConfig();

    if (tokensValid) {
      scheduleTokenRefresh();
    }

    if (hasRequiredTokens().valid && !tokensValid) {
      console.log("[OAuth] Все токены получены, перезапускаем сервер...");
      res.send(`
                <html>
                    <body style="background:#0d0d0d;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
                        <h2 style="color:#28a745;">✅ Авторизация ${isBroadcaster ? "стримера" : "бота"} успешна!</h2>
                        <p>Все необходимые токены получены. Сервер будет перезапущен для применения настроек.</p>
                        <p>Пожалуйста, перезапустите сервер вручную.</p>
                        <button onclick="window.close()" style="margin-top:20px;padding:10px 20px;background:#9147ff;color:white;border:none;border-radius:5px;cursor:pointer;">Закрыть</button>
                    </body>
                </html>
            `);

      setTimeout(() => {
        process.exit(0);
      }, 2000);
    } else {
      res.send(`
                <html>
                    <body style="background:#0d0d0d;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
                        <h2 style="color:#28a745;">✅ Авторизация ${isBroadcaster ? "стримера" : "бота"} успешна!</h2>
                        <p>Можете закрыть это окно и вернуться в панель управления.</p>
                        <button onclick="window.close()" style="margin-top:20px;padding:10px 20px;background:#9147ff;color:white;border:none;border-radius:5px;cursor:pointer;">Закрыть</button>
                        <script>setTimeout(() => window.close(), 2000);</script>
                    </body>
                </html>
            `);
    }
  } catch (error) {
    console.error("[OAuth] Ошибка в callback:", error);
    res.status(500).send(`
            <html>
                <body style="background:#0d0d0d;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
                    <h2 style="color:#dc3545;">❌ Внутренняя ошибка сервера</h2>
                    <p>${error.message}</p>
                </body>
            </html>
        `);
  }
});

app.post("/api/auth/refresh/:type", async (req, res) => {
  const { type } = req.params;
  if (type !== "bot" && type !== "broadcaster") {
    return res
      .status(400)
      .json({ error: 'type должен быть "bot" или "broadcaster"' });
  }
  const success = await refreshTwitchToken(type);
  if (success) {
    res.json({ success: true, message: `Токен ${type} обновлён` });
  } else {
    res
      .status(500)
      .json({ success: false, error: "Не удалось обновить токен" });
  }
});

// ========== ОСТАЛЬНЫЕ API РОУТЫ ==========
app.get("/api/health", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ ok: true, startTime: SERVER_START_TIME });
});
app.get("/api/config", (req, res) => {
  try {
    res.json(loadFullConfig());
  } catch (e) {
    res.status(500).json({ error: "Ошибка" });
  }
});
app.post("/api/config", async (req, res) => {
  try {
    console.log("[DEBUG] Получен конфиг для сохранения");

    if (req.body.periodicEvents) {
      for (const [key, event] of Object.entries(req.body.periodicEvents)) {
        if (event.interval && event.interval < 10) {
          event.interval = 10;
          console.log(
            `[INFO] Интервал события "${key}" скорректирован до 10 секунд`,
          );
        }
      }
    }

    const success = await saveFullConfig(req.body);

    if (success) {
      FULL_CONFIG = req.body;
      updateFromConfig();

      if (tokensValid) {
        restartTimers();
      }

      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Ошибка записи файла" });
    }
  } catch (e) {
    console.error("[ERROR] Ошибка сохранения конфига:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Нет файла" });
  res.json({
    success: true,
    file: {
      originalName: req.file.originalname,
      fileName: req.file.filename,
      path: `/media/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

app.get("/api/media-files", async (req, res) => {
  try {
    const files = await fsPromises.readdir(mediaDir);
    const result = await Promise.all(
      files.map(async (f) => {
        const stat = await fsPromises.stat(path.join(mediaDir, f));
        const ext = path.extname(f).toLowerCase();
        let type = "unknown";
        if (ext.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) type = "image";
        else if (ext.match(/\.(mp4|webm|mov|avi|mkv|flv)$/)) type = "video";
        else if (ext.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/)) type = "audio";
        return {
          name: f,
          path: `/media/${f}`,
          size: stat.size,
          modified: stat.mtime,
          type,
        };
      }),
    );
    result.sort((a, b) => b.modified - a.modified);
    res.json({ success: true, files: result });
  } catch (e) {
    res.status(500).json({ error: "Ошибка" });
  }
});

app.delete("/api/media-files/:filename", async (req, res) => {
  try {
    const fp = path.join(mediaDir, req.params.filename);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: "Не найден" });
    await fsPromises.unlink(fp);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Ошибка" });
  }
});

app.get("/api/media-files/:filename/probe", async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(mediaDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Файл не найден" });
    }

    const stat = await fsPromises.stat(filePath);
    const ext = path.extname(filename).toLowerCase().slice(1);
    const warnings = [];
    let detectedCodec = null;
    let mediaType = "unknown";

    if (["mp4", "webm", "mov", "avi", "mkv", "flv", "m4v"].includes(ext))
      mediaType = "video";
    else if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext))
      mediaType = "audio";
    else if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext))
      mediaType = "image";

    // Для видеофайлов — пытаемся определить кодек по заголовку
    if (mediaType === "video") {
      try {
        const fd = await fsPromises.open(filePath, "r");
        const headerSize = Math.min(stat.size, 16384);
        const buffer = Buffer.alloc(headerSize);
        await fd.read(buffer, 0, headerSize, 0);
        await fd.close();

        const headerAscii = buffer.toString("ascii");

        if (headerAscii.includes("hvc1") || headerAscii.includes("hev1")) {
          detectedCodec = "H.265/HEVC";
          warnings.push(
            "Видео использует кодек H.265/HEVC. Большинство браузеров не поддерживают этот кодек. Рекомендуется перекодировать в H.264 (MP4).",
          );
        } else if (
          headerAscii.includes("avc1") ||
          headerAscii.includes("avc3")
        ) {
          detectedCodec = "H.264/AVC";
        } else if (headerAscii.includes("vp08")) {
          detectedCodec = "VP8";
        } else if (headerAscii.includes("vp09")) {
          detectedCodec = "VP9";
        } else if (headerAscii.includes("av01")) {
          detectedCodec = "AV1";
          warnings.push(
            "Видео использует кодек AV1. Поддержка может быть ограничена в старых браузерах.",
          );
        }
      } catch (e) {
        // Не удалось прочитать заголовок — не критично
      }

      if (ext === "mkv") {
        warnings.push(
          "Формат MKV имеет ограниченную поддержку в браузерах. Рекомендуется MP4 или WebM.",
        );
      }
      if (ext === "avi") {
        warnings.push(
          "Формат AVI не поддерживается браузерами. Необходимо конвертировать в MP4 или WebM.",
        );
      }
      if (ext === "flv") {
        warnings.push(
          "Формат FLV не поддерживается браузерами. Необходимо конвертировать в MP4 или WebM.",
        );
      }
      if (ext === "mov") {
        warnings.push(
          "Формат MOV может не поддерживаться во всех браузерах. Рекомендуется MP4.",
        );
      }
    }

    if (mediaType === "audio") {
      if (ext === "flac") {
        warnings.push(
          "Формат FLAC может не поддерживаться во всех браузерах. Рекомендуется MP3 или OGG.",
        );
      }
      if (ext === "aac") {
        warnings.push(
          "Формат AAC может требовать контейнер M4A для воспроизведения в браузере.",
        );
      }
    }

    res.json({
      success: true,
      file: filename,
      size: stat.size,
      sizeFormatted: (stat.size / 1024 / 1024).toFixed(2) + " MB",
      mediaType,
      extension: ext,
      codec: detectedCodec,
      warnings,
      supported: warnings.length === 0,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post("/api/banwords/generate-aliases", (req, res) => {
  if (!req.body.word) return res.status(400).json({ error: "Нет слова" });
  const a = generateAliases(req.body.word);
  res.json({ word: req.body.word, aliases: a, count: a.length });
});

app.get("/api/network-info", (req, res) => {
  const interfaces = require("os").networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces))
    for (const iface of interfaces[name])
      if (iface.family === "IPv4")
        addresses.push({
          interface: name,
          address: iface.address,
          internal: iface.internal,
        });
  const config = loadFullConfig();
  res.json({
    server: { port: CONFIG.port, wsPort: CONFIG.wsPort, host: CONFIG.host },
    addresses,
    overlayUrls: (config.overlays || []).map((o) => ({
      name: o.name,
      url: `http://${getLocalIP()}:${CONFIG.port}/overlay/${o.path}`,
    })),
    wsUrl: `ws://${getLocalIP()}:${CONFIG.wsPort}`,
  });
});

app.get("/api/debug/viewers", async (req, res) => {
  try {
    const viewers = await fetchViewersFromAPI();
    res.json({
      success: true,
      cache: {
        age: Date.now() - viewersCacheTime,
        count: viewersCache.length,
        viewers: viewersCache.slice(0, 20),
      },
      api: { count: viewers.length, viewers: viewers.slice(0, 20) },
      recent: {
        count: recentChatters.size,
        chatters: Array.from(recentChatters).slice(0, 20),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/viewers/random", async (req, res) => {
  try {
    res.json({ success: true, viewer: await getRandomViewer() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/periodic-events", (req, res) => {
  const events = loadPeriodicEvents();
  const result = {};
  for (const [n, e] of Object.entries(events))
    result[n] = { ...e, timerActive: activeTimers.has(n) };
  res.json({ success: true, events: result });
});
app.post("/api/periodic-events/restart", (req, res) => {
  restartTimers();
  res.json({ success: true });
});
app.post("/api/periodic-events/:name/trigger", async (req, res) => {
  const events = loadPeriodicEvents();
  const ev = events[req.params.name];
  if (!ev) return res.status(404).json({ error: "Не найдено" });
  await executePeriodicEvent(req.params.name, ev);
  res.json({ success: true });
});
app.get("/api/overlays/connected", (req, res) => {
  const connected = [];
  connectedOverlays.forEach((info, ws) => {
    if (ws.readyState === WebSocket.OPEN) connected.push(info);
  });
  res.json({ success: true, connected });
});
app.get("/api/rewards/channel", async (req, res) => {
  try {
    if (!channelId)
      return res.status(400).json({ error: "ID канала не определён" });
    const token = BROADCASTER_TOKEN || OAUTH_TOKEN;
    const response = await fetch(
      `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${channelId}`,
      { headers: { "Client-Id": CLIENT_ID, Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      const errText = await response.text();
      return res
        .status(response.status)
        .json({ error: `Twitch API: ${response.status}`, details: errText });
    }
    const data = await response.json();
    res.json({
      success: true,
      rewards: (data.data || []).map((r) => ({
        id: r.id,
        title: r.title,
        cost: r.cost,
        isEnabled: r.is_enabled,
        isPaused: r.is_paused,
        requiresInput: r.is_user_input_required,
        backgroundColor: r.background_color,
        image: r.image?.url_1x || r.default_image?.url_1x || null,
      })),
    });
  } catch (e) {
    res.status(500).json({ error: "Ошибка" });
  }
});

app.get("/api/obs/status", async (req, res) => {
  const obsConfig = getObsConfig();
  const overlayStatus = getOverlayConnectionStatus();

  const result = {
    success: true,
    obsWebSocketAvailable: !!OBSWebSocket,
    obsConfigured: !!obsConfig,
    obsEnabled: obsConfig?.enabled || false,
    obsUrl: obsConfig?.url || null,
    browserSources: obsConfig?.browserSources || [],
    autoRefresh: obsConfig?.autoRefresh || false,
    refreshAttempts: obsRefreshAttempts,
    maxRefreshAttempts: OBS_MAX_REFRESH_ATTEMPTS,
    autoRefreshDone: obsAutoRefreshDone,
    overlays: {
      expected: overlayStatus.expected,
      connected: overlayStatus.connected,
      missing: overlayStatus.missing,
    },
  };

  res.json(result);
});

app.post("/api/obs/refresh", async (req, res) => {
  if (!OBSWebSocket) {
    return res.status(400).json({
      success: false,
      error:
        "obs-websocket-js не установлен. Выполните: npm install obs-websocket-js",
    });
  }

  const obsConfig = getObsConfig();
  if (!obsConfig) {
    return res.status(400).json({
      success: false,
      error:
        'OBS WebSocket не настроен. Добавьте секцию "obs" в config.json.',
    });
  }

  const success = await refreshObsBrowserSources();
  res.json({
    success,
    message: success
      ? "Browser Source обновлены. Ожидайте переподключения оверлеев."
      : "Не удалось обновить Browser Source. Проверьте логи.",
  });
});

app.post("/api/obs/test-connection", async (req, res) => {
  if (!OBSWebSocket) {
    return res.status(400).json({
      success: false,
      error: "obs-websocket-js не установлен",
    });
  }

  const obsConfig = getObsConfig();
  if (!obsConfig) {
    return res.status(400).json({
      success: false,
      error: 'Секция "obs" не найдена в config.json',
    });
  }

  const obs = new OBSWebSocket();
  try {
    await obs.connect(obsConfig.url, obsConfig.password || undefined);

    // Получаем список всех источников
    const { inputs } = await obs.call("GetInputList");
    const browserSources = inputs.filter(
      (i) =>
        i.inputKind === "browser_source" ||
        i.inputKind === "linuxbrowser-source",
    );

    await obs.disconnect();

    res.json({
      success: true,
      message: "Подключение к OBS WebSocket успешно!",
      obsVersion: "connected",
      browserSources: browserSources.map((s) => ({
        inputName: s.inputName,
        inputKind: s.inputKind,
      })),
    });
  } catch (error) {
    try {
      await obs.disconnect();
    } catch {}

    const msg = error.message || String(error);
    let hint = "";

    if (msg.includes("ECONNREFUSED")) {
      hint =
        "OBS/Streamlabs не запущен или WebSocket Server не включён. Откройте OBS -> Инструменты -> Настройки WebSocket-сервера.";
    } else if (msg.includes("authentication") || msg.includes("4009")) {
      hint = "Неверный пароль. Проверьте obs.password в config.json.";
    }

    res.status(500).json({
      success: false,
      error: msg,
      hint,
    });
  }
});

app.get("/api/eventsub/status", (req, res) => {
  res.json({
    connected: eventSubWs && eventSubWs.readyState === WebSocket.OPEN,
    sessionId: eventSubSessionId,
    subscriptions: eventSubSubscriptionIds.length,
    channelId,
  });
});
app.post("/api/eventsub/reconnect", (req, res) => {
  reconnectEventSub();
  res.json({ success: true, message: "EventSub переподключается..." });
});
app.get("/api/shoutout/status", (req, res) => {
  res.json({
    success: true,
    done: Array.from(shoutoutDone),
    queue: [...shoutoutQueue],
    cooldownUntil: shoutoutCooldownUntil,
    cooldownRemaining: Math.max(0, shoutoutCooldownUntil - Date.now()),
    processing: shoutoutProcessing,
  });
});
app.post("/api/shoutout/reset", (req, res) => {
  shoutoutDone.clear();
  console.log("[INFO] Список выполненных shoutout сброшен");
  res.json({ success: true });
});
app.post("/api/shoutout/trigger", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Укажите username" });
  if (
    !shoutoutQueue.some((name) => name.toLowerCase() === username.toLowerCase())
  ) {
    shoutoutQueue.push(username);
    console.log(`[INFO] Ручной shoutout для ${username} добавлен в очередь`);
    processShoutoutQueue();
  }
  res.json({
    success: true,
    message: `${username} добавлен в очередь shoutout`,
  });
});
app.get("/api/events", (req, res) => {
  res.json({ success: true, events: loadEvents() });
});
app.post("/api/events/:eventType/test", async (req, res) => {
  const eventType = req.params.eventType;
  const testData = {
    follow: { username: "TestUser", user: "TestUser", userId: "12345" },
    subscribe: {
      username: "TestUser",
      user: "TestUser",
      tier: "Tier 1",
      tierRaw: "1000",
      isGift: "false",
    },
    resubscribe: {
      username: "TestUser",
      user: "TestUser",
      tier: "Tier 1",
      tierRaw: "1000",
      months: "6",
      streakMonths: "3",
      message: "Привет! Уже 6 месяцев!",
    },
    giftSub: {
      username: "TestGifter",
      user: "TestGifter",
      tier: "Tier 1",
      tierRaw: "1000",
      total: "5",
      isAnonymous: "false",
    },
    raid: {
      username: "TestRaider",
      user: "TestRaider",
      viewers: "42",
      fromUserId: "12345",
    },
  };
  const data = testData[eventType] || {
    username: "TestUser",
    user: "TestUser",
  };
  await handleEvent(eventType, { ...data, ...(req.body || {}) });
  res.json({
    success: true,
    message: `Тестовое событие "${eventType}" выполнено`,
  });
});
app.get("/api/tokens/status", (req, res) => {
  res.json({
    success: true,
    valid: tokensValid,
    missing: tokensValid ? [] : tokenCheck.missing,
  });
});
app.get("/overlay/:overlayPath", (req, res) => {
  res.set({
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.sendFile(path.join(__dirname, "overlay.html"));
});
app.get("/overlay", (req, res) => {
  res.set({
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.sendFile(path.join(__dirname, "overlay.html"));
});

app.post("/api/shutdown", (req, res) => {
  res.json({ success: true });
  setTimeout(() => {
    if (botTokenRefreshTimer) clearTimeout(botTokenRefreshTimer);
    if (broadcasterTokenRefreshTimer)
      clearTimeout(broadcasterTokenRefreshTimer);
    if (overlayMonitorTimer) clearInterval(overlayMonitorTimer);
    if (obsRefreshTimer) clearTimeout(obsRefreshTimer);
    stopAllTimers();
    disconnectEventSub();
    logFileStream.end();
    process.exit(0);
  }, 500);
});

// ========== ЗАПУСК СЕРВЕРА ==========
app.listen(CONFIG.port, CONFIG.host, () => {
  console.log(`[START] Веб-сервер: http://${getLocalIP()}:${CONFIG.port}`);

  const config = loadFullConfig();
  if (config.overlays?.length > 0) {
    console.log("[START] Оверлеи:");
    config.overlays.forEach((o) =>
      console.log(
        `[START]   "${o.name}" -> http://${getLocalIP()}:${CONFIG.port}/overlay/${o.path}`,
      ),
    );
  } else {
    console.log(
      `[START] Оверлей: http://${getLocalIP()}:${CONFIG.port}/overlay`,
    );
  }

  if (tokensValid) {
    const autoList = loadAutoShoutout();
    if (autoList.length > 0) {
      console.log(`[START] Auto-shoutout для: ${autoList.join(", ")}`);
    }
  }

  completeStartupTask("server");
});
