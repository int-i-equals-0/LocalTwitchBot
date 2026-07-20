// client/src/components/Common/ChatEditor.jsx
import { useState } from 'react';
import { FaTrash, FaPlus, FaRandom, FaSpaceShuttle, FaArrowUp, FaArrowDown, FaUsers, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import Tooltip from '../Tooltip';
import './ChatEditor.css';

function ChatEditor({ value = { enabled: false, components: [] }, onChange }) {
  const [previewKey, setPreviewKey] = useState(0);

  const generatePreview = () => {
    if (!value.components || value.components.length === 0) return '';
    
    return value.components.map((comp, index) => {
      switch (comp.type) {
        case 'space': return ' ';
        case 'static': return comp.value || '';
        case 'author': return '@username';
        case 'target': return '@target';
        case 'randomViewer': return '@randomViewer';
        case 'random': {
          const min = comp.min || 0;
          const max = comp.max || 100;
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        case 'phrase': {
          if (comp.phrases?.length > 0) {
            const valid = comp.phrases.filter(p => p.trim());
            if (valid.length) return valid[Math.floor(Math.random() * valid.length)];
          }
          return '';
        }
        default: return '';
      }
    }).join('');
  };

  const toggleEnabled = () => {
    onChange({
      ...value,
      enabled: !value.enabled
    });
  };

  const addComponent = (type) => {
    const newComponent = (() => {
      switch (type) {
        case 'static': return { type: 'static', value: '' };
        case 'author': return { type: 'author' };
        case 'target': return { type: 'target' };
        case 'randomViewer': return { type: 'randomViewer' };
        case 'random': return { type: 'random', min: 1, max: 100 };
        case 'phrase': return { type: 'phrase', phrases: [''] };
        case 'space': return { type: 'space' };
        default: return { type: 'static', value: '' };
      }
    })();

    onChange({
      ...value,
      components: [...(value.components || []), newComponent]
    });
    setPreviewKey(prev => prev + 1);
  };

  const updateComponent = (index, updates) => {
    const newComponents = [...(value.components || [])];
    newComponents[index] = { ...newComponents[index], ...updates };
    onChange({
      ...value,
      components: newComponents
    });
    setPreviewKey(prev => prev + 1);
  };

  const removeComponent = (index) => {
    const newComponents = (value.components || []).filter((_, i) => i !== index);
    onChange({
      ...value,
      components: newComponents
    });
    setPreviewKey(prev => prev + 1);
  };

  const moveComponent = (index, direction) => {
    const newComponents = [...(value.components || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newComponents.length) return;
    [newComponents[index], newComponents[newIndex]] = [newComponents[newIndex], newComponents[index]];
    onChange({
      ...value,
      components: newComponents
    });
    setPreviewKey(prev => prev + 1);
  };

  const addPhrase = (compIndex) => {
    const newComponents = [...(value.components || [])];
    newComponents[compIndex] = {
      ...newComponents[compIndex],
      phrases: [...(newComponents[compIndex].phrases || []), '']
    };
    onChange({
      ...value,
      components: newComponents
    });
  };

  const updatePhrase = (compIndex, phraseIndex, phraseValue) => {
    const newComponents = [...(value.components || [])];
    const phrases = [...newComponents[compIndex].phrases];
    phrases[phraseIndex] = phraseValue;
    newComponents[compIndex] = { ...newComponents[compIndex], phrases };
    onChange({
      ...value,
      components: newComponents
    });
  };

  const removePhrase = (compIndex, phraseIndex) => {
    const newComponents = [...(value.components || [])];
    const phrases = newComponents[compIndex].phrases.filter((_, i) => i !== phraseIndex);
    if (phrases.length === 0) {
      // Если фраз не осталось, удаляем весь компонент
      onChange({
        ...value,
        components: newComponents.filter((_, i) => i !== compIndex)
      });
    } else {
      newComponents[compIndex] = { ...newComponents[compIndex], phrases };
      onChange({
        ...value,
        components: newComponents
      });
    }
  };

  const renderComponent = (comp, index) => {
    const total = (value.components || []).length;
    const isFirst = index === 0;
    const isLast = index === total - 1;

    return (
      <div className="component-wrapper" key={index}>
        <div className="move-buttons">
          <button 
            onClick={() => moveComponent(index, -1)} 
            className={`move-btn up ${isFirst ? 'disabled' : ''}`}
            disabled={isFirst}
            title="Вверх"
          >
            <FaArrowUp />
          </button>
          <button 
            onClick={() => moveComponent(index, 1)} 
            className={`move-btn down ${isLast ? 'disabled' : ''}`}
            disabled={isLast}
            title="Вниз"
          >
            <FaArrowDown />
          </button>
        </div>
        <div className="component-content">
          {comp.type === 'space' && (
            <div className="component space">
              <span className="space-icon"><FaSpaceShuttle /> Пробел</span>
              <Tooltip text="Вставляет пробел между соседними компонентами" />
              <button onClick={() => removeComponent(index)} className="remove-btn">
                <FaTrash />
              </button>
            </div>
          )}

          {comp.type === 'static' && (
            <div className="component static">
              <span>📝 Текст:</span>
              <input
                type="text"
                value={comp.value || ''}
                onChange={(e) => updateComponent(index, { value: e.target.value })}
                placeholder="Введите текст..."
              />
              <button onClick={() => removeComponent(index)} className="remove-btn">
                <FaTrash />
              </button>
            </div>
          )}

          {comp.type === 'author' && (
            <div className="component variable">
              <span>👤 Автор</span>
              <Tooltip text="Имя пользователя, вызвавшего команду/событие" />
              <button onClick={() => removeComponent(index)} className="remove-btn">
                <FaTrash />
              </button>
            </div>
          )}

          {comp.type === 'target' && (
            <div className="component variable">
              <span>🎯 Цель</span>
              <Tooltip text="Первый аргумент после команды" />
              <button onClick={() => removeComponent(index)} className="remove-btn">
                <FaTrash />
              </button>
            </div>
          )}

          {comp.type === 'randomViewer' && (
            <div className="component variable">
              <span><FaUsers /> Случайный зритель</span>
              <Tooltip text="Подставляет случайного зрителя из чата" />
              <button onClick={() => removeComponent(index)} className="remove-btn">
                <FaTrash />
              </button>
            </div>
          )}

          {comp.type === 'random' && (
            <div className="component random">
              <span>🎲 Случайное число:</span>
              <input
                type="number"
                value={comp.min || 0}
                onChange={(e) => updateComponent(index, { min: parseInt(e.target.value) || 0 })}
                placeholder="Мин"
                className="number-input"
              />
              <span className="separator">—</span>
              <input
                type="number"
                value={comp.max || 100}
                onChange={(e) => updateComponent(index, { max: parseInt(e.target.value) || 100 })}
                placeholder="Макс"
                className="number-input"
              />
              <button onClick={() => removeComponent(index)} className="remove-btn">
                <FaTrash />
              </button>
            </div>
          )}

          {comp.type === 'phrase' && (
            <div className="component phrase-set">
              <div className="phrase-header">
                <span>📚 Набор фраз</span>
                <Tooltip text="Бот выберет случайную фразу из набора" />
                <button onClick={() => addPhrase(index)} className="add-phrase-btn">
                  <FaPlus />
                </button>
              </div>
              {(comp.phrases || []).map((phrase, pIdx) => (
                <div key={pIdx} className="phrase-item">
                  <input
                    type="text"
                    value={phrase}
                    onChange={(e) => updatePhrase(index, pIdx, e.target.value)}
                    placeholder={`Вариант ${pIdx + 1}`}
                  />
                  <button onClick={() => removePhrase(index, pIdx)} className="remove-phrase-btn">
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="chat-editor">
      <div className="editor-header">
        <div className="toggle-container">
          <button 
            className={`toggle-btn ${value.enabled ? 'enabled' : 'disabled'}`}
            onClick={toggleEnabled}
          >
            {value.enabled ? <FaToggleOn /> : <FaToggleOff />}
            <span>{value.enabled ? 'Текст в чат включён' : 'Текст в чат выключен'}</span>
          </button>
          <Tooltip text="Включить отправку текстового сообщения в чат" />
        </div>
      </div>

      {value.enabled && (
        <div className="editor-content">
          <div className="components-list">
            {(!value.components || value.components.length === 0) ? (
              <div className="empty-components">
                <p>✨ Начните добавлять компоненты для создания сообщения</p>
              </div>
            ) : (
              value.components.map((comp, idx) => renderComponent(comp, idx))
            )}
          </div>

          <div className="add-component-buttons">
            <button onClick={() => addComponent('static')} className="add-btn">
              <FaPlus /> Текст
            </button>
            <button onClick={() => addComponent('author')} className="add-btn">
              <FaPlus /> Автор
            </button>
            <button onClick={() => addComponent('target')} className="add-btn">
              <FaPlus /> Цель
            </button>
            <button onClick={() => addComponent('randomViewer')} className="add-btn">
              <FaUsers /> Случайный зритель
            </button>
            <button onClick={() => addComponent('random')} className="add-btn">
              <FaRandom /> Случайное число
            </button>
            <button onClick={() => addComponent('phrase')} className="add-btn">
              <FaPlus /> Набор фраз
            </button>
            <button onClick={() => addComponent('space')} className="add-btn space-btn">
              <FaSpaceShuttle /> Пробел
            </button>
          </div>

          <div className="preview-section">
            <div className="preview-header">
              <strong>Предпросмотр:</strong>
              <button onClick={() => setPreviewKey(prev => prev + 1)} className="refresh-preview-btn" title="Обновить">
                <MdRefresh /> Обновить
              </button>
            </div>
            <div className="preview-box">
              {generatePreview() ? (
                <span className="preview-text">{generatePreview()}</span>
              ) : (
                <span className="preview-placeholder">Сообщение будет выглядеть так...</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatEditor;