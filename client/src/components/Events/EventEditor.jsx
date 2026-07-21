// client/src/components/Events/EventEditor.jsx
import { useState } from 'react';
import { FaSave } from 'react-icons/fa';
import ResponseEditor from '../Common/ResponseEditor';
import './EventsTab.css';

function EventEditor({ eventType, config, meta, onUpdate, overlays = [] }) {
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

  const handleSave = () => {
    onUpdate({
      ...config,
      response
    });
  };

  const getEventTitle = () => {
    switch(eventType) {
      case 'follow':
        return 'Новый фолловер';
      case 'subscribe':
        return 'Новый подписчик';
      case 'resubscribe':
        return 'Продление подписки';
      case 'giftSub':
        return 'Подарочная подписка';
      case 'bits':
        return 'Bits / Cheer';
      case 'raid':
        return 'Рейд';
      default:
        return meta.name || eventType;
    }
  };

  return (
    <div className="event-editor">
      <div className="event-editor-header">
        <div className="event-meta">
          <h2>{getEventTitle()}</h2>
          <p className="event-description">{meta.description}</p>
          <div className="event-vars">
            <span className="vars-label">Доступные переменные:</span>
            {meta.vars.map(v => (
              <code key={v} className="var-badge">{`{${v}}`}</code>
            ))}
          </div>
        </div>
      </div>

      <ResponseEditor
        value={response}
        onChange={setResponse}
        overlays={overlays}
        showAliasesTab={false}
      />

      <div className="event-editor-actions">
        <button onClick={handleSave} className="save-event-btn primary">
          <FaSave /> Сохранить событие
        </button>
      </div>
    </div>
  );
}

export default EventEditor;