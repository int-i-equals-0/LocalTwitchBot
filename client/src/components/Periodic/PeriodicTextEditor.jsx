import { useState } from 'react';
import { FaTrash, FaPlus, FaRandom, FaSpaceShuttle, FaArrowUp, FaArrowDown, FaPowerOff, FaUsers } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import Tooltip from '../Tooltip';
import './PeriodicTab.css';

function PeriodicTextEditor({ eventKey, event, onUpdate }) {
  const [previewKey, setPreviewKey] = useState(0);
  const [editName, setEditName] = useState(eventKey);
  const [intervalValue, setIntervalValue] = useState(event.interval || 300);

  // ========== INTERVAL HANDLING ==========
  const handleIntervalChange = (e) => {
    // Просто обновляем локальное состояние, не трогаем event
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

  const generateRandomFromComponent = (comp) => {
    if (comp.type === 'random') {
      const min = comp.min || 0;
      const max = comp.max || 100;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return null;
  };

  const generatePhraseFromComponent = (comp) => {
    if (comp.type === 'phrase' && comp.phrases && comp.phrases.length > 0) {
      const validPhrases = comp.phrases.filter(p => p.trim() !== '');
      if (validPhrases.length === 0) return null;
      return validPhrases[Math.floor(Math.random() * validPhrases.length)];
    }
    return null;
  };

  const generatePreview = () => {
    if (!event.response?.components) return '';
    const randomValues = new Map();
    const phraseValues = new Map();

    return event.response.components.map((comp, index) => {
      switch (comp.type) {
        case 'space': return ' ';
        case 'static': return comp.value || '';
        case 'author': return '@BotName';
        case 'random':
          if (!randomValues.has(index)) randomValues.set(index, generateRandomFromComponent(comp));
          return randomValues.get(index);
        case 'phrase':
          if (!phraseValues.has(index)) phraseValues.set(index, generatePhraseFromComponent(comp));
          return phraseValues.get(index) || '';
        case 'randomViewer': return '@randomViewer';
        default: return '';
      }
    }).join('');
  };

  const moveComponentUp = (index) => {
    if (index === 0) return;
    const components = [...event.response.components];
    [components[index - 1], components[index]] = [components[index], components[index - 1]];
    onUpdate({ ...event, response: { ...event.response, components } });
    setPreviewKey(prev => prev + 1);
  };

  const moveComponentDown = (index) => {
    const components = event.response.components;
    if (index === components.length - 1) return;
    const newComponents = [...components];
    [newComponents[index], newComponents[index + 1]] = [newComponents[index + 1], newComponents[index]];
    onUpdate({ ...event, response: { ...event.response, components: newComponents } });
    setPreviewKey(prev => prev + 1);
  };

  const addComponent = (type) => {
    const components = [...(event.response?.components || [])];
    switch (type) {
      case 'static': components.push({ type: 'static', value: '' }); break;
      case 'author': components.push({ type: 'author' }); break;
      case 'random': components.push({ type: 'random', min: 0, max: 100 }); break;
      case 'phrase': components.push({ type: 'phrase', phrases: [''] }); break;
      case 'space': components.push({ type: 'space' }); break;
      case 'randomViewer': components.push({ type: 'randomViewer' }); break;
    }
    onUpdate({ ...event, response: { ...event.response, components } });
    setPreviewKey(prev => prev + 1);
  };

  const updateComponent = (index, updates) => {
    const components = [...event.response.components];
    components[index] = { ...components[index], ...updates };
    onUpdate({ ...event, response: { ...event.response, components } });
    setPreviewKey(prev => prev + 1);
  };

  const removeComponent = (index) => {
    const components = event.response.components.filter((_, i) => i !== index);
    onUpdate({ ...event, response: { ...event.response, components } });
    setPreviewKey(prev => prev + 1);
  };

  const addPhrase = (compIndex) => {
    const components = [...event.response.components];
    components[compIndex].phrases.push('');
    onUpdate({ ...event, response: { ...event.response, components } });
  };

  const updatePhrase = (compIndex, phraseIndex, value) => {
    const components = [...event.response.components];
    components[compIndex].phrases[phraseIndex] = value;
    onUpdate({ ...event, response: { ...event.response, components } });
  };

  const removePhrase = (compIndex, phraseIndex) => {
    const components = [...event.response.components];
    components[compIndex].phrases.splice(phraseIndex, 1);
    if (components[compIndex].phrases.length === 0) {
      components.splice(compIndex, 1);
    }
    onUpdate({ ...event, response: { ...event.response, components } });
  };

  const toggleEnabled = () => {
    onUpdate({ ...event, enabled: !event.enabled });
  };

  const renderComponent = (comp, index) => {
    const totalComponents = event.response?.components?.length || 0;
    const isFirst = index === 0;
    const isLast = index === totalComponents - 1;

    return (
      <div className="component-wrapper" key={index}>
        <div className="move-buttons">
          <button onClick={() => moveComponentUp(index)} className={`move-btn up ${isFirst ? 'disabled' : ''}`} disabled={isFirst} title="Вверх">
            <FaArrowUp />
          </button>
          <button onClick={() => moveComponentDown(index)} className={`move-btn down ${isLast ? 'disabled' : ''}`} disabled={isLast} title="Вниз">
            <FaArrowDown />
          </button>
        </div>
        <div className="component-content">
          {(() => {
            switch (comp.type) {
              case 'space':
                return (
                  <div className="component space">
                    <span className="space-icon"><FaSpaceShuttle /> Пробел</span>
                    <button onClick={() => removeComponent(index)} className="remove-btn"><FaTrash /></button>
                  </div>
                );
              case 'static':
                return (
                  <div className="component static">
                    <span>📝 Текст:</span>
                    <input type="text" value={comp.value || ''} onChange={(e) => updateComponent(index, { value: e.target.value })} placeholder="Введите текст..." />
                    <button onClick={() => removeComponent(index)} className="remove-btn"><FaTrash /></button>
                  </div>
                );
              case 'author':
                return (
                  <div className="component variable">
                    <span>👤 Автор (бот)</span>
                    <Tooltip text="Имя бота (в периодическом событии автор — это бот)" />
                    <button onClick={() => removeComponent(index)} className="remove-btn"><FaTrash /></button>
                  </div>
                );
              case 'random':
                return (
                  <div className="component random">
                    <span>🎲 Случайное число:</span>
                    <input type="number" value={comp.min} onChange={(e) => updateComponent(index, { min: parseInt(e.target.value) || 0 })} placeholder="Мин" className="number-input" />
                    <span className="separator">—</span>
                    <input type="number" value={comp.max} onChange={(e) => updateComponent(index, { max: parseInt(e.target.value) || 100 })} placeholder="Макс" className="number-input" />
                    <button onClick={() => removeComponent(index)} className="remove-btn"><FaTrash /></button>
                  </div>
                );
              case 'phrase':
                return (
                  <div className="component phrase-set">
                    <div className="phrase-header">
                      <span>📚 Набор фраз</span>
                      <Tooltip text="Бот выберет случайную фразу из набора" />
                      <button onClick={() => addPhrase(index)} className="add-phrase-btn"><FaPlus /></button>
                    </div>
                    {comp.phrases.map((phrase, pIdx) => (
                      <div key={pIdx} className="phrase-item">
                        <input type="text" value={phrase} onChange={(e) => updatePhrase(index, pIdx, e.target.value)} placeholder="Введите фразу..." />
                        <button onClick={() => removePhrase(index, pIdx)} className="remove-phrase-btn"><FaTrash /></button>
                      </div>
                    ))}
                  </div>
                );
              case 'randomViewer':
                return (
                  <div className="component variable">
                    <span><FaUsers /> Случайный зритель</span>
                    <Tooltip text="Подставляет случайного зрителя из чата" />
                    <button onClick={() => removeComponent(index)} className="remove-btn"><FaTrash /></button>
                  </div>
                );
              default: return null;
            }
          })()}
        </div>
      </div>
    );
  };

  const preview = generatePreview();

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
              <input type="checkbox" checked={event.enabled !== false} onChange={toggleEnabled} />
              <span className="toggle-slider">
                <span className="toggle-icon"><FaPowerOff /></span>
              </span>
            </label>
            <span className="toggle-label">{event.enabled !== false ? 'Включено' : 'Выключено'}</span>
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
            <button onClick={() => { setIntervalValue(60); onUpdate({ ...event, interval: 60 }); }} className={`preset-btn ${event.interval === 60 ? 'active' : ''}`}>1 мин</button>
            <button onClick={() => { setIntervalValue(300); onUpdate({ ...event, interval: 300 }); }} className={`preset-btn ${event.interval === 300 ? 'active' : ''}`}>5 мин</button>
            <button onClick={() => { setIntervalValue(600); onUpdate({ ...event, interval: 600 }); }} className={`preset-btn ${event.interval === 600 ? 'active' : ''}`}>10 мин</button>
            <button onClick={() => { setIntervalValue(900); onUpdate({ ...event, interval: 900 }); }} className={`preset-btn ${event.interval === 900 ? 'active' : ''}`}>15 мин</button>
            <button onClick={() => { setIntervalValue(1800); onUpdate({ ...event, interval: 1800 }); }} className={`preset-btn ${event.interval === 1800 ? 'active' : ''}`}>30 мин</button>
            <button onClick={() => { setIntervalValue(3600); onUpdate({ ...event, interval: 3600 }); }} className={`preset-btn ${event.interval === 3600 ? 'active' : ''}`}>1 час</button>
          </div>
        </div>
      </div>

      <div className="components-editor">
        <h4>Сборка сообщения:</h4>
        <div className="components-list">
          {event.response?.components?.map((comp, idx) => renderComponent(comp, idx))}
          {(!event.response?.components || event.response.components.length === 0) && (
            <div className="empty-components">
              <p>✨ Начните добавлять компоненты для создания сообщения</p>
            </div>
          )}
        </div>

        <div className="add-component-buttons">
          <button onClick={() => addComponent('static')} className="add-btn"><FaPlus /> Текст</button>
          <button onClick={() => addComponent('randomViewer')} className="add-btn"><FaUsers /> Случайный зритель</button>
          <button onClick={() => addComponent('random')} className="add-btn"><FaRandom /> Случайное число</button>
          <button onClick={() => addComponent('phrase')} className="add-btn"><FaPlus /> Набор фраз</button>
          <button onClick={() => addComponent('space')} className="add-btn space-btn"><FaSpaceShuttle /> Пробел</button>
        </div>

        <div className="preview-section">
          <div className="preview-header">
            <strong>Предпросмотр:</strong>
            <button onClick={() => setPreviewKey(prev => prev + 1)} className="refresh-preview-btn" title="Обновить">
              <MdRefresh /> Обновить
            </button>
          </div>
          <div className="preview-box">
            {preview ? (
              <span className="preview-text">{preview}</span>
            ) : (
              <span className="preview-placeholder">Сообщение будет выглядеть так...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PeriodicTextEditor;