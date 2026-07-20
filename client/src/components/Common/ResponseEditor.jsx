// client/src/components/Common/ResponseEditor.jsx
import { useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import ChatEditor from './ChatEditor';
import MediaEditor from './MediaEditor';
import './ResponseEditor.css';

function ResponseEditor({ value = { chat: { enabled: false, components: [] }, media: { enabled: false, file: '', volume: 100, overlay: null, text: { enabled: false, content: '', position: 'overlay' } } }, onChange, overlays = [], showAliasesTab = false, aliasesValue = [], onAliasesChange, allCommands = {} }) {
  const [activeTab, setActiveTab] = useState('chat');

  const updateChat = (chatValue) => {
    onChange({
      ...value,
      chat: chatValue
    });
  };

  const updateMedia = (mediaValue) => {
    onChange({
      ...value,
      media: mediaValue
    });
  };

  return (
    <div className="response-editor">
      <div className="response-tabs">
        <button
          className={`response-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Текст в чат
        </button>
        <button
          className={`response-tab ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          🎬 Медиа на оверлей
        </button>
        {showAliasesTab && (
          <button
            className={`response-tab ${activeTab === 'aliases' ? 'active' : ''}`}
            onClick={() => setActiveTab('aliases')}
          >
            ⚡ Алиасы
          </button>
        )}
      </div>

      <div className="response-content">
        {activeTab === 'chat' && (
          <ChatEditor
            value={value.chat || { enabled: false, components: [] }}
            onChange={updateChat}
          />
        )}
        
        {activeTab === 'media' && (
          <MediaEditor
            value={value.media || { enabled: false, file: '', volume: 100, overlay: null, text: { enabled: false, content: '', position: 'overlay' } }}
            onChange={updateMedia}
            overlays={overlays}
          />
        )}

        {activeTab === 'aliases' && showAliasesTab && (
          <div className="aliases-tab-content">
            {/* Здесь будет компонент для редактирования алиасов */}
            <AliasEditor
              value={aliasesValue}
              onChange={onAliasesChange}
              allCommands={allCommands}
              currentCommandName={value.name}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Временный компонент для алиасов (позже заменим на полноценный)
function AliasEditor({ value = [], onChange, allCommands = {}, currentCommandName }) {
  const [newAlias, setNewAlias] = useState('');

  const addAlias = () => {
    if (!newAlias.trim()) return;
    const alias = newAlias.startsWith('!') ? newAlias : `!${newAlias}`;
    if (value.includes(alias)) {
      alert('Такой алиас уже существует');
      return;
    }
    if (alias === `!${currentCommandName}`) {
      alert('Нельзя создать алиас, ссылающийся на самого себя');
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
          Дополнительные команды, которые будут выполнять то же самое действие
        </p>
      </div>

      <div className="aliases-list">
        {value.length === 0 ? (
          <div className="empty-aliases">
            <p>📭 У команды нет алиасов</p>
          </div>
        ) : (
          value.map(alias => (
            <div key={alias} className="alias-item">
              <span className="alias-name">{alias}</span>
              <button onClick={() => removeAlias(alias)} className="remove-alias-btn">
                ✕
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

export default ResponseEditor;