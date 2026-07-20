// client/src/components/Common/AliasEditor.jsx
import { useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import './ResponseEditor.css';

function AliasEditor({ value = [], onChange, allCommands = {}, currentCommandName }) {
  const [newAlias, setNewAlias] = useState('');

  const addAlias = () => {
    const trimmed = newAlias.trim();
    if (!trimmed) return;
    
    const alias = trimmed.startsWith('!') ? trimmed : `!${trimmed}`;
    const aliasWithoutBang = alias.slice(1);
    
    if (value.includes(alias)) {
      alert('Такой алиас уже существует');
      return;
    }
    
    if (alias === `!${currentCommandName}`) {
      alert('Нельзя создать алиас, ссылающийся на самого себя');
      return;
    }
    
    if (allCommands[alias]) {
      alert(`Команда ${alias} уже существует. Алиас не может совпадать с существующей командой.`);
      return;
    }
    
    onChange([...value, alias]);
    setNewAlias('');
  };

  const removeAlias = (alias) => {
    onChange(value.filter(a => a !== alias));
  };

  return (
    <div className="aliases-editor">
      <div className="aliases-header">
        <h4>⚡ Алиасы команды</h4>
        <p className="aliases-description">
          Дополнительные команды, которые будут выполнять то же самое действие.
          Алиасы не могут совпадать с существующими командами.
        </p>
      </div>

      <div className="aliases-list">
        {value.length === 0 ? (
          <div className="empty-aliases">
            <p>📭 У команды нет алиасов</p>
            <p className="hint">Добавьте алиас, чтобы команду можно было вызвать по нескольким именам</p>
          </div>
        ) : (
          value.map(alias => (
            <div key={alias} className="alias-item">
              <span className="alias-name">{alias}</span>
              <button onClick={() => removeAlias(alias)} className="remove-alias-btn" title="Удалить алиас">
                <FaTrash />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="add-alias-form">
        <input
          type="text"
          value={newAlias}
          onChange={(e) => setNewAlias(e.target.value.replace(/^!+/, ''))}
          placeholder="Название алиаса (без !)"
          onKeyPress={(e) => e.key === 'Enter' && addAlias()}
          className="alias-input"
        />
        <button onClick={addAlias} className="add-alias-btn">
          <FaPlus /> Добавить алиас
        </button>
      </div>

      <div className="aliases-warning">
        ⚠️ Алиас будет работать только если оригинальная команда включена
      </div>
    </div>
  );
}

export default AliasEditor;