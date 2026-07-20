import { useState } from 'react';
import { FaTrash, FaPlus, FaRandom, FaSpaceShuttle, FaArrowUp, FaArrowDown, FaPowerOff } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import Tooltip from '../Tooltip';
import PermissionsSelector from './PermissionsSelector';
import './CommandEditor.css';
import { FaUsers } from 'react-icons/fa';

function TextCommandEditor({ command, onUpdate }) {
  const [previewKey, setPreviewKey] = useState(0); // Для принудительного обновления превью
  const [newPhrase, setNewPhrase] = useState('');

  // Функция для генерации случайного числа на основе компонента
  const generateRandomFromComponent = (comp) => {
    if (comp.type === 'random') {
      const min = comp.min || 0;
      const max = comp.max || 100;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return null;
  };

  // Функция для генерации случайной фразы из набора
  const generatePhraseFromComponent = (comp) => {
    if (comp.type === 'phrase' && comp.phrases && comp.phrases.length > 0) {
      const validPhrases = comp.phrases.filter(p => p.trim() !== '');
      if (validPhrases.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * validPhrases.length);
      return validPhrases[randomIndex];
    }
    return null;
  };

  // Функция для генерации превью с реальными значениями
  const generatePreview = () => {
    if (!command.response?.components) return '';
    
    // Храним сгенерированные значения для этого превью
    const randomValues = new Map();
    const phraseValues = new Map();
    
    // Просто склеиваем все компоненты подряд, без добавления пробелов
    return command.response.components.map((comp, index) => {
      switch (comp.type) {
        case 'space':
          return ' '; // Пробел только там, где явно указан
          
        case 'static':
          return comp.value || '';
          
        case 'author':
          return '@username';
          
        case 'target':
          return '@target';
          
        case 'random': {
          if (!randomValues.has(index)) {
            randomValues.set(index, generateRandomFromComponent(comp));
          }
          return randomValues.get(index);
        }
        
        case 'phrase': {
          if (!phraseValues.has(index)) {
            phraseValues.set(index, generatePhraseFromComponent(comp));
          }
          return phraseValues.get(index) || '';
        }

        case 'randomViewer':
          return '@randomViewer';
        
        default:
          return '';
      }
    }).join(''); // Просто склеиваем без дополнительных пробелов
  };

  // НОВАЯ ФУНКЦИЯ: Перемещение компонента вверх
  const moveComponentUp = (index) => {
    if (index === 0) return; // Нельзя переместить первый элемент выше
    
    const components = [...command.response.components];
    // Меняем местами с предыдущим элементом
    [components[index - 1], components[index]] = [components[index], components[index - 1]];
    
    onUpdate({
      ...command,
      response: { ...command.response, components }
    });
    
    // Обновляем превью
    setPreviewKey(prev => prev + 1);
  };

  // НОВАЯ ФУНКЦИЯ: Перемещение компонента вниз
  const moveComponentDown = (index) => {
    const components = command.response.components;
    if (index === components.length - 1) return; // Нельзя переместить последний элемент ниже
    
    const newComponents = [...components];
    // Меняем местами со следующим элементом
    [newComponents[index], newComponents[index + 1]] = [newComponents[index + 1], newComponents[index]];
    
    onUpdate({
      ...command,
      response: { ...command.response, components: newComponents }
    });
    
    // Обновляем превью
    setPreviewKey(prev => prev + 1);
  };

  const addComponent = (type) => {
    const components = [...(command.response?.components || [])];
    
    switch (type) {
      case 'static':
        components.push({ type: 'static', value: '' });
        break;
      case 'author':
        components.push({ type: 'author' });
        break;
      case 'target':
        components.push({ type: 'target' });
        break;
      case 'random':
        components.push({ type: 'random', min: 0, max: 100 });
        break;
      case 'phrase':
        components.push({ type: 'phrase', phrases: [''] });
        break;
      case 'space':
        components.push({ type: 'space' });
        break;
      case 'randomViewer':
        components.push({ type: 'randomViewer' });
        break;
    }
    
    onUpdate({
      ...command,
      response: { ...command.response, components }
    });
    
    // Обновляем превью
    setPreviewKey(prev => prev + 1);
  };

  const updateComponent = (index, updates) => {
    const components = [...command.response.components];
    components[index] = { ...components[index], ...updates };
    onUpdate({
      ...command,
      response: { ...command.response, components }
    });
    
    // Обновляем превью
    setPreviewKey(prev => prev + 1);
  };

  const removeComponent = (index) => {
    const components = command.response.components.filter((_, i) => i !== index);
    onUpdate({
      ...command,
      response: { ...command.response, components }
    });
    
    // Обновляем превью
    setPreviewKey(prev => prev + 1);
  };

  const addPhrase = (compIndex) => {
    const components = [...command.response.components];
    components[compIndex].phrases.push('');
    onUpdate({
      ...command,
      response: { ...command.response, components }
    });
  };

  const updatePhrase = (compIndex, phraseIndex, value) => {
    const components = [...command.response.components];
    components[compIndex].phrases[phraseIndex] = value;
    onUpdate({
      ...command,
      response: { ...command.response, components }
    });
  };

  const removePhrase = (compIndex, phraseIndex) => {
    const components = [...command.response.components];
    components[compIndex].phrases.splice(phraseIndex, 1);
    
    // Если после удаления фраз не осталось, удаляем весь компонент
    if (components[compIndex].phrases.length === 0) {
      components.splice(compIndex, 1);
    }
    
    onUpdate({
      ...command,
      response: { ...command.response, components }
    });
  };

  const refreshPreview = () => {
    setPreviewKey(prev => prev + 1);
  };

  const toggleEnabled = () => {
    onUpdate({
      ...command,
      enabled: !command.enabled
    });
  };

  const renderComponent = (comp, index) => {
    const totalComponents = command.response?.components?.length || 0;
    const isFirst = index === 0;
    const isLast = index === totalComponents - 1;

    // Оборачиваем содержимое компонента в общий контейнер с кнопками перемещения
    return (
      <div className="component-wrapper" key={index}>
        {/* Кнопки перемещения слева */}
        <div className="move-buttons">
          <button 
            onClick={() => moveComponentUp(index)} 
            className={`move-btn up ${isFirst ? 'disabled' : ''}`}
            disabled={isFirst}
            title="Переместить вверх"
          >
            <FaArrowUp />
          </button>
          <button 
            onClick={() => moveComponentDown(index)} 
            className={`move-btn down ${isLast ? 'disabled' : ''}`}
            disabled={isLast}
            title="Переместить вниз"
          >
            <FaArrowDown />
          </button>
        </div>

        {/* Сам компонент */}
        <div className="component-content">
          {(() => {
            switch (comp.type) {
              case 'space':
                return (
                  <div className="component space">
                    <span className="space-icon"><FaSpaceShuttle /> Пробел</span>
                    <Tooltip text="Вставляет пробел между соседними компонентами" />
                    <button onClick={() => removeComponent(index)} className="remove-btn">
                      <FaTrash />
                    </button>
                  </div>
                );

              case 'static':
                return (
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
                );

              case 'author':
                return (
                  <div className="component variable">
                    <span>👤 Автор</span>
                    <Tooltip text="Имя пользователя, написавшего команду" />
                    <button onClick={() => removeComponent(index)} className="remove-btn">
                      <FaTrash />
                    </button>
                  </div>
                );

              case 'target':
                return (
                  <div className="component variable">
                    <span>🎯 Цель</span>
                    <Tooltip text="Первый аргумент после команды" />
                    <button onClick={() => removeComponent(index)} className="remove-btn">
                      <FaTrash />
                    </button>
                  </div>
                );

              case 'random':
                return (
                  <div className="component random">
                    <span>🎲 Случайное число:</span>
                    <input
                      type="number"
                      value={comp.min}
                      onChange={(e) => updateComponent(index, { min: parseInt(e.target.value) || 0 })}
                      placeholder="Мин"
                      className="number-input"
                    />
                    <span className="separator">—</span>
                    <input
                      type="number"
                      value={comp.max}
                      onChange={(e) => updateComponent(index, { max: parseInt(e.target.value) || 100 })}
                      placeholder="Макс"
                      className="number-input"
                    />
                    <button onClick={() => removeComponent(index)} className="remove-btn">
                      <FaTrash />
                    </button>
                  </div>
                );

              case 'phrase':
                return (
                  <div className="component phrase-set">
                    <div className="phrase-header">
                      <span>📚 Набор фраз</span>
                      <Tooltip text="Бот выберет случайную фразу из набора" />
                      <button onClick={() => addPhrase(index)} className="add-phrase-btn">
                        <FaPlus />
                      </button>
                    </div>
                    {comp.phrases.map((phrase, pIdx) => (
                      <div key={pIdx} className="phrase-item">
                        <input
                          type="text"
                          value={phrase}
                          onChange={(e) => updatePhrase(index, pIdx, e.target.value)}
                          placeholder="Введите фразу..."
                        />
                        <button onClick={() => removePhrase(index, pIdx)} className="remove-phrase-btn">
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                );

              case 'randomViewer':
                return (
                  <div className="component variable">
                    <span><FaUsers /> Случайный зритель</span>
                    <Tooltip text="Подставляет случайного зрителя из чата" />
                    <button onClick={() => removeComponent(index)} className="remove-btn">
                      <FaTrash />
                    </button>
                  </div>
                );

              default:
                return null;
            }
          })()}
        </div>
      </div>
    );
  };

  const preview = generatePreview();

   return (
    <div className="text-command-editor">
      <div className="command-header">
        <div className="command-title-row">
          <input
            type="text"
            value={command.name || ''}
            onChange={(e) => {
              let name = e.target.value;
              name = name.replace(/^!+/, '');
              onUpdate({ ...command, name });
            }}
            placeholder="Название команды (без !)"
            className="command-name-input"
          />
          
          {/* Тумблер включения/выключения */}
          <div className="command-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={command.enabled !== false} // По умолчанию true
                onChange={toggleEnabled}
              />
              <span className="toggle-slider">
                <span className="toggle-icon">
                  <FaPowerOff />
                </span>
              </span>
            </label>
            <span className="toggle-label">
              {command.enabled !== false ? 'Включена' : 'Выключена'}
            </span>
            <Tooltip text="Временно отключить команду без удаления" />
          </div>
        </div>
      </div>

      <PermissionsSelector
        value={command.permissions || []}
        onChange={(perms) => onUpdate({ ...command, permissions: perms })}
      />

      <div className="components-editor">
        <h4>Сборка сообщения:</h4>
        <div className="components-list">
          {command.response?.components?.map((comp, idx) => renderComponent(comp, idx))}
          {(!command.response?.components || command.response.components.length === 0) && (
            <div className="empty-components">
              <p>✨ Начните добавлять компоненты для создания сообщения</p>
            </div>
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
          <button onClick={() => addComponent('random')} className="add-btn">
            <FaRandom /> Случайное число
          </button>
          <button onClick={() => addComponent('phrase')} className="add-btn">
            <FaPlus /> Набор фраз
          </button>
          <button onClick={() => addComponent('randomViewer')} className="add-btn">
            <FaUsers /> Случайный зритель
          </button>
          <button onClick={() => addComponent('space')} className="add-btn space-btn">
            <FaSpaceShuttle /> Пробел
          </button>
        </div>

        <div className="preview-section">
          <div className="preview-header">
            <strong>Предпросмотр:</strong>
            <button onClick={refreshPreview} className="refresh-preview-btn" title="Сгенерировать новые случайные значения">
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
          <div className="preview-hint">
            <Tooltip text="Превью показывает реальный результат с случайными числами и фразами. Нажмите 'Обновить' чтобы увидеть другие варианты." />
            <span className="hint-text">Нажмите 🔄 чтобы увидеть другие варианты</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TextCommandEditor;