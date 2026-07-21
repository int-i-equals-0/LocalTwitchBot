// client/src/components/Common/MediaEditor/MediaPreview.jsx

import { useState, useEffect } from 'react';
import { FaPlay, FaStop } from 'react-icons/fa';
import { usePreviewPlayer } from './hooks/usePreviewPlayer';
import { API_BASE } from './utils';
import './MediaEditor.css';

function MediaPreview({
  file,
  secondaryFile,
  fileType,
  secondaryFileType,
  text,
  animation,
  volume,
}) {
  const [showPreview, setShowPreview] = useState(false);

  const {
    state,
    videoRef,
    audioRef,
    wrapperRef,
    play,
    stop,
    handleMediaEnded,
    reset,
    isIdle,
    isExiting,
    PREVIEW_STATES,
  } = usePreviewPlayer({ animation, volume });

  useEffect(() => {
    reset();
  }, [file, secondaryFile, reset]);

  if (!file) return null;

  const textEnabled = text?.enabled;
  const textAnimation = text?.animation || 'none';
  const textAmplitude = text?.animationAmplitude || 1;
  const font = text?.font || {};

  let imageFile = null;
  let audioFile = null;
  let videoFile = null;

  if (fileType === 'video') {
    videoFile = file;
  } else if (fileType === 'image') {
    imageFile = file;
    if (secondaryFileType === 'audio' && secondaryFile) {
      audioFile = secondaryFile;
    }
  } else if (fileType === 'audio') {
    audioFile = file;
    if (secondaryFileType === 'image' && secondaryFile) {
      imageFile = secondaryFile;
    }
  }

  const getTextPositionStyle = (position) => {
    switch (position) {
      case 'above': return { position: 'relative', order: -1, marginBottom: '10px' };
      case 'below': return { position: 'relative', order: 1, marginTop: '10px' };
      case 'left': return { position: 'relative', order: -1, marginRight: '10px', alignSelf: 'center' };
      case 'right': return { position: 'relative', order: 1, marginLeft: '10px', alignSelf: 'center' };
      case 'overlay':
      default:
        return { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 20 };
    }
  };

  const getContainerFlexStyle = (position) => {
    if (position === 'left' || position === 'right') {
      return { display: 'flex', alignItems: 'center', justifyContent: 'center' };
    }
    return { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' };
  };

  const renderAnimatedText = (content, anim, animKey, amplitude) => {
    if (!content) return '[текст]';
    if (!anim || anim === 'none') return content;

    const animClass = `preview-char-${anim}`;
    const style = amplitude !== 1 ? { '--amplitude': amplitude } : {};

    return content.split('').map((char, i) => (
      <span
        key={`${animKey}-${i}`}
        className={`preview-char ${animClass}`}
        style={{ animationDelay: `${i * 0.05}s`, ...style }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));
  };

  const textOverlayStyle = {
    fontFamily: font.fontFamily || "'Segoe UI', sans-serif",
    fontSize: `${Math.min(font.fontSize || 32, 32)}px`,
    fontWeight: font.fontWeight || '700',
    fontStyle: font.fontStyle || 'normal',
    color: font.color || '#ffffff',
    textShadow: '0px 0px 1px #000, 0px 0px 2px #000, 0px 0px 3px #000',
  };

  const renderTextOverlay = (position) => {
    if (!textEnabled) return null;

    const textStyle = getTextPositionStyle(position);
    const isAnimating = state.status === PREVIEW_STATES.PLAYING || state.status === PREVIEW_STATES.ENTERING;
    const content = isAnimating
      ? renderAnimatedText(text.content, textAnimation, state.animKey, textAmplitude)
      : (text.content || '[текст]');

    return (
      <div
        key={`text-${state.animKey}`}
        className="preview-text-overlay"
        style={{ ...textOverlayStyle, ...textStyle }}
      >
        {content}
      </div>
    );
  };

  const renderControls = () => (
    <div className="preview-controls">
      {isIdle || isExiting ? (
        <button onClick={play} className="preview-play-btn" disabled={isExiting}>
          <FaPlay /> Воспроизвести
        </button>
      ) : (
        <button onClick={stop} className="preview-stop-btn" disabled={isExiting}>
          <FaStop /> Остановить
        </button>
      )}
    </div>
  );

  const textPosition = text?.position || 'overlay';

  // Рендерит внутренности: медиа + текст (без кнопок)
  const renderMediaContent = (mediaElement) => (
    <>
      <div
        ref={wrapperRef}
        className="preview-media-layout"
        style={{
          position: 'relative',
          ...getContainerFlexStyle(textPosition),
        }}
      >
        {mediaElement}
        {renderTextOverlay(textPosition)}
      </div>
      {renderControls()}
    </>
  );

  return (
    <div className="media-preview-section">
      <div className="preview-header">
        <h4>👁️ Предпросмотр</h4>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`preview-toggle-btn ${showPreview ? 'active' : ''}`}
        >
          {showPreview ? 'Скрыть' : 'Показать'}
        </button>
      </div>

      {showPreview && (
        <div className="preview-container">
          {/* Видео */}
          {videoFile && renderMediaContent(
            <video
              ref={videoRef}
              src={`${API_BASE}/media/${videoFile}`}
              className="preview-video"
              onEnded={handleMediaEnded}
              playsInline
              style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
            />
          )}

          {/* Картинка (+ опционально звук) */}
          {!videoFile && imageFile && renderMediaContent(
            <>
              <img
                key={`img-${state.animKey}`}
                src={`${API_BASE}/media/${imageFile}`}
                alt="preview"
                className="preview-image"
                style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
              />
              {audioFile && (
                <audio
                  ref={audioRef}
                  src={`${API_BASE}/media/${audioFile}`}
                  onEnded={handleMediaEnded}
                />
              )}
            </>
          )}

          {/* Только звук (без картинки) */}
          {!videoFile && !imageFile && audioFile && renderMediaContent(
            <>
              <div className="audio-only-placeholder">🎵 Аудио: {audioFile}</div>
              <audio
                ref={audioRef}
                src={`${API_BASE}/media/${audioFile}`}
                onEnded={handleMediaEnded}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default MediaPreview;