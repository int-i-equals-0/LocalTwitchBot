import { useRef, useState, useEffect } from 'react';
import { FaTrash, FaUpload, FaFolderOpen, FaPowerOff } from 'react-icons/fa';
import Tooltip from '../Tooltip';
import OverlaySelector from '../Commands/OverlaySelector';
import './RewardsTab.css';

function RewardMediaEditor({ reward, onUpdate, overlays = [] }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(reward.response?.file || '');
  const [textEnabled, setTextEnabled] = useState(reward.response?.text?.enabled || false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [showFileBrowser, setShowFileBrowser] = useState(false);

  useEffect(() => { loadMediaFiles(); }, []);

  const loadMediaFiles = async () => {
    try { const r = await fetch('http://127.0.0.1:3001/api/media-files'); const d = await r.json(); if (d.success) setMediaFiles(d.files); } catch (e) {}
  };

  const handleFileSelect = async (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 100*1024*1024) { alert('Файл слишком большой'); return; } await uploadFile(f); };

  const uploadFile = async (file) => {
    setUploading(true); setUploadProgress(0);
    const fd = new FormData(); fd.append('file', file);
    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', e => { if (e.lengthComputable) setUploadProgress(Math.round(e.loaded/e.total*100)); });
      const result = await new Promise((res, rej) => { xhr.onload = () => xhr.status === 200 ? res(JSON.parse(xhr.response)) : rej(); xhr.onerror = rej; xhr.open('POST', 'http://127.0.0.1:3001/api/upload'); xhr.send(fd); });
      if (result.success) { await loadMediaFiles(); setSelectedFile(result.file.fileName); onUpdate({ ...reward, response: { ...reward.response, file: result.file.fileName } }); }
    } catch (e) { alert('Ошибка загрузки'); }
    finally { setUploading(false); setUploadProgress(0); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const selectExisting = (f) => { setSelectedFile(f.name); onUpdate({ ...reward, response: { ...reward.response, file: f.name } }); setShowFileBrowser(false); };

  const updateTextSettings = (updates) => {
    onUpdate({ ...reward, response: { ...reward.response, text: { enabled: textEnabled, content: reward.response?.text?.content || '', position: reward.response?.text?.position || 'overlay', ...updates } } });
  };

  const toggleText = (en) => { setTextEnabled(en); updateTextSettings({ enabled: en }); };
  const toggleEnabled = () => onUpdate({ ...reward, enabled: !reward.enabled });

  const getFileIcon = (f) => f.type === 'video' ? '🎬' : f.type === 'audio' ? '🎵' : f.type === 'image' ? '🖼️' : '📄';

  return (
    <div className="reward-editor">
      <div className="command-toggle" style={{ marginBottom: 15 }}>
        <label className="toggle-switch">
          <input type="checkbox" checked={reward.enabled !== false} onChange={toggleEnabled} />
          <span className="toggle-slider"><span className="toggle-icon"><FaPowerOff /></span></span>
        </label>
        <span className="toggle-label">{reward.enabled !== false ? 'Включена' : 'Выключена'}</span>
      </div>

      <div className="media-file-selector">
        <label>🎬 Медиа файл:</label>
        <div className="file-input-group">
          <input type="text" value={selectedFile || 'Файл не выбран'} readOnly className="file-name-display" />
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="video/*,audio/*,image/*" style={{ display: 'none' }} />
          <div className="file-button-group">
            <button onClick={() => fileInputRef.current.click()} className="browse-btn" disabled={uploading}><FaUpload /> {uploading ? `${uploadProgress}%` : 'Загрузить'}</button>
            <button onClick={() => setShowFileBrowser(!showFileBrowser)} className="browse-btn browse-existing"><FaFolderOpen /> Из папки</button>
          </div>
        </div>
        {showFileBrowser && (
          <div className="file-browser">
            <h4>📁 Файлы</h4>
            {mediaFiles.length === 0 ? <p className="empty-files">Нет файлов</p> : (
              <div className="files-grid">
                {mediaFiles.map(f => (
                  <div key={f.name} className={`file-item ${selectedFile === f.name ? 'selected' : ''}`} onClick={() => selectExisting(f)}>
                    <span className="file-icon">{getFileIcon(f)}</span>
                    <span className="file-name">{f.name}</span>
                    <span className="file-size">{(f.size/1024/1024).toFixed(1)} MB</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {uploading && <div className="upload-progress"><div className="progress-bar"><div className="progress-fill" style={{ width: `${uploadProgress}%` }} /></div></div>}
      </div>

      <OverlaySelector value={reward.response?.overlay || ''} onChange={id => onUpdate({ ...reward, response: { ...reward.response, overlay: id } })} overlays={overlays} />

      <div className="media-settings">
        <label>Громкость:</label>
        <div className="volume-control">
          <input type="range" min="0" max="100" value={reward.response?.volume || 100} onChange={e => onUpdate({ ...reward, response: { ...reward.response, volume: parseInt(e.target.value) } })} />
          <span className="volume-value">{reward.response?.volume || 100}%</span>
        </div>
      </div>

      <div className="media-text-section">
        <div className="section-header">
          <label className="toggle-label">
            <input type="checkbox" checked={textEnabled} onChange={e => toggleText(e.target.checked)} className="toggle-checkbox" />
            <span className="toggle-text">📝 Текст</span>
            <Tooltip text="Используйте {user} для имени пользователя, {message} для текста" />
          </label>
        </div>
        {textEnabled && (
          <div className="text-settings">
            <textarea value={reward.response?.text?.content || ''} onChange={e => updateTextSettings({ content: e.target.value })} placeholder="Текст... {user} активировал награду! {message}" rows="3" className="text-content-input" />
            <div className="position-selector">
              <label>Позиция:</label>
              <div className="position-buttons">
                {['above','below','left','right','overlay'].map(p => (
                  <button key={p} type="button" className={`position-btn ${reward.response?.text?.position === p ? 'active' : ''}`} onClick={() => updateTextSettings({ position: p })}>
                    {p === 'above' && '⬆️ Над'}{p === 'below' && '⬇️ Под'}{p === 'left' && '⬅️ Слева'}{p === 'right' && '➡️ Справа'}{p === 'overlay' && '🎯 Поверх'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RewardMediaEditor;