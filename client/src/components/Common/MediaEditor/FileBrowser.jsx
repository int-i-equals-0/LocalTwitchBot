// client/src/components/Common/MediaEditor/FileBrowser.jsx

import { useState, useMemo } from 'react';
import { FaTrash, FaSearch } from 'react-icons/fa';
import { useNotification } from '../../Notification';
import { getFileIcon, filterFilesByType } from './utils';
import './MediaEditor.css';

function FileBrowser({ files, selectedFile, onSelect, onDelete, filterType = null }) {
  const { showConfirm } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = useMemo(() => {
    let result = filterType ? filterFilesByType(files, filterType) : files;
    if (searchQuery) {
      result = result.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [files, filterType, searchQuery]);

  const handleDelete = (fileName, event) => {
    event.stopPropagation();
    showConfirm(`Удалить файл "${fileName}"?`, () => onDelete(fileName));
  };

  return (
    <div className="file-browser">
      <div className="file-browser-header">
        <h4>📁 Медиа-файлы {filterType && `(${filterType})`}</h4>
        <div className="file-search">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Поиск файлов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="file-search-input"
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <p className="empty-files">
          {files.length === 0
            ? 'Нет файлов'
            : `Нет файлов, содержащих "${searchQuery}"`}
        </p>
      ) : (
        <div className="files-grid">
          {filteredFiles.map((file) => (
            <div
              key={file.name}
              className={`file-item ${selectedFile === file.name ? 'selected' : ''}`}
              onClick={() => onSelect(file)}
            >
              <span className="file-icon">{getFileIcon(file)}</span>
              <span className="file-name" title={file.name}>{file.name}</span>
              <span className="file-size">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              <button
                className="delete-file-btn"
                onClick={(e) => handleDelete(file.name, e)}
                title="Удалить"
              >
                <FaTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileBrowser;