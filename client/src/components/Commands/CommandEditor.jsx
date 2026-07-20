// client/src/components/Commands/CommandEditor.jsx
import { useState } from 'react';
import { FaSave, FaPlus } from 'react-icons/fa';
import PermissionsSelector from './PermissionsSelector';
import ResponseEditor from '../Common/ResponseEditor';
import AliasEditor from '../Common/AliasEditor';
import './CommandEditor.css';

function CommandEditor({ commandKey, config, onUpdate, overlays = [], allCommands = {}, isNew = false }) {
  const [name, setName] = useState(config.name || (commandKey ? commandKey.slice(1) : ''));
  const [permissions, setPermissions] = useState(config.permissions || []);
  const [aliases, setAliases] = useState(config.aliases || []);
  const [response, setResponse] = useState(config.response || {
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

  const isNameEmpty = !name.trim();

  const handleSave = () => {
    if (isNameEmpty) return;
    onUpdate({
      ...config,
      name: name.trim(),
      permissions,
      aliases,
      response
    });
  };

  return (
    <div className="command-editor">
      <div className="command-editor-header">
        <div className="command-name-section">
          <label>Название команды (без !)</label>
          <div className="command-name-input-wrapper">
            <span className="command-name-prefix">!</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/^!+/, ''))}
              placeholder="название"
              className="command-name-input"
              autoFocus={isNew}
            />
          </div>
          {!isNameEmpty && (
            <div className="command-preview">
              <span className="preview-label">Будет доступна как:</span>
              <code className="command-preview-name">!{name}</code>
            </div>
          )}
        </div>
      </div>

      <PermissionsSelector value={permissions} onChange={setPermissions} />

      <ResponseEditor
        value={response}
        onChange={setResponse}
        overlays={overlays}
        showAliasesTab={true}
        aliasesValue={aliases}
        onAliasesChange={setAliases}
        allCommands={allCommands}
        currentCommandName={name}
      />

      <div className="command-editor-actions">
        <button
          onClick={handleSave}
          className={`save-command-btn primary ${isNameEmpty ? 'disabled' : ''}`}
          disabled={isNameEmpty}
          title={isNameEmpty ? 'Введите название команды' : ''}
        >
          {isNew ? <><FaPlus /> Создать команду</> : <><FaSave /> Сохранить команду</>}
        </button>
      </div>
    </div>
  );
}

export default CommandEditor;