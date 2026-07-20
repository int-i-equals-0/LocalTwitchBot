// client/src/components/Periodic/PeriodicTab.jsx

import { useState } from 'react';
import { FaPlus, FaTrash, FaPowerOff, FaEdit, FaPlay } from 'react-icons/fa';
import Modal from '../Common/Modal';
import PeriodicEditor from './PeriodicEditor';
import { useNotification, NOTIFICATION_TYPES } from '../Notification';
import './PeriodicTab.css';

function PeriodicTab({ events, onUpdate, overlays = [] }) {
  const { showNotification, showConfirm } = useNotification();
  const [editingEvent, setEditingEvent] = useState(null);

  const getEmptyConfig = () => ({
    enabled: true,
    interval: 300,
    response: {
      chat: { enabled: false, components: [] },
      media: {
        enabled: false,
        file: '',
        volume: 100,
        overlay: null,
        text: {
          enabled: false,
          content: '',
          position: 'overlay',
          animation: 'none',
          font: {}
        },
        animation: { enter: 'none', exit: 'none' }
      }
    }
  });

  const openCreateModal = () => {
    setEditingEvent({ key: null, config: getEmptyConfig(), isNew: true });
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

  const updateEvent = (oldKey, newConfig, isNew = false) => {
    const newEvents = { ...events };
    const newKey = newConfig._newName || oldKey;

    if (!isNew && !oldKey) return;

    const finalKey = isNew ? newConfig._newName : newKey;

    if (!finalKey || !finalKey.trim()) {
      showNotification('⚠️ Введите название события!', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    if (isNew && newEvents[finalKey]) {
      showNotification('❌ Событие с таким именем уже существует!', NOTIFICATION_TYPES.ERROR, 3000);
      return;
    }

    if (!isNew && newKey !== oldKey && newEvents[newKey]) {
      showNotification('❌ Событие с таким именем уже существует!', NOTIFICATION_TYPES.ERROR, 3000);
      return;
    }

    const { _newName, ...cleanConfig } = newConfig;

    if (isNew) {
      newEvents[finalKey] = cleanConfig;
      showNotification(`✅ Событие "${finalKey}" создано`, NOTIFICATION_TYPES.SUCCESS, 2000);
    } else if (newKey !== oldKey) {
      delete newEvents[oldKey];
      newEvents[newKey] = cleanConfig;
      showNotification(`✏️ Событие переименовано: "${oldKey}" → "${newKey}"`, NOTIFICATION_TYPES.INFO, 2000);
    } else {
      newEvents[oldKey] = cleanConfig;
      showNotification(`✅ Событие "${oldKey}" сохранено`, NOTIFICATION_TYPES.SUCCESS, 2000);
    }

    onUpdate(newEvents);
    setEditingEvent(null);
  };

  const toggleEventStatus = (eventKey, currentStatus, e) => {
    e.stopPropagation();
    const event = events[eventKey];
    const newStatus = !currentStatus;
    onUpdate({
      ...events,
      [eventKey]: { ...event, enabled: newStatus }
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
    } catch {
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
    } catch {
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

  const getReactionType = (config) => {
    const hasChat = config.response?.chat?.enabled;
    const hasMedia = config.response?.media?.enabled;

    if (!hasChat && !hasMedia) return { icon: '💤', text: 'Нет реакции' };
    if (hasChat && !hasMedia) return { icon: '💬', text: 'Текст' };
    if (!hasChat && hasMedia) return { icon: '🎬', text: 'Медиа' };
    return { icon: '💬🎬', text: 'Текст + Медиа' };
  };

  const getOverlayInfo = (config) => {
    if (!config.response?.media?.enabled || !config.response?.media?.overlay) return null;
    const overlay = config.response.media.overlay;
    return overlays.find(o => o.id === (overlay.id || overlay));
  };

  const getModalTitle = () => {
    if (!editingEvent) return '';
    if (editingEvent.isNew) return 'Создание периодического события';
    return `Редактирование события "${editingEvent.key || ''}"`;
  };

  return (
    <div className="periodic-tab">
      <div className="periodic-header">
        <h2>⏰ Периодические события</h2>
        <p className="periodic-description">
          События, которые срабатывают автоматически через равные промежутки времени.
        </p>
        <div className="periodic-header-actions">
          <button onClick={restartTimers} className="restart-timers-btn">
            🔄 Перезапустить таймеры
          </button>
          <button onClick={openCreateModal} className="create-periodic-btn">
            <FaPlus /> Создать событие
          </button>
        </div>
      </div>

      <div className="periodic-list">
        {Object.keys(events).length === 0 && (
          <div className="empty-periodic">
            <p>📭 Периодических событий нет</p>
            <p className="hint">Нажмите "Создать событие" чтобы добавить первое событие</p>
          </div>
        )}

        {Object.entries(events).map(([eventKey, config]) => {
          const reactionType = getReactionType(config);
          const overlayInfo = getOverlayInfo(config);
          const isEnabled = config.enabled !== false;
          const interval = config.interval || 300;

          return (
            <div key={eventKey} className={`periodic-card ${!isEnabled ? 'disabled' : ''}`}>
              <div className="periodic-card-header">
                <div className="periodic-title">
                  <span className="periodic-name">{eventKey}</span>
                  <span className={`periodic-status-badge ${isEnabled ? 'enabled' : 'disabled'}`}>
                    {isEnabled ? 'Вкл' : 'Выкл'}
                  </span>
                  <span className="periodic-interval-badge" title={`${interval} секунд`}>
                    ⏱️ {formatInterval(interval)}
                  </span>
                  <span className="periodic-type-badge">
                    {reactionType.icon} {reactionType.text}
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
                    onClick={(e) => toggleEventStatus(eventKey, isEnabled, e)}
                    className={`status-toggle-btn ${isEnabled ? 'on' : 'off'}`}
                    title={isEnabled ? 'Выключить' : 'Включить'}
                  >
                    <FaPowerOff />
                  </button>
                  <button
                    onClick={() => setEditingEvent({ key: eventKey, config })}
                    className="edit-btn"
                    title="Редактировать"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteEvent(eventKey); }}
                    className="delete-btn"
                    title="Удалить"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title={getModalTitle()}
        size="xlarge"
      >
        {editingEvent && (
          <PeriodicEditor
            eventKey={editingEvent.isNew ? '' : editingEvent.key}
            event={editingEvent.config}
            onUpdate={(updated) => updateEvent(
              editingEvent.key,
              updated,
              editingEvent.isNew
            )}
            overlays={overlays}
            isNew={editingEvent.isNew}
          />
        )}
      </Modal>
    </div>
  );
}

export default PeriodicTab;