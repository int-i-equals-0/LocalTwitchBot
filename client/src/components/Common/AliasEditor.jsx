// client/src/components/Common/AliasEditor.jsx

import { useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { useNotification, NOTIFICATION_TYPES } from '../Notification';
import './ResponseEditor.css';

function AliasEditor({ value = [], onChange, allCommands = {}, currentCommandName }) {
  const { showNotification } = useNotification();
  const [newAlias, setNewAlias] = useState('');

  const addAlias = () => {
    const trimmed = newAlias.trim();
    if (!trimmed) return;

    const alias = trimmed.startsWith('!') ? trimmed : `!${trimmed}`;

    if (value.includes(alias)) {
      showNotification('⚠️ Такой алиас уже существует', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    if (alias === `!${currentCommandName}`) {
      showNotification('⚠️ Нельзя создать алиас, ссылающийся на самого себя', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    if (allCommands[alias]) {
      showNotification(`❌ Команда ${alias} уже существует. Алиас не может совпадать с существующей командой.`, NOTIFICATION_TYPES.ERROR, 3000);
      return;
    }

    onChange([...value, alias]);
    setNewAlias('');
    showNotification(`✅ Алиас ${alias} добавлен`, NOTIFICATION_TYPES.SUCCESS, 1500);
  };

  const removeAlias = (alias) => {
    onChange(value.filter(a => a !== alias));
    showNotification(`🗑️ Алиас ${alias} удалён`, NOTIFICATION_TYPES.WARNING, 1500);
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
          onKeyDown={(e) => e.key === 'Enter' && addAlias()}
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