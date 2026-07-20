// client/src/components/Common/MediaEditor.jsx

import { useRef, useState, useEffect, useCallback } from "react";
import { FaTrash, FaUpload, FaFolderOpen, FaPlay, FaStop, FaSearch, FaVolumeUp } from "react-icons/fa";
import Tooltip from "../Tooltip";
import { useNotification, NOTIFICATION_TYPES } from "../Notification";
import "./MediaEditor.css";

const FONT_FAMILIES = [
  { label: "Segoe UI", value: "'Segoe UI', sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Impact", value: "Impact, sans-serif" },
  { label: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
  { label: "Consolas", value: "Consolas, monospace" },
  { label: "Calibri", value: "Calibri, sans-serif" },
];

const TEXT_ANIMATIONS = [
  { value: "none", label: "— Без анимации —" },
  { value: "bounce", label: "🏀 Bounce" },
  { value: "pulse", label: "💓 Pulse" },
  { value: "rubberBand", label: "🎸 Rubber Band" },
  { value: "tada", label: "🎉 Tada" },
  { value: "wave", label: "🌊 Wave" },
  { value: "wiggle", label: "🐛 Wiggle" },
  { value: "wobble", label: "🍮 Wobble" },
];

const MEDIA_ENTER_ANIMATIONS = [
  { value: "none", label: "— Без анимации —" },
  { value: "fadeIn", label: "🎭 Fade In (плавное появление)" },
  { value: "fadeInLeft", label: "➡️ Сдвиг слева" },
  { value: "fadeInRight", label: "⬅️ Сдвиг справа" },
  { value: "fadeInTop", label: "⬇️ Сдвиг сверху" },
  { value: "fadeInBottom", label: "⬆️ Сдвиг снизу" },
  { value: "scaleIn", label: "🔍 Scale In (увеличение из центра)" },
];

const MEDIA_EXIT_ANIMATIONS = [
  { value: "none", label: "— Без анимации —" },
  { value: "fadeOut", label: "🎭 Fade Out (плавное исчезновение)" },
  { value: "fadeOutLeft", label: "⬅️ Уход налево" },
  { value: "fadeOutRight", label: "➡️ Уход направо" },
  { value: "fadeOutTop", label: "⬆️ Уход наверх" },
  { value: "fadeOutBottom", label: "⬇️ Уход вниз" },
  { value: "scaleOut", label: "🔍 Scale Out (уменьшение в центр)" },
];

function MediaEditor({
  value = {
    enabled: false,
    file: "",
    volume: 100,
    overlay: null,
    text: {
      enabled: false,
      content: "",
      position: "overlay",
      animation: "none",
      font: {},
    },
    animation: { enter: "none", exit: "none" },
  },
  onChange,
  overlays = [],
}) {
  const { showNotification, showConfirm } = useNotification();
  const fileInputRef = useRef(null);
  const previewVideoRef = useRef(null);
  const previewAudioRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(value.file || "");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [textEnabled, setTextEnabled] = useState(value.text?.enabled || false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [textAnimKey, setTextAnimKey] = useState(0);
  const [mediaAnimKey, setMediaAnimKey] = useState(0);
  const [fontSelectionMode, setFontSelectionMode] = useState("preset");
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewAnimation, setPreviewAnimation] = useState("idle");
  const [enterDuration, setEnterDuration] = useState(
    value.animation?.enterDuration || 0.5,
  );
  const [exitDuration, setExitDuration] = useState(
    value.animation?.exitDuration || 0.5,
  );
  const [textAnimationAmplitude, setTextAnimationAmplitude] = useState(
    value.text?.animationAmplitude || 1,
  );

  const loadMediaFiles = useCallback(async () => {
    try {
      const response = await fetch("http://127.0.0.1:3001/api/media-files");
      const data = await response.json();
      if (data.success) {
        setMediaFiles(data.files);
      } else {
        showNotification(
          "⚠️ Не удалось загрузить список медиафайлов",
          NOTIFICATION_TYPES.WARNING,
          3000,
        );
      }
    } catch (error) {
      console.error("Ошибка загрузки файлов:", error);
      showNotification(
        "❌ Ошибка подключения к серверу",
        NOTIFICATION_TYPES.ERROR,
        3000,
      );
    }
  }, [showNotification]);

  useEffect(() => {
    loadMediaFiles();
  }, [loadMediaFiles]);

  useEffect(() => {
    setSelectedFile(value.file || "");
    setTextEnabled(value.text?.enabled || false);
  }, [value]);

  useEffect(() => {
    if (!showFileBrowser) setFileSearchQuery("");
  }, [showFileBrowser]);

  useEffect(() => {
    setPreviewPlaying(false);
    setTextAnimKey(0);
    setMediaAnimKey(0);
    setErrorMessage("");
  }, [selectedFile]);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage("❌ Файл слишком большой (макс. 100MB)");
      showNotification(
        "❌ Файл слишком большой (макс. 100MB)",
        NOTIFICATION_TYPES.ERROR,
        3000,
      );
      return;
    }

    if (file.type.startsWith("video/")) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (
        ext === "hevc" ||
        ext === "h265" ||
        file.name.toLowerCase().includes("h265")
      ) {
        setErrorMessage(
          "⚠️ Видео в формате H.265 может не воспроизводиться в браузере. Рекомендуется использовать H.264 (MP4)",
        );
        showNotification(
          "⚠️ Видео в формате H.265 может не воспроизводиться в браузере",
          NOTIFICATION_TYPES.WARNING,
          5000,
        );
      } else {
        setErrorMessage("");
      }
    }

    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable)
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
      });
      const result = await new Promise((resolve, reject) => {
        xhr.onload = () =>
          xhr.status === 200
            ? resolve(JSON.parse(xhr.response))
            : reject(new Error("Ошибка"));
        xhr.onerror = () => reject(new Error("Ошибка сети"));
        xhr.open("POST", "http://127.0.0.1:3001/api/upload");
        xhr.send(formData);
      });
      if (result.success) {
        await loadMediaFiles();
        setSelectedFile(result.file.fileName);
        onChange({ ...value, file: result.file.fileName, enabled: true });
        setErrorMessage("");
        showNotification(
          `✅ Файл "${result.file.fileName}" загружен`,
          NOTIFICATION_TYPES.SUCCESS,
          2000,
        );
      } else {
        showNotification(
          "❌ Ошибка загрузки файла",
          NOTIFICATION_TYPES.ERROR,
          3000,
        );
      }
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      setErrorMessage("❌ Ошибка загрузки файла");
      showNotification(
        "❌ Ошибка загрузки файла",
        NOTIFICATION_TYPES.ERROR,
        3000,
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const selectExistingFile = async (file) => {
    setSelectedFile(file.name);
    onChange({ ...value, file: file.name, enabled: true });
    setShowFileBrowser(false);
    setFileSearchQuery("");
    showNotification(
      `📁 Выбран файл "${file.name}"`,
      NOTIFICATION_TYPES.INFO,
      1500,
    );

    try {
      const resp = await fetch(
        `http://127.0.0.1:3001/api/media-files/${file.name}/probe`,
      );
      const data = await resp.json();
      if (data.success && data.warnings.length > 0) {
        setErrorMessage(`⚠️ ${data.warnings.join("\n⚠️ ")}`);
        showNotification(
          `⚠️ ${data.warnings[0]}`,
          NOTIFICATION_TYPES.WARNING,
          5000,
        );
      } else {
        setErrorMessage("");
      }
    } catch (error) {
      console.error("Ошибка проверки файла:", error);
      showNotification(
        "❌ Ошибка проверки файла",
        NOTIFICATION_TYPES.ERROR,
        3000,
      );
    }
  };

  const deleteFile = (fileName, event) => {
    event.stopPropagation();
    showConfirm(`Удалить файл "${fileName}"?`, async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:3001/api/media-files/${fileName}`,
          { method: "DELETE" },
        );
        const data = await response.json();
        if (data.success) {
          await loadMediaFiles();
          if (selectedFile === fileName) {
            setSelectedFile("");
            onChange({ ...value, file: "", enabled: value.enabled });
          }
          showNotification(
            `🗑️ Файл "${fileName}" удалён`,
            NOTIFICATION_TYPES.SUCCESS,
            2000,
          );
        } else {
          showNotification(
            "❌ Ошибка удаления файла",
            NOTIFICATION_TYPES.ERROR,
            3000,
          );
        }
      } catch (error) {
        console.error("Ошибка удаления:", error);
        showNotification(
          "❌ Ошибка удаления файла",
          NOTIFICATION_TYPES.ERROR,
          3000,
        );
      }
    });
  };

  const updateMedia = (updates) => {
    onChange({ ...value, ...updates });
  };

  const toggleText = (enabled) => {
    setTextEnabled(enabled);
    updateMedia({ text: { ...value.text, enabled } });
    showNotification(
      enabled ? "📝 Текст включён" : "📝 Текст выключен",
      NOTIFICATION_TYPES.INFO,
      1000,
    );
  };

  const updateText = (updates) => {
    updateMedia({ text: { ...value.text, ...updates } });
  };

  const updateFont = (updates) => {
    updateMedia({
      text: {
        ...value.text,
        font: { ...(value.text?.font || {}), ...updates },
      },
    });
  };

  const getTextPositionStyle = (position) => {
    switch (position) {
      case "above":
        return { position: "relative", order: -1, marginBottom: "10px" };
      case "below":
        return { position: "relative", order: 1, marginTop: "10px" };
      case "left":
        return {
          position: "relative",
          order: -1,
          marginRight: "10px",
          alignSelf: "center",
        };
      case "right":
        return {
          position: "relative",
          order: 1,
          marginLeft: "10px",
          alignSelf: "center",
        };
      case "overlay":
      default:
        return {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 20,
        };
    }
  };

  const getContainerFlexStyle = (position) => {
    switch (position) {
      case "left":
        return {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        };
      case "right":
        return {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        };
      default:
        return {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        };
    }
  };

  const updateAnimation = (updates) => {
    updateMedia({
      animation: { ...(value.animation || {}), ...updates },
    });
  };

  const updateAnimationDuration = (type, duration) => {
    updateMedia({
      animation: { ...(value.animation || {}), [`${type}Duration`]: duration },
    });
    if (type === "enter") setEnterDuration(duration);
    else setExitDuration(duration);
  };

  const getFileIcon = (file) => {
    if (file.type === "video") return "🎬";
    if (file.type === "audio") return "🎵";
    if (file.type === "image") return "🖼️";
    return "📄";
  };

  const getFileMediaType = (fileName) => {
    if (!fileName) return "unknown";
    const ext = fileName.split(".").pop().toLowerCase();
    if (["mp4", "webm", "mov", "avi", "mkv", "flv", "m4v"].includes(ext))
      return "video";
    if (["mp3", "wav", "ogg", "m4a", "flac", "aac"].includes(ext))
      return "audio";
    if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext))
      return "image";
    return "unknown";
  };

  const togglePreview = () => {
    if (showPreview) {
      setShowPreview(false);
      setPreviewPlaying(false);
    } else {
      setShowPreview(true);
    }
  };

  const playPreview = () => {
    if (previewPlaying) return;
    if (previewAnimation === "exiting") return;

    setPreviewPlaying(true);
    setPreviewAnimation("entering");
    setTextAnimKey((prev) => prev + 1);
    setMediaAnimKey((prev) => prev + 1);

    const video = previewVideoRef.current;
    const img = document.querySelector(".preview-image");
    const audio = previewAudioRef.current;
    // Находим контейнер текста (он может быть не один)
    const textElements = document.querySelectorAll(".preview-text-overlay");
    const enterAnim = value.animation?.enter || "none";
    const enterDuration = value.animation?.enterDuration || 0.5;

    const startPlayback = () => {
      if (video) {
        video.currentTime = 0;
        video.volume = volumePercent / 100;
        video.play().catch(() => {
          showNotification(
            "⚠️ Не удалось воспроизвести видео",
            NOTIFICATION_TYPES.WARNING,
            2000,
          );
        });
      }
      if (audio) {
        audio.currentTime = 0;
        audio.volume = volumePercent / 100;
        audio.play().catch(() => {
          showNotification(
            "⚠️ Не удалось воспроизвести аудио",
            NOTIFICATION_TYPES.WARNING,
            2000,
          );
        });
      }
      setPreviewAnimation("playing");
    };

    const applyAnimation = (element, animation, duration, onComplete) => {
      if (!element) return onComplete?.();
      if (animation === "none") return onComplete?.();

      const animationClass = `media-enter-${animation}`;
      element.classList.add(animationClass);
      element.style.animationDuration = `${duration}s`;

      textElements.forEach((textEl) => {
        textEl.classList.add(animationClass);
        textEl.style.animationDuration = `${duration}s`;
      });

      const onAnimationEnd = () => {
        element.classList.remove(animationClass);
        textElements.forEach((textEl) => {
          textEl.classList.remove(animationClass);
        });
        element.removeEventListener("animationend", onAnimationEnd);
        onComplete?.();
      };
      element.addEventListener("animationend", onAnimationEnd);
    };

    if (enterAnim !== "none") {
      const target = video || img;
      applyAnimation(target, enterAnim, enterDuration, startPlayback);
    } else {
      startPlayback();
    }
  };

  const stopPreview = () => {
    if (!previewPlaying) return;
    if (previewAnimation === "exiting") return;

    setPreviewPlaying(false);

    const video = previewVideoRef.current;
    const img = document.querySelector(".preview-image");
    const audio = previewAudioRef.current;
    const textElements = document.querySelectorAll(".preview-text-overlay");
    const exitAnim = value.animation?.exit || "none";
    const exitDuration = value.animation?.exitDuration || 0.5;

    const finishStop = () => {
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setPreviewAnimation("idle");
    };

    const applyExitAnimation = (element, animation, duration, onComplete) => {
      if (!element) return onComplete?.();
      if (animation === "none") return onComplete?.();

      const animationClass = `media-exit-${animation}`;
      element.classList.add(animationClass);
      element.style.animationDuration = `${duration}s`;

      textElements.forEach((textEl) => {
        textEl.classList.add(animationClass);
        textEl.style.animationDuration = `${duration}s`;
      });

      const onAnimationEnd = () => {
        element.classList.remove(animationClass);
        textElements.forEach((textEl) => {
          textEl.classList.remove(animationClass);
        });
        element.removeEventListener("animationend", onAnimationEnd);
        onComplete?.();
      };
      element.addEventListener("animationend", onAnimationEnd);
    };

    if (exitAnim !== "none") {
      setPreviewAnimation("exiting");
      const target = video || img;
      applyExitAnimation(target, exitAnim, exitDuration, finishStop);
    } else {
      finishStop();
    }
  };

  const handleVideoEnded = () => {
    if (previewAnimation === "playing") {
      const exitAnim = value.animation?.exit || "none";
      if (exitAnim !== "none") {
        stopPreview();
      } else {
        setPreviewAnimation("idle");
      }
    }
  };

  const filteredFiles = mediaFiles.filter((file) =>
    file.name.toLowerCase().includes(fileSearchQuery.toLowerCase()),
  );

  const fileType = getFileMediaType(selectedFile);
  const font = value.text?.font || {};
  const textAnimation = value.text?.animation || "none";
  const volumePercent = value.volume || 100;

  const renderAnimatedTextPreview = (text, animation, animKey, amplitude) => {
    if (!text) return "[текст]";
    if (!animation || animation === "none") return text;
    const animClass = `preview-char-${animation}`;
    const style = amplitude !== 1 ? { "--amplitude": amplitude } : {};

    return text.split("").map((char, i) => (
      <span
        key={`${animKey}-${i}`}
        className={`preview-char ${animClass}`}
        style={{
          animationDelay: `${i * 0.05}s`,
          ...style,
        }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  };

  const textOverlayStyle = {
    fontFamily: font.fontFamily || "'Segoe UI', sans-serif",
    fontSize: `${Math.min(font.fontSize || 32, 32)}px`,
    fontWeight: font.fontWeight || "700",
    fontStyle: font.fontStyle || "normal",
    color: font.color || "#ffffff",
    textShadow: "0px 0px 1px #000, 0px 0px 2px #000, 0px 0px 3px #000",
  };

  const renderTextOverlay = (position) => {
    if (!textEnabled) return null;

    const textStyle = getTextPositionStyle(position);
    const content =
      previewAnimation === "playing" || previewAnimation === "entering"
        ? renderAnimatedTextPreview(
            value.text.content,
            textAnimation,
            textAnimKey,
            textAnimationAmplitude,
          )
        : value.text.content || "[текст]";

    return (
      <div
        key={`text-wrapper-${textAnimKey}`}
        className="preview-text-overlay"
        style={{ ...textOverlayStyle, ...textStyle }}
      >
        {content}
      </div>
    );
  };

  const renderPreviewControls = () => (
    <div className="preview-controls">
      {previewAnimation === "idle" || previewAnimation === "exiting" ? (
        <button
          onClick={playPreview}
          className="preview-play-btn"
          disabled={previewAnimation === "exiting"}
        >
          <FaPlay /> Воспроизвести
        </button>
      ) : (
        <button
          onClick={stopPreview}
          className="preview-stop-btn"
          disabled={previewAnimation === "exiting"}
        >
          <FaStop /> Остановить
        </button>
      )}
    </div>
  );

  return (
    <div className="media-editor">
      {errorMessage && <div className="error-message">{errorMessage}</div>}

      {/* File Selector */}
      <div className="media-file-selector">
        <label>
          🎬 Медиа файл
          <Tooltip text="Выберите видео, аудио или изображение. Поддерживаются: MP4, WebM, MP3, WAV, OGG, JPG, PNG, GIF, WebP." />
        </label>
        <div className="file-input-group">
          <input
            type="text"
            value={selectedFile || "Файл не выбран"}
            readOnly
            placeholder="Файл не выбран"
            className="file-name-display"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="video/*,audio/*,image/*"
            style={{ display: "none" }}
          />
          <div className="file-button-group">
            <button
              onClick={() => fileInputRef.current.click()}
              className="browse-btn"
              disabled={uploading}
            >
              <FaUpload /> {uploading ? `${uploadProgress}%` : "Загрузить"}
            </button>
            <button
              onClick={() => setShowFileBrowser(!showFileBrowser)}
              className="browse-btn browse-existing"
            >
              <FaFolderOpen /> Из папки
            </button>
          </div>
        </div>

        {showFileBrowser && (
          <div className="file-browser">
            <div className="file-browser-header">
              <h4>📁 Медиа-файлы</h4>
              <div className="file-search">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Поиск файлов..."
                  value={fileSearchQuery}
                  onChange={(e) => setFileSearchQuery(e.target.value)}
                  className="file-search-input"
                />
                {fileSearchQuery && (
                  <button
                    className="search-clear-btn"
                    onClick={() => setFileSearchQuery("")}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {filteredFiles.length === 0 ? (
              <p className="empty-files">
                {mediaFiles.length === 0
                  ? "Нет файлов"
                  : `Нет файлов, содержащих "${fileSearchQuery}"`}
              </p>
            ) : (
              <div className="files-grid">
                {filteredFiles.map((file) => (
                  <div
                    key={file.name}
                    className={`file-item ${selectedFile === file.name ? "selected" : ""}`}
                    onClick={() => selectExistingFile(file)}
                  >
                    <span className="file-icon">{getFileIcon(file)}</span>
                    <span className="file-name" title={file.name}>
                      {file.name}
                    </span>
                    <span className="file-size">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button
                      className="delete-file-btn"
                      onClick={(e) => deleteFile(file.name, e)}
                      title="Удалить"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="progress-text">{uploadProgress}%</span>
          </div>
        )}
      </div>

      {/* Overlay Selector */}
      <div className="overlay-selector">
        <label>
          🖥️ Целевой оверлей
          <Tooltip text="Выберите конкретный оверлей для отображения медиа. Если не выбрано — отправится на все подключённые оверлеи." />
        </label>
        <select
          value={value.overlay?.id || value.overlay || ""}
          onChange={(e) => {
            const sel = overlays.find((o) => o.id === e.target.value);
            updateMedia({
              overlay: sel ? { id: sel.id, path: sel.path } : null,
            });
            showNotification(
              sel ? `🖥️ Выбран оверлей: ${sel.name}` : "📡 Выбраны все оверлеи",
              NOTIFICATION_TYPES.INFO,
              1500,
            );
          }}
          className="overlay-select"
        >
          <option value="">📡 Все оверлеи</option>
          {overlays.map((o) => (
            <option key={o.id} value={o.id}>
              🖥️ {o.name} (/overlay/{o.path})
            </option>
          ))}
        </select>
      </div>

      {/* Volume Control */}
      <div className="media-settings">
        <label>
          🔊 Громкость
          <Tooltip text="Громкость воспроизведения для видео и аудио (0-100%)" />
        </label>
        <div className="volume-control">
          <input
            type="range"
            min="0"
            max="100"
            value={volumePercent}
            onChange={(e) => updateMedia({ volume: parseInt(e.target.value) })}
          />
          <span className="volume-value">{volumePercent}%</span>
          <FaVolumeUp className="volume-icon" />
        </div>
      </div>

      {/* Queue Mode */}
      <div className="media-settings">
        <label>
          🎬 Режим воспроизведения
          <Tooltip text="«В очереди» — ждёт окончания других медиа. «Вне очереди» — играет сразу поверх всего." />
        </label>
        <div className="position-buttons">
          <button
            type="button"
            className={`position-btn ${(value.queueMode || "queue") === "queue" ? "active" : ""}`}
            onClick={() => updateMedia({ queueMode: "queue" })}
          >
            📋 В очереди
          </button>
          <button
            type="button"
            className={`position-btn ${value.queueMode === "immediate" ? "active" : ""}`}
            onClick={() => updateMedia({ queueMode: "immediate" })}
          >
            ⚡ Вне очереди
          </button>
        </div>
      </div>

      {/* Media Animations */}
      {(fileType === "video" || fileType === "image") && (
        <div className="media-animation-section">
          <h4>🎭 Анимации медиа</h4>
          <div className="animation-row">
            <div className="animation-select-group">
              <label>Появление</label>
              <select
                value={value.animation?.enter || "none"}
                onChange={(e) => updateAnimation({ enter: e.target.value })}
                className="animation-select"
              >
                {MEDIA_ENTER_ANIMATIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="animation-select-group">
              <label>Скрытие</label>
              <select
                value={value.animation?.exit || "none"}
                onChange={(e) => updateAnimation({ exit: e.target.value })}
                className="animation-select"
              >
                {MEDIA_EXIT_ANIMATIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="animation-row duration-row">
            <div className="animation-speed-group">
              <label>Длительность появления: {enterDuration.toFixed(1)}с</label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={enterDuration}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setEnterDuration(val);
                  updateAnimationDuration("enter", val);
                }}
                className="speed-slider"
                disabled={value.animation?.enter === "none"}
              />
            </div>
            <div className="animation-speed-group">
              <label>Длительность скрытия: {exitDuration.toFixed(1)}с</label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={exitDuration}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setExitDuration(val);
                  updateAnimationDuration("exit", val);
                }}
                className="speed-slider"
                disabled={value.animation?.exit === "none"}
              />
            </div>
          </div>
        </div>
      )}

      {/* Text Section */}
      <div className="media-text-section">
        <div className="section-header">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={textEnabled}
              onChange={(e) => toggleText(e.target.checked)}
              className="toggle-checkbox"
            />
            <span className="toggle-text">📝 Показывать текст на оверлее</span>
            <Tooltip text="Добавить текст поверх медиа или рядом с ним. Можно использовать переменную {user}." />
          </label>
        </div>

        {textEnabled && (
          <div className="text-settings">
            <div className="text-vars-block">
              <div className="text-vars-label">
                <span>📌 Доступные переменные:</span>
              </div>
              <div className="text-vars-badges">
                <code className="text-var-badge">{"{user}"}</code>
                <span className="text-var-note">— имя пользователя</span>
              </div>
            </div>

            <div className="text-input-group">
              <label>Текст</label>
              <textarea
                value={value.text?.content || ""}
                onChange={(e) => updateText({ content: e.target.value })}
                placeholder="Текст для отображения... Используйте {user} для имени пользователя"
                rows="3"
                className="text-content-input"
              />
            </div>

            <div className="position-selector">
              <label>Позиция текста</label>
              <div className="position-buttons">
                {["above", "below", "left", "right", "overlay"].map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    className={`position-btn ${value.text?.position === pos ? "active" : ""}`}
                    onClick={() => updateText({ position: pos })}
                  >
                    {pos === "above" && "⬆️ Сверху"}
                    {pos === "below" && "⬇️ Снизу"}
                    {pos === "left" && "⬅️ Слева"}
                    {pos === "right" && "➡️ Справа"}
                    {pos === "overlay" && "🎯 Поверх"}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-animation-selector">
              <label>🎭 Анимация текста</label>
              <div className="animation-select-row">
                <select
                  value={textAnimation}
                  onChange={(e) => updateText({ animation: e.target.value })}
                  className="animation-select"
                >
                  {TEXT_ANIMATIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                {textAnimation !== "none" && (
                  <div className="amplitude-control">
                    <label>Сила анимации</label>
                    <input
                      type="range"
                      min="0.3"
                      max="2"
                      step="0.1"
                      value={textAnimationAmplitude}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTextAnimationAmplitude(val);
                        updateText({ animationAmplitude: val });
                      }}
                      className="amplitude-slider"
                    />
                    <span className="amplitude-value">
                      {textAnimationAmplitude.toFixed(1)}x
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="font-settings">
              <h4>🔤 Настройки шрифта</h4>
              <div className="font-settings-grid">
                <div className="font-setting-item">
                  <label>Режим выбора шрифта</label>
                  <div className="font-mode-buttons">
                    <button
                      type="button"
                      className={`font-mode-btn ${fontSelectionMode === "preset" ? "active" : ""}`}
                      onClick={() => {
                        setFontSelectionMode("preset");
                        updateFont({ fontFamily: "'Segoe UI', sans-serif" });
                      }}
                    >
                      📋 Из списка
                    </button>
                    <button
                      type="button"
                      className={`font-mode-btn ${fontSelectionMode === "custom" ? "active" : ""}`}
                      onClick={() => setFontSelectionMode("custom")}
                    >
                      ✏️ Свой шрифт
                    </button>
                  </div>
                </div>

                {fontSelectionMode === "preset" ? (
                  <div className="font-setting-item">
                    <label>Семейство</label>
                    <select
                      value={font.fontFamily || "'Segoe UI', sans-serif"}
                      onChange={(e) =>
                        updateFont({ fontFamily: e.target.value })
                      }
                      className="font-select"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="font-setting-item">
                    <label>Название шрифта</label>
                    <input
                      type="text"
                      value={
                        font.fontFamily
                          ?.replace(/'/g, "")
                          .replace(", sans-serif", "") || ""
                      }
                      onChange={(e) =>
                        updateFont({
                          fontFamily: `'${e.target.value}', sans-serif`,
                        })
                      }
                      placeholder="например: Roboto, Montserrat"
                      className="custom-font-input"
                    />
                  </div>
                )}

                <div className="font-setting-item">
                  <label>Размер: {font.fontSize || 32}px</label>
                  <input
                    type="range"
                    min="12"
                    max="120"
                    value={font.fontSize || 32}
                    onChange={(e) =>
                      updateFont({ fontSize: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div className="font-setting-item">
                  <label>Цвет текста</label>
                  <div className="color-input-group">
                    <input
                      type="color"
                      value={font.color || "#ffffff"}
                      onChange={(e) => updateFont({ color: e.target.value })}
                      className="color-picker"
                    />
                    <input
                      type="text"
                      value={font.color || "#ffffff"}
                      onChange={(e) => updateFont({ color: e.target.value })}
                      className="color-text-input"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {selectedFile && (
        <div className="media-preview-section">
          <div className="preview-header">
            <h4>👁️ Предпросмотр</h4>
            <button
              onClick={togglePreview}
              className={`preview-toggle-btn ${showPreview ? "active" : ""}`}
            >
              {showPreview ? "Скрыть" : "Показать"}
            </button>
          </div>
          {showPreview && (
            <div className="preview-container">
              {fileType === "video" && (
                <div
                  className="preview-video-wrap"
                  style={{
                    position: "relative",
                    ...getContainerFlexStyle(value.text?.position || "overlay"),
                  }}
                >
                  <video
                    ref={previewVideoRef}
                    src={`http://127.0.0.1:3001/media/${selectedFile}`}
                    className="preview-video"
                    onEnded={handleVideoEnded}
                    playsInline
                    style={{
                      maxWidth: "100%",
                      maxHeight: "300px",
                      borderRadius: "8px",
                    }}
                  />
                  {renderTextOverlay(value.text?.position || "overlay")}
                  {renderPreviewControls()}
                </div>
              )}
              {fileType === "image" && (
                <div
                  className="preview-image-wrap"
                  style={{
                    position: "relative",
                    ...getContainerFlexStyle(value.text?.position || "overlay"),
                  }}
                >
                  <img
                    key={`image-${mediaAnimKey}`}
                    src={`http://127.0.0.1:3001/media/${selectedFile}`}
                    alt="preview"
                    className="preview-image"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "300px",
                      borderRadius: "8px",
                    }}
                  />
                  {renderTextOverlay(value.text?.position || "overlay")}
                  {renderPreviewControls()}
                </div>
              )}
              {fileType === "audio" && (
                <div
                  className="preview-audio-wrap"
                  style={{
                    position: "relative",
                    ...getContainerFlexStyle(value.text?.position || "overlay"),
                  }}
                >
                  <audio
                    ref={previewAudioRef}
                    src={`http://127.0.0.1:3001/media/${selectedFile}`}
                    style={{ width: "100%" }}
                    onEnded={handleVideoEnded}
                  />
                  {renderTextOverlay(value.text?.position || "overlay")}
                  {renderPreviewControls()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MediaEditor;