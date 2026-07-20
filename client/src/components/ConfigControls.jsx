// client/src/components/ConfigControls.jsx

import { FaSave, FaFolderOpen } from 'react-icons/fa';
import { useNotification, NOTIFICATION_TYPES } from './Notification';
import './ConfigControls.css';

function ConfigControls({ onSave, onLoad }) {
  const { showNotification } = useNotification();

  const handleSave = async () => {
    if (!onSave) {
      showNotification('❌ Функция сохранения не передана', NOTIFICATION_TYPES.ERROR, 3000);
      return;
    }
    try {
      await onSave();
    } catch {
      showNotification('❌ Ошибка при сохранении конфига', NOTIFICATION_TYPES.ERROR, 3000);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          if (onLoad) {
            onLoad(config);
            showNotification('✅ Конфиг успешно загружен!', NOTIFICATION_TYPES.SUCCESS, 2000);
          } else {
            showNotification('❌ Функция загрузки не передана', NOTIFICATION_TYPES.ERROR, 3000);
          }
        } catch {
          showNotification('❌ Ошибка загрузки файла: неверный формат JSON', NOTIFICATION_TYPES.ERROR, 3000);
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  return (
    <div className="config-controls">
      <button onClick={handleSave} className="config-btn save">
        <FaSave /> Сохранить
      </button>
      <button onClick={() => document.getElementById('config-file-input').click()} className="config-btn load">
        <FaFolderOpen /> Загрузить
      </button>
      <input
        type="file"
        id="config-file-input"
        accept=".json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default ConfigControls;