// client/src/components/Rewards/RewardEditor.jsx
import ResponseEditor from '../Common/ResponseEditor';
import './RewardsTab.css';

function RewardEditor({ reward, onUpdate, overlays = [] }) {
  const updateResponse = (response) => {
    onUpdate({
      ...reward,
      response
    });
  };

  return (
    <div className="reward-editor">
      <div className="reward-id-info">
        <span className="reward-id-label">Reward ID:</span>
        <code className="reward-id-value">{reward.rewardId}</code>
      </div>

      <ResponseEditor
        value={reward.response || {
          chat: { enabled: false, components: [] },
          media: { enabled: false, file: '', volume: 100, overlay: null, text: { enabled: false, content: '', position: 'overlay' } }
        }}
        onChange={updateResponse}
        overlays={overlays}
        showAliasesTab={false}
      />
    </div>
  );
}

export default RewardEditor;