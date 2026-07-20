import { useRef, useState, useEffect } from 'react';
import { FaTrash, FaUpload, FaFolderOpen, FaPowerOff } from 'react-icons/fa';
import Tooltip from '../Tooltip';
import OverlaySelector from '../Commands/OverlaySelector';
import './PeriodicTab.css';

function PeriodicMediaEditor({ eventKey, event, onUpdate, overlays = [] }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(event.response?.file || '');
  const [textEnabled, setTextEnabled] = useState(event.response?.text?.enabled || false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [editName, setEditName] = useState(eventKey);
  const [intervalValue, setIntervalValue] = useState(event.interval || 300);

  useEffect(() => { loadMediaFiles(); }, []);

  // ========== INTERVAL HANDLING ==========
  const handleIntervalChange = (e) => {
    // Просто обновляем локальное состояние, не трогаем event
    setIntervalValue(e.target.value);
  };

  const handleIntervalBlur = () => {
    const numValue = parseInt(intervalValue);
    if (isNaN(numValue) || numValue < 10) {
      const corrected = 10;
      setIntervalValue(corrected);
      onUpdate({ ...event, interval: corrected });
    } else {
      onUpdate({ ...event, interval: numValue });
    }
  };

  const loadMediaFiles = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/media-files');
      const data = await response.json();
      if (data.success) setMediaFiles(data.files);
    } catch (error) {
      console.error('Ошибка загрузки списка файлов:', error);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      alert('❌ Файл слишком большой. Максимум: 100MB');
      return;
    }
    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      });

      const promise = new Promise((resolve, reject) => {
        xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.response)) : reject(new Error('Ошибка загрузки'));
        xhr.onerror = () => reject(new Error('Ошибка сети'));
        xhr.open('POST', 'http://127.0.0.1:3001/api/upload');
        xhr.send(formData);
      });

      const result = await promise;
      if (result.success) {
        await loadMediaFiles();
        setSelectedFile(result.file.fileName);
        onUpdate({
          ...event,
          response: { ...event.response, file: result.file.fileName, fullPath: result.file.path, originalName: result.file.originalName }
        });
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки:', error);
      alert('❌ Ошибка при загрузке файла');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const selectExistingFile = (file) => {
    setSelectedFile(file.name);
    onUpdate({ ...event, response: { ...event.response, file: file.name, fullPath: file.path } });
    setShowFileBrowser(false);
  };

  const deleteFile = async (fileName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Удалить файл ${fileName}?`)) return;
    try {
      const response = await fetch(`http://127.0.0.1:3001/api/media-files/${fileName}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await loadMediaFiles();
        if (selectedFile === fileName) {
          setSelectedFile('');
          onUpdate({ ...event, response: { ...event.response, file: '', fullPath: '' } });
        }
      }
    } catch (error) {
      alert('❌ Ошибка при удалении файла');
    }
  };

  const updateTextSettings = (updates) => {
    onUpdate({
      ...event,
      response: {
        ...event.response,
        text: { enabled: textEnabled, content: event.response?.text?.content || '', position: event.response?.text?.position || 'overlay', ...updates }
      }
    });
  };

  const toggleText = (enabled) => {
    setTextEnabled(enabled);
    updateTextSettings({ enabled });
  };

  const toggleEnabled = () => {
    onUpdate({ ...event, enabled: !event.enabled });
  };

  const handleNameChange = (newName) => {
    setEditName(newName);
    onUpdate({ ...event, _newName: newName });
  };

  const getFileIcon = (file) => {
    if (file.type === 'video') return '🎬';
    if (file.type === 'audio') return '🎵';
    if (file.type === 'image') return '🖼️';
    return '📄';
  };

  return (
    <div className="periodic-editor">
      <div className="periodic-editor-header">
        <div className="periodic-name-row">
          <input
            type="text"
            value={editName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Название события"
            className="periodic-name-input"
          />
          <div className="command-toggle">
            <label className="toggle-switch">
              <input type="checkbox" checked={event.enabled !== false} onChange={toggleEnabled} />
              <span className="toggle-slider">
                <span className="toggle-icon"><FaPowerOff /></span>
              </span>
            </label>
            <span className="toggle-label">{event.enabled !== false ? 'Включено' : 'Выключено'}</span>
          </div>
        </div>
      </div>

      <div className="interval-setting">
        <label>
          ⏱️ Интервал (секунды):
          <Tooltip text="Как часто будет срабатывать событие. Минимальное значение 10 секунд." />
        </label>
        <div className="interval-input-group">
          <input
            type="number"
            value={intervalValue}
            onChange={handleIntervalChange}
            onBlur={handleIntervalBlur}
            min="1"
            className="interval-input"
          />
          <div className="interval-presets">
            <button onClick={() => { setIntervalValue(60); onUpdate({ ...event, interval: 60 }); }} className={`preset-btn ${event.interval === 60 ? 'active' : ''}`}>1 мин</button>
            <button onClick={() => { setIntervalValue(300); onUpdate({ ...event, interval: 300 }); }} className={`preset-btn ${event.interval === 300 ? 'active' : ''}`}>5 мин</button>
            <button onClick={() => { setIntervalValue(600); onUpdate({ ...event, interval: 600 }); }} className={`preset-btn ${event.interval === 600 ? 'active' : ''}`}>10 мин</button>
            <button onClick={() => { setIntervalValue(900); onUpdate({ ...event, interval: 900 }); }} className={`preset-btn ${event.interval === 900 ? 'active' : ''}`}>15 мин</button>
            <button onClick={() => { setIntervalValue(1800); onUpdate({ ...event, interval: 1800 }); }} className={`preset-btn ${event.interval === 1800 ? 'active' : ''}`}>30 мин</button>
            <button onClick={() => { setIntervalValue(3600); onUpdate({ ...event, interval: 3600 }); }} className={`preset-btn ${event.interval === 3600 ? 'active' : ''}`}>1 час</button>
          </div>
        </div>
      </div>

      <div className="media-file-selector">
        <label>🎬 Медиа файл: <Tooltip text="Выберите видео, аудио или изображение" /></label>
        <div className="file-input-group">
          <input type="text" value={selectedFile || 'Файл не выбран'} readOnly placeholder="Файл не выбран" className="file-name-display" />
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="video/*,audio/*,image/*" style={{ display: 'none' }} />
          <div className="file-button-group">
            <button onClick={() => fileInputRef.current.click()} className="browse-btn" disabled={uploading}>
              <FaUpload /> {uploading ? `Загрузка ${uploadProgress}%` : 'Загрузить новый'}
            </button>
            <button onClick={() => setShowFileBrowser(!showFileBrowser)} className="browse-btn browse-existing">
              <FaFolderOpen /> Выбрать из папки
            </button>
          </div>
        </div>

        {showFileBrowser && (
          <div className="file-browser">
            <h4>📁 Медиа-файлы на сервере</h4>
            {mediaFiles.length === 0 ? (
              <p className="empty-files">Нет загруженных файлов</p>
            ) : (
              <div className="files-grid">
                {mediaFiles.map(file => (
                  <div key={file.name} className={`file-item ${selectedFile === file.name ? 'selected' : ''}`} onClick={() => selectExistingFile(file)}>
                    <span className="file-icon">{getFileIcon(file)}</span>
                    <span className="file-name" title={file.name}>{file.name}</span>
                    <span className="file-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                    <button className="delete-file-btn" onClick={(e) => deleteFile(file.name, e)} title="Удалить файл"><FaTrash /></button>
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
        value={event.response?.overlay || ''}
        onChange={(overlayId) => onUpdate({
          ...event,
          response: { ...event.response, overlay: overlayId }
        })}
        overlays={overlays}
      />

      <div className="media-settings">
        <label>Громкость: <Tooltip text="Для видео и аудио" /></label>
        <div className="volume-control">
          <input type="range" min="0" max="100" value={event.response?.volume || 100}
            onChange={(e) => onUpdate({ ...event, response: { ...event.response, volume: parseInt(e.target.value) } })} />
          <span className="volume-value">{event.response?.volume || 100}%</span>
        </div>
      </div>

      <div className="media-text-section">
        <div className="section-header">
          <label className="toggle-label">
            <input type="checkbox" checked={textEnabled} onChange={(e) => toggleText(e.target.checked)} className="toggle-checkbox" />
            <span className="toggle-text">📝 Показывать текст</span>
            <Tooltip text="Добавить текст поверх медиа или рядом с ним" />
          </label>
        </div>

        {textEnabled && (
          <div className="text-settings">
            <div className="text-input-group">
              <textarea
                value={event.response?.text?.content || ''}
                onChange={(e) => updateTextSettings({ content: e.target.value })}
                placeholder="Введите текст для отображения..."
                rows="3"
                className="text-content-input"
              />
            </div>
            <div className="position-selector">
              <label>Позиция текста:</label>
              <div className="position-buttons">
                {['above', 'below', 'left', 'right', 'overlay'].map(pos => (
                  <button key={pos} type="button"
                    className={`position-btn ${event.response?.text?.position === pos ? 'active' : ''}`}
                    onClick={() => updateTextSettings({ position: pos })}>
                    {pos === 'above' && '⬆️ Над медиа'}
                    {pos === 'below' && '⬇️ Под медиа'}
                    {pos === 'left' && '⬅️ Слева'}
                    {pos === 'right' && '➡️ Справа'}
                    {pos === 'overlay' && '🎯 Поверх'}
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

export default PeriodicMediaEditor;