// client/src/components/Periodic/PeriodicTab.jsx
import { useState } from 'react';
import { FaPlus, FaTrash, FaPowerOff, FaPlay } from 'react-icons/fa';
import PeriodicEditor from './PeriodicEditor';
import { useNotification, NOTIFICATION_TYPES } from '../Notification/Notification';
import './PeriodicTab.css';

function PeriodicTab({ events, onUpdate, overlays = [] }) {
  const { showNotification, showConfirm } = useNotification();
  const [newEvent, setNewEvent] = useState({ name: '' });
  const [expandedEvents, setExpandedEvents] = useState({});

  const toggleExpand = (eventKey) => {
    setExpandedEvents(prev => ({ ...prev, [eventKey]: !prev[eventKey] }));
  };

  const addEvent = () => {
    if (!newEvent.name.trim()) {
      showNotification('⚠️ Введите название события!', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    const eventKey = newEvent.name.trim();

    if (events[eventKey]) {
      showNotification('❌ Событие с таким именем уже существует!', NOTIFICATION_TYPES.ERROR, 3000);
      return;
    }

    const eventConfig = {
      enabled: true,
      interval: 300,
      response: {
        chat: {
          enabled: false,
          components: []
        },
        media: {
          enabled: false,
          file: '',
          volume: 100,
          overlay: null,
          text: {
            enabled: false,
            content: '',
            position: 'overlay'
          }
        }
      }
    };

    onUpdate({ ...events, [eventKey]: eventConfig });
    setNewEvent({ name: '' });
    showNotification(`✅ Событие "${eventKey}" создано`, NOTIFICATION_TYPES.SUCCESS, 2000);
  };

  const deleteEvent = (eventKey) => {
    showConfirm(
      `Вы действительно хотите удалить событие "${eventKey}"?\n\nЭто действие нельзя отменить.`,
      () => {
        const newEvents = { ...events };
        delete newEvents[eventKey];
        onUpdate(newEvents);
        showNotification(`🗑️ Событие "${eventKey}" удалено`, NOTIFICATION_TYPES.WARNING, 2000);
      }
    );
  };

  const updateEvent = (key, newConfig) => {
    const newEvents = { ...events };

    // Если имя изменилось
    if (newConfig._newName && newConfig._newName !== key) {
      delete newEvents[key];
      const { _newName, ...configWithoutNewName } = newConfig;
      newEvents[_newName] = configWithoutNewName;
      showNotification(`✏️ Событие переименовано: "${key}" → "${_newName}"`, NOTIFICATION_TYPES.INFO, 2000);
    } else {
      const { _newName, ...configWithoutNewName } = newConfig;
      newEvents[key] = configWithoutNewName;
    }

    onUpdate(newEvents);
  };

  const toggleEventStatus = (eventKey, e) => {
    e.stopPropagation();
    const eventConfig = events[eventKey];
    const newStatus = !eventConfig.enabled;

    onUpdate({
      ...events,
      [eventKey]: { ...eventConfig, enabled: newStatus }
    });

    showNotification(
      `${newStatus ? '🔛' : '🔴'} Событие "${eventKey}" ${newStatus ? 'включено' : 'выключено'}`,
      NOTIFICATION_TYPES.INFO,
      1500
    );
  };

  const triggerEvent = async (eventKey, e) => {
    e.stopPropagation();
    try {
      const response = await fetch(`http://127.0.0.1:3001/api/periodic-events/${encodeURIComponent(eventKey)}/trigger`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        showNotification(`▶️ Событие "${eventKey}" запущено вручную`, NOTIFICATION_TYPES.SUCCESS, 2000);
      } else {
        showNotification(`❌ Ошибка: ${data.error}`, NOTIFICATION_TYPES.ERROR, 3000);
      }
    } catch (error) {
      showNotification('❌ Ошибка подключения к серверу', NOTIFICATION_TYPES.ERROR, 3000);
    }
  };

  const restartTimers = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/periodic-events/restart', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        showNotification('🔄 Таймеры перезапущены', NOTIFICATION_TYPES.SUCCESS, 2000);
      }
    } catch (error) {
      showNotification('❌ Ошибка перезапуска таймеров', NOTIFICATION_TYPES.ERROR, 3000);
    }
  };

  const formatInterval = (seconds) => {
    if (seconds < 60) return `${seconds} сек`;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours} ч`);
    if (minutes > 0) parts.push(`${minutes} мин`);
    if (secs > 0 && hours === 0) parts.push(`${secs} сек`);
    
    return parts.join(' ');
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
    <div className="periodic-tab">
      <div className="periodic-header">
        <h2>⏰ Периодические события</h2>
        <p className="periodic-description">
          События, которые срабатывают автоматически через равные промежутки времени.
        </p>
        <button onClick={restartTimers} className="restart-timers-btn">
          🔄 Перезапустить все таймеры
        </button>
      </div>

      <div className="periodic-list">
        {Object.entries(events).length === 0 && (
          <div className="empty-periodic">
            <p>📭 Пока нет периодических событий</p>
            <p className="hint">Создайте первое событие ниже</p>
          </div>
        )}

        {Object.entries(events).map(([eventKey, config]) => {
          const overlayInfo = getOverlayInfo(config, overlays);
          const reactionType = getReactionType(config);

          return (
            <div key={eventKey} className={`periodic-card ${config.enabled === false ? 'disabled' : ''}`}>
              <div className="periodic-card-header" onClick={() => toggleExpand(eventKey)}>
                <div className="periodic-title">
                  <span className="periodic-name">{eventKey}</span>
                  <span className="periodic-type-badge" title={reactionType.text}>
                    {reactionType.icon} {reactionType.text}
                  </span>
                  <span className="periodic-interval-badge" title={`${config.interval || 300} секунд`}>
                    ⏱️ {formatInterval(config.interval || 300)}
                  </span>
                  {overlayInfo && (
                    <span className="overlay-badge">🖥️ Оверлей: {overlayInfo.name}</span>
                  )}
                </div>
                <div className="periodic-actions">
                  <button
                    onClick={(e) => triggerEvent(eventKey, e)}
                    className="trigger-btn"
                    title="Запустить сейчас"
                  >
                    <FaPlay />
                  </button>
                  <button
                    onClick={(e) => toggleEventStatus(eventKey, e)}
                    className={`status-toggle-btn ${config.enabled === false ? 'off' : 'on'}`}
                    title={config.enabled === false ? 'Включить' : 'Выключить'}
                  >
                    <FaPowerOff />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteEvent(eventKey); }}
                    className="delete-btn"
                  >
                    <FaTrash />
                  </button>
                  <span className="expand-icon">{expandedEvents[eventKey] ? '▼' : '▶'}</span>
                </div>
              </div>

              {expandedEvents[eventKey] && (
                <div className="periodic-editor-container">
                  <PeriodicEditor
                    eventKey={eventKey}
                    event={config}
                    onUpdate={(updated) => updateEvent(eventKey, updated)}
                    overlays={overlays}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="add-periodic-section">
        <h3>➕ Новое событие</h3>
        <div className="add-periodic-form">
          <input
            type="text"
            value={newEvent.name}
            onChange={(e) => setNewEvent({ name: e.target.value })}
            placeholder="Название события"
            className="new-periodic-input"
          />
          <button onClick={addEvent} className="add-periodic-btn">
            <FaPlus /> Создать
          </button>
        </div>
        <p className="form-hint">
          После создания вы сможете настроить текстовый ответ и/или медиа на оверлей
        </p>
      </div>
    </div>
  );
}

export default PeriodicTab;