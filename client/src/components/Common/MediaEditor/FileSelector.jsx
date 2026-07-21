// client/src/components/Common/MediaEditor/FileSelector.jsx

import { useState, useEffect, useCallback } from 'react';
import { FaUpload, FaFolderOpen } from 'react-icons/fa';
import FileBrowser from './FileBrowser';
import { useFileUpload } from './hooks/useFileUpload';
import './MediaEditor.css';

function FileSelector({
  label,
  selectedFile,
  onFileSelect,
  onFileClear,
  mediaFiles,
  onDeleteFile,
  accept = 'video/*,audio/*,image/*',
  filterType = null,
  disabled = false,
}) {
  const [showBrowser, setShowBrowser] = useState(false);

  const handleUploadComplete = useCallback((uploadedFile) => {
    onFileSelect(uploadedFile.fileName);
  }, [onFileSelect]);

  const {
    fileInputRef,
    uploading,
    uploadProgress,
    handleFileSelect,
    openFilePicker,
  } = useFileUpload({ onUploadComplete: handleUploadComplete });

  useEffect(() => {
    if (!showBrowser) return;
  }, [showBrowser]);

  const handleBrowseSelect = useCallback((file) => {
    onFileSelect(file.name);
    setShowBrowser(false);
  }, [onFileSelect]);

  return (
    <div className="media-file-selector">
      {label && <label>{label}</label>}

      <div className="file-input-group">
        <input
          type="text"
          value={selectedFile || 'Файл не выбран'}
          readOnly
          placeholder="Файл не выбран"
          className="file-name-display"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={accept}
          style={{ display: 'none' }}
        />
        <div className="file-button-group">
          <button
            onClick={openFilePicker}
            className="browse-btn"
            disabled={uploading || disabled}
          >
            <FaUpload /> {uploading ? `${uploadProgress}%` : 'Загрузить'}
          </button>
          <button
            onClick={() => setShowBrowser(!showBrowser)}
            className="browse-btn browse-existing"
            disabled={disabled}
          >
            <FaFolderOpen /> Из папки
          </button>
          {selectedFile && onFileClear && (
            <button
              onClick={onFileClear}
              className="browse-btn clear-file-btn"
              disabled={disabled}
              title="Убрать файл"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {showBrowser && (
        <FileBrowser
          files={mediaFiles}
          selectedFile={selectedFile}
          onSelect={handleBrowseSelect}
          onDelete={onDeleteFile}
          filterType={filterType}
        />
      )}

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <span className="progress-text">{uploadProgress}%</span>
        </div>
      )}
    </div>
  );
}

export default FileSelector;