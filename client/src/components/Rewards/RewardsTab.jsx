// client/src/components/Rewards/RewardsTab.jsx
import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaPowerOff, FaSync, FaGift } from 'react-icons/fa';
import RewardEditor from './RewardEditor';
import { useNotification, NOTIFICATION_TYPES } from '../Notification/Notification';
import Tooltip from '../Tooltip';
import './RewardsTab.css';

function RewardsTab({ rewards, onUpdate, overlays = [] }) {
  const { showNotification, showConfirm } = useNotification();
  const [channelRewards, setChannelRewards] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [expandedRewards, setExpandedRewards] = useState({});
  const [eventSubStatus, setEventSubStatus] = useState({ connected: false, sessionId: null, subscriptions: 0 });
  const [newReward, setNewReward] = useState({ rewardId: '' });

  useEffect(() => {
    fetchChannelRewards();
    fetchEventSubStatus();
    const interval = setInterval(fetchEventSubStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchChannelRewards = async () => {
    setLoadingRewards(true);
    try {
      const response = await fetch('http://127.0.0.1:3001/api/rewards/channel');
      const data = await response.json();
      if (data.success) setChannelRewards(data.rewards);
      else showNotification(`⚠️ ${data.error || 'Не удалось загрузить награды'}`, NOTIFICATION_TYPES.WARNING, 3000);
    } catch (error) {
      showNotification('❌ Ошибка подключения к серверу', NOTIFICATION_TYPES.ERROR, 3000);
    } finally { setLoadingRewards(false); }
  };

  const fetchEventSubStatus = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/eventsub/status');
      const data = await response.json();
      setEventSubStatus(data);
    } catch (e) {}
  };

  const reconnectEventSub = async () => {
    try {
      await fetch('http://127.0.0.1:3001/api/eventsub/reconnect', { method: 'POST' });
      showNotification('🔄 EventSub переподключается...', NOTIFICATION_TYPES.INFO, 2000);
      setTimeout(fetchEventSubStatus, 3000);
    } catch (e) {
      showNotification('❌ Ошибка переподключения', NOTIFICATION_TYPES.ERROR, 3000);
    }
  };

  const toggleExpand = (key) => setExpandedRewards(prev => ({ ...prev, [key]: !prev[key] }));

  const addReward = () => {
    if (!newReward.rewardId) { 
      showNotification('⚠️ Выберите награду!', NOTIFICATION_TYPES.WARNING, 2000); 
      return; 
    }
    
    const channelReward = channelRewards.find(r => r.id === newReward.rewardId);
    if (!channelReward) { 
      showNotification('❌ Награда не найдена', NOTIFICATION_TYPES.ERROR, 2000); 
      return; 
    }
    
    if (Object.values(rewards).find(r => r.rewardId === newReward.rewardId)) { 
      showNotification('❌ Эта награда уже настроена!', NOTIFICATION_TYPES.ERROR, 3000); 
      return; 
    }

    const key = `reward_${Date.now().toString(36)}`;
    const config = {
      enabled: true,
      rewardId: newReward.rewardId,
      rewardTitle: channelReward.title,
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

    onUpdate({ ...rewards, [key]: config });
    setNewReward({ rewardId: '' });
    showNotification(`✅ Награда "${channelReward.title}" добавлена`, NOTIFICATION_TYPES.SUCCESS, 2000);
  };

  const deleteReward = (key) => {
    showConfirm(`Удалить реакцию на награду "${rewards[key].rewardTitle}"?`, () => {
      const updated = { ...rewards }; 
      delete updated[key]; 
      onUpdate(updated);
      showNotification('🗑️ Реакция удалена', NOTIFICATION_TYPES.WARNING, 2000);
    });
  };

  const updateReward = (key, newConfig) => onUpdate({ ...rewards, [key]: newConfig });

  const toggleRewardStatus = (key, e) => {
    e.stopPropagation();
    const r = rewards[key];
    onUpdate({ ...rewards, [key]: { ...r, enabled: !r.enabled } });
    showNotification(
      `${!r.enabled ? '🔛' : '🔴'} "${r.rewardTitle}" ${!r.enabled ? 'включена' : 'выключена'}`,
      NOTIFICATION_TYPES.INFO,
      1500
    );
  };

  const getResponseBadge = (config) => {
    const hasChat = config.response?.chat?.enabled;
    const hasMedia = config.response?.media?.enabled;

    const parts = [];
    if (hasChat) parts.push('💬');
    if (hasMedia) parts.push('🎬');
    
    return parts.length > 0 ? parts.join(' ') : '💤 Нет реакции';
  };

  const getOverlayInfo = (config) => {
    if (!config.response?.media?.enabled || !config.response?.media?.overlay) return null;
    const overlay = config.response.media.overlay;
    // Может быть как объектом {id, path}, так и просто строкой id
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
    <div className="rewards-tab">
      <div className="rewards-header">
        <h2>🎁 Награды за баллы канала</h2>
        <p className="rewards-description">Настройте реакции бота на использование наград за баллы канала.</p>
        
        <div className="pubsub-status">
          <span className={`pubsub-indicator ${eventSubStatus.connected ? 'connected' : 'disconnected'}`}>
            {eventSubStatus.connected ? '🟢 EventSub подключен' : '🔴 EventSub отключен'}
          </span>
          {eventSubStatus.connected && eventSubStatus.subscriptions > 0 && (
            <span className="eventsub-subs-count">📡 Подписок: {eventSubStatus.subscriptions}</span>
          )}
          <button onClick={reconnectEventSub} className="pubsub-reconnect-btn">
            <FaSync /> Переподключить
          </button>
          <Tooltip text="EventSub WebSocket нужен для отслеживания наград (особенно без текста). Для наград с текстом также работает IRC." />
        </div>
      </div>

      <div className="rewards-list">
        {Object.entries(rewards).length === 0 && (
          <div className="empty-rewards">
            <FaGift className="empty-icon" />
            <p>📭 Реакции на награды не настроены</p>
            <p className="hint">Выберите награду канала ниже и настройте реакцию</p>
          </div>
        )}

        {Object.entries(rewards).map(([key, config]) => {
          const channelInfo = channelRewards.find(r => r.id === config.rewardId);
          const overlayInfo = getOverlayInfo(config);
          const reactionType = getReactionType(config);

          return (
            <div key={key} className={`reward-card ${config.enabled === false ? 'disabled' : ''}`}>
              <div className="reward-card-header" onClick={() => toggleExpand(key)}>
                <div className="reward-title">
                  {channelInfo?.image && <img src={channelInfo.image} alt="" className="reward-icon" />}
                  <span className="reward-name">{config.rewardTitle}</span>
                  {channelInfo && <span className="reward-cost">{channelInfo.cost} 💎</span>}
                  <span className="reward-type-badge" title={reactionType.text}>
                    {reactionType.icon} {reactionType.text}
                  </span>
                  {overlayInfo && (
                    <span className="overlay-badge">🖥️ Оверлей: {overlayInfo.name}</span>
                  )}
                </div>
                <div className="reward-actions">
                  <button 
                    onClick={(e) => toggleRewardStatus(key, e)} 
                    className={`status-toggle-btn ${config.enabled === false ? 'off' : 'on'}`}
                  >
                    <FaPowerOff />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteReward(key); }} 
                    className="delete-btn"
                  >
                    <FaTrash />
                  </button>
                  <span className="expand-icon">{expandedRewards[key] ? '▼' : '▶'}</span>
                </div>
              </div>

              {expandedRewards[key] && (
                <div className="reward-editor-container">
                  <RewardEditor
                    reward={config}
                    onUpdate={(updated) => updateReward(key, updated)}
                    overlays={overlays}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="add-reward-section">
        <h3>➕ Новая реакция на награду</h3>
        <div className="channel-rewards-header">
          <span>Награды канала:</span>
          <button onClick={fetchChannelRewards} className="refresh-rewards-btn" disabled={loadingRewards}>
            <FaSync className={loadingRewards ? 'spinning' : ''} /> {loadingRewards ? 'Загрузка...' : 'Обновить список'}
          </button>
        </div>

        {channelRewards.length === 0 && !loadingRewards && (
          <div className="no-channel-rewards">
            <p>⚠️ Не удалось загрузить награды канала</p>
            <p className="hint">Убедитесь, что токен имеет scope <code>channel:read:redemptions</code> и на канале есть пользовательские награды</p>
          </div>
        )}

        {channelRewards.length > 0 && (
          <div className="add-reward-form">
            <select 
              value={newReward.rewardId} 
              onChange={(e) => setNewReward({ rewardId: e.target.value })} 
              className="reward-select"
            >
              <option value="">Выберите награду...</option>
              {channelRewards
                .filter(r => !Object.values(rewards).some(c => c.rewardId === r.id))
                .map(r => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.cost} 💎) {r.requiresInput ? '📝' : ''}
                  </option>
                ))}
            </select>
            <button onClick={addReward} className="add-reward-btn">
              <FaPlus /> Добавить
            </button>
          </div>
        )}

        <div className="rewards-help">
          <h4>📖 Как это работает:</h4>
          <ul>
            <li>Каждая награда может иметь <strong>текстовый ответ в чат</strong> и/или <strong>медиа на оверлей</strong></li>
            <li>В тексте можно использовать <code>{'{user}'}</code> (имя активировавшего) и <code>{'{message}'}</code> (введённый текст)</li>
            <li>В медиа можно добавить текст поверх с теми же переменными</li>
            <li>Каждый тип реакции включается отдельным переключателем</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default RewardsTab;