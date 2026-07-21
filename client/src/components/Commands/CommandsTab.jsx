// client/src/components/Commands/CommandsTab.jsx

import { useState } from 'react';
import { FaPlus, FaTrash, FaPowerOff, FaEdit } from 'react-icons/fa';
import Modal from '../Common/Modal';
import CommandEditor from './CommandEditor';
import { useNotification, NOTIFICATION_TYPES } from '../Notification';
import './CommandsTab.css';

function CommandsTab({ commands, onUpdate, overlays = [] }) {
  const { showNotification, showConfirm } = useNotification();
  const [editingCommand, setEditingCommand] = useState(null);

  const getEmptyConfig = () => ({
    enabled: true,
    name: '',
    permissions: [],
    aliases: [],
    response: {
      chat: { enabled: false, components: [] },
      media: {
        enabled: false,
        file: '',
        volume: 100,
        overlay: null,
        text: {
          enabled: false,
          content: '',
          position: 'overlay',
          animation: 'none',
          font: {}
        },
        animation: { enter: 'none', exit: 'none' }
      }
    }
  });

  const openCreateModal = () => {
    setEditingCommand({ key: null, config: getEmptyConfig(), isNew: true });
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

  const updateCommand = (oldKey, newConfig, isNew = false) => {
    const newCommands = { ...commands };
    const newKey = `!${newConfig.name}`;

    if (!newConfig.name.trim()) {
      showNotification('⚠️ Введите название команды!', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    if (isNew && newCommands[newKey]) {
      showNotification('❌ Команда с таким именем уже существует!', NOTIFICATION_TYPES.ERROR, 3000);
      return;
    }

    if (!isNew && oldKey && oldKey !== newKey && newCommands[newKey]) {
      showNotification('❌ Команда с таким именем уже существует!', NOTIFICATION_TYPES.ERROR, 3000);
      return;
    }

    if (!isNew && oldKey && oldKey !== newKey) {
      delete newCommands[oldKey];
    }

    newCommands[newKey] = newConfig;
    onUpdate(newCommands);
    setEditingCommand(null);

    if (isNew) {
      showNotification(`✅ Команда ${newKey} создана`, NOTIFICATION_TYPES.SUCCESS, 2000);
    } else if (oldKey !== newKey) {
      showNotification(`✏️ Команда переименована: ${oldKey} → ${newKey}`, NOTIFICATION_TYPES.INFO, 2000);
    } else {
      showNotification(`✅ Команда ${newKey} сохранена`, NOTIFICATION_TYPES.SUCCESS, 2000);
    }
  };

  const toggleCommandStatus = (cmdKey, currentStatus, e) => {
    e.stopPropagation();
    const command = commands[cmdKey];
    const newStatus = !currentStatus;
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

  const getReactionType = (config) => {
    const hasChat = config.response?.chat?.enabled;
    const hasMedia = config.response?.media?.enabled;

    if (!hasChat && !hasMedia) return { icon: '💤', text: 'Нет реакции' };
    if (hasChat && !hasMedia) return { icon: '💬', text: 'Текст' };
    if (!hasChat && hasMedia) return { icon: '🎬', text: 'Медиа' };
    return { icon: '💬🎬', text: 'Текст + Медиа' };
  };

  const getAliasesBadge = (aliases) => {
    if (!aliases || aliases.length === 0) return null;
    return { icon: '⚡', text: `Алиасов: ${aliases.length}` };
  };

  const getModalTitle = () => {
    if (!editingCommand) return '';
    if (editingCommand.isNew) return 'Создание новой команды';
    return `Редактирование команды ${editingCommand.key || ''}`;
  };

  return (
    <div className="commands-tab">
      <div className="commands-header">
        <h2>🤖 Команды чата</h2>
        <p className="commands-description">
          Настройте команды, которые бот будет выполнять в чате. 
          Можно использовать переменные: {'{user}'} — имя автора, {'{target}'} — первый аргумент.
        </p>
        <button className="create-command-btn" onClick={openCreateModal}>
          <FaPlus /> Создать команду
        </button>
      </div>

      <div className="commands-list">
        {Object.keys(commands).length === 0 && (
          <div className="empty-commands">
            <p>📭 Команды не созданы</p>
            <p className="hint">Нажмите "Создать команду" чтобы добавить первую команду</p>
          </div>
        )}

        {Object.entries(commands).map(([cmdKey, config]) => {
          const reactionType = getReactionType(config);
          const aliasesBadge = getAliasesBadge(config.aliases);
          const hasOverlay = config.response?.media?.enabled && config.response?.media?.overlay;
          const overlayObj = hasOverlay 
            ? overlays.find(o => o.id === (config.response?.media?.overlay?.id || config.response?.media?.overlay))
            : null;
          const isEnabled = config.enabled !== false;

          return (
            <div key={cmdKey} className={`command-card ${!isEnabled ? 'disabled' : ''}`}>
              <div className="command-card-header">
                <div className="command-title">
                  <span className="command-name">{cmdKey}</span>
                  <span className={`command-status-badge ${isEnabled ? 'enabled' : 'disabled'}`}>
                    {isEnabled ? 'Вкл' : 'Выкл'}
                  </span>
                  <span className="command-type-badge">
                    {reactionType.icon} {reactionType.text}
                  </span>
                  {aliasesBadge && (
                    <span className="command-aliases-badge">
                      {aliasesBadge.icon} {aliasesBadge.text}
                    </span>
                  )}
                  {config.permissions?.length > 0 && (
                    <span className="permissions-badge">🔒 {config.permissions.length}</span>
                  )}
                  {overlayObj && (
                    <span className="overlay-badge">🖥️ Оверлей: {overlayObj.name}</span>
                  )}
                </div>
                <div className="command-actions">
                  <button
                    onClick={(e) => toggleCommandStatus(cmdKey, isEnabled, e)}
                    className={`status-toggle-btn ${isEnabled ? 'on' : 'off'}`}
                    title={isEnabled ? 'Выключить' : 'Включить'}
                  >
                    <FaPowerOff />
                  </button>
                  <button
                    onClick={() => setEditingCommand({ key: cmdKey, config })}
                    className="edit-btn"
                    title="Редактировать"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCommand(cmdKey); }}
                    className="delete-btn"
                    title="Удалить"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={!!editingCommand}
        onClose={() => setEditingCommand(null)}
        title={getModalTitle()}
        size="xlarge"
      >
        {editingCommand && (
          <CommandEditor
            commandKey={editingCommand.isNew ? null : editingCommand.key}
            config={editingCommand.config}
            onUpdate={(updated) => updateCommand(
              editingCommand.key,
              updated,
              editingCommand.isNew
            )}
            overlays={overlays}
            allCommands={commands}
            isNew={editingCommand.isNew}
          />
        )}
      </Modal>
    </div>
  );
}

export default CommandsTab;