// client/src/components/Common/ResponseEditor.jsx

import { useState } from 'react';
import ChatEditor from './ChatEditor';
import MediaEditor from './MediaEditor/MediaEditor';
import AliasEditor from './AliasEditor';
import './ResponseEditor.css';

function ResponseEditor({ 
  value = { 
    chat: { enabled: false, components: [] }, 
    media: { 
      enabled: false, 
      file: '', 
      volume: 100, 
      overlay: null, 
      text: { enabled: false, content: '', position: 'overlay', animation: 'none', font: {} },
      animation: { enter: 'none', exit: 'none' }
    } 
  }, 
  onChange, 
  overlays = [], 
  showAliasesTab = false, 
  aliasesValue = [], 
  onAliasesChange, 
  allCommands = {},
  currentCommandName = ''
}) {
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

  const toggleChatEnabled = () => {
    updateChat({
      ...value.chat,
      enabled: !value.chat?.enabled
    });
  };

  const toggleMediaEnabled = () => {
    updateMedia({
      ...value.media,
      enabled: !value.media?.enabled
    });
  };

  return (
    <div className="response-editor">
      <div className="response-tabs">
        <button
          className={`response-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className="tab-indicator chat"></span>
          💬 Текст в чат
          <label className="tab-toggle">
            <input
              type="checkbox"
              checked={value.chat?.enabled || false}
              onChange={toggleChatEnabled}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="tab-toggle-slider"></span>
          </label>
        </button>
        <button
          className={`response-tab ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          <span className="tab-indicator media"></span>
          🎬 Медиа на оверлей
          <label className="tab-toggle">
            <input
              type="checkbox"
              checked={value.media?.enabled || false}
              onChange={toggleMediaEnabled}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="tab-toggle-slider"></span>
          </label>
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
            value={value.media || { 
              enabled: false, 
              file: '', 
              volume: 100, 
              overlay: null, 
              text: { enabled: false, content: '', position: 'overlay', animation: 'none', font: {} },
              animation: { enter: 'none', exit: 'none' }
            }}
            onChange={updateMedia}
            overlays={overlays}
          />
        )}

        {activeTab === 'aliases' && showAliasesTab && (
          <AliasEditor
            value={aliasesValue}
            onChange={onAliasesChange}
            allCommands={allCommands}
            currentCommandName={currentCommandName}
          />
        )}
      </div>
    </div>
  );
}

export default ResponseEditor;