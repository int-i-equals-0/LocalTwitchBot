// client/src/components/Rewards/RewardsTab.jsx
import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaPowerOff, FaEdit, FaSync } from 'react-icons/fa';
import Modal from '../Common/Modal';
import RewardEditor from './RewardEditor';
import RewardSelector from './RewardSelector';
import { useNotification, NOTIFICATION_TYPES } from '../Notification/Notification';
import './RewardsTab.css';

function RewardsTab({ rewards, onUpdate, overlays = [] }) {
  const { showNotification, showConfirm } = useNotification();
  const [editingReward, setEditingReward] = useState(null);
  const [channelRewards, setChannelRewards] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [eventSubStatus, setEventSubStatus] = useState({ connected: false, subscriptions: 0 });

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
      if (data.success) {
        setChannelRewards(data.rewards);
      } else {
        showNotification(`⚠️ ${data.error || 'Не удалось загрузить награды'}`, NOTIFICATION_TYPES.WARNING, 3000);
      }
    } catch (error) {
      showNotification('❌ Ошибка подключения к серверу', NOTIFICATION_TYPES.ERROR, 3000);
    } finally {
      setLoadingRewards(false);
    }
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

  const getEmptyConfig = (selectedReward) => ({
    enabled: true,
    rewardId: selectedReward.id,
    rewardTitle: selectedReward.title,
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
    setEditingReward({ key: null, config: null, isNew: true, step: 'select' });
  };

  const handleRewardSelected = (selectedReward) => {
    const config = getEmptyConfig(selectedReward);
    setEditingReward({ key: null, config, isNew: true, step: 'edit' });
  };

  const deleteReward = (key, rewardTitle) => {
    showConfirm(`Удалить реакцию на награду "${rewardTitle}"?`, () => {
      const updated = { ...rewards };
      delete updated[key];
      onUpdate(updated);
      showNotification('🗑️ Реакция удалена', NOTIFICATION_TYPES.WARNING, 2000);
    });
  };

  const updateReward = (key, newConfig, isNew = false) => {
    if (isNew) {
      const newKey = `reward_${Date.now().toString(36)}`;
      onUpdate({ ...rewards, [newKey]: newConfig });
      showNotification(`✅ Реакция на "${newConfig.rewardTitle}" создана`, NOTIFICATION_TYPES.SUCCESS, 2000);
    } else {
      onUpdate({ ...rewards, [key]: newConfig });
      showNotification(`✅ Реакция на "${newConfig.rewardTitle}" сохранена`, NOTIFICATION_TYPES.SUCCESS, 2000);
    }
    setEditingReward(null);
  };

  const toggleRewardStatus = (key, currentStatus, e) => {
    e.stopPropagation();
    const reward = rewards[key];
    const newStatus = !currentStatus;
    onUpdate({ ...rewards, [key]: { ...reward, enabled: newStatus } });
    showNotification(
      `${newStatus ? '🔛' : '🔴'} "${reward.rewardTitle}" ${newStatus ? 'включена' : 'выключена'}`,
      NOTIFICATION_TYPES.INFO,
      1500
    );
  };

  const getReactionType = (config) => {
    const hasChat = config.response?.chat?.enabled;
    const hasMedia = config.response?.media?.enabled;

    if (!hasChat && !hasMedia) return { icon: '💤', text: 'Нет реакции' };
    if (hasChat && !hasMedia) return { icon: '💬', text: 'Текст' };
    if (!hasChat && hasMedia) return { icon: '🎬', text: 'Медиа' };
    return { icon: '💬🎬', text: 'Текст + Медиа' };
  };

  const getRewardInfo = (rewardId) => {
    return channelRewards.find(r => r.id === rewardId);
  };

  const getModalTitle = () => {
    if (!editingReward) return '';
    if (editingReward.isNew && editingReward.step === 'select') return 'Выберите награду';
    if (editingReward.isNew && editingReward.step === 'edit') {
      return `Создание реакции на "${editingReward.config?.rewardTitle || ''}"`;
    }
    return `Редактирование реакции на "${editingReward.config?.rewardTitle || ''}"`;
  };

  const getModalSize = () => {
    if (editingReward?.isNew && editingReward?.step === 'select') return 'medium';
    return 'xlarge';
  };

  return (
    <div className="rewards-tab">
      <div className="rewards-header">
        <h2>🎁 Награды за баллы канала</h2>
        <p className="rewards-description">
          Настройте реакции бота на использование наград за баллы канала.
          Можно использовать переменные: {'{user}'} — имя активировавшего, {'{message}'} — введённый текст.
        </p>
        
        <div className="eventsub-status-bar">
          <div className={`eventsub-indicator ${eventSubStatus.connected ? 'connected' : 'disconnected'}`}>
            {eventSubStatus.connected ? '🟢 EventSub подключен' : '🔴 EventSub отключен'}
          </div>
          {eventSubStatus.connected && eventSubStatus.subscriptions > 0 && (
            <span className="eventsub-subs-count">📡 Подписок: {eventSubStatus.subscriptions}</span>
          )}
          <button onClick={reconnectEventSub} className="eventsub-reconnect-btn">
            <FaSync /> Переподключить
          </button>
        </div>
      </div>

      <div className="rewards-list">
        {Object.keys(rewards).length === 0 && (
          <div className="empty-rewards">
            <p>📭 Реакции на награды не настроены</p>
            <p className="hint">Нажмите "Добавить реакцию" чтобы выбрать награду из списка</p>
          </div>
        )}

        {Object.entries(rewards).map(([key, config]) => {
          const rewardInfo = getRewardInfo(config.rewardId);
          const reactionType = getReactionType(config);
          const hasOverlay = config.response?.media?.enabled && config.response?.media?.overlay;
          const overlayObj = hasOverlay 
            ? overlays.find(o => o.id === (config.response?.media?.overlay?.id || config.response?.media?.overlay))
            : null;
          const isEnabled = config.enabled !== false;

          return (
            <div key={key} className={`reward-card ${!isEnabled ? 'disabled' : ''}`}>
              <div className="reward-card-header">
                <div className="reward-title">
                  {rewardInfo?.image && <img src={rewardInfo.image} alt="" className="reward-icon" />}
                  <span className="reward-name">{config.rewardTitle}</span>
                  {rewardInfo && <span className="reward-cost">{rewardInfo.cost} 💎</span>}
                  <span className={`reward-status-badge ${isEnabled ? 'enabled' : 'disabled'}`}>
                    {isEnabled ? 'Вкл' : 'Выкл'}
                  </span>
                  <span className="reward-type-badge">
                    {reactionType.icon} {reactionType.text}
                  </span>
                  {overlayObj && (
                    <span className="overlay-badge">🖥️ Оверлей: {overlayObj.name}</span>
                  )}
                </div>
                <div className="reward-actions">
                  <button
                    onClick={(e) => toggleRewardStatus(key, isEnabled, e)}
                    className={`status-toggle-btn ${isEnabled ? 'on' : 'off'}`}
                    title={isEnabled ? 'Выключить' : 'Включить'}
                  >
                    <FaPowerOff />
                  </button>
                  <button
                    onClick={() => setEditingReward({ key, config })}
                    className="edit-btn"
                    title="Редактировать"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteReward(key, config.rewardTitle); }}
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

      <div className="add-reward-section">
        <button className="add-reward-main-btn" onClick={openCreateModal}>
          <FaPlus /> Добавить реакцию на награду
        </button>
      </div>

      {/* Единое модальное окно */}
      <Modal
        isOpen={!!editingReward}
        onClose={() => setEditingReward(null)}
        title={getModalTitle()}
        size={getModalSize()}
      >
        {editingReward && editingReward.isNew && editingReward.step === 'select' && (
          <RewardSelector
            channelRewards={channelRewards}
            existingRewards={rewards}
            loadingRewards={loadingRewards}
            onRefreshRewards={fetchChannelRewards}
            onRewardSelected={handleRewardSelected}
            onCancel={() => setEditingReward(null)}
          />
        )}
        {editingReward && !(editingReward.isNew && editingReward.step === 'select') && (
          <RewardEditor
            reward={editingReward.config}
            onUpdate={(updated) => updateReward(
              editingReward.key,
              updated,
              editingReward.isNew
            )}
            overlays={overlays}
            isNew={editingReward.isNew}
          />
        )}
      </Modal>
    </div>
  );
}

export default RewardsTab;