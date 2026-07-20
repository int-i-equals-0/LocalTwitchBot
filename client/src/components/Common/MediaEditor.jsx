// client/src/components/Common/MediaEditor.jsx
import { useRef, useState, useEffect } from 'react';
import { FaTrash, FaUpload, FaFolderOpen, FaToggleOn, FaToggleOff, FaPlay, FaStop, FaSearch } from 'react-icons/fa';
import Tooltip from '../Tooltip';
import './MediaEditor.css';

const FONT_FAMILIES = [
  { label: 'Segoe UI', value: "'Segoe UI', sans-serif" },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Palatino Linotype', value: "'Palatino Linotype', serif" },
  { label: 'Courier New', value: "'Courier New', monospace" },
  { label: 'Lucida Console', value: "'Lucida Console', monospace" },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Comic Sans MS', value: "'Comic Sans MS', cursive" },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Cambria', value: 'Cambria, serif' },
];

const TEXT_ANIMATIONS = [
  { value: 'none', label: '— Без анимации —' },
  { value: 'bounce', label: '🏀 Bounce' },
  { value: 'pulse', label: '💓 Pulse' },
  { value: 'rubberBand', label: '🎸 Rubber Band' },
  { value: 'tada', label: '🎉 Tada' },
  { value: 'wave', label: '🌊 Wave' },
  { value: 'wiggle', label: '🐛 Wiggle' },
  { value: 'wobble', label: '🍮 Wobble' },
];

const MEDIA_ENTER_ANIMATIONS = [
  { value: 'none', label: '— Без анимации —' },
  { value: 'fadeInLeft', label: '⬅️ Фейд слева' },
  { value: 'fadeInRight', label: '➡️ Фейд справа' },
  { value: 'fadeInTop', label: '⬆️ Фейд сверху' },
  { value: 'fadeInBottom', label: '⬇️ Фейд снизу' },
];

const MEDIA_EXIT_ANIMATIONS = [
  { value: 'none', label: '— Без анимации —' },
  { value: 'fadeOutLeft', label: '⬅️ Фейд налево' },
  { value: 'fadeOutRight', label: '➡️ Фейд направо' },
  { value: 'fadeOutTop', label: '⬆️ Фейд наверх' },
  { value: 'fadeOutBottom', label: '⬇️ Фейд вниз' },
];

function MediaEditor({ 
  value = { 
    enabled: false, file: '', volume: 100, overlay: null, 
    text: { enabled: false, content: '', position: 'overlay', animation: 'none', font: {} },
    animation: { enter: 'none', exit: 'none' }
  }, 
  onChange, 
  overlays = [] 
}) {
  const fileInputRef = useRef(null);
  const previewVideoRef = useRef(null);
  const previewAudioRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(value.file || '');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [textEnabled, setTextEnabled] = useState(value.text?.enabled || false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [textAnimKey, setTextAnimKey] = useState(0);
  const [mediaAnimKey, setMediaAnimKey] = useState(0);
  const [customFont, setCustomFont] = useState('');
  const [fontSelectionMode, setFontSelectionMode] = useState('preset');
  const [fileSearchQuery, setFileSearchQuery] = useState(''); // Добавлено состояние для поиска

  useEffect(() => { loadMediaFiles(); }, []);

  useEffect(() => {
    setSelectedFile(value.file || '');
    setTextEnabled(value.text?.enabled || false);
  }, [value]);

  // Сброс поиска при закрытии браузера
  useEffect(() => {
    if (!showFileBrowser) {
      setFileSearchQuery('');
    }
  }, [showFileBrowser]);

  // Сброс состояний при смене файла
  useEffect(() => {
    setPreviewPlaying(false);
    setTextAnimKey(0);
    setMediaAnimKey(0);
  }, [selectedFile]);

  const loadMediaFiles = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/media-files');
      const data = await response.json();
      if (data.success) setMediaFiles(data.files);
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
    }
  };

  const toggleEnabled = () => {
    onChange({ ...value, enabled: !value.enabled });
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      alert('❌ Файл слишком большой (макс. 100MB)');
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
      const result = await new Promise((resolve, reject) => {
        xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.response)) : reject(new Error('Ошибка'));
        xhr.onerror = () => reject(new Error('Ошибка сети'));
        xhr.open('POST', 'http://127.0.0.1:3001/api/upload');
        xhr.send(formData);
      });
      if (result.success) {
        await loadMediaFiles();
        setSelectedFile(result.file.fileName);
        onChange({ ...value, file: result.file.fileName, enabled: true });
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      alert('❌ Ошибка загрузки файла');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const selectExistingFile = (file) => {
    setSelectedFile(file.name);
    onChange({ ...value, file: file.name, enabled: true });
    setShowFileBrowser(false);
    setFileSearchQuery(''); // Очищаем поиск при выборе файла
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
          onChange({ ...value, file: '', enabled: value.enabled });
        }
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  };

  const updateMedia = (updates) => {
    onChange({ ...value, ...updates });
  };

  const toggleText = (enabled) => {
    setTextEnabled(enabled);
    updateMedia({ text: { ...value.text, enabled } });
  };

  const updateText = (updates) => {
    updateMedia({ text: { ...value.text, ...updates } });
  };

  const updateFont = (updates) => {
    updateMedia({
      text: {
        ...value.text,
        font: { ...(value.text?.font || {}), ...updates }
      }
    });
  };

  const updateAnimation = (updates) => {
    updateMedia({
      animation: { ...(value.animation || {}), ...updates }
    });
  };

  const getFileIcon = (file) => {
    if (file.type === 'video') return '🎬';
    if (file.type === 'audio') return '🎵';
    if (file.type === 'image') return '🖼️';
    return '📄';
  };

  const getFileMediaType = (fileName) => {
    if (!fileName) return 'unknown';
    const ext = fileName.split('.').pop().toLowerCase();
    if (['mp4','webm','mov','avi','mkv','flv','m4v'].includes(ext)) return 'video';
    if (['mp3','wav','ogg','m4a','flac','aac'].includes(ext)) return 'audio';
    if (['jpg','jpeg','png','gif','webp','bmp'].includes(ext)) return 'image';
    return 'unknown';
  };

  const togglePreview = () => {
    if (showPreview) {
      setShowPreview(false);
      setPreviewPlaying(false);
    } else {
      setShowPreview(true);
    }
  };

  const playPreview = () => {
    setPreviewPlaying(true);
    setTextAnimKey(prev => prev + 1);
    setMediaAnimKey(prev => prev + 1);
    
    const video = previewVideoRef.current;
    if (video) {
      video.currentTime = 0;
      video.volume = (value.volume || 100) / 100;
      video.play().catch(() => {});
    }
    
    const audio = previewAudioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.volume = (value.volume || 100) / 100;
      audio.play().catch(() => {});
    }
  };

  const stopPreview = () => {
    setPreviewPlaying(false);
    
    const video = previewVideoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    
    const audio = previewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  // Фильтрация файлов по поисковому запросу
  const filteredFiles = mediaFiles.filter(file => 
    file.name.toLowerCase().includes(fileSearchQuery.toLowerCase())
  );

  const fileType = getFileMediaType(selectedFile);
  const font = value.text?.font || {};
  const textAnimation = value.text?.animation || 'none';

  const renderAnimatedTextPreview = (text, animation, animKey) => {
    if (!text) return '[текст]';
    if (!animation || animation === 'none') return text;
    return text.split('').map((char, i) => (
      <span 
        key={`${animKey}-${i}`}
        className={`preview-char preview-char-${animation}`}
        style={{ animationDelay: `${i * 0.05}s` }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  return (
    <div className="media-editor">
      <div className="editor-header">
        <div className="toggle-container">
          <button
            className={`toggle-btn ${value.enabled ? 'enabled' : 'disabled'}`}
            onClick={toggleEnabled}
          >
            {value.enabled ? <FaToggleOn /> : <FaToggleOff />}
            <span>{value.enabled ? 'Медиа на оверлей включено' : 'Медиа на оверлей выключено'}</span>
          </button>
          <Tooltip text="Включить воспроизведение медиа на оверлее" />
        </div>
      </div>

      {value.enabled && (
        <div className="editor-content">
          {/* === ФАЙЛ === */}
          <div className="media-file-selector">
            <label>
              🎬 Медиа файл
              <Tooltip text="Выберите видео, аудио или изображение. Поддерживаются: MP4, WebM, MP3, WAV, OGG, JPG, PNG, GIF, WebP и другие." />
            </label>
            <div className="file-input-group">
              <input type="text" value={selectedFile || 'Файл не выбран'} readOnly placeholder="Файл не выбран" className="file-name-display" />
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
                <div className="file-browser-header">
                  <h4>📁 Медиа-файлы</h4>
                  <div className="file-search">
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Поиск файлов..."
                      value={fileSearchQuery}
                      onChange={(e) => setFileSearchQuery(e.target.value)}
                      className="file-search-input"
                    />
                    {fileSearchQuery && (
                      <button 
                        className="search-clear-btn"
                        onClick={() => setFileSearchQuery('')}
                        title="Очистить"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {filteredFiles.length === 0 ? (
                  <p className="empty-files">
                    {mediaFiles.length === 0 
                      ? 'Нет файлов' 
                      : `Нет файлов, содержащих "${fileSearchQuery}"`}
                  </p>
                ) : (
                  <div className="files-grid">
                    {filteredFiles.map(file => (
                      <div key={file.name} className={`file-item ${selectedFile === file.name ? 'selected' : ''}`} onClick={() => selectExistingFile(file)}>
                        <span className="file-icon">{getFileIcon(file)}</span>
                        <span className="file-name" title={file.name}>{file.name}</span>
                        <span className="file-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                        <button className="delete-file-btn" onClick={(e) => deleteFile(file.name, e)} title="Удалить"><FaTrash /></button>
                      </div>
                    ))}
                  </div>
                )}
                {fileSearchQuery && filteredFiles.length > 0 && (
                  <div className="search-stats">
                    Найдено: {filteredFiles.length} из {mediaFiles.length}
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

          {/* === ОВЕРЛЕЙ === */}
          <div className="overlay-selector">
            <label>
              🖥️ Целевой оверлей
              <Tooltip text="Выберите конкретный оверлей для отображения медиа. Если не выбрано — отправится на все подключённые оверлеи." />
            </label>
            <select
              value={value.overlay?.id || value.overlay || ''}
              onChange={(e) => {
                const sel = overlays.find(o => o.id === e.target.value);
                updateMedia({ overlay: sel ? { id: sel.id, path: sel.path } : null });
              }}
              className="overlay-select"
            >
              <option value="">📡 Все оверлеи</option>
              {overlays.map(o => (
                <option key={o.id} value={o.id}>🖥️ {o.name} (/overlay/{o.path})</option>
              ))}
            </select>
          </div>

          {/* === ГРОМКОСТЬ === */}
          <div className="media-settings">
            <label>
              🔊 Громкость
              <Tooltip text="Громкость воспроизведения для видео и аудио (0-100%)" />
            </label>
            <div className="volume-control">
              <input type="range" min="0" max="100" value={value.volume || 100} onChange={(e) => updateMedia({ volume: parseInt(e.target.value) })} />
              <span className="volume-value">{value.volume || 100}%</span>
            </div>
          </div>

          {/* === АНИМАЦИИ МЕДИА (только для видео и изображений) === */}
          {(fileType === 'video' || fileType === 'image') && (
            <div className="media-animation-section">
              <h4>🎭 Анимации медиа</h4>
              <div className="animation-row">
                <div className="animation-select-group">
                  <label>
                    Появление
                    <Tooltip text="Анимация при появлении медиа на экране" />
                  </label>
                  <select
                    value={value.animation?.enter || 'none'}
                    onChange={(e) => updateAnimation({ enter: e.target.value })}
                    className="animation-select"
                  >
                    {MEDIA_ENTER_ANIMATIONS.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div className="animation-select-group">
                  <label>
                    Скрытие
                    <Tooltip text="Анимация при исчезновении медиа с экрана" />
                  </label>
                  <select
                    value={value.animation?.exit || 'none'}
                    onChange={(e) => updateAnimation({ exit: e.target.value })}
                    className="animation-select"
                  >
                    {MEDIA_EXIT_ANIMATIONS.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* === ТЕКСТ === */}
          <div className="media-text-section">
            <div className="section-header">
              <label className="toggle-label">
                <input type="checkbox" checked={textEnabled} onChange={(e) => toggleText(e.target.checked)} className="toggle-checkbox" />
                <span className="toggle-text">📝 Показывать текст на оверлее</span>
                <Tooltip text="Добавить текст поверх медиа или рядом с ним. Можно использовать переменную {user} — она подставит имя пользователя, вызвавшего команду/событие." />
              </label>
            </div>

            {textEnabled && (
              <div className="text-settings">
                {/* Блок доступных переменных */}
                <div className="text-vars-block">
                  <div className="text-vars-label">
                    <span>📌 Доступные переменные:</span>
                    <Tooltip text="Переменные автоматически заменяются на реальные значения при выполнении команды/события" />
                  </div>
                  <div className="text-vars-badges">
                    <code className="text-var-badge">{'{user}'}</code>
                    <span className="text-var-note">— имя пользователя</span>
                  </div>
                </div>

                <div className="text-input-group">
                  <label>
                    Текст
                    <Tooltip text="Поддерживается переменная {user} — имя пользователя" />
                  </label>
                  <textarea
                    value={value.text?.content || ''}
                    onChange={(e) => updateText({ content: e.target.value })}
                    placeholder="Текст для отображения... Используйте {user} для имени пользователя"
                    rows="3"
                    className="text-content-input"
                  />
                </div>

                {/* Позиция текста */}
                <div className="position-selector">
                  <label>
                    Позиция текста
                    <Tooltip text="Расположение текста относительно медиа-файла" />
                  </label>
                  <div className="position-buttons">
                    {['above', 'below', 'left', 'right', 'overlay'].map(pos => (
                      <button
                        key={pos}
                        type="button"
                        className={`position-btn ${value.text?.position === pos ? 'active' : ''}`}
                        onClick={() => updateText({ position: pos })}
                      >
                        {pos === 'above' && '⬆️ Сверху'}
                        {pos === 'below' && '⬇️ Снизу'}
                        {pos === 'left' && '⬅️ Слева'}
                        {pos === 'right' && '➡️ Справа'}
                        {pos === 'overlay' && '🎯 Поверх'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Анимация текста */}
                <div className="text-animation-selector">
                  <label>
                    🎭 Анимация текста
                    <Tooltip text="Анимация для каждой буквы текста при появлении" />
                  </label>
                  <select
                    value={textAnimation}
                    onChange={(e) => updateText({ animation: e.target.value })}
                    className="animation-select"
                  >
                    {TEXT_ANIMATIONS.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>

                {/* Настройки шрифта */}
                <div className="font-settings">
                  <h4>
                    🔤 Настройки шрифта
                    <Tooltip text="Настройте внешний вид текста на оверлее" />
                  </h4>
                  <div className="font-settings-grid">
                    <div className="font-setting-item">
                      <label>Режим выбора шрифта</label>
                      <div className="font-mode-buttons">
                        <button
                          type="button"
                          className={`font-mode-btn ${fontSelectionMode === 'preset' ? 'active' : ''}`}
                          onClick={() => {
                            setFontSelectionMode('preset');
                            updateFont({ fontFamily: "'Segoe UI', sans-serif" });
                            setCustomFont('');
                          }}
                        >
                          📋 Из списка
                        </button>
                        <button
                          type="button"
                          className={`font-mode-btn ${fontSelectionMode === 'custom' ? 'active' : ''}`}
                          onClick={() => {
                            setFontSelectionMode('custom');
                            const currentFont = font.fontFamily || "'Segoe UI', sans-serif";
                            const isPresetFont = FONT_FAMILIES.some(f => f.value === currentFont);
                            if (isPresetFont) {
                              setCustomFont('');
                              updateFont({ fontFamily: '' });
                            } else {
                              setCustomFont(currentFont.replace(/'/g, '').replace(', sans-serif', ''));
                            }
                          }}
                        >
                          ✏️ Свой шрифт
                        </button>
                      </div>
                    </div>

                    {fontSelectionMode === 'preset' ? (
                      <div className="font-setting-item">
                        <label>Семейство</label>
                        <select
                          value={font.fontFamily || "'Segoe UI', sans-serif"}
                          onChange={(e) => updateFont({ fontFamily: e.target.value })}
                          className="font-select"
                          style={{ fontFamily: font.fontFamily || "'Segoe UI', sans-serif" }}
                        >
                          {FONT_FAMILIES.map(f => (
                            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="font-setting-item">
                        <label>Название шрифта</label>
                        <input
                          type="text"
                          value={(() => {
                            const currentFont = font.fontFamily || '';
                            let cleanName = currentFont.replace(/^'|'$/g, '');
                            if (cleanName.includes(',')) {
                              cleanName = cleanName.split(',')[0].trim();
                            }
                            return customFont || cleanName;
                          })()}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setCustomFont(newValue);
                            if (newValue.trim() === '') {
                              updateFont({ fontFamily: '' });
                            } else {
                              updateFont({ fontFamily: `'${newValue}', sans-serif` });
                            }
                          }}
                          placeholder="например: Roboto, Montserrat, Open Sans"
                          className="custom-font-input"
                        />
                        <div className="input-hint">
                          💡 Введите название шрифта, установленного в вашей системе
                        </div>
                      </div>
                    )}

                    <div className="font-setting-item">
                      <label>
                        Размер: {font.fontSize || 32}px
                        <Tooltip text="Размер шрифта в пикселях (12-120)" />
                      </label>
                      <input
                        type="range" min="12" max="120" value={font.fontSize || 32}
                        onChange={(e) => updateFont({ fontSize: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="font-setting-item">
                      <label>Жирность</label>
                      <select
                        value={font.fontWeight || '700'}
                        onChange={(e) => updateFont({ fontWeight: e.target.value })}
                        className="font-select"
                      >
                        <option value="400">Обычный (400)</option>
                        <option value="500">Средний (500)</option>
                        <option value="600">Полужирный (600)</option>
                        <option value="700">Жирный (700)</option>
                        <option value="800">Очень жирный (800)</option>
                        <option value="900">Сверхжирный (900)</option>
                      </select>
                    </div>
                    <div className="font-setting-item font-style-row">
                      <label className="toggle-label">
                        <input
                          type="checkbox"
                          checked={font.fontStyle === 'italic'}
                          onChange={(e) => updateFont({ fontStyle: e.target.checked ? 'italic' : 'normal' })}
                          className="toggle-checkbox"
                        />
                        <span className="toggle-label-text">Курсив</span>
                        <Tooltip text="Наклонный шрифт" />
                      </label>
                    </div>
                    <div className="font-setting-item">
                      <label>
                        Цвет текста
                        <Tooltip text="Цвет текста в формате HEX (#RRGGBB)" />
                      </label>
                      <div className="color-input-group">
                        <input
                          type="color"
                          value={font.color || '#ffffff'}
                          onChange={(e) => updateFont({ color: e.target.value })}
                          className="color-picker"
                        />
                        <input
                          type="text"
                          value={font.color || '#ffffff'}
                          onChange={(e) => updateFont({ color: e.target.value })}
                          className="color-text-input"
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* === ПРЕДПРОСМОТР МЕДИА === */}
          {selectedFile && (
            <div className="media-preview-section">
              <div className="preview-header">
                <h4>👁️ Предпросмотр</h4>
                <button onClick={togglePreview} className={`preview-toggle-btn ${showPreview ? 'active' : ''}`}>
                  {showPreview ? 'Скрыть' : 'Показать'}
                </button>
              </div>
              {showPreview && (
                <div className="preview-container">
                  {fileType === 'video' && (
                    <div className="preview-video-wrap">
                      <video
                        ref={previewVideoRef}
                        src={`http://127.0.0.1:3001/media/${selectedFile}`}
                        className={`preview-video ${previewPlaying && value.animation?.enter && value.animation.enter !== 'none' ? `media-enter-${value.animation.enter}` : ''}`}
                        onEnded={() => setPreviewPlaying(false)}
                        playsInline
                        style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                      />
                      {textEnabled && (
                        <div 
                          key={`text-wrapper-${textAnimKey}`}
                          className="preview-text-overlay"
                          style={{
                            fontFamily: font.fontFamily || "'Segoe UI', sans-serif",
                            fontSize: `${Math.min(font.fontSize || 32, 32)}px`,
                            fontWeight: font.fontWeight || '700',
                            fontStyle: font.fontStyle || 'normal',
                            color: font.color || '#ffffff',
                            textShadow: '0px 0px 1px #000, 0px 0px 2px #000, 0px 0px 3px #000'
                          }}
                        >
                          {previewPlaying 
                            ? renderAnimatedTextPreview(value.text.content, textAnimation, textAnimKey)
                            : value.text.content || '[текст]'
                          }
                        </div>
                      )}
                      <div className="preview-controls">
                        {!previewPlaying ? (
                          <button onClick={playPreview} className="preview-play-btn"><FaPlay /> Воспроизвести</button>
                        ) : (
                          <button onClick={stopPreview} className="preview-stop-btn"><FaStop /> Остановить</button>
                        )}
                      </div>
                    </div>
                  )}
                  {fileType === 'image' && (
                    <div className="preview-image-wrap">
                      <img
                        key={`image-${mediaAnimKey}`}
                        src={`http://127.0.0.1:3001/media/${selectedFile}`}
                        alt="preview"
                        className={`preview-image ${previewPlaying && value.animation?.enter && value.animation.enter !== 'none' ? `media-enter-${value.animation.enter}` : ''}`}
                        style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                      />
                      {textEnabled && (
                        <div 
                          key={`text-wrapper-${textAnimKey}`}
                          className="preview-text-overlay"
                          style={{
                            fontFamily: font.fontFamily || "'Segoe UI', sans-serif",
                            fontSize: `${Math.min(font.fontSize || 32, 32)}px`,
                            fontWeight: font.fontWeight || '700',
                            fontStyle: font.fontStyle || 'normal',
                            color: font.color || '#ffffff',
                            textShadow: '0px 0px 1px #000, 0px 0px 2px #000, 0px 0px 3px #000',
                            marginTop: '10px'
                          }}
                        >
                          {previewPlaying 
                            ? renderAnimatedTextPreview(value.text.content, textAnimation, textAnimKey)
                            : value.text.content || '[текст]'
                          }
                        </div>
                      )}
                      <div className="preview-controls">
                        {!previewPlaying ? (
                          <button onClick={playPreview} className="preview-play-btn"><FaPlay /> Воспроизвести</button>
                        ) : (
                          <button onClick={stopPreview} className="preview-stop-btn"><FaStop /> Остановить</button>
                        )}
                      </div>
                    </div>
                  )}
                  {fileType === 'audio' && (
                    <div className="preview-audio-wrap">
                      <audio
                        ref={previewAudioRef}
                        src={`http://127.0.0.1:3001/media/${selectedFile}`}
                        style={{ width: '100%' }}
                      />
                      {textEnabled && (
                        <div 
                          key={`text-wrapper-${textAnimKey}`}
                          className="preview-text-overlay"
                          style={{
                            fontFamily: font.fontFamily || "'Segoe UI', sans-serif",
                            fontSize: `${Math.min(font.fontSize || 32, 32)}px`,
                            fontWeight: font.fontWeight || '700',
                            fontStyle: font.fontStyle || 'normal',
                            color: font.color || '#ffffff',
                            textShadow: '0px 0px 1px #000, 0px 0px 2px #000, 0px 0px 3px #000',
                            marginTop: '10px'
                          }}
                        >
                          {previewPlaying 
                            ? renderAnimatedTextPreview(value.text.content, textAnimation, textAnimKey)
                            : value.text.content || '[текст]'
                          }
                        </div>
                      )}
                      <div className="preview-controls">
                        {!previewPlaying ? (
                          <button onClick={playPreview} className="preview-play-btn"><FaPlay /> Воспроизвести</button>
                        ) : (
                          <button onClick={stopPreview} className="preview-stop-btn"><FaStop /> Остановить</button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MediaEditor;