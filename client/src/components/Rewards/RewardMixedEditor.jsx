// client/src/components/Rewards/RewardMixedEditor.jsx

import { useRef, useState, useEffect } from 'react';
import { FaTrash, FaPlus, FaRandom, FaSpaceShuttle, FaUpload, FaFolderOpen, FaPowerOff, FaArrowUp, FaArrowDown, FaUsers } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import Tooltip from '../Tooltip';
import OverlaySelector from '../Commands/OverlaySelector';
import './RewardsTab.css';

function RewardMixedEditor({ reward, onUpdate, overlays = [] }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(reward.response?.media?.file || '');
  const [textEnabled, setTextEnabled] = useState(reward.response?.media?.text?.enabled || false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => { loadMediaFiles(); }, []);

  const loadMediaFiles = async () => {
    try {
      const r = await fetch('http://127.0.0.1:3001/api/media-files');
      const d = await r.json();
      if (d.success) setMediaFiles(d.files);
    } catch (e) {}
  };

  // ========== CHAT COMPONENTS ==========
  const chatComponents = reward.response?.chat?.components || [];

  const updateChatComponents = (newComponents) => {
    onUpdate({
      ...reward,
      response: { ...reward.response, chat: { ...reward.response?.chat, components: newComponents } }
    });
  };

  const addChatComponent = (type) => {
    const comp = (() => {
      switch (type) {
        case 'static': return { type: 'static', value: '' };
        case 'author': return { type: 'author' };
        case 'target': return { type: 'target' };
        case 'randomViewer': return { type: 'randomViewer' };
        case 'random': return { type: 'random', min: 1, max: 100 };
        case 'phrase': return { type: 'phrase', phrases: [''] };
        case 'space': return { type: 'space' };
        default: return { type: 'static', value: '' };
      }
    })();
    updateChatComponents([...chatComponents, comp]);
    setPreviewKey(k => k + 1);
  };

  const removeChatComponent = (index) => {
    updateChatComponents(chatComponents.filter((_, i) => i !== index));
    setPreviewKey(k => k + 1);
  };

  const updateChatComponent = (index, updates) => {
    const c = [...chatComponents];
    c[index] = { ...c[index], ...updates };
    updateChatComponents(c);
    setPreviewKey(k => k + 1);
  };

  const moveChatComponent = (index, dir) => {
    const c = [...chatComponents];
    const ni = index + dir;
    if (ni < 0 || ni >= c.length) return;
    [c[index], c[ni]] = [c[ni], c[index]];
    updateChatComponents(c);
    setPreviewKey(k => k + 1);
  };

  const addPhrase = (ci) => {
    const c = [...chatComponents];
    c[ci] = { ...c[ci], phrases: [...(c[ci].phrases || []), ''] };
    updateChatComponents(c);
  };

  const updatePhrase = (ci, pi, val) => {
    const c = [...chatComponents];
    const p = [...c[ci].phrases];
    p[pi] = val;
    c[ci] = { ...c[ci], phrases: p };
    updateChatComponents(c);
  };

  const removePhrase = (ci, pi) => {
    const c = [...chatComponents];
    const p = c[ci].phrases.filter((_, i) => i !== pi);
    if (p.length === 0) {
      updateChatComponents(c.filter((_, i) => i !== ci));
    } else {
      c[ci] = { ...c[ci], phrases: p };
      updateChatComponents(c);
    }
  };

  // ========== MEDIA ==========
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { alert('❌ Файл слишком большой.'); return; }
    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true); setUploadProgress(0);
    const fd = new FormData(); fd.append('file', file);
    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); });
      const result = await new Promise((resolve, reject) => {
        xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.response)) : reject();
        xhr.onerror = () => reject();
        xhr.open('POST', 'http://127.0.0.1:3001/api/upload');
        xhr.send(fd);
      });
      if (result.success) {
        await loadMediaFiles();
        setSelectedFile(result.file.fileName);
        onUpdate({ ...reward, response: { ...reward.response, media: { ...reward.response?.media, file: result.file.fileName } } });
      }
    } catch (e) { alert('❌ Ошибка загрузки'); }
    finally { setUploading(false); setUploadProgress(0); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const selectExistingFile = (f) => {
    setSelectedFile(f.name);
    onUpdate({ ...reward, response: { ...reward.response, media: { ...reward.response?.media, file: f.name } } });
    setShowFileBrowser(false);
  };

  const updateMediaTextSettings = (updates) => {
    onUpdate({
      ...reward,
      response: {
        ...reward.response,
        media: {
          ...reward.response?.media,
          text: { enabled: textEnabled, content: reward.response?.media?.text?.content || '', position: reward.response?.media?.text?.position || 'overlay', ...updates }
        }
      }
    });
  };

  const toggleMediaText = (en) => { setTextEnabled(en); updateMediaTextSettings({ enabled: en }); };
  const toggleEnabled = () => onUpdate({ ...reward, enabled: !reward.enabled });

  const getFileIcon = (f) => f.type === 'video' ? '🎬' : f.type === 'audio' ? '🎵' : f.type === 'image' ? '🖼️' : '📄';

  // ========== PREVIEW ==========
  const generatePreview = () => {
    return chatComponents.map(comp => {
      switch (comp.type) {
        case 'author': return '@Зритель';
        case 'target': return '@цель';
        case 'randomViewer': return '@случайный';
        case 'static': return comp.value || '';
        case 'space': return ' ';
        case 'random': return Math.floor(Math.random() * ((comp.max || 100) - (comp.min || 0) + 1)) + (comp.min || 0);
        case 'phrase': { const v = (comp.phrases || []).filter(p => p.trim()); return v.length ? v[Math.floor(Math.random() * v.length)] : ''; }
        default: return '';
      }
    }).join('') || '(пустое сообщение)';
  };

  // ========== RENDER COMPONENT ==========
  const renderChatComponent = (comp, index) => {
    const total = chatComponents.length;
    const isFirst = index === 0;
    const isLast = index === total - 1;

    return (
      <div className="component-wrapper" key={index}>
        <div className="move-buttons">
          <button onClick={() => moveChatComponent(index, -1)} className={`move-btn up ${isFirst ? 'disabled' : ''}`} disabled={isFirst}><FaArrowUp /></button>
          <button onClick={() => moveChatComponent(index, 1)} className={`move-btn down ${isLast ? 'disabled' : ''}`} disabled={isLast}><FaArrowDown /></button>
        </div>
        <div className="component-content">
          {(() => {
            switch (comp.type) {
              case 'space': return <div className="component space"><span className="space-icon"><FaSpaceShuttle /> Пробел</span><button className="remove-btn" onClick={() => removeChatComponent(index)}><FaTrash /></button></div>;
              case 'static': return <div className="component static"><span>📝 Текст:</span><input type="text" value={comp.value || ''} onChange={(e) => updateChatComponent(index, { value: e.target.value })} placeholder="Текст..." /><button className="remove-btn" onClick={() => removeChatComponent(index)}><FaTrash /></button></div>;
              case 'author': return <div className="component variable"><span>👤 Автор</span><Tooltip text="Имя того, кто активировал награду" /><button className="remove-btn" onClick={() => removeChatComponent(index)}><FaTrash /></button></div>;
              case 'target': return <div className="component variable"><span>🎯 Текст автора</span><Tooltip text="Текст, который ввёл пользователь при активации" /><button className="remove-btn" onClick={() => removeChatComponent(index)}><FaTrash /></button></div>;
              case 'randomViewer': return <div className="component variable"><span><FaUsers /> Случайный зритель</span><button className="remove-btn" onClick={() => removeChatComponent(index)}><FaTrash /></button></div>;
              case 'random': return <div className="component random"><span>🎲 от</span><input type="number" className="number-input" value={comp.min || 0} onChange={(e) => updateChatComponent(index, { min: parseInt(e.target.value) || 0 })} /><span className="separator">до</span><input type="number" className="number-input" value={comp.max || 100} onChange={(e) => updateChatComponent(index, { max: parseInt(e.target.value) || 100 })} /><button className="remove-btn" onClick={() => removeChatComponent(index)}><FaTrash /></button></div>;
              case 'phrase': return (
                <div className="component phrase-set">
                  <div className="phrase-header"><span>📚 Набор фраз</span><button className="add-phrase-btn" onClick={() => addPhrase(index)}><FaPlus /></button></div>
                  {(comp.phrases || []).map((phrase, pi) => (<div key={pi} className="phrase-item"><input type="text" value={phrase} onChange={(e) => updatePhrase(index, pi, e.target.value)} placeholder={`Вариант ${pi + 1}`} /><button className="remove-phrase-btn" onClick={() => removePhrase(index, pi)}><FaTrash /></button></div>))}
                  <button className="remove-btn" onClick={() => removeChatComponent(index)} style={{ marginTop: 8 }}><FaTrash /> Удалить блок</button>
                </div>
              );
              default: return null;
            }
          })()}
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

      {/* ===== ЧАСТЬ 1: ТЕКСТ В ЧАТ ===== */}
      <div className="mixed-section">
        <div className="mixed-section-header">
          <h4>💬 Текст в чат</h4>
          <Tooltip text="Текст, который бот отправит в чат при активации награды" />
        </div>

        <div className="components-list">
          {chatComponents.length === 0 ? (
            <div className="empty-components"><p>✨ Добавьте компоненты для создания ответа</p></div>
          ) : (
            chatComponents.map((comp, index) => renderChatComponent(comp, index))
          )}
        </div>

        <div className="add-component-buttons">
          <button onClick={() => addChatComponent('static')} className="add-btn"><FaPlus /> Текст</button>
          <button onClick={() => addChatComponent('author')} className="add-btn"><FaPlus /> Автор</button>
          <button onClick={() => addChatComponent('target')} className="add-btn"><FaPlus /> Текст автора</button>
          <button onClick={() => addChatComponent('randomViewer')} className="add-btn"><FaUsers /> Случ. зритель</button>
          <button onClick={() => addChatComponent('random')} className="add-btn"><FaRandom /> Число</button>
          <button onClick={() => addChatComponent('phrase')} className="add-btn"><FaPlus /> Фразы</button>
          <button onClick={() => addChatComponent('space')} className="add-btn space-btn"><FaSpaceShuttle /> Пробел</button>
        </div>

        <div className="preview-section">
          <div className="preview-header">
            <strong>Предпросмотр чата:</strong>
            <button className="refresh-preview-btn" onClick={() => setPreviewKey(k => k + 1)}><MdRefresh /> Обновить</button>
          </div>
          <div className="preview-box">
            <span className="preview-text" key={previewKey}>{generatePreview()}</span>
          </div>
        </div>
      </div>

      {/* ===== ЧАСТЬ 2: МЕДИА НА ОВЕРЛЕЙ ===== */}
      <div className="mixed-section">
        <div className="mixed-section-header">
          <h4>🎬 Медиа на оверлей</h4>
          <Tooltip text="Медиа-файл, который будет воспроизведен на оверлее" />
        </div>

        <div className="media-file-selector">
          <label>🎬 Медиа файл:</label>
          <div className="file-input-group">
            <input type="text" value={selectedFile || 'Файл не выбран'} readOnly className="file-name-display" />
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="video/*,audio/*,image/*" style={{ display: 'none' }} />
            <div className="file-button-group">
              <button onClick={() => fileInputRef.current.click()} className="browse-btn" disabled={uploading}>
                <FaUpload /> {uploading ? `${uploadProgress}%` : 'Загрузить'}
              </button>
              <button onClick={() => setShowFileBrowser(!showFileBrowser)} className="browse-btn browse-existing">
                <FaFolderOpen /> Из папки
              </button>
            </div>
          </div>

          {showFileBrowser && (
            <div className="file-browser">
              <h4>📁 Файлы</h4>
              {mediaFiles.length === 0 ? <p className="empty-files">Нет файлов</p> : (
                <div className="files-grid">
                  {mediaFiles.map(f => (
                    <div key={f.name} className={`file-item ${selectedFile === f.name ? 'selected' : ''}`} onClick={() => selectExistingFile(f)}>
                      <span className="file-icon">{getFileIcon(f)}</span>
                      <span className="file-name">{f.name}</span>
                      <span className="file-size">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${uploadProgress}%` }} /></div>
              <span className="progress-text">{uploadProgress}%</span>
            </div>
          )}
        </div>

        <OverlaySelector
          value={reward.response?.media?.overlay || ''}
          onChange={(id) => onUpdate({ ...reward, response: { ...reward.response, media: { ...reward.response?.media, overlay: id } } })}
          overlays={overlays}
        />

        <div className="media-settings">
          <label>Громкость:</label>
          <div className="volume-control">
            <input type="range" min="0" max="100" value={reward.response?.media?.volume || 100}
              onChange={(e) => onUpdate({ ...reward, response: { ...reward.response, media: { ...reward.response?.media, volume: parseInt(e.target.value) } } })} />
            <span className="volume-value">{reward.response?.media?.volume || 100}%</span>
          </div>
        </div>

        <div className="media-text-section">
          <div className="section-header">
            <label className="toggle-label">
              <input type="checkbox" checked={textEnabled} onChange={(e) => toggleMediaText(e.target.checked)} className="toggle-checkbox" />
              <span className="toggle-text">📝 Текст на оверлее</span>
              <Tooltip text="Используйте {user} для имени, {message} для текста пользователя" />
            </label>
          </div>

          {textEnabled && (
            <div className="text-settings">
              <textarea value={reward.response?.media?.text?.content || ''}
                onChange={(e) => updateMediaTextSettings({ content: e.target.value })}
                placeholder="Текст... {user} активировал награду! {message}" rows="3" className="text-content-input" />
              <div className="position-selector">
                <label>Позиция:</label>
                <div className="position-buttons">
                  {['above', 'below', 'left', 'right', 'overlay'].map(pos => (
                    <button key={pos} type="button"
                      className={`position-btn ${reward.response?.media?.text?.position === pos ? 'active' : ''}`}
                      onClick={() => updateMediaTextSettings({ position: pos })}>
                      {pos === 'above' && '⬆️ Над'}{pos === 'below' && '⬇️ Под'}{pos === 'left' && '⬅️ Слева'}{pos === 'right' && '➡️ Справа'}{pos === 'overlay' && '🎯 Поверх'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RewardMixedEditor;