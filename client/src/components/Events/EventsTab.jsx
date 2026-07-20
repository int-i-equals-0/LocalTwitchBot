// client/src/components/Events/EventsTab.jsx
import { useState, useRef, useEffect } from 'react';
import { FaPowerOff, FaPlus, FaTrash, FaPlay } from 'react-icons/fa';
import ResponseEditor from '../Common/ResponseEditor';
import Tooltip from '../Tooltip';
import { useNotification, NOTIFICATION_TYPES } from '../Notification/Notification';
import './EventsTab.css';

const EVENT_TYPES = {
  follow: { 
    label: '💚 Новый фолловер', 
    description: 'Срабатывает когда кто-то подписывается на канал (follow)', 
    vars: ['user'] 
  },
  subscribe: { 
    label: '⭐ Новая подписка', 
    description: 'Срабатывает при новой платной подписке на канал', 
    vars: ['user', 'tier', 'isGift'] 
  },
  resubscribe: { 
    label: '🔄 Переподписка', 
    description: 'Срабатывает при продлении подписки с сообщением', 
    vars: ['user', 'tier', 'months', 'streakMonths', 'message'] 
  },
  giftSub: { 
    label: '🎁 Подарочная подписка', 
    description: 'Срабатывает когда кто-то дарит подписки', 
    vars: ['user', 'tier', 'total', 'isAnonymous'] 
  },
  raid: { 
    label: '🏴‍☠️ Рейд', 
    description: 'Срабатывает при входящем рейде на канал', 
    vars: ['user', 'viewers'] 
  }
};

function EventsTab({ events, onEventsUpdate, autoshoutout, onAutoshoutoutUpdate, overlays = [] }) {
  const { showNotification } = useNotification();
  const [expandedEvents, setExpandedEvents] = useState({});
  const [newShoutoutUser, setNewShoutoutUser] = useState('');
  const [shoutoutStatus, setShoutoutStatus] = useState(null);

  const loadShoutoutStatus = async () => {
    try {
      const resp = await fetch('http://127.0.0.1:3001/api/shoutout/status');
      const data = await resp.json();
      if (data.success) setShoutoutStatus(data);
    } catch (e) {}
  };

  useEffect(() => {
    loadShoutoutStatus();
    const interval = setInterval(loadShoutoutStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (eventType) => {
    setExpandedEvents(prev => ({ ...prev, [eventType]: !prev[eventType] }));
  };

  const updateEvent = (eventType, config) => {
    onEventsUpdate({ ...events, [eventType]: config });
  };

  const toggleEventEnabled = (eventType) => {
    const current = events[eventType] || {};
    updateEvent(eventType, { ...current, enabled: !current.enabled });
  };

  const testEvent = async (eventType) => {
    try {
      const resp = await fetch(`http://127.0.0.1:3001/api/events/${eventType}/test`, { method: 'POST' });
      const data = await resp.json();
      if (data.success) {
        showNotification(`✅ Тестовое событие "${EVENT_TYPES[eventType].label}" отправлено`, NOTIFICATION_TYPES.SUCCESS, 2000);
      }
    } catch (e) { 
      showNotification('❌ Ошибка отправки тестового события', NOTIFICATION_TYPES.ERROR, 3000); 
    }
  };

  const getResponseBadge = (config) => {
    if (!config.response) return '💤 Не настроено';
    
    const hasChat = config.response.chat?.enabled;
    const hasMedia = config.response.media?.enabled;

    const parts = [];
    if (hasChat) parts.push('💬');
    if (hasMedia) parts.push('🎬');
    
    return parts.length > 0 ? parts.join(' ') : '💤 Нет реакции';
  };

  const getOverlayInfo = (config, overlays) => {
    if (!config.response?.media?.enabled || !config.response?.media?.overlay) return null;
    const overlay = config.response.media.overlay;
    return overlays.find(o => o.id === (overlay.id || overlay));
  };

  // ===== AUTO SHOUTOUT =====
  const addShoutoutUser = () => {
    const name = newShoutoutUser.trim().toLowerCase();
    if (!name) return;
    if (autoshoutout.some(u => u.toLowerCase() === name)) {
      showNotification('⚠️ Пользователь уже в списке', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }
    onAutoshoutoutUpdate([...autoshoutout, name]);
    setNewShoutoutUser('');
    showNotification(`✅ ${name} добавлен в авто-шаут`, NOTIFICATION_TYPES.SUCCESS, 2000);
  };

  const removeShoutoutUser = (username) => {
    onAutoshoutoutUpdate(autoshoutout.filter(u => u.toLowerCase() !== username.toLowerCase()));
    showNotification(`🗑️ ${username} удалён из авто-шаута`, NOTIFICATION_TYPES.WARNING, 2000);
  };

  const resetShoutouts = async () => {
    try {
      await fetch('http://127.0.0.1:3001/api/shoutout/reset', { method: 'POST' });
      showNotification('🔄 Список выполненных шаутов сброшен', NOTIFICATION_TYPES.SUCCESS, 2000);
      loadShoutoutStatus();
    } catch (e) { 
      showNotification('❌ Ошибка сброса', NOTIFICATION_TYPES.ERROR, 3000); 
    }
  };

  const triggerShoutout = async (username) => {
    try {
      await fetch('http://127.0.0.1:3001/api/shoutout/trigger', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ username })
      });
      showNotification(`📢 Шаут для ${username} добавлен в очередь`, NOTIFICATION_TYPES.SUCCESS, 2000);
      loadShoutoutStatus();
    } catch (e) { 
      showNotification('❌ Ошибка', NOTIFICATION_TYPES.ERROR, 3000); 
    }
  };

  const getReactionType = (config) => {
    if (!config.response) return { icon: '💤', text: 'Нет реакции' };
    
    const hasChat = config.response.chat?.enabled;
    const hasMedia = config.response.media?.enabled;

    if (!hasChat && !hasMedia) return { icon: '💤', text: 'Нет реакции' };
    if (hasChat && !hasMedia) return { icon: '💬', text: 'Тип: Текст' };
    if (!hasChat && hasMedia) return { icon: '🎬', text: 'Тип: Медиа' };
    if (hasChat && hasMedia) return { icon: '💬🎬', text: 'Тип: Текст + Медиа' };
  };

  return (
    <div className="events-tab">
      <h2>🎉 События</h2>
      <p className="events-description">
        Настройте реакции бота на события Twitch. Используйте переменные вроде {'{user}'}, {'{tier}'}, {'{viewers}'} в текстах.
      </p>

      <div className="events-list">
        {Object.entries(EVENT_TYPES).map(([eventType, meta]) => {
          const config = events[eventType] || { 
            enabled: false, 
            response: {
              chat: { enabled: false, components: [] },
              media: { enabled: false, file: '', volume: 100, overlay: null, text: { enabled: false, content: '', position: 'overlay' } }
            }
          };
          const isExpanded = expandedEvents[eventType];
          const isEnabled = config.enabled === true;
          const overlayInfo = getOverlayInfo(config, overlays);
          const reactionType = getReactionType(config);

          return (
            <div key={eventType} className={`event-card ${!isEnabled ? 'disabled' : ''}`}>
            <div className="event-card-header" onClick={() => toggleExpand(eventType)}>
              <div className="event-title">
                <span className="event-name">{meta.label}</span>
                <span className="event-type-badge" title={reactionType.text}>
                  {reactionType.icon} {reactionType.text}
                </span>
                {overlayInfo && (
                  <span className="overlay-badge">🖥️ Оверлей: {overlayInfo.name}</span>
                )}
                </div>
                <div className="event-actions">
                  <button 
                    onClick={(e) => { e.stopPropagation(); testEvent(eventType); }} 
                    className="test-btn" 
                    title="Тест"
                  >
                    <FaPlay /> Тест
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleEventEnabled(eventType); }} 
                    className={`status-toggle-btn ${isEnabled ? 'on' : 'off'}`}
                  >
                    <FaPowerOff />
                  </button>
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="event-editor-container">
                  <div className="event-meta">
                    <p className="event-description">{meta.description}</p>
                    <div className="event-vars">
                      <span className="vars-label">Доступные переменные:</span>
                      {meta.vars.map(v => (
                        <code key={v} className="var-badge">{`{${v}}`}</code>
                      ))}
                    </div>
                  </div>

                  <ResponseEditor
                    value={config.response || {
                      chat: { enabled: false, components: [] },
                      media: { enabled: false, file: '', volume: 100, overlay: null, text: { enabled: false, content: '', position: 'overlay' } }
                    }}
                    onChange={(response) => updateEvent(eventType, { ...config, response })}
                    overlays={overlays}
                    showAliasesTab={false}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== AUTO SHOUTOUT ===== */}
      <div className="autoshoutout-section">
        <h3>📢 Автоматический Shoutout 
          <Tooltip text="Бот автоматически делает /shoutout пользователям из списка при их первом сообщении за сессию. Кулдаун 2 минуты." />
        </h3>

        <div className="shoutout-users-list">
          {autoshoutout.length === 0 ? (
            <div className="empty-shoutout">📭 Список пуст. Добавьте пользователей для авто-шаута.</div>
          ) : (
            autoshoutout.map(user => (
              <div key={user} className="shoutout-user-tag">
                <span className="shoutout-username">{user}</span>
                {shoutoutStatus?.done?.includes(user.toLowerCase()) && 
                  <span className="shoutout-done-badge">✅ done</span>
                }
                {shoutoutStatus?.queue?.some(q => q.toLowerCase() === user.toLowerCase()) && 
                  <span className="shoutout-queue-badge">⏳ очередь</span>
                }
                <button 
                  className="shoutout-trigger-btn" 
                  onClick={() => triggerShoutout(user)} 
                  title="Шаут вручную"
                >
                  📢
                </button>
                <button 
                  className="shoutout-remove-btn" 
                  onClick={() => removeShoutoutUser(user)}
                >
                  <FaTrash />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="add-shoutout-form">
          <input 
            type="text" 
            value={newShoutoutUser} 
            onChange={(e) => setNewShoutoutUser(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addShoutoutUser()} 
            placeholder="Никнейм пользователя" 
            className="shoutout-input" 
          />
          <button onClick={addShoutoutUser} className="add-shoutout-btn">
            <FaPlus /> Добавить
          </button>
        </div>

        {shoutoutStatus && (
          <div className="shoutout-status-box">
            <div className="shoutout-status-header">
              <h4>📊 Статус</h4>
              <button onClick={resetShoutouts} className="reset-shoutout-btn">
                🔄 Сбросить
              </button>
            </div>
            <div className="shoutout-status-items">
              <div className="shoutout-status-item">
                <span className="status-label">Выполнено:</span>
                <span className="status-value">{shoutoutStatus.done?.length || 0}</span>
              </div>
              <div className="shoutout-status-item">
                <span className="status-label">В очереди:</span>
                <span className="status-value">{shoutoutStatus.queue?.length || 0}</span>
              </div>
              <div className="shoutout-status-item">
                <span className="status-label">Кулдаун:</span>
                <span className="status-value">
                  {shoutoutStatus.cooldownRemaining > 0 
                    ? `${Math.ceil(shoutoutStatus.cooldownRemaining / 1000)} сек` 
                    : '✅ Готов'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventsTab;