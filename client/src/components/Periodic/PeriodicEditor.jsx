// client/src/components/Periodic/PeriodicEditor.jsx
import { useState } from 'react';
import { FaPowerOff } from 'react-icons/fa';
import ResponseEditor from '../Common/ResponseEditor';
import Tooltip from '../Tooltip';
import './PeriodicTab.css';

function PeriodicEditor({ eventKey, event, onUpdate, overlays = [] }) {
  const [editName, setEditName] = useState(eventKey);
  const [intervalValue, setIntervalValue] = useState(event.interval || 300);

  const handleIntervalChange = (e) => {
    setIntervalValue(e.target.value);
  };

  const handleIntervalBlur = () => {
    const numValue = parseInt(intervalValue);
    if (isNaN(numValue) || numValue < 10) {
      const corrected = 10;
      setIntervalValue(corrected);
      onUpdate({ ...event, interval: corrected });
    } else {
      onUpdate({ ...event, interval: numValue });
    }
  };

  const toggleEnabled = () => {
    onUpdate({ ...event, enabled: !event.enabled });
  };

  const updateResponse = (response) => {
    onUpdate({ ...event, response });
  };

  return (
    <div className="periodic-editor">
      <div className="periodic-editor-header">
        <div className="periodic-name-row">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => {
              if (editName && editName !== eventKey) {
                onUpdate({ ...event, _newName: editName });
              }
            }}
            placeholder="Название события"
            className="periodic-name-input"
          />
          <div className="command-toggle">
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={event.enabled !== false} 
                onChange={toggleEnabled} 
              />
              <span className="toggle-slider">
                <span className="toggle-icon"><FaPowerOff /></span>
              </span>
            </label>
            <span className="toggle-label">
              {event.enabled !== false ? 'Включено' : 'Выключено'}
            </span>
          </div>
        </div>
      </div>

      <div className="interval-setting">
        <label>
          ⏱️ Интервал (секунды):
          <Tooltip text="Как часто будет срабатывать событие. Минимальное значение 10 секунд." />
        </label>
        <div className="interval-input-group">
          <input
            type="number"
            value={intervalValue}
            onChange={handleIntervalChange}
            onBlur={handleIntervalBlur}
            min="1"
            className="interval-input"
          />
          <div className="interval-presets">
            <button 
              onClick={() => { setIntervalValue(60); onUpdate({ ...event, interval: 60 }); }} 
              className={`preset-btn ${event.interval === 60 ? 'active' : ''}`}
            >
              1 мин
            </button>
            <button 
              onClick={() => { setIntervalValue(300); onUpdate({ ...event, interval: 300 }); }} 
              className={`preset-btn ${event.interval === 300 ? 'active' : ''}`}
            >
              5 мин
            </button>
            <button 
              onClick={() => { setIntervalValue(600); onUpdate({ ...event, interval: 600 }); }} 
              className={`preset-btn ${event.interval === 600 ? 'active' : ''}`}
            >
              10 мин
            </button>
            <button 
              onClick={() => { setIntervalValue(900); onUpdate({ ...event, interval: 900 }); }} 
              className={`preset-btn ${event.interval === 900 ? 'active' : ''}`}
            >
              15 мин
            </button>
            <button 
              onClick={() => { setIntervalValue(1800); onUpdate({ ...event, interval: 1800 }); }} 
              className={`preset-btn ${event.interval === 1800 ? 'active' : ''}`}
            >
              30 мин
            </button>
            <button 
              onClick={() => { setIntervalValue(3600); onUpdate({ ...event, interval: 3600 }); }} 
              className={`preset-btn ${event.interval === 3600 ? 'active' : ''}`}
            >
              1 час
            </button>
          </div>
        </div>
      </div>

      <ResponseEditor
        value={event.response || {
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

export default PeriodicEditor;