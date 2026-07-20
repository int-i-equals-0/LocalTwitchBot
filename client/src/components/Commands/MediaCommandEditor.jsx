// client/src/components/Commands/MediaCommandEditor.jsx

import { useRef, useState, useEffect } from 'react';
import { FaTrash, FaPlus, FaRandom, FaSpaceShuttle, FaUpload, FaFolderOpen, FaPowerOff } from 'react-icons/fa';
import Tooltip from '../Tooltip';
import PermissionsSelector from './PermissionsSelector';
import OverlaySelector from './OverlaySelector';
import './CommandEditor.css';

function MediaCommandEditor({ command, onUpdate, overlays = [] }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(command.response?.file || '');
  const [textEnabled, setTextEnabled] = useState(command.response?.text?.enabled || false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [showFileBrowser, setShowFileBrowser] = useState(false);

  useEffect(() => {
    loadMediaFiles();
  }, []);

  const loadMediaFiles = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/media-files');
      const data = await response.json();
      if (data.success) setMediaFiles(data.files);
    } catch (error) {
      console.error('Ошибка загрузки списка файлов:', error);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      alert('❌ Файл слишком большой. Максимальный размер: 100MB');
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
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
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
          ...command,
          response: { ...command.response, file: result.file.fileName, fullPath: result.file.path, originalName: result.file.originalName }
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
    onUpdate({ ...command, response: { ...command.response, file: file.name, fullPath: file.path } });
    setShowFileBrowser(false);
  };

  const deleteFile = async (fileName, event) => {
    event.stopPropagation();
    if (!window.confirm(`Удалить файл ${fileName}?`)) return;
    try {
      const response = await fetch(`http://127.0.0.1:3001/api/media-files/${fileName}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await loadMediaFiles();
        if (selectedFile === fileName) {
          setSelectedFile('');
          onUpdate({ ...command, response: { ...command.response, file: '', fullPath: '' } });
        }
      }
    } catch (error) {
      console.error('Ошибка удаления файла:', error);
      alert('❌ Ошибка при удалении файла');
    }
  };

  const updateTextSettings = (updates) => {
    onUpdate({
      ...command,
      response: {
        ...command.response,
        text: { enabled: textEnabled, content: command.response?.text?.content || '', position: command.response?.text?.position || 'overlay', ...updates }
      }
    });
  };

  const toggleText = (enabled) => {
    setTextEnabled(enabled);
    updateTextSettings({ enabled });
  };

  const getFileIcon = (file) => {
    if (file.type === 'video') return '🎬';
    if (file.type === 'audio') return '🎵';
    if (file.type === 'image') return '🖼️';
    return '📄';
  };

  const toggleEnabled = () => {
    onUpdate({ ...command, enabled: !command.enabled });
  };

  return (
    <div className="media-command-editor">
      <div className="command-header">
        <div className="command-title-row">
          <input
            type="text"
            value={command.name || ''}
            onChange={(e) => {
              let name = e.target.value.replace(/^!+/, '');
              onUpdate({ ...command, name });
            }}
            placeholder="Название команды (без !)"
            className="command-name-input"
          />
          <div className="command-toggle">
            <label className="toggle-switch">
              <input type="checkbox" checked={command.enabled !== false} onChange={toggleEnabled} />
              <span className="toggle-slider">
                <span className="toggle-icon"><FaPowerOff /></span>
              </span>
            </label>
            <span className="toggle-label">{command.enabled !== false ? 'Включена' : 'Выключена'}</span>
            <Tooltip text="Временно отключить команду без удаления" />
          </div>
        </div>
      </div>

      <PermissionsSelector
        value={command.permissions || []}
        onChange={(perms) => onUpdate({ ...command, permissions: perms })}
      />

      <div className="media-file-selector">
        <label>🎬 Медиа файл: <Tooltip text="Выберите видео, аудио или изображение" /></label>
        <div className="file-input-group">
          <input
            type="text"
            value={selectedFile || (command.response?.originalName ? `${command.response.originalName} (${command.response.file})` : 'Файл не выбран')}
            readOnly
            placeholder="Файл не выбран"
            className="file-name-display"
          />
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

        {selectedFile && (
          <div className="file-info">
            {selectedFile.match(/\.(mp4|webm|mov|avi)$/i) && '🎬 Видео'}
            {selectedFile.match(/\.(mp3|wav|ogg|m4a)$/i) && '🎵 Аудио'}
            {selectedFile.match(/\.(jpg|jpeg|png|gif|webp)$/i) && '🖼️ Изображение'}
          </div>
        )}
      </div>

      {/* СЕЛЕКТОР ОВЕРЛЕЯ — между файлом и громкостью */}
      <OverlaySelector
        value={command.response?.overlay || ''}
        onChange={(overlayId) => onUpdate({
          ...command,
          response: { ...command.response, overlay: overlayId }
        })}
        overlays={overlays}
      />

      <div className="media-settings">
        <label>Громкость: <Tooltip text="Для видео и аудио" /></label>
        <div className="volume-control">
          <input type="range" min="0" max="100" value={command.response?.volume || 100}
            onChange={(e) => onUpdate({ ...command, response: { ...command.response, volume: parseInt(e.target.value) } })} />
          <span className="volume-value">{command.response?.volume || 100}%</span>
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
                value={command.response?.text?.content || ''}
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
                    className={`position-btn ${command.response?.text?.position === pos ? 'active' : ''}`}
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
            <div className="preview-box media-text-preview">
              <strong>Предпросмотр:</strong>
              <div className={`media-preview with-text position-${command.response?.text?.position || 'overlay'}`}>
                <div className="media-placeholder">{selectedFile || '[медиа]'}</div>
                <div className="text-overlay">{command.response?.text?.content || '[текст]'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MediaCommandEditor;