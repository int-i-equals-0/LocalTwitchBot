// client/src/components/Commands/CommandsTab.jsx
import { useState } from 'react';
import { FaPlus, FaTrash, FaPowerOff } from 'react-icons/fa';
import ResponseEditor from '../Common/ResponseEditor';
import PermissionsSelector from './PermissionsSelector';
import { useNotification, NOTIFICATION_TYPES } from '../Notification/Notification';
import './CommandEditor.css';

function CommandsTab({ commands, onUpdate, overlays = [] }) {
  const { showNotification, showConfirm } = useNotification();
  const [newCommand, setNewCommand] = useState({
    name: '',
    permissions: [],
    enabled: true
  });

  const [expandedCommands, setExpandedCommands] = useState({});

  const toggleExpand = (cmdKey) => {
    setExpandedCommands(prev => ({ ...prev, [cmdKey]: !prev[cmdKey] }));
  };

  const addCommand = () => {
    if (!newCommand.name) {
      showNotification('⚠️ Введите название команды!', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    const commandKey = `!${newCommand.name}`;
    if (commands[commandKey]) {
      showNotification('❌ Команда с таким именем уже существует!', NOTIFICATION_TYPES.ERROR, 3000);
      return;
    }

    const newConfig = {
      enabled: true,
      name: newCommand.name,
      permissions: newCommand.permissions || [],
      aliases: [],
      response: {
        chat: {
          enabled: false,
          components: []
        },
        media: {
          enabled: false,
          file: '',
          volume: 100,
          overlay: null,
          text: {
            enabled: false,
            content: '',
            position: 'overlay'
          }
        }
      }
    };

    onUpdate({ ...commands, [commandKey]: newConfig });
    setNewCommand({ name: '', permissions: [], enabled: true });
    showNotification(`✅ Команда ${commandKey} создана`, NOTIFICATION_TYPES.SUCCESS, 2000);
  };

  const deleteCommand = (commandKey) => {
    showConfirm(
      `Вы действительно хотите удалить команду ${commandKey}?\n\nЭто действие нельзя отменить.`,
      () => {
        const newCommands = { ...commands };
        delete newCommands[commandKey];
        onUpdate(newCommands);
        showNotification(`🗑️ Команда ${commandKey} удалена`, NOTIFICATION_TYPES.WARNING, 2000);
      }
    );
  };

  const updateCommand = (oldKey, newConfig) => {
    const newCommands = { ...commands };
    const newKey = `!${newConfig.name}`;
    if (oldKey !== newKey) {
      delete newCommands[oldKey];
    }
    newCommands[newKey] = newConfig;
    onUpdate(newCommands);
    if (oldKey !== newKey) {
      showNotification(`✏️ Команда переименована: ${oldKey} → ${newKey}`, NOTIFICATION_TYPES.INFO, 2000);
    }
  };

  const toggleCommandStatus = (cmdKey, event) => {
    event.stopPropagation();
    const command = commands[cmdKey];
    const newStatus = !command.enabled;
    onUpdate({
      ...commands,
      [cmdKey]: { ...command, enabled: newStatus }
    });
    showNotification(
      `${newStatus ? '🔛' : '🔴'} Команда ${cmdKey} ${newStatus ? 'включена' : 'выключена'}`,
      NOTIFICATION_TYPES.INFO,
      1500
    );
  };

  // Новая функция для получения типа реакции
  const getReactionType = (config) => {
    const hasChat = config.response?.chat?.enabled;
    const hasMedia = config.response?.media?.enabled;

    if (!hasChat && !hasMedia) return { icon: '💤', text: 'Нет реакции' };
    if (hasChat && !hasMedia) return { icon: '💬', text: 'Тип: Текст' };
    if (!hasChat && hasMedia) return { icon: '🎬', text: 'Тип: Медиа' };
    if (hasChat && hasMedia) return { icon: '💬🎬', text: 'Тип: Текст + Медиа' };
  };

  // Новая функция для получения бейджа алиасов
  const getAliasesBadge = (aliases) => {
    if (!aliases || aliases.length === 0) return null;
    return {
      icon: '⚡',
      text: `Алиасов: ${aliases.length}`
    };
  };

  return (
    <div className="commands-tab">
      <div className="commands-list">
        {Object.entries(commands).map(([cmdKey, config]) => {
          const reactionType = getReactionType(config);
          const aliasesBadge = getAliasesBadge(config.aliases);
          const hasOverlay = config.response?.media?.enabled && config.response?.media?.overlay;
          const overlayObj = hasOverlay 
            ? overlays.find(o => o.id === (config.response?.media?.overlay?.id || config.response?.media?.overlay))
            : null;

          return (
            <div key={cmdKey} className={`command-card ${config.enabled === false ? 'disabled' : ''}`}>
              <div className="command-card-header" onClick={() => toggleExpand(cmdKey)}>
                <div className="command-title">
                  <span className="command-name">{cmdKey}</span>
                  <span className="command-type-badge" title={reactionType.text}>
                    {reactionType.icon} {reactionType.text}
                  </span>
                  {aliasesBadge && (
                    <span className="command-aliases-badge" title={aliasesBadge.text}>
                      {aliasesBadge.icon} {aliasesBadge.text}
                    </span>
                  )}
                  {config.permissions?.length > 0 && (
                    <span className="permissions-badge">🔒 {config.permissions.length}</span>
                  )}
                  {overlayObj && (
                    <span className="overlay-badge">
                      🖥️ Оверлей: {overlayObj.name}
                    </span>
                  )}
                </div>
                <div className="command-actions">
                  <button
                    onClick={(e) => toggleCommandStatus(cmdKey, e)}
                    className={`status-toggle-btn ${config.enabled === false ? 'off' : 'on'}`}
                    title={config.enabled === false ? 'Включить команду' : 'Выключить команду'}
                  >
                    <FaPowerOff />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCommand(cmdKey); }}
                    className="delete-btn"
                  >
                    <FaTrash />
                  </button>
                  <span className="expand-icon">{expandedCommands[cmdKey] ? '▼' : '▶'}</span>
                </div>
              </div>
              
              {expandedCommands[cmdKey] && (
                <div className="command-editor-container">
                  <div className="command-header">
                    <input
                      type="text"
                      value={config.name || cmdKey.slice(1)}
                      onChange={(e) => {
                        const newName = e.target.value.replace(/^!+/, '');
                        updateCommand(cmdKey, { ...config, name: newName });
                      }}
                      placeholder="Название команды (без !)"
                      className="command-name-input"
                    />
                  </div>

                  <PermissionsSelector
                    value={config.permissions || []}
                    onChange={(perms) => updateCommand(cmdKey, { ...config, permissions: perms })}
                  />

                  <ResponseEditor
                    value={config.response || {
                      chat: { enabled: false, components: [] },
                      media: { enabled: false, file: '', volume: 100, overlay: null, text: { enabled: false, content: '', position: 'overlay' } }
                    }}
                    onChange={(response) => updateCommand(cmdKey, { ...config, response })}
                    overlays={overlays}
                    showAliasesTab={true}
                    aliasesValue={config.aliases || []}
                    onAliasesChange={(aliases) => updateCommand(cmdKey, { ...config, aliases })}
                    allCommands={commands}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="add-command-section">
        <h3>➕ Новая команда</h3>
        <div className="add-command-form">
          <input
            type="text"
            value={newCommand.name}
            onChange={(e) => setNewCommand({ ...newCommand, name: e.target.value.replace(/^!+/, '') })}
            placeholder="Название команды (без !)"
            className="new-command-input"
          />
          <button onClick={addCommand} className="add-command-btn">
            <FaPlus /> Создать
          </button>
        </div>
        <p className="form-hint">
          После создания вы сможете настроить текстовый ответ, медиа на оверлей и алиасы
        </p>
      </div>
    </div>
  );
}

export default CommandsTab;