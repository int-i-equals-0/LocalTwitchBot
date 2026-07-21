// client/src/components/Overlays/OverlaysTab.jsx

import { useState } from 'react';
import { FaPlus, FaTrash, FaCopy, FaExternalLinkAlt, FaPlug } from 'react-icons/fa';
import Tooltip from '../Tooltip';
import { useNotification, NOTIFICATION_TYPES } from '../Notification';
import './OverlaysTab.css';

const OBS_DEFAULTS = {
  enabled: false,
  url: 'ws://127.0.0.1:4455',
  password: '',
  autoRefresh: true,
  browserSources: [],
};

function OverlaysTab({
  overlays = [],
  onUpdate,
  obs = {},
  onObsUpdate,
}) {
  const { showNotification, showConfirm } = useNotification();
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');

  const obsConfig = {
    ...OBS_DEFAULTS,
    ...(obs || {}),
  };

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

  const buildDefaultObsInputName = (overlayName) => {
    const trimmed = String(overlayName || '').trim();
    return trimmed ? `Overlay ${trimmed}` : 'Overlay';
  };

  const addObsBrowserSourceMapping = (overlay) => {
    if (!onObsUpdate) return;

    const currentSources = Array.isArray(obsConfig.browserSources)
      ? obsConfig.browserSources
      : [];

    if (currentSources.some((s) => s.overlayPath === overlay.path)) return;

    updateObsConfig({
      browserSources: [
        ...currentSources,
        {
          overlayPath: overlay.path,
          inputName: buildDefaultObsInputName(overlay.name),
        },
      ],
    });
  };

  const removeObsBrowserSourceMapping = (overlayPath) => {
    if (!onObsUpdate) return;

    const currentSources = Array.isArray(obsConfig.browserSources)
      ? obsConfig.browserSources
      : [];

    updateObsConfig({
      browserSources: currentSources.filter((s) => s.overlayPath !== overlayPath),
    });
  };

  const updateObsBrowserSourceOverlayPath = (oldPath, newPath, overlayName) => {
    if (!onObsUpdate || !newPath) return;

    const currentSources = Array.isArray(obsConfig.browserSources)
      ? obsConfig.browserSources
      : [];

    const existingIndex = currentSources.findIndex((s) => s.overlayPath === oldPath);

    if (existingIndex !== -1) {
      const nextSources = [...currentSources];
      nextSources[existingIndex] = {
        ...nextSources[existingIndex],
        overlayPath: newPath,
      };

      updateObsConfig({
        browserSources: nextSources,
      });
      return;
    }

    if (!currentSources.some((s) => s.overlayPath === newPath)) {
      updateObsConfig({
        browserSources: [
          ...currentSources,
          {
            overlayPath: newPath,
            inputName: buildDefaultObsInputName(overlayName),
          },
        ],
      });
    }
  };

  const updateObsConfig = (patch) => {
    if (!onObsUpdate) {
      showNotification(
        '⚠️ Сохранение OBS-настроек пока не подключено в родительском компоненте',
        NOTIFICATION_TYPES.WARNING,
        3000
      );
      return;
    }

    onObsUpdate({
      ...OBS_DEFAULTS,
      ...(obs || {}),
      ...patch,
    });
  };

  const toggleObsEnabled = () => {
    const newValue = !obsConfig.enabled;
    updateObsConfig({ enabled: newValue });

    showNotification(
      newValue
        ? '✅ Интеграция с OBS / Streamlabs включена'
        : '⚪ Интеграция с OBS / Streamlabs отключена',
      newValue ? NOTIFICATION_TYPES.SUCCESS : NOTIFICATION_TYPES.INFO,
      2000
    );
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
    addObsBrowserSourceMapping(newOverlay);

    setNewName('');
    setNewPath('');
    showNotification(`✅ Оверлей "${newOverlay.name}" создан`, NOTIFICATION_TYPES.SUCCESS, 2000);
  };

  const deleteOverlay = (overlay) => {
    showConfirm(
      `Удалить оверлей "${overlay.name}"?\n\nВсе команды, привязанные к этому оверлею, будут отправляться на все оверлеи.`,
      () => {
        onUpdate(overlays.filter(o => o.id !== overlay.id));
        removeObsBrowserSourceMapping(overlay.path);
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
    const currentOverlay = overlays.find(o => o.id === id);

    if (!currentOverlay) return;

    if (!sanitized) {
      showNotification('⚠️ Адрес оверлея не может быть пустым', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    if (overlays.some(o => o.id !== id && o.path === sanitized)) {
      showNotification('❌ Такой адрес уже занят', NOTIFICATION_TYPES.ERROR, 2000);
      return;
    }

    onUpdate(overlays.map(o => o.id === id ? { ...o, path: sanitized } : o));
    updateObsBrowserSourceOverlayPath(currentOverlay.path, sanitized, currentOverlay.name);
  };

  const getLocalIP = () => {
    return window.location.hostname;
  };

  return (
    <div className="overlays-tab">
      <div className="overlays-header">
        <h2>🖥️ Оверлеи</h2>
        <p className="overlays-description">
          Оверлеи — это веб-страницы, которые вы добавляете как источники в OBS.
          Каждый оверлей получает свой уникальный URL и может принимать медиа отдельно.
        </p>
      </div>

      <div className="obs-integration-card">
        <div className="obs-integration-header">
          <div className="obs-integration-title">
            <h3>
              <FaPlug /> OBS / Streamlabs WebSocket
            </h3>
            <p className="obs-integration-description">
              Если включено, бот сможет автоматически попытаться обновить Browser Source,
              когда OBS или Streamlabs были запущены раньше сервера.
            </p>
          </div>

          <label className="toggle-label obs-toggle-row">
            <span className="toggle-text">
              {obsConfig.enabled ? 'Включено' : 'Выключено'}
            </span>
            <span className="toggle-switch">
              <input
                type="checkbox"
                checked={!!obsConfig.enabled}
                onChange={toggleObsEnabled}
              />
              <span className="toggle-slider"></span>
            </span>
          </label>
        </div>

        <div className="obs-integration-body">
          <div className={`obs-status-badge ${obsConfig.enabled ? 'enabled' : 'disabled'}`}>
            {obsConfig.enabled
              ? '✅ Интеграция активна'
              : '⚪ Интеграция отключена'}
          </div>

          <div className="obs-meta-list">
            <div className="obs-meta-item">
              <span className="obs-meta-label">URL WebSocket:</span>
              <code>{obsConfig.url || OBS_DEFAULTS.url}</code>
            </div>

            <div className="obs-meta-item">
              <span className="obs-meta-label">Автообновление Browser Source:</span>
              <span>{obsConfig.autoRefresh === false ? 'выключено' : 'включено'}</span>
            </div>

            <div className="obs-meta-item">
              <span className="obs-meta-label">Привязок Browser Source:</span>
              <span>{Array.isArray(obsConfig.browserSources) ? obsConfig.browserSources.length : 0}</span>
            </div>
          </div>

          <div className="obs-hint">
            <strong>Важно:</strong> этот переключатель управляет только полем
            <code> obs.enabled </code>
            в конфиге. Остальные OBS-настройки
            (<code>url</code>, <code>password</code>, <code>browserSources</code>)
            пока редактируются вручную в <code>config.json</code>.
          </div>
        </div>
      </div>

      <div className="overlays-list">
        {overlays.length === 0 && (
          <div className="empty-overlays">
            <p>📭 Оверлеи не созданы</p>
            <p className="hint">Создайте первый оверлей, чтобы начать</p>
          </div>
        )}

        {overlays.map(overlay => (
          <div key={overlay.id} className="overlay-card">
            <div className="overlay-card-fields">
              <div className="overlay-field">
                <label>Название</label>
                <input
                  type="text"
                  value={overlay.name}
                  onChange={(e) => updateOverlayName(overlay.id, e.target.value)}
                  placeholder="Название оверлея"
                  className="overlay-name-input"
                />
              </div>
              <div className="overlay-field">
                <label>Адрес (путь)</label>
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
                http://{getLocalIP()}:3001/overlay/{overlay.path}
              </span>
            </div>

            <div className="overlay-card-actions">
              <button onClick={() => copyUrl(overlay)} className="overlay-action-btn copy">
                <FaCopy /> Копировать URL
              </button>
              <button onClick={() => openOverlay(overlay)} className="overlay-action-btn open">
                <FaExternalLinkAlt /> Открыть
              </button>
              <button onClick={() => deleteOverlay(overlay)} className="overlay-action-btn delete">
                <FaTrash /> Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="add-overlay-form">
        <h3>➕ Новый оверлей</h3>
        <div className="add-overlay-fields">
          <div className="add-overlay-field">
            <label>Название</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (!newPath) {
                  setNewPath(sanitizePath(e.target.value));
                }
              }}
              placeholder="Например: Алерты"
              className="add-overlay-input"
            />
          </div>
          <div className="add-overlay-field">
            <label>
              Адрес
              <Tooltip text="Только латинские буквы, цифры, дефис и подчёркивание" />
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

export default OverlaysTab;