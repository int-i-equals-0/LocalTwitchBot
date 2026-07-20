import { useState, useEffect } from 'react';
import { FaPowerOff } from 'react-icons/fa';
import Tooltip from '../Tooltip';
import PermissionsSelector from './PermissionsSelector';
import './CommandEditor.css';

function AliasCommandEditor({ command, onUpdate, allCommands }) {
  const [targetCommand, setTargetCommand] = useState(command.target || '');

  // Находим целевую команду для предпросмотра
  const targetExists = allCommands[targetCommand];
  const targetConfig = targetExists ? allCommands[targetCommand] : null;

  const toggleEnabled = () => {
    onUpdate({
      ...command,
      enabled: !command.enabled
    });
  };

  return (
    <div className="alias-command-editor">
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
            placeholder="Название алиаса (без !)"
            className="command-name-input"
          />
          
          {/* Тумблер включения/выключения */}
          <div className="command-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={command.enabled !== false}
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

      <div className="alias-selector">
        <label>
          🔗 Дублирует команду:
          <Tooltip text="Выберите команду, которую будет повторять этот алиас" />
        </label>
        
        <select
          value={targetCommand}
          onChange={(e) => {
            setTargetCommand(e.target.value);
            onUpdate({ ...command, target: e.target.value });
          }}
          className="alias-select"
        >
          <option value="">Выберите команду...</option>
          {Object.keys(allCommands)
            .filter(cmd => cmd !== `!${command.name}`) // Нельзя ссылаться на себя
            .map(cmd => (
              <option key={cmd} value={cmd}>
                {cmd} {allCommands[cmd].type === 'text' ? '💬' : 
                       allCommands[cmd].type === 'media' ? '🎬' : '⚡'}
              </option>
            ))}
        </select>

        {targetCommand && targetExists && (
          <div className="alias-preview">
            <h5>Предпросмотр:</h5>
            <div className="preview-box">
              {targetConfig.type === 'text' && (
                <div>💬 Текстовая команда</div>
              )}
              {targetConfig.type === 'media' && (
                <div>🎬 Медиа: {targetConfig.response?.file}</div>
              )}
              {targetConfig.type === 'alias' && (
                <div>⚡ Цепочка алиасов</div>
              )}
            </div>
          </div>
        )}

        {targetCommand && !targetExists && (
          <div className="warning">
            ⚠️ Выбранная команда не существует!
          </div>
        )}
      </div>
    </div>
  );
}

export default AliasCommandEditor;