// client/src/components/Commands/OverlaySelector.jsx

import Tooltip from '../Tooltip';
import './OverlaySelector.css';

function OverlaySelector({ value, onChange, overlays = [] }) {
  return (
    <div className="overlay-selector">
      <label>
        🖥️ Целевой оверлей:
        <Tooltip text="Выберите оверлей, на который будет отправлено медиа. Если не выбран — отправится на все." />
      </label>
      
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="overlay-select"
      >
        <option value="">📡 Все оверлеи</option>
        {overlays.map(overlay => (
          <option key={overlay.id} value={overlay.id}>
            🖥️ {overlay.name} ({overlay.path})
          </option>
        ))}
      </select>
      
      {overlays.length === 0 && (
        <div className="overlay-hint">
          ⚠️ Оверлеи не созданы. Создайте их на вкладке «Основное».
        </div>
      )}
      
      {value && (
        <div className="overlay-info">
          {(() => {
            const selected = overlays.find(o => o.id === value);
            if (selected) {
              return `✅ Медиа будет отправлено на: "${selected.name}" (/overlay/${selected.path})`;
            }
            return '⚠️ Выбранный оверлей не найден';
          })()}
        </div>
      )}
    </div>
  );
}

export default OverlaySelector;