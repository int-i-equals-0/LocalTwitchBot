// client/src/components/Common/MediaEditor/OverlaySelector.jsx

import Tooltip from '../../Tooltip';
import { useNotification, NOTIFICATION_TYPES } from '../../Notification';
import './MediaEditor.css';

function OverlaySelector({ value, onChange, overlays = [] }) {
  const { showNotification } = useNotification();

  const handleChange = (e) => {
    const sel = overlays.find(o => o.id === e.target.value);
    onChange(sel ? { id: sel.id, path: sel.path } : null);
    showNotification(
      sel ? `🖥️ Выбран оверлей: ${sel.name}` : '📡 Выбраны все оверлеи',
      NOTIFICATION_TYPES.INFO,
      1500,
    );
  };

  return (
    <div className="overlay-selector">
      <label>
        🖥️ Целевой оверлей
        <Tooltip text="Выберите конкретный оверлей для отображения медиа. Если не выбрано — отправится на все подключённые оверлеи." />
      </label>
      <select
        value={value?.id || value || ''}
        onChange={handleChange}
        className="overlay-select"
      >
        <option value="">📡 Все оверлеи</option>
        {overlays.map(o => (
          <option key={o.id} value={o.id}>🖥️ {o.name} (/overlay/{o.path})</option>
        ))}
      </select>
    </div>
  );
}

export default OverlaySelector;