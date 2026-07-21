// client/src/components/Common/MediaEditor/hooks/useFileUpload.js

import { useState, useRef, useCallback } from 'react';
import { useNotification, NOTIFICATION_TYPES } from '../../../Notification';

const API_BASE = 'http://127.0.0.1:3001';

export function useFileUpload({ onUploadComplete }) {
  const { showNotification } = useNotification();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = useCallback((file) => {
    if (file.size > 100 * 1024 * 1024) {
      showNotification('❌ Файл слишком большой (макс. 100MB)', NOTIFICATION_TYPES.ERROR, 3000);
      return { valid: false, warning: '❌ Файл слишком большой (макс. 100MB)' };
    }

    if (file.type.startsWith('video/')) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'hevc' || ext === 'h265' || file.name.toLowerCase().includes('h265')) {
        showNotification('⚠️ Видео в формате H.265 может не воспроизводиться в браузере', NOTIFICATION_TYPES.WARNING, 5000);
        return { valid: true, warning: '⚠️ Видео в формате H.265 может не воспроизводиться в браузере. Рекомендуется использовать H.264 (MP4)' };
      }
    }

    return { valid: true, warning: null };
  }, [showNotification]);

  const uploadFile = useCallback(async (file) => {
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      const result = await new Promise((resolve, reject) => {
        xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.response)) : reject(new Error('Ошибка'));
        xhr.onerror = () => reject(new Error('Ошибка сети'));
        xhr.open('POST', `${API_BASE}/api/upload`);
        xhr.send(formData);
      });

      if (result.success) {
        showNotification(`✅ Файл "${result.file.fileName}" загружен`, NOTIFICATION_TYPES.SUCCESS, 2000);
        onUploadComplete?.(result.file);
        return result.file;
      } else {
        showNotification('❌ Ошибка загрузки файла', NOTIFICATION_TYPES.ERROR, 3000);
        return null;
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      showNotification('❌ Ошибка загрузки файла', NOTIFICATION_TYPES.ERROR, 3000);
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [showNotification, onUploadComplete]);

  const handleFileSelect = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return null;

    const validation = validateFile(file);
    if (!validation.valid) return null;

    return await uploadFile(file);
  }, [validateFile, uploadFile]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    fileInputRef,
    uploading,
    uploadProgress,
    handleFileSelect,
    openFilePicker,
    uploadFile,
    validateFile,
  };
}