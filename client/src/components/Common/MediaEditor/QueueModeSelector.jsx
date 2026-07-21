// client/src/components/Common/MediaEditor/QueueModeSelector.jsx

import Tooltip from '../../Tooltip';
import './MediaEditor.css';

function QueueModeSelector({ value = 'queue', onChange }) {
  return (
    <div className="media-settings">
      <label>
        🎬 Режим воспроизведения
        <Tooltip text="«В очереди» — ждёт окончания других медиа. «Вне очереди» — играет сразу поверх всего." />
      </label>
      <div className="position-buttons">
        <button
          type="button"
          className={`position-btn ${value === 'queue' ? 'active' : ''}`}
          onClick={() => onChange('queue')}
        >
          📋 В очереди
        </button>
        <button
          type="button"
          className={`position-btn ${value === 'immediate' ? 'active' : ''}`}
          onClick={() => onChange('immediate')}
        >
          ⚡ Вне очереди
        </button>
      </div>
    </div>
  );
}

export default QueueModeSelector;