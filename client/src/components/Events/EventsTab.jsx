// client/src/components/Events/EventsTab.jsx
import { useState } from 'react';
import { FaPowerOff, FaEdit, FaPlay } from 'react-icons/fa';
import Modal from '../Common/Modal';
import EventEditor from './EventEditor';
import { useNotification, NOTIFICATION_TYPES } from '../Notification';
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
  bits: {
    label: '💎 Bits / Cheer',
    description: 'Срабатывает, когда кто-то отправляет Bits (cheer) в чат канала',
    vars: ['user', 'bits', 'message', 'isAnonymous']
  },
  raid: { 
    label: '🏴‍☠️ Рейд', 
    description: 'Срабатывает при входящем рейде на канал', 
    vars: ['user', 'viewers'] 
  },
  watchStreak: {
    label: '🔥 Watch Streak',
    description: 'Срабатывает, когда зритель делится серией просмотренных стримов подряд',
    vars: ['user', 'streakCount', 'channelPointsAwarded', 'systemMessage', 'message']
  }
};

function EventsTab({ events, onUpdate, overlays = [] }) {
  const { showNotification } = useNotification();
  const [editingEvent, setEditingEvent] = useState(null);

  const toggleEventEnabled = (eventType, currentStatus) => {
    const current = events[eventType] || {};
    onUpdate({ 
      ...events, 
      [eventType]: { ...current, enabled: !currentStatus } 
    });
    showNotification(
      `${!currentStatus ? '🔛' : '🔴'} Событие "${EVENT_TYPES[eventType].label}" ${!currentStatus ? 'включено' : 'выключено'}`,
      NOTIFICATION_TYPES.INFO,
      1500
    );
  };

  const testEvent = async (eventType) => {
    try {
      const resp = await fetch(`http://127.0.0.1:3001/api/events/${eventType}/test`, { method: 'POST' });
      const data = await resp.json();
      if (data.success) {
        showNotification(`✅ Тестовое событие "${EVENT_TYPES[eventType].label}" отправлено`, NOTIFICATION_TYPES.SUCCESS, 2000);
      }
    } catch { 
      showNotification('❌ Ошибка отправки тестового события', NOTIFICATION_TYPES.ERROR, 3000); 
    }
  };

  const updateEvent = (eventType, newConfig) => {
    onUpdate({ ...events, [eventType]: newConfig });
    setEditingEvent(null);
    showNotification(`✅ Событие "${EVENT_TYPES[eventType].label}" сохранено`, NOTIFICATION_TYPES.SUCCESS, 2000);
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

  return (
    <div className="events-tab">
      <div className="events-header">
        <h2>🎉 События Twitch</h2>
        <p className="events-description">
          Настройте реакции бота на события Twitch. Используйте переменные вроде {'{user}'}, {'{tier}'}, {'{viewers}'}, {'{streakCount}'} в текстах.
        </p>
      </div>

      <div className="events-list">
        {Object.entries(EVENT_TYPES).map(([eventType, meta]) => {
          const config = events[eventType] || { 
            enabled: false, 
            response: {
              chat: { enabled: false, components: [] },
              media: {
                enabled: false,
                file: '',
                volume: 100,
                overlay: null,
                text: { enabled: false, content: '', position: 'overlay', animation: 'none', font: {} },
                animation: { enter: 'none', exit: 'none' }
              }
            }
          };
          const isEnabled = config.enabled === true;
          const reactionType = getReactionType(config);
          const overlayInfo = getOverlayInfo(config);

          return (
            <div key={eventType} className={`event-card ${!isEnabled ? 'disabled' : ''}`}>
              <div className="event-card-header">
                <div className="event-title">
                  <span className="event-name">{meta.label}</span>
                  <span className={`event-status-badge ${isEnabled ? 'enabled' : 'disabled'}`}>
                    {isEnabled ? 'Вкл' : 'Выкл'}
                  </span>
                  <span className="event-type-badge">
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
                    onClick={(e) => { e.stopPropagation(); toggleEventEnabled(eventType, isEnabled); }} 
                    className={`status-toggle-btn ${isEnabled ? 'on' : 'off'}`}
                  >
                    <FaPowerOff />
                  </button>
                  <button
                    onClick={() => setEditingEvent({ type: eventType, config, meta })}
                    className="edit-btn"
                    title="Редактировать"
                  >
                    <FaEdit />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Модальное окно редактирования события */}
      <Modal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title={`Редактирование события: ${editingEvent?.meta?.label || ''}`}
        size="xlarge"
      >
        {editingEvent && (
          <EventEditor
            eventType={editingEvent.type}
            config={editingEvent.config}
            meta={editingEvent.meta}
            onUpdate={(updated) => updateEvent(editingEvent.type, updated)}
            overlays={overlays}
          />
        )}
      </Modal>
    </div>
  );
}

export default EventsTab;
