// client/src/components/ConfigControls.jsx
import { FaSave, FaFolderOpen } from 'react-icons/fa';
import { useNotification, NOTIFICATION_TYPES } from './Notification/Notification';
import './ConfigControls.css';

function ConfigControls({ onSave, onLoad }) {
  const { showNotification } = useNotification();

  const handleSave = async () => {
    try {
      await onSave();
    } catch (error) {
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
          
          if (!config.tokens && !config.commands && !config.banwords) {
            showNotification('❌ Неверный формат файла', NOTIFICATION_TYPES.ERROR, 3000);
            return;
          }
          
          onLoad(config);
          showNotification('✅ Конфиг успешно загружен!', NOTIFICATION_TYPES.SUCCESS, 2000);
        } catch (error) {
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
        <FaSave /> Сохранить конфиг
      </button>
      <button onClick={() => document.getElementById('file-input').click()} className="config-btn load">
        <FaFolderOpen /> Загрузить конфиг
      </button>
      <input
        type="file"
        id="file-input"
        accept=".json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
}

export default ConfigControls;