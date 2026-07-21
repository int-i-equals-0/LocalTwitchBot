// client/src/components/Periodic/PeriodicEditor.jsx

import { useState } from 'react';
import { FaSave, FaPlus, FaPowerOff } from 'react-icons/fa';
import ResponseEditor from '../Common/ResponseEditor';
import Tooltip from '../Tooltip';
import './PeriodicTab.css';

const DEFAULT_COLORS = [
  { value: '#ef4444', label: '🔴 Красный' },
  { value: '#f59e0b', label: '🟡 Жёлтый' },
  { value: '#22c55e', label: '🟢 Зелёный' },
  { value: '#3b82f6', label: '🔵 Синий' },
  { value: '#8b5cf6', label: '🟣 Фиолетовый' },
  { value: '#ec4899', label: '🩷 Розовый' },
  { value: '#14b8a6', label: '🩵 Бирюзовый' },
  { value: '#f97316', label: '🟠 Оранжевый' },
  { value: '#06b6d4', label: '🌊 Циан' },
  { value: '#84cc16', label: '🥝 Лайм' },
];

function PeriodicEditor({ eventKey, event, onUpdate, overlays = [], isNew = false }) {
  const [editName, setEditName] = useState(eventKey);
  const [intervalValue, setIntervalValue] = useState(event.interval || 300);
  const [offsetValue, setOffsetValue] = useState(event.offset || 0);
  const [color, setColor] = useState(event.color || '');
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

  const handleOffsetChange = (e) => {
    setOffsetValue(e.target.value);
  };

  const handleOffsetBlur = () => {
    const numValue = parseInt(offsetValue);
    const interval = Math.max(10, parseInt(intervalValue) || 10);
    if (isNaN(numValue) || numValue < 0) {
      setOffsetValue(0);
    } else if (numValue >= interval) {
      setOffsetValue(numValue % interval);
    }
  };

  const toggleEnabled = () => {
    setEnabled(!enabled);
  };

  const handleSave = () => {
    if (isNameEmpty) return;
    const interval = Math.max(10, parseInt(intervalValue) || 10);
    const offset = Math.max(0, parseInt(offsetValue) || 0) % interval;
    onUpdate({
      ...event,
      _newName: editName !== eventKey ? editName : undefined,
      enabled,
      interval,
      offset,
      color,
      response
    });
  };

  const setIntervalPreset = (seconds) => {
    setIntervalValue(seconds);
  };

  const formatOffset = (seconds) => {
    if (!seconds || seconds === 0) return '0 сек';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0 && s > 0) return `${m} мин ${s} сек`;
    if (m > 0) return `${m} мин`;
    return `${s} сек`;
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

      {/* Цвет на таймлайне */}
      <div className="color-setting">
        <label>
          🎨 Цвет на таймлайне
          <Tooltip text="Цвет для отображения этого события на таймлайне. Если не выбран — будет назначен автоматически." />
        </label>
        <div className="color-presets">
          {DEFAULT_COLORS.map(c => (
            <button
              key={c.value}
              className={`color-preset-btn ${color === c.value ? 'active' : ''}`}
              style={{ backgroundColor: c.value }}
              onClick={() => setColor(color === c.value ? '' : c.value)}
              title={c.label}
            />
          ))}
          <div className="color-custom">
            <input
              type="color"
              className="color-picker-input"
              value={color || '#9147ff'}
              onChange={(e) => setColor(e.target.value)}
              title="Свой цвет"
            />
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
              className={`preset-btn ${intervalValue == 60 ? 'active' : ''}`}
            >
              1 мин
            </button>
            <button 
              onClick={() => setIntervalPreset(300)} 
              className={`preset-btn ${intervalValue == 300 ? 'active' : ''}`}
            >
              5 мин
            </button>
            <button 
              onClick={() => setIntervalPreset(600)} 
              className={`preset-btn ${intervalValue == 600 ? 'active' : ''}`}
            >
              10 мин
            </button>
            <button 
              onClick={() => setIntervalPreset(900)} 
              className={`preset-btn ${intervalValue == 900 ? 'active' : ''}`}
            >
              15 мин
            </button>
            <button 
              onClick={() => setIntervalPreset(1800)} 
              className={`preset-btn ${intervalValue == 1800 ? 'active' : ''}`}
            >
              30 мин
            </button>
            <button 
              onClick={() => setIntervalPreset(3600)} 
              className={`preset-btn ${intervalValue == 3600 ? 'active' : ''}`}
            >
              1 час
            </button>
          </div>
        </div>
      </div>

      {/* Смещение */}
      <div className="offset-setting">
        <label>
          ⏩ Смещение (секунды)
          <Tooltip text="Задержка перед первым срабатыванием. Используйте для разнесения событий с одинаковым интервалом. Также можно настроить через таймлайн (перетаскивание меток)." />
        </label>
        <div className="offset-input-group">
          <input
            type="number"
            value={offsetValue}
            onChange={handleOffsetChange}
            onBlur={handleOffsetBlur}
            min="0"
            max={Math.max(10, (parseInt(intervalValue) || 300) - 1)}
            className="interval-input"
          />
          <span className="offset-preview">
            Первое срабатывание через: <strong>{formatOffset(parseInt(offsetValue) || 0)}</strong>
          </span>
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