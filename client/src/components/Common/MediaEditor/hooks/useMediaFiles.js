// client/src/components/Common/MediaEditor/hooks/useMediaFiles.js

import { useState, useCallback } from 'react';
import { useNotification, NOTIFICATION_TYPES } from '../../../Notification';

const API_BASE = 'http://127.0.0.1:3001';

export function useMediaFiles() {
  const { showNotification } = useNotification();
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadMediaFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/media-files`);
      const data = await response.json();
      if (data.success) {
        setMediaFiles(data.files);
      } else {
        showNotification('⚠️ Не удалось загрузить список медиафайлов', NOTIFICATION_TYPES.WARNING, 3000);
      }
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
      showNotification('❌ Ошибка подключения к серверу', NOTIFICATION_TYPES.ERROR, 3000);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const deleteFile = useCallback(async (fileName) => {
    try {
      const response = await fetch(`${API_BASE}/api/media-files/${fileName}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await loadMediaFiles();
        showNotification(`🗑️ Файл "${fileName}" удалён`, NOTIFICATION_TYPES.SUCCESS, 2000);
        return true;
      } else {
        showNotification('❌ Ошибка удаления файла', NOTIFICATION_TYPES.ERROR, 3000);
        return false;
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      showNotification('❌ Ошибка удаления файла', NOTIFICATION_TYPES.ERROR, 3000);
      return false;
    }
  }, [loadMediaFiles, showNotification]);

  const probeFile = useCallback(async (fileName) => {
    try {
      const resp = await fetch(`${API_BASE}/api/media-files/${fileName}/probe`);
      const data = await resp.json();
      if (data.success && data.warnings.length > 0) {
        showNotification(`⚠️ ${data.warnings[0]}`, NOTIFICATION_TYPES.WARNING, 5000);
        return { warnings: data.warnings };
      }
      return { warnings: [] };
    } catch (error) {
      console.error('Ошибка проверки файла:', error);
      showNotification('❌ Ошибка проверки файла', NOTIFICATION_TYPES.ERROR, 3000);
      return { warnings: [] };
    }
  }, [showNotification]);

  return {
    mediaFiles,
    loading,
    loadMediaFiles,
    deleteFile,
    probeFile,
  };
}