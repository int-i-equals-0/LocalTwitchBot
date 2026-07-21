// client/src/components/Common/MediaEditor/MediaEditor.jsx

import { useEffect, useCallback } from 'react';
import { useNotification, NOTIFICATION_TYPES } from '../../Notification';
import { useMediaFiles } from './hooks/useMediaFiles';
import FileSelector from './FileSelector';
import OverlaySelector from './OverlaySelector';
import VolumeControl from './VolumeControl';
import QueueModeSelector from './QueueModeSelector';
import MediaAnimationSettings from './MediaAnimationSettings';
import TextOverlaySettings from './TextOverlaySettings';
import MediaPreview from './MediaPreview';
import Tooltip from '../../Tooltip';
import { getFileMediaType, getSecondaryFileType, getAcceptString, DEFAULT_MEDIA_VALUE } from './utils';
import './MediaEditor.css';

function MediaEditor({ value = DEFAULT_MEDIA_VALUE, onChange, overlays = [] }) {
  const { showNotification } = useNotification();
  const { mediaFiles, loadMediaFiles, deleteFile, probeFile } = useMediaFiles();

  useEffect(() => {
    loadMediaFiles();
  }, [loadMediaFiles]);

  const updateMedia = useCallback((updates) => {
    onChange({ ...value, ...updates });
  }, [value, onChange]);

  // --- Основной файл ---
  const handlePrimaryFileSelect = useCallback(async (fileName) => {
    const newType = getFileMediaType(fileName);
    const oldType = getFileMediaType(value.file);

    const updates = { file: fileName, enabled: true };

    // Если сменился тип и вторичный файл стал несовместимым — сбрасываем
    if (newType === 'video') {
      updates.secondaryFile = '';
    } else if (newType !== oldType && value.secondaryFile) {
      const expectedSecondary = getSecondaryFileType(newType);
      const currentSecondaryType = getFileMediaType(value.secondaryFile);
      if (currentSecondaryType !== expectedSecondary) {
        updates.secondaryFile = '';
      }
    }

    updateMedia(updates);

    // Probe
    const probeResult = await probeFile(fileName);
    if (probeResult.warnings.length > 0) {
      // Уведомление уже показано в probeFile
    }

    showNotification(`📁 Выбран файл "${fileName}"`, NOTIFICATION_TYPES.INFO, 1500);
  }, [value, updateMedia, probeFile, showNotification]);

  const handlePrimaryClear = useCallback(() => {
    updateMedia({ file: '', secondaryFile: '' });
  }, [updateMedia]);

  // --- Вторичный файл ---
  const handleSecondaryFileSelect = useCallback(async (fileName) => {
    updateMedia({ secondaryFile: fileName });
    showNotification(`📁 Дополнительный файл: "${fileName}"`, NOTIFICATION_TYPES.INFO, 1500);

    await probeFile(fileName);
  }, [updateMedia, probeFile, showNotification]);

  const handleSecondaryClear = useCallback(() => {
    updateMedia({ secondaryFile: '' });
  }, [updateMedia]);

  // --- Удаление файла с учётом ссылок ---
  const handleDeleteFile = useCallback(async (fileName) => {
    const success = await deleteFile(fileName);
    if (success) {
      const updates = {};
      if (value.file === fileName) {
        updates.file = '';
        updates.secondaryFile = '';
      }
      if (value.secondaryFile === fileName) {
        updates.secondaryFile = '';
      }
      if (Object.keys(updates).length > 0) {
        updateMedia(updates);
      }
    }
  }, [value, deleteFile, updateMedia]);

  // --- Типы файлов ---
  const primaryType = getFileMediaType(value.file);
  const secondaryAllowedType = getSecondaryFileType(primaryType);
  const secondaryType = getFileMediaType(value.secondaryFile);

  const showAnimations = primaryType === 'video' || primaryType === 'image' ||
    (primaryType === 'audio' && secondaryType === 'image');

  return (
    <div className="media-editor">
      {/* Основной файл */}
      <FileSelector
        label={
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎬 Медиа файл
            <Tooltip text="Выберите видео, аудио или изображение. Поддерживаются: MP4, WebM, MP3, WAV, OGG, JPG, PNG, GIF, WebP." />
          </span>
        }
        selectedFile={value.file}
        onFileSelect={handlePrimaryFileSelect}
        onFileClear={handlePrimaryClear}
        mediaFiles={mediaFiles}
        onDeleteFile={handleDeleteFile}
        accept="video/*,audio/*,image/*"
      />

      {/* Вторичный файл (картинка+звук) */}
      {value.file && secondaryAllowedType && (
        <div className="secondary-file-section">
          <FileSelector
            label={
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {secondaryAllowedType === 'audio' ? '🎵 Звук (дополнительно)' : '🖼️ Картинка (дополнительно)'}
                <Tooltip text={
                  secondaryAllowedType === 'audio'
                    ? 'Добавьте звуковое сопровождение к изображению'
                    : 'Добавьте изображение для отображения вместе со звуком'
                } />
              </span>
            }
            selectedFile={value.secondaryFile}
            onFileSelect={handleSecondaryFileSelect}
            onFileClear={handleSecondaryClear}
            mediaFiles={mediaFiles}
            onDeleteFile={handleDeleteFile}
            accept={getAcceptString(secondaryAllowedType)}
            filterType={secondaryAllowedType}
          />
        </div>
      )}

      {/* Оверлей */}
      <OverlaySelector
        value={value.overlay}
        onChange={(overlay) => updateMedia({ overlay })}
        overlays={overlays}
      />

      {/* Громкость */}
      <VolumeControl
        value={value.volume || 100}
        onChange={(volume) => updateMedia({ volume })}
      />

      {/* Режим очереди */}
      <QueueModeSelector
        value={value.queueMode || 'queue'}
        onChange={(queueMode) => updateMedia({ queueMode })}
      />

      {/* Анимации медиа */}
      {showAnimations && (
        <MediaAnimationSettings
          animation={value.animation || {}}
          onChange={(animation) => updateMedia({ animation })}
        />
      )}

      {/* Текст */}
      <TextOverlaySettings
        text={value.text || {}}
        onChange={(text) => updateMedia({ text })}
      />

      {/* Предпросмотр */}
      {value.file && (
        <MediaPreview
          file={value.file}
          secondaryFile={value.secondaryFile}
          fileType={primaryType}
          secondaryFileType={secondaryAllowedType}
          text={value.text}
          animation={value.animation}
          volume={value.volume}
        />
      )}
    </div>
  );
}

export default MediaEditor;