// client/src/components/Periodic/PeriodicEditor.jsx

import { useState } from 'react';
import { FaSave, FaPlus, FaPowerOff } from 'react-icons/fa';
import ResponseEditor from '../Common/ResponseEditor';
import Tooltip from '../Tooltip';
import './PeriodicTab.css';

function PeriodicEditor({ eventKey, event, onUpdate, overlays = [], isNew = false }) {
  const [editName, setEditName] = useState(eventKey);
  const [intervalValue, setIntervalValue] = useState(event.interval || 300);
  const [response, setResponse] = useState(event.response || {
    chat: { enabled: false, components: [] },
    media: {
      enabled: false,
      file: '',
      volume: 100,
      overlay: null,
      text: { enabled: false, content: '', position: 'overlay', animation: 'none', font: {} },
      animation: { enter: 'none', exit: 'none' }
    }
  });
  const [enabled, setEnabled] = useState(event.enabled !== false);

  const isNameEmpty = !editName.trim();

  const handleIntervalChange = (e) => {
    setIntervalValue(e.target.value);
  };

  const handleIntervalBlur = () => {
    const numValue = parseInt(intervalValue);
    if (isNaN(numValue) || numValue < 10) {
      setIntervalValue(10);
    }
  };

  const toggleEnabled = () => {
    setEnabled(!enabled);
  };

  const handleSave = () => {
    if (isNameEmpty) return;
    onUpdate({
      ...event,
      _newName: editName !== eventKey ? editName : undefined,
      enabled,
      interval: Math.max(10, parseInt(intervalValue) || 10),
      response
    });
  };

  const setIntervalPreset = (seconds) => {
    setIntervalValue(seconds);
  };

  return (
    <div className="periodic-editor">
      <div className="periodic-editor-header">
        <div className="periodic-name-row">
          <div className="periodic-name-field">
            <label>Название события</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Название события"
              className="periodic-name-input"
              autoFocus={isNew}
            />
          </div>
          <div className="periodic-toggle-field">
            <label className="toggle-label">
              <span className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={enabled} 
                  onChange={toggleEnabled} 
                />
                <span className="toggle-slider">
                  <span className="toggle-icon"><FaPowerOff /></span>
                </span>
              </span>
              <span className="toggle-text">
                {enabled ? 'Включено' : 'Выключено'}
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="interval-setting">
        <label>
          ⏱️ Интервал (секунды)
          <Tooltip text="Как часто будет срабатывать событие. Минимальное значение 10 секунд." />
        </label>
        <div className="interval-input-group">
          <input
            type="number"
            value={intervalValue}
            onChange={handleIntervalChange}
            onBlur={handleIntervalBlur}
            min="10"
            className="interval-input"
          />
          <div className="interval-presets">
            <button 
              onClick={() => setIntervalPreset(60)} 
              className={`preset-btn ${intervalValue === 60 ? 'active' : ''}`}
            >
              1 мин
            </button>
            <button 
              onClick={() => setIntervalPreset(300)} 
              className={`preset-btn ${intervalValue === 300 ? 'active' : ''}`}
            >
              5 мин
            </button>
            <button 
              onClick={() => setIntervalPreset(600)} 
              className={`preset-btn ${intervalValue === 600 ? 'active' : ''}`}
            >
              10 мин
            </button>
            <button 
              onClick={() => setIntervalPreset(900)} 
              className={`preset-btn ${intervalValue === 900 ? 'active' : ''}`}
            >
              15 мин
            </button>
            <button 
              onClick={() => setIntervalPreset(1800)} 
              className={`preset-btn ${intervalValue === 1800 ? 'active' : ''}`}
            >
              30 мин
            </button>
            <button 
              onClick={() => setIntervalPreset(3600)} 
              className={`preset-btn ${intervalValue === 3600 ? 'active' : ''}`}
            >
              1 час
            </button>
          </div>
        </div>
      </div>

      <ResponseEditor
        value={response}
        onChange={setResponse}
        overlays={overlays}
        showAliasesTab={false}
      />

      <div className="periodic-editor-actions">
        <button
          onClick={handleSave}
          className={`save-periodic-btn primary ${isNameEmpty ? 'disabled' : ''}`}
          disabled={isNameEmpty}
          title={isNameEmpty ? 'Введите название события' : ''}
        >
          {isNew ? <><FaPlus /> Создать событие</> : <><FaSave /> Сохранить событие</>}
        </button>
      </div>
    </div>
  );
}

export default PeriodicEditor;