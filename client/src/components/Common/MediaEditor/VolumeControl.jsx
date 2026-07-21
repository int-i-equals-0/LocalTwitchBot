// client/src/components/Common/MediaEditor/VolumeControl.jsx

import { FaVolumeUp } from 'react-icons/fa';
import Tooltip from '../../Tooltip';
import './MediaEditor.css';

function VolumeControl({ value = 100, onChange }) {
  return (
    <div className="media-settings">
      <label>
        🔊 Громкость
        <Tooltip text="Громкость воспроизведения для видео и аудио (0-100%)" />
      </label>
      <div className="volume-control">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
        />
        <span className="volume-value">{value}%</span>
        <FaVolumeUp className="volume-icon" />
      </div>
    </div>
  );
}

export default VolumeControl;