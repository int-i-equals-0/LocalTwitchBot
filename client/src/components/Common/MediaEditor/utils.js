// client/src/components/Common/MediaEditor/utils.js

export const API_BASE = 'http://127.0.0.1:3001';

export function getFileMediaType(fileName) {
  if (!fileName) return 'unknown';
  const ext = fileName.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) return 'audio';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'image';
  return 'unknown';
}

export function getFileIcon(file) {
  if (file.type === 'video') return '🎬';
  if (file.type === 'audio') return '🎵';
  if (file.type === 'image') return '🖼️';
  return '📄';
}

/**
 * Определяет, может ли основной файл иметь вторичный файл
 * и какого типа должен быть вторичный файл
 */
export function getSecondaryFileType(primaryFileType) {
  switch (primaryFileType) {
    case 'image': return 'audio';
    case 'audio': return 'image';
    case 'video': return null; // видео не может иметь вторичный файл
    default: return null;
  }
}

/**
 * Возвращает accept-строку для file input
 */
export function getAcceptString(mediaType) {
  switch (mediaType) {
    case 'video': return 'video/*';
    case 'audio': return 'audio/*';
    case 'image': return 'image/*';
    default: return 'video/*,audio/*,image/*';
  }
}

/**
 * Фильтрует файлы по типу
 */
export function filterFilesByType(files, type) {
  if (!type) return files;
  return files.filter(f => f.type === type);
}

export const FONT_FAMILIES = [
  { label: 'Segoe UI', value: "'Segoe UI', sans-serif" },
  { label: 'Arial', value: "Arial, sans-serif" },
  { label: 'Verdana', value: "Verdana, sans-serif" },
  { label: 'Tahoma', value: "Tahoma, sans-serif" },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { label: 'Georgia', value: "Georgia, serif" },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Courier New', value: "'Courier New', monospace" },
  { label: 'Impact', value: "Impact, sans-serif" },
  { label: 'Comic Sans MS', value: "'Comic Sans MS', cursive" },
  { label: 'Consolas', value: "Consolas, monospace" },
  { label: 'Calibri', value: "Calibri, sans-serif" },
];

export const TEXT_ANIMATIONS = [
  { value: 'none', label: '— Без анимации —' },
  { value: 'bounce', label: '🏀 Bounce' },
  { value: 'pulse', label: '💓 Pulse' },
  { value: 'rubberBand', label: '🎸 Rubber Band' },
  { value: 'tada', label: '🎉 Tada' },
  { value: 'wave', label: '🌊 Wave' },
  { value: 'wiggle', label: '🐛 Wiggle' },
  { value: 'wobble', label: '🍮 Wobble' },
];

export const MEDIA_ENTER_ANIMATIONS = [
  { value: 'none', label: '— Без анимации —' },
  { value: 'fadeIn', label: '🎭 Fade In (плавное появление)' },
  { value: 'fadeInLeft', label: '➡️ Сдвиг слева' },
  { value: 'fadeInRight', label: '⬅️ Сдвиг справа' },
  { value: 'fadeInTop', label: '⬇️ Сдвиг сверху' },
  { value: 'fadeInBottom', label: '⬆️ Сдвиг снизу' },
  { value: 'scaleIn', label: '🔍 Scale In (увеличение из центра)' },
];

export const MEDIA_EXIT_ANIMATIONS = [
  { value: 'none', label: '— Без анимации —' },
  { value: 'fadeOut', label: '🎭 Fade Out (плавное исчезновение)' },
  { value: 'fadeOutLeft', label: '⬅️ Уход налево' },
  { value: 'fadeOutRight', label: '➡️ Уход направо' },
  { value: 'fadeOutTop', label: '⬆️ Уход наверх' },
  { value: 'fadeOutBottom', label: '⬇️ Уход вниз' },
  { value: 'scaleOut', label: '🔍 Scale Out (уменьшение в центр)' },
];

export const DEFAULT_MEDIA_VALUE = {
  enabled: false,
  file: '',
  secondaryFile: '',
  volume: 100,
  overlay: null,
  text: {
    enabled: false,
    content: '',
    position: 'overlay',
    animation: 'none',
    animationAmplitude: 1,
    font: {},
  },
  animation: { enter: 'none', exit: 'none', enterDuration: 0.5, exitDuration: 0.5 },
  queueMode: 'queue',
};