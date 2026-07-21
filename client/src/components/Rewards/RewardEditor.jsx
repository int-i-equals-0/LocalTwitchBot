// client/src/components/Rewards/RewardEditor.jsx

import { useState } from "react";
import { FaSave, FaPlus } from "react-icons/fa";
import ResponseEditor from "../Common/ResponseEditor";
import "./RewardsTab.css";

function RewardEditor({ reward, onUpdate, overlays = [], isNew = false }) {
  const [response, setResponse] = useState(
    reward.response || {
      chat: { enabled: false, components: [] },
      media: {
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
    },
  );

  const handleSave = () => {
    onUpdate({
      ...reward,
      response,
    });
  };

  return (
    <div className="reward-editor">
      <div className="reward-editor-header">
        <div className="reward-id-info">
          <span className="reward-id-label">Reward ID:</span>
          <code className="reward-id-value">{reward.rewardId}</code>
        </div>
        <p className="reward-vars-hint">
          💡 Доступные переменные: {"{user}"} — имя пользователя, {"{message}"}{" "}
          — введённый текст
        </p>
      </div>

      <ResponseEditor
        value={response}
        onChange={setResponse}
        overlays={overlays}
        showAliasesTab={false}
      />

      <div className="reward-editor-actions">
        <button onClick={handleSave} className="save-reward-btn primary">
          {isNew ? (
            <>
              <FaPlus /> Создать реакцию
            </>
          ) : (
            <>
              <FaSave /> Сохранить реакцию
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default RewardEditor;
