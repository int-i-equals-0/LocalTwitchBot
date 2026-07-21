// client/src/components/Common/MediaEditor/MediaAnimationSettings.jsx

import { useState } from 'react';
import { MEDIA_ENTER_ANIMATIONS, MEDIA_EXIT_ANIMATIONS } from './utils';
import './MediaEditor.css';

function MediaAnimationSettings({ animation = {}, onChange }) {
  const [enterDuration, setEnterDuration] = useState(animation.enterDuration || 0.5);
  const [exitDuration, setExitDuration] = useState(animation.exitDuration || 0.5);

  const update = (updates) => {
    onChange({ ...animation, ...updates });
  };

  return (
    <div className="media-animation-section">
      <h4>🎭 Анимации медиа</h4>
      <div className="animation-row">
        <div className="animation-select-group">
          <label>Появление</label>
          <select
            value={animation.enter || 'none'}
            onChange={(e) => update({ enter: e.target.value })}
            className="animation-select"
          >
            {MEDIA_ENTER_ANIMATIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
        <div className="animation-select-group">
          <label>Скрытие</label>
          <select
            value={animation.exit || 'none'}
            onChange={(e) => update({ exit: e.target.value })}
            className="animation-select"
          >
            {MEDIA_EXIT_ANIMATIONS.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="animation-row duration-row">
        <div className="animation-speed-group">
          <label>Длительность появления: {enterDuration.toFixed(1)}с</label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={enterDuration}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setEnterDuration(val);
              update({ enterDuration: val });
            }}
            className="speed-slider"
            disabled={animation.enter === 'none'}
          />
        </div>
        <div className="animation-speed-group">
          <label>Длительность скрытия: {exitDuration.toFixed(1)}с</label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={exitDuration}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setExitDuration(val);
              update({ exitDuration: val });
            }}
            className="speed-slider"
            disabled={animation.exit === 'none'}
          />
        </div>
      </div>
    </div>
  );
}

export default MediaAnimationSettings;