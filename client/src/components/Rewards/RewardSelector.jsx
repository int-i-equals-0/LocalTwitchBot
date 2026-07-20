// client/src/components/Rewards/RewardSelector.jsx
import { useState } from 'react';
import { FaPlus, FaSync, FaArrowRight } from 'react-icons/fa';
import './RewardsTab.css';

function RewardSelector({ channelRewards, existingRewards, loadingRewards, onRefreshRewards, onRewardSelected, onCancel }) {
  const [selectedRewardId, setSelectedRewardId] = useState('');

  const availableRewards = channelRewards.filter(
    r => !Object.values(existingRewards).some(existing => existing.rewardId === r.id)
  );

  const handleContinue = () => {
    const selectedReward = channelRewards.find(r => r.id === selectedRewardId);
    if (selectedReward) {
      onRewardSelected(selectedReward);
    }
  };

  return (
    <div className="reward-selector">
      <div className="channel-rewards-info">
        <div className="info-header">
          <span>📋 Награды канала</span>
          <button onClick={onRefreshRewards} className="refresh-btn" disabled={loadingRewards}>
            <FaSync className={loadingRewards ? 'spinning' : ''} />
            {loadingRewards ? 'Загрузка...' : 'Обновить'}
          </button>
        </div>

        {loadingRewards && (
          <div className="loading-rewards">Загрузка наград...</div>
        )}

        {!loadingRewards && channelRewards.length === 0 && (
          <div className="no-rewards-warning">
            <p>⚠️ Не удалось загрузить награды канала</p>
            <p className="hint">Убедитесь, что:</p>
            <ul>
              <li>Стример авторизован с scope <code>channel:read:redemptions</code></li>
              <li>На канале есть пользовательские награды</li>
              <li>Сервер перезапущен после авторизации</li>
            </ul>
          </div>
        )}

        {!loadingRewards && availableRewards.length === 0 && channelRewards.length > 0 && (
          <div className="no-available-rewards">
            <p>✅ Все доступные награды уже настроены</p>
          </div>
        )}

        {availableRewards.length > 0 && (
          <div className="form-group">
            <label>Выберите награду</label>
            <select
              value={selectedRewardId}
              onChange={(e) => setSelectedRewardId(e.target.value)}
              className="reward-select"
            >
              <option value="">-- Выберите награду --</option>
              {availableRewards.map(reward => (
                <option key={reward.id} value={reward.id}>
                  {reward.title} ({reward.cost} 💎) {reward.requiresInput ? '📝' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedRewardId && (
          <div className="selected-reward-info">
            <div className="reward-preview">
              <strong>Информация:</strong>
              {channelRewards.find(r => r.id === selectedRewardId)?.requiresInput && (
                <p className="reward-hint">📝 Эта награда требует ввод текста. Переменная {'{message}'} будет подставлена.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="form-actions">
        <button onClick={onCancel} className="outline">Отмена</button>
        <button onClick={handleContinue} className="primary" disabled={!selectedRewardId}>
          <FaArrowRight /> Далее — настроить реакцию
        </button>
      </div>
    </div>
  );
}

export default RewardSelector;