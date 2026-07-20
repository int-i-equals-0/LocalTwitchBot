// client/src/components/Commands/MixedCommandEditor.jsx

import { useRef, useState, useEffect } from 'react';
import { FaTrash, FaPlus, FaRandom, FaSpaceShuttle, FaUpload, FaFolderOpen, FaPowerOff, FaArrowUp, FaArrowDown, FaUsers } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import Tooltip from '../Tooltip';
import PermissionsSelector from './PermissionsSelector';
import OverlaySelector from './OverlaySelector';
import './CommandEditor.css';

function MixedCommandEditor({ command, onUpdate, overlays = [] }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(command.response?.media?.file || '');
  const [textEnabled, setTextEnabled] = useState(command.response?.media?.text?.enabled || false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => { loadMediaFiles(); }, []);

  const loadMediaFiles = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/media-files');
      const data = await response.json();
      if (data.success) setMediaFiles(data.files);
    } catch (error) { console.error('Ошибка загрузки списка файлов:', error); }
  };

  // ========== CHAT COMPONENTS ==========
  const chatComponents = command.response?.chat?.components || [];

  const updateChatComponents = (newComponents) => {
    onUpdate({
      ...command,
      response: { ...command.response, chat: { ...command.response?.chat, components: newComponents } }
    });
  };

  const addChatComponent = (type) => {
    const newComp = (() => {
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
    updateChatComponents([...chatComponents, newComp]);
    setPreviewKey(k => k + 1);
  };

  const removeChatComponent = (index) => {
    updateChatComponents(chatComponents.filter((_, i) => i !== index));
    setPreviewKey(k => k + 1);
  };

  const updateChatComponent = (index, updates) => {
    const newComps = [...chatComponents];
    newComps[index] = { ...newComps[index], ...updates };
    updateChatComponents(newComps);
    setPreviewKey(k => k + 1);
  };

  const moveChatComponent = (index, direction) => {
    const newComps = [...chatComponents];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newComps.length) return;
    [newComps[index], newComps[newIndex]] = [newComps[newIndex], newComps[index]];
    updateChatComponents(newComps);
    setPreviewKey(k => k + 1);
  };

  const addPhrase = (compIndex) => {
    const newComps = [...chatComponents];
    newComps[compIndex] = { ...newComps[compIndex], phrases: [...(newComps[compIndex].phrases || []), ''] };
    updateChatComponents(newComps);
  };

  const updatePhrase = (compIndex, phraseIndex, value) => {
    const newComps = [...chatComponents];
    const phrases = [...newComps[compIndex].phrases];
    phrases[phraseIndex] = value;
    newComps[compIndex] = { ...newComps[compIndex], phrases };
    updateChatComponents(newComps);
  };

  const removePhrase = (compIndex, phraseIndex) => {
    const newComps = [...chatComponents];
    const phrases = newComps[compIndex].phrases.filter((_, i) => i !== phraseIndex);
    if (phrases.length === 0) {
      updateChatComponents(chatComponents.filter((_, i) => i !== compIndex));
    } else {
      newComps[compIndex] = { ...newComps[compIndex], phrases };
      updateChatComponents(newComps);
    }
  };

  // ========== MEDIA ==========
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) { alert('❌ Файл слишком большой. Максимальный размер: 100MB'); return; }
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
      const result = await new Promise((resolve, reject) => {
        xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.response)) : reject(new Error('Ошибка загрузки'));
        xhr.onerror = () => reject(new Error('Ошибка сети'));
        xhr.open('POST', 'http://127.0.0.1:3001/api/upload');
        xhr.send(formData);
      });
      if (result.success) {
        await loadMediaFiles();
        setSelectedFile(result.file.fileName);
        onUpdate({
          ...command,
          response: { ...command.response, media: { ...command.response?.media, file: result.file.fileName, fullPath: result.file.path, originalName: result.file.originalName } }
        });
      }
    } catch (error) { console.error('❌ Ошибка загрузки:', error); alert('❌ Ошибка при загрузке файла'); }
    finally { setUploading(false); setUploadProgress(0); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const selectExistingFile = (file) => {
    setSelectedFile(file.name);
    onUpdate({ ...command, response: { ...command.response, media: { ...command.response?.media, file: file.name, fullPath: file.path } } });
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
          onUpdate({ ...command, response: { ...command.response, media: { ...command.response?.media, file: '', fullPath: '' } } });
        }
      }
    } catch (error) { alert('❌ Ошибка при удалении файла'); }
  };

  const updateMediaTextSettings = (updates) => {
    onUpdate({
      ...command,
      response: {
        ...command.response,
        media: {
          ...command.response?.media,
          text: { enabled: textEnabled, content: command.response?.media?.text?.content || '', position: command.response?.media?.text?.position || 'overlay', ...updates }
        }
      }
    });
  };

  const toggleMediaText = (enabled) => {
    setTextEnabled(enabled);
    updateMediaTextSettings({ enabled });
  };

  const getFileIcon = (file) => {
    if (file.type === 'video') return '🎬';
    if (file.type === 'audio') return '🎵';
    if (file.type === 'image') return '🖼️';
    return '📄';
  };

  const toggleEnabled = () => { onUpdate({ ...command, enabled: !command.enabled }); };

  // ========== PREVIEW ==========
  const generatePreview = () => {
    return chatComponents.map((comp) => {
      switch (comp.type) {
        case 'author': return '@Username';
        case 'target': return '@Target';
        case 'randomViewer': return '@RandomViewer';
        case 'static': return comp.value || '';
        case 'space': return ' ';
        case 'random': return Math.floor(Math.random() * ((comp.max || 100) - (comp.min || 0) + 1)) + (comp.min || 0);
        case 'phrase':
          if (comp.phrases?.length > 0) {
            const valid = comp.phrases.filter(p => p.trim());
            if (valid.length) return valid[Math.floor(Math.random() * valid.length)];
          }
          return '';
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
          <button onClick={() => moveChatComponent(index, -1)} className={`move-btn up ${isFirst ? 'disabled' : ''}`} disabled={isFirst} title="Вверх"><FaArrowUp /></button>
          <button onClick={() => moveChatComponent(index, 1)} className={`move-btn down ${isLast ? 'disabled' : ''}`} disabled={isLast} title="Вниз"><FaArrowDown /></button>
        </div>
        <div className="component-content">
          {(() => {
            switch (comp.type) {
              case 'space':
                return (
                  <div className="component space">
                    <span className="space-icon"><FaSpaceShuttle /> Пробел</span>
                    <Tooltip text="Вставляет пробел между соседними компонентами" />
                    <button onClick={() => removeChatComponent(index)} className="remove-btn"><FaTrash /></button>
                  </div>
                );
              case 'static':
                return (
                  <div className="component static">
                    <span>📝 Текст:</span>
                    <input type="text" value={comp.value || ''} onChange={(e) => updateChatComponent(index, { value: e.target.value })} placeholder="Введите текст..." />
                    <button onClick={() => removeChatComponent(index)} className="remove-btn"><FaTrash /></button>
                  </div>
                );
              case 'author':
                return (
                  <div className="component variable">
                    <span>👤 Автор</span>
                    <Tooltip text="Имя пользователя, написавшего команду" />
                    <button onClick={() => removeChatComponent(index)} className="remove-btn"><FaTrash /></button>
                  </div>
                );
              case 'target':
                return (
                  <div className="component variable">
                    <span>🎯 Цель</span>
                    <Tooltip text="Первый аргумент после команды" />
                    <button onClick={() => removeChatComponent(index)} className="remove-btn"><FaTrash /></button>
                  </div>
                );
              case 'randomViewer':
                return (
                  <div className="component variable">
                    <span><FaUsers /> Случайный зритель</span>
                    <Tooltip text="Подставляет случайного зрителя из чата" />
                    <button onClick={() => removeChatComponent(index)} className="remove-btn"><FaTrash /></button>
                  </div>
                );
              case 'random':
                return (
                  <div className="component random">
                    <span>🎲 Случайное число:</span>
                    <input type="number" value={comp.min || 0} onChange={(e) => updateChatComponent(index, { min: parseInt(e.target.value) || 0 })} placeholder="Мин" className="number-input" />
                    <span className="separator">—</span>
                    <input type="number" value={comp.max || 100} onChange={(e) => updateChatComponent(index, { max: parseInt(e.target.value) || 100 })} placeholder="Макс" className="number-input" />
                    <button onClick={() => removeChatComponent(index)} className="remove-btn"><FaTrash /></button>
                  </div>
                );
              case 'phrase':
                return (
                  <div className="component phrase-set">
                    <div className="phrase-header">
                      <span>📚 Набор фраз</span>
                      <Tooltip text="Бот выберет случайную фразу из набора" />
                      <button onClick={() => addPhrase(index)} className="add-phrase-btn"><FaPlus /></button>
                    </div>
                    {(comp.phrases || []).map((phrase, pIdx) => (
                      <div key={pIdx} className="phrase-item">
                        <input type="text" value={phrase} onChange={(e) => updatePhrase(index, pIdx, e.target.value)} placeholder={`Вариант ${pIdx + 1}`} />
                        <button onClick={() => removePhrase(index, pIdx)} className="remove-phrase-btn"><FaTrash /></button>
                      </div>
                    ))}
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
    <div className="mixed-command-editor">
      <div className="command-header">
        <div className="command-title-row">
          <input type="text" value={command.name || ''} onChange={(e) => onUpdate({ ...command, name: e.target.value.replace(/^!+/, '') })} placeholder="Название команды (без !)" className="command-name-input" />
          <div className="command-toggle">
            <label className="toggle-switch">
              <input type="checkbox" checked={command.enabled !== false} onChange={toggleEnabled} />
              <span className="toggle-slider"><span className="toggle-icon"><FaPowerOff /></span></span>
            </label>
            <span className="toggle-label">{command.enabled !== false ? 'Включена' : 'Выключена'}</span>
            <Tooltip text="Временно отключить команду без удаления" />
          </div>
        </div>
      </div>

      <PermissionsSelector value={command.permissions || []} onChange={(perms) => onUpdate({ ...command, permissions: perms })} />

      {/* ===== ЧАСТЬ 1: ТЕКСТ В ЧАТ ===== */}
      <div className="mixed-section">
        <div className="mixed-section-header">
          <h4>💬 Текст в чат</h4>
          <Tooltip text="Этот текст будет отправлен в чат Twitch при выполнении команды" />
        </div>

        <div className="components-list">
          {chatComponents.length === 0 ? (
            <div className="empty-components"><p>✨ Начните добавлять компоненты для создания сообщения</p></div>
          ) : (
            chatComponents.map((comp, index) => renderChatComponent(comp, index))
          )}
        </div>

        <div className="add-component-buttons">
          <button onClick={() => addChatComponent('static')} className="add-btn"><FaPlus /> Текст</button>
          <button onClick={() => addChatComponent('author')} className="add-btn"><FaPlus /> Автор</button>
          <button onClick={() => addChatComponent('target')} className="add-btn"><FaPlus /> Цель</button>
          <button onClick={() => addChatComponent('randomViewer')} className="add-btn"><FaUsers /> Случайный зритель</button>
          <button onClick={() => addChatComponent('random')} className="add-btn"><FaRandom /> Случайное число</button>
          <button onClick={() => addChatComponent('phrase')} className="add-btn"><FaPlus /> Набор фраз</button>
          <button onClick={() => addChatComponent('space')} className="add-btn space-btn"><FaSpaceShuttle /> Пробел</button>
        </div>

        <div className="preview-section">
          <div className="preview-header">
            <strong>Предпросмотр чата:</strong>
            <button className="refresh-preview-btn" onClick={() => setPreviewKey(k => k + 1)} title="Обновить"><MdRefresh /> Обновить</button>
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
          <Tooltip text="Медиа-файл, который будет воспроизведен на оверлее при выполнении команды" />
        </div>

        <div className="media-file-selector">
          <label>🎬 Медиа файл: <Tooltip text="Выберите видео, аудио или изображение" /></label>
          <div className="file-input-group">
            <input type="text" value={selectedFile || (command.response?.media?.originalName ? `${command.response.media.originalName} (${command.response.media.file})` : 'Файл не выбран')} readOnly placeholder="Файл не выбран" className="file-name-display" />
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

        <OverlaySelector
          value={command.response?.media?.overlay || ''}
          onChange={(overlayId) => onUpdate({ ...command, response: { ...command.response, media: { ...command.response?.media, overlay: overlayId } } })}
          overlays={overlays}
        />

        <div className="media-settings">
          <label>Громкость: <Tooltip text="Для видео и аудио" /></label>
          <div className="volume-control">
            <input type="range" min="0" max="100" value={command.response?.media?.volume || 100}
              onChange={(e) => onUpdate({ ...command, response: { ...command.response, media: { ...command.response?.media, volume: parseInt(e.target.value) } } })} />
            <span className="volume-value">{command.response?.media?.volume || 100}%</span>
          </div>
        </div>

        <div className="media-text-section">
          <div className="section-header">
            <label className="toggle-label">
              <input type="checkbox" checked={textEnabled} onChange={(e) => toggleMediaText(e.target.checked)} className="toggle-checkbox" />
              <span className="toggle-text">📝 Показывать текст на оверлее</span>
              <Tooltip text="Добавить текст поверх медиа или рядом с ним на оверлее" />
            </label>
          </div>

          {textEnabled && (
            <div className="text-settings">
              <div className="text-input-group">
                <textarea value={command.response?.media?.text?.content || ''} onChange={(e) => updateMediaTextSettings({ content: e.target.value })} placeholder="Текст на оверлее... (поддерживается {user}, {target})" rows="3" className="text-content-input" />
              </div>
              <div className="position-selector">
                <label>Позиция текста:</label>
                <div className="position-buttons">
                  {['above', 'below', 'left', 'right', 'overlay'].map(pos => (
                    <button key={pos} type="button"
                      className={`position-btn ${command.response?.media?.text?.position === pos ? 'active' : ''}`}
                      onClick={() => updateMediaTextSettings({ position: pos })}>
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
                <div className={`media-preview with-text position-${command.response?.media?.text?.position || 'overlay'}`}>
                  <div className="media-placeholder">{selectedFile || '[медиа]'}</div>
                  <div className="text-overlay">{command.response?.media?.text?.content || '[текст]'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MixedCommandEditor;