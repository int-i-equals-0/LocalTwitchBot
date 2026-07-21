// client/src/components/Shoutouts/ShoutoutsTab.jsx

import { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaTrash, FaSync, FaBullhorn, FaTimes } from 'react-icons/fa';
import Tooltip from '../Tooltip';
import { useNotification, NOTIFICATION_TYPES } from '../Notification';
import './ShoutoutsTab.css';

const RAID_SHOUTOUT_MODES = [
  {
    value: 'none',
    label: 'Никто',
    description: 'Рейды не добавляют пользователей в очередь shoutout.',
  },
  {
    value: 'listed',
    label: 'Только из списка auto-shoutout',
    description: 'Рейдер получит shoutout только если он есть в списке ниже.',
  },
  {
    value: 'unlisted',
    label: 'Только кроме списка auto-shoutout',
    description: 'Рейдер получит shoutout только если его нет в списке ниже.',
  },
  {
    value: 'all',
    label: 'Все рейдеры',
    description: 'Любой рейдер попадёт в очередь shoutout.',
  },
];

const SOURCE_LABELS = {
  message: 'сообщение',
  raid: 'рейд',
  manual: 'ручной',
};

function ShoutoutsTab({
  autoshoutout,
  onUpdate,
  shoutoutSettings = { raidMode: 'none' },
  onSettingsUpdate,
}) {
  const { showNotification, showConfirm } = useNotification();
  const [newUser, setNewUser] = useState('');
  const [shoutoutStatus, setShoutoutStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [removingQueueItemId, setRemovingQueueItemId] = useState(null);

  const raidMode = shoutoutSettings?.raidMode || 'none';
  const selectedRaidMode = RAID_SHOUTOUT_MODES.find((mode) => mode.value === raidMode)
    || RAID_SHOUTOUT_MODES[0];

  const loadShoutoutStatus = useCallback(async () => {
    try {
      const resp = await fetch('http://127.0.0.1:3001/api/shoutout/status');
      const data = await resp.json();
      if (data.success) setShoutoutStatus(data);
    } catch {
      showNotification('❌ Не удалось загрузить статус шаутов', NOTIFICATION_TYPES.ERROR, 3000);
    }
  }, [showNotification]);

  useEffect(() => {
    loadShoutoutStatus();
    const interval = setInterval(loadShoutoutStatus, 5000);
    return () => clearInterval(interval);
  }, [loadShoutoutStatus]);

  const addShoutoutUser = () => {
    const name = newUser.trim().toLowerCase();
    if (!name) {
      showNotification('⚠️ Введите имя пользователя', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }
    if (autoshoutout.some(u => u.toLowerCase() === name)) {
      showNotification('⚠️ Пользователь уже в списке', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }
    onUpdate([...autoshoutout, name]);
    setNewUser('');
    showNotification(`✅ ${name} добавлен в авто-шаут`, NOTIFICATION_TYPES.SUCCESS, 2000);
  };

  const updateRaidMode = (nextMode) => {
    onSettingsUpdate?.({
      ...(shoutoutSettings || {}),
      raidMode: nextMode,
    });
    const mode = RAID_SHOUTOUT_MODES.find((item) => item.value === nextMode);
    showNotification(
      `✅ Режим shoutout для рейдов: ${mode?.label || nextMode}`,
      NOTIFICATION_TYPES.SUCCESS,
      2000
    );
  };

  const removeShoutoutUser = (username) => {
    showConfirm(`Удалить ${username} из списка авто-шаутов?`, () => {
      onUpdate(autoshoutout.filter(u => u.toLowerCase() !== username.toLowerCase()));
      showNotification(`🗑️ ${username} удалён из авто-шаута`, NOTIFICATION_TYPES.WARNING, 2000);
    });
  };

  const resetShoutouts = async () => {
    try {
      await fetch('http://127.0.0.1:3001/api/shoutout/reset', { method: 'POST' });
      showNotification('🔄 Список выполненных шаутов сброшен', NOTIFICATION_TYPES.SUCCESS, 2000);
      loadShoutoutStatus();
    } catch { 
      showNotification('❌ Ошибка сброса', NOTIFICATION_TYPES.ERROR, 3000); 
    }
  };

  const triggerShoutout = async (username) => {
    setLoading(true);
    try {
      await fetch('http://127.0.0.1:3001/api/shoutout/trigger', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username })
      });
      showNotification(`📢 Шаут для ${username} добавлен в очередь`, NOTIFICATION_TYPES.SUCCESS, 2000);
      loadShoutoutStatus();
    } catch { 
      showNotification('❌ Ошибка', NOTIFICATION_TYPES.ERROR, 3000); 
    } finally {
      setLoading(false);
    }
  };

  const removeQueueItem = async (item) => {
    const itemId = item.id ?? item.index;
    if (itemId === undefined || itemId === null) return;

    const itemKey = String(itemId);
    setRemovingQueueItemId(itemKey);

    try {
      const resp = await fetch(`http://127.0.0.1:3001/api/shoutout/queue/${encodeURIComponent(itemKey)}`, {
        method: 'DELETE'
      });
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Не удалось удалить запись из очереди');
      }

      showNotification(
        `🗑️ ${data.removed?.username || item.username} удалён из очереди shoutout`,
        NOTIFICATION_TYPES.SUCCESS,
        2000
      );
      loadShoutoutStatus();
    } catch (error) {
      showNotification(
        `❌ ${error.message || 'Ошибка удаления из очереди'}`,
        NOTIFICATION_TYPES.ERROR,
        3000
      );
    } finally {
      setRemovingQueueItemId(null);
    }
  };

  const formatCooldown = (ms) => {
    if (ms <= 0) return 'Готов';
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes} мин ${remainingSeconds} сек`;
    }
    return `${seconds} сек`;
  };

  const hasUserInQueue = (username) => {
    const normalized = username.toLowerCase();
    if (shoutoutStatus?.queueDetails) {
      return shoutoutStatus.queueDetails.some(
        (item) => item.username?.toLowerCase() === normalized
      );
    }
    return shoutoutStatus?.queue?.some(q => q.toLowerCase() === normalized);
  };

  const hasUserDone = (username) => {
    const normalized = username.toLowerCase();
    if (shoutoutStatus?.doneDetails) {
      return shoutoutStatus.doneDetails.some(
        (item) => item.username?.toLowerCase() === normalized
      );
    }
    return shoutoutStatus?.done?.includes(normalized);
  };

  const formatSources = (sources = []) => {
    return sources.map((source) => SOURCE_LABELS[source] || source).join(', ');
  };

  return (
    <div className="shoutouts-tab">
      <div className="shoutouts-header">
        <h2>📢 Автоматический Shoutout</h2>
        <p className="shoutouts-description">
          Бот автоматически делает /shoutout пользователям из списка при их первом сообщении за сессию.
          Кулдаун между шаутами — 2 минуты.
        </p>
        <Tooltip text="Shoutout работает только если бот имеет права модератора и стример авторизован с нужными scope" />
      </div>

      <div className="shoutouts-content">
        <div className="shoutout-list-section">
          <h3>🚀 Shoutout для рейдов</h3>
          <div className="raid-mode-control">
            <label htmlFor="raid-shoutout-mode">
              Какие рейдеры должны получить shoutout?
            </label>
            <select
              id="raid-shoutout-mode"
              value={raidMode}
              onChange={(e) => updateRaidMode(e.target.value)}
              className="raid-mode-select"
            >
              {RAID_SHOUTOUT_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </div>
          <p className="raid-mode-description">{selectedRaidMode.description}</p>
        </div>

        <div className="shoutout-list-section">
          <h3>👥 Список для авто-шаута</h3>
          
          <div className="shoutout-users-list">
            {autoshoutout.length === 0 ? (
              <div className="empty-shoutout-list">
                <p>📭 Список пуст</p>
                <p className="hint">Добавьте пользователей для автоматического шаута</p>
              </div>
            ) : (
              autoshoutout.map(user => (
                <div key={user} className="shoutout-user-card">
                  <div className="shoutout-user-info">
                    <span className="shoutout-username">{user}</span>
                    {hasUserDone(user) && (
                      <span className="shoutout-done-badge">✅ Выполнено</span>
                    )}
                    {hasUserInQueue(user) && (
                      <span className="shoutout-queue-badge">⏳ В очереди</span>
                    )}
                  </div>
                  <div className="shoutout-user-actions">
                    <button 
                      className="shoutout-trigger-btn" 
                      onClick={() => triggerShoutout(user)} 
                      title="Шаут вручную"
                      disabled={loading}
                    >
                      <FaBullhorn /> Шаутнуть
                    </button>
                    <button 
                      className="shoutout-remove-btn" 
                      onClick={() => removeShoutoutUser(user)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="add-shoutout-form">
            <input 
              type="text" 
              value={newUser} 
              onChange={(e) => setNewUser(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addShoutoutUser()} 
              placeholder="Никнейм пользователя (например: twitchuser)" 
              className="shoutout-input" 
            />
            <button onClick={addShoutoutUser} className="add-shoutout-btn">
              <FaPlus /> Добавить
            </button>
          </div>
        </div>

        {shoutoutStatus && (
          <div className="shoutout-status-section">
            <div className="shoutout-status-header">
              <h3>📊 Статус шаутов</h3>
              <button onClick={resetShoutouts} className="reset-shoutout-btn">
                <FaSync /> Сбросить выполненные
              </button>
            </div>
            
            <div className="shoutout-status-grid">
              <div className="status-card">
                <div className="status-icon">✅</div>
                <div className="status-info">
                  <div className="status-label">Выполнено</div>
                  <div className="status-value">{shoutoutStatus.done?.length || 0}</div>
                </div>
              </div>
              
              <div className="status-card">
                <div className="status-icon">⏳</div>
                <div className="status-info">
                  <div className="status-label">В очереди</div>
                  <div className="status-value">{shoutoutStatus.queue?.length || 0}</div>
                </div>
              </div>
              
              <div className="status-card">
                <div className="status-icon">⏱️</div>
                <div className="status-info">
                  <div className="status-label">Кулдаун</div>
                  <div className="status-value">
                    {formatCooldown(shoutoutStatus.cooldownRemaining)}
                  </div>
                </div>
              </div>
            </div>

            {shoutoutStatus.queue?.length > 0 && (
              <div className="queue-list">
                <strong>Очередь:</strong>
                <div className="queue-items">
                  {(shoutoutStatus.queueDetails || shoutoutStatus.queue.map((username, index) => ({ username, index }))).map((item, idx) => {
                    const itemKey = String(item.id ?? item.index ?? idx);

                    return (
                      <span key={itemKey} className="queue-item">
                        <span className="queue-item-text">
                          {item.username}
                          {item.source && (
                            <span className="shoutout-source"> {SOURCE_LABELS[item.source] || item.source}</span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="queue-remove-btn"
                          onClick={() => removeQueueItem(item)}
                          disabled={removingQueueItemId === itemKey}
                          title="Удалить из очереди"
                        >
                          <FaTimes />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {shoutoutStatus.done?.length > 0 && (
              <div className="done-list">
                <strong>Авто-shoutout за сессию:</strong>
                <div className="done-items">
                  {(shoutoutStatus.doneDetails || shoutoutStatus.done.map((username) => ({ username }))).map((item, idx) => (
                    <span key={idx} className="done-item">
                      {item.username}
                      {item.sources?.length > 0 && (
                        <span className="shoutout-source"> {formatSources(item.sources)}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="shoutout-info">
          <h4>📖 Как это работает</h4>
          <ul>
            <li>При первом сообщении пользователя из списка за сессию бот делает /shoutout</li>
            <li>Рейдеры обрабатываются по выбранному выше режиму</li>
            <li>Shoutout за сообщение не мешает более позднему shoutout за рейд, но рейд блокирует последующий авто-шаут за сообщение</li>
            <li>Кулдаун между шаутами — 2 минуты (чтобы не спамить)</li>
            <li>Twitch ограничивает повторный shoutout одному пользователю; лишние записи можно удалить из очереди</li>
            <li>Если несколько пользователей пишут одновременно — они попадают в очередь</li>
            <li>Список выполненных сбрасывается при перезапуске сервера или кнопкой "Сбросить"</li>
            <li>Для работы шаута бот должен иметь права <code>moderator:manage:shoutouts</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ShoutoutsTab;
