import { useState } from 'react';
import { FaPlus, FaTrash, FaCopy, FaExternalLinkAlt } from 'react-icons/fa';
import Tooltip from '../Tooltip';
import { useNotification, NOTIFICATION_TYPES } from '../Notification/Notification';
import './OverlayManager.css';

function OverlayManager({ overlays = [], onUpdate }) {
  const { showNotification, showConfirm } = useNotification();
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');

  const sanitizePath = (input) => {
    return input
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-_]/g, '')
      .replace(/^-+|-+$/g, '');
  };

  const generateId = () => {
    return 'overlay_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  };

  const addOverlay = () => {
    if (!newName.trim()) {
      showNotification('⚠️ Введите название оверлея!', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    const path = newPath.trim() || sanitizePath(newName);

    if (!path) {
      showNotification('⚠️ Адрес оверлея не может быть пустым!', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    if (overlays.some(o => o.path === path)) {
      showNotification('❌ Оверлей с таким адресом уже существует!', NOTIFICATION_TYPES.ERROR, 3000);
      return;
    }

    const newOverlay = {
      id: generateId(),
      name: newName.trim(),
      path: path
    };

    onUpdate([...overlays, newOverlay]);
    setNewName('');
    setNewPath('');
    showNotification(`✅ Оверлей "${newOverlay.name}" создан`, NOTIFICATION_TYPES.SUCCESS, 2000);
  };

  const deleteOverlay = (overlay) => {
    showConfirm(
      `Удалить оверлей "${overlay.name}"?\n\nВсе команды, привязанные к этому оверлею, будут отправляться на все оверлеи.`,
      () => {
        onUpdate(overlays.filter(o => o.id !== overlay.id));
        showNotification(`🗑️ Оверлей "${overlay.name}" удалён`, NOTIFICATION_TYPES.WARNING, 2000);
      }
    );
  };

  const copyUrl = (overlay) => {
    const url = `http://${window.location.hostname}:3001/overlay/${overlay.path}`;
    navigator.clipboard.writeText(url).then(() => {
      showNotification(`📋 URL скопирован: ${url}`, NOTIFICATION_TYPES.SUCCESS, 2000);
    }).catch(() => {
      showNotification(`📋 URL: ${url}`, NOTIFICATION_TYPES.INFO, 5000);
    });
  };

  const openOverlay = (overlay) => {
    window.open(`http://${window.location.hostname}:3001/overlay/${overlay.path}`, '_blank');
  };

  const updateOverlayName = (id, newName) => {
    onUpdate(overlays.map(o => o.id === id ? { ...o, name: newName } : o));
  };

  const updateOverlayPath = (id, newPath) => {
    const sanitized = sanitizePath(newPath);
    if (overlays.some(o => o.id !== id && o.path === sanitized)) {
      showNotification('❌ Такой адрес уже занят', NOTIFICATION_TYPES.ERROR, 2000);
      return;
    }
    onUpdate(overlays.map(o => o.id === id ? { ...o, path: sanitized } : o));
  };

  return (
    <div className="overlay-manager">
      <h3>
        🖥️ Оверлеи
        <Tooltip text="Создайте несколько оверлеев для разных источников в OBS. Каждый оверлей получает свой URL и может принимать медиа отдельно." />
      </h3>

      <div className="overlays-list">
        {overlays.length === 0 && (
          <div className="empty-overlays">
            <p>📭 Оверлеи не созданы</p>
            <p className="hint">Создайте оверлей, чтобы медиа-команды могли отправлять контент на конкретный источник в OBS</p>
          </div>
        )}

        {overlays.map(overlay => (
          <div key={overlay.id} className="overlay-card">
            <div className="overlay-card-fields">
              <div className="overlay-field">
                <label>Название:</label>
                <input
                  type="text"
                  value={overlay.name}
                  onChange={(e) => updateOverlayName(overlay.id, e.target.value)}
                  placeholder="Название оверлея"
                  className="overlay-name-input"
                />
              </div>
              <div className="overlay-field">
                <label>Адрес:</label>
                <div className="overlay-path-group">
                  <span className="path-prefix">/overlay/</span>
                  <input
                    type="text"
                    value={overlay.path}
                    onChange={(e) => updateOverlayPath(overlay.id, e.target.value)}
                    placeholder="my-overlay"
                    className="overlay-path-input"
                  />
                </div>
              </div>
            </div>
            <div className="overlay-card-url">
              <span className="overlay-url">
                http://{window.location.hostname}:3001/overlay/{overlay.path}
              </span>
            </div>
            <div className="overlay-card-actions">
              <button onClick={() => copyUrl(overlay)} className="overlay-action-btn copy" title="Скопировать URL">
                <FaCopy /> Копировать
              </button>
              <button onClick={() => openOverlay(overlay)} className="overlay-action-btn open" title="Открыть в новой вкладке">
                <FaExternalLinkAlt /> Открыть
              </button>
              <button onClick={() => deleteOverlay(overlay)} className="overlay-action-btn delete" title="Удалить оверлей">
                <FaTrash /> Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="add-overlay-form">
        <h4>➕ Новый оверлей</h4>
        <div className="add-overlay-fields">
          <div className="add-overlay-field">
            <label>Название:</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (!newPath) {
                  // Автогенерация пути из названия, только если путь не задан вручную
                }
              }}
              placeholder="Например: Алерты"
              className="add-overlay-input"
            />
          </div>
          <div className="add-overlay-field">
            <label>
              Адрес (латиница):
              <Tooltip text="Только латинские буквы, цифры, дефис и подчёркивание. Пробелы запрещены." />
            </label>
            <div className="overlay-path-group">
              <span className="path-prefix">/overlay/</span>
              <input
                type="text"
                value={newPath || sanitizePath(newName)}
                onChange={(e) => setNewPath(sanitizePath(e.target.value))}
                placeholder="alerts"
                className="add-overlay-path-input"
              />
            </div>
          </div>
          <button onClick={addOverlay} className="add-overlay-btn">
            <FaPlus /> Создать
          </button>
        </div>
      </div>
    </div>
  );
}

export default OverlayManager;