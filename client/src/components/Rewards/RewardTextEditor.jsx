import { useState } from 'react';
import { FaTrash, FaPlus, FaRandom, FaSpaceShuttle, FaArrowUp, FaArrowDown, FaPowerOff, FaUsers } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import Tooltip from '../Tooltip';
import './RewardsTab.css';

function RewardTextEditor({ reward, onUpdate }) {
  const [previewKey, setPreviewKey] = useState(0);

  const generatePreview = () => {
    if (!reward.response?.components) return '';
    return reward.response.components.map((comp, i) => {
      switch (comp.type) {
        case 'space': return ' ';
        case 'static': return comp.value || '';
        case 'author': return '@Зритель';
        case 'target': return '@цель';
        case 'random': return Math.floor(Math.random() * ((comp.max||100) - (comp.min||0) + 1)) + (comp.min||0);
        case 'phrase':
          if (comp.phrases?.length > 0) { const v = comp.phrases.filter(p => p.trim()); return v.length ? v[Math.floor(Math.random() * v.length)] : ''; }
          return '';
        case 'randomViewer': return '@случайный';
        default: return '';
      }
    }).join('');
  };

  const moveUp = (i) => { if (i === 0) return; const c = [...reward.response.components]; [c[i-1], c[i]] = [c[i], c[i-1]]; onUpdate({ ...reward, response: { ...reward.response, components: c } }); };
  const moveDown = (i) => { const c = [...reward.response.components]; if (i >= c.length - 1) return; [c[i], c[i+1]] = [c[i+1], c[i]]; onUpdate({ ...reward, response: { ...reward.response, components: c } }); };

  const addComponent = (type) => {
    const c = [...(reward.response?.components || [])];
    switch (type) {
      case 'static': c.push({ type: 'static', value: '' }); break;
      case 'author': c.push({ type: 'author' }); break;
      case 'target': c.push({ type: 'target' }); break;
      case 'random': c.push({ type: 'random', min: 0, max: 100 }); break;
      case 'phrase': c.push({ type: 'phrase', phrases: [''] }); break;
      case 'space': c.push({ type: 'space' }); break;
      case 'randomViewer': c.push({ type: 'randomViewer' }); break;
    }
    onUpdate({ ...reward, response: { ...reward.response, components: c } });
  };

  const updateComponent = (i, updates) => { const c = [...reward.response.components]; c[i] = { ...c[i], ...updates }; onUpdate({ ...reward, response: { ...reward.response, components: c } }); };
  const removeComponent = (i) => { onUpdate({ ...reward, response: { ...reward.response, components: reward.response.components.filter((_, idx) => idx !== i) } }); };

  const addPhrase = (ci) => { const c = [...reward.response.components]; c[ci].phrases.push(''); onUpdate({ ...reward, response: { ...reward.response, components: c } }); };
  const updatePhrase = (ci, pi, v) => { const c = [...reward.response.components]; c[ci].phrases[pi] = v; onUpdate({ ...reward, response: { ...reward.response, components: c } }); };
  const removePhrase = (ci, pi) => { const c = [...reward.response.components]; c[ci].phrases.splice(pi, 1); if (c[ci].phrases.length === 0) c.splice(ci, 1); onUpdate({ ...reward, response: { ...reward.response, components: c } }); };

  const toggleEnabled = () => onUpdate({ ...reward, enabled: !reward.enabled });

  const renderComponent = (comp, i) => {
    const total = reward.response?.components?.length || 0;
    return (
      <div className="component-wrapper" key={i}>
        <div className="move-buttons">
          <button onClick={() => moveUp(i)} className={`move-btn up ${i === 0 ? 'disabled' : ''}`} disabled={i === 0}><FaArrowUp /></button>
          <button onClick={() => moveDown(i)} className={`move-btn down ${i >= total - 1 ? 'disabled' : ''}`} disabled={i >= total - 1}><FaArrowDown /></button>
        </div>
        <div className="component-content">
          {comp.type === 'space' && <div className="component space"><span className="space-icon"><FaSpaceShuttle /> Пробел</span><button onClick={() => removeComponent(i)} className="remove-btn"><FaTrash /></button></div>}
          {comp.type === 'static' && <div className="component static"><span>📝 Текст:</span><input type="text" value={comp.value||''} onChange={e => updateComponent(i, { value: e.target.value })} placeholder="Текст..." /><button onClick={() => removeComponent(i)} className="remove-btn"><FaTrash /></button></div>}
          {comp.type === 'author' && <div className="component variable"><span>👤 Пользователь</span><Tooltip text="Имя того, кто активировал награду" /><button onClick={() => removeComponent(i)} className="remove-btn"><FaTrash /></button></div>}
          {comp.type === 'target' && <div className="component variable"><span>🎯 Текст пользователя</span><Tooltip text="Текст, который пользователь ввёл при активации награды" /><button onClick={() => removeComponent(i)} className="remove-btn"><FaTrash /></button></div>}
          {comp.type === 'random' && <div className="component random"><span>🎲 Случайное:</span><input type="number" value={comp.min} onChange={e => updateComponent(i, { min: parseInt(e.target.value)||0 })} className="number-input" /><span className="separator">—</span><input type="number" value={comp.max} onChange={e => updateComponent(i, { max: parseInt(e.target.value)||100 })} className="number-input" /><button onClick={() => removeComponent(i)} className="remove-btn"><FaTrash /></button></div>}
          {comp.type === 'phrase' && <div className="component phrase-set"><div className="phrase-header"><span>📚 Набор фраз</span><button onClick={() => addPhrase(i)} className="add-phrase-btn"><FaPlus /></button></div>{comp.phrases.map((p, pi) => <div key={pi} className="phrase-item"><input type="text" value={p} onChange={e => updatePhrase(i, pi, e.target.value)} placeholder="Фраза..." /><button onClick={() => removePhrase(i, pi)} className="remove-phrase-btn"><FaTrash /></button></div>)}</div>}
          {comp.type === 'randomViewer' && <div className="component variable"><span><FaUsers /> Случайный зритель</span><button onClick={() => removeComponent(i)} className="remove-btn"><FaTrash /></button></div>}
        </div>
      </div>
    );
  };

  return (
    <div className="reward-editor">
      <div className="command-toggle" style={{ marginBottom: 15 }}>
        <label className="toggle-switch">
          <input type="checkbox" checked={reward.enabled !== false} onChange={toggleEnabled} />
          <span className="toggle-slider"><span className="toggle-icon"><FaPowerOff /></span></span>
        </label>
        <span className="toggle-label">{reward.enabled !== false ? 'Включена' : 'Выключена'}</span>
      </div>

      <div className="components-editor">
        <h4>Сборка ответа:</h4>
        <div className="components-list">
          {reward.response?.components?.map((c, i) => renderComponent(c, i))}
          {(!reward.response?.components || reward.response.components.length === 0) && (
            <div className="empty-components"><p>✨ Добавьте компоненты для создания ответа</p></div>
          )}
        </div>
        <div className="add-component-buttons">
          <button onClick={() => addComponent('static')} className="add-btn"><FaPlus /> Текст</button>
          <button onClick={() => addComponent('author')} className="add-btn"><FaPlus /> Пользователь</button>
          <button onClick={() => addComponent('target')} className="add-btn"><FaPlus /> Текст пользователя</button>
          <button onClick={() => addComponent('randomViewer')} className="add-btn"><FaUsers /> Случайный зритель</button>
          <button onClick={() => addComponent('random')} className="add-btn"><FaRandom /> Случайное число</button>
          <button onClick={() => addComponent('phrase')} className="add-btn"><FaPlus /> Набор фраз</button>
          <button onClick={() => addComponent('space')} className="add-btn space-btn"><FaSpaceShuttle /> Пробел</button>
        </div>
        <div className="preview-section">
          <div className="preview-header">
            <strong>Предпросмотр:</strong>
            <button onClick={() => setPreviewKey(p => p + 1)} className="refresh-preview-btn"><MdRefresh /> Обновить</button>
          </div>
          <div className="preview-box">
            <span className="preview-text">{generatePreview() || <span className="preview-placeholder">Ответ будет таким...</span>}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RewardTextEditor;