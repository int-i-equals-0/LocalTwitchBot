// client/src/components/Common/MediaEditor/hooks/usePreviewPlayer.js

import { useReducer, useRef, useCallback } from 'react';
import { useNotification, NOTIFICATION_TYPES } from '../../../Notification';

const PREVIEW_STATES = {
  IDLE: 'idle',
  ENTERING: 'entering',
  PLAYING: 'playing',
  EXITING: 'exiting',
};

function previewReducer(state, action) {
  switch (action.type) {
    case 'START_ENTER':
      return { ...state, status: PREVIEW_STATES.ENTERING, animKey: state.animKey + 1 };
    case 'ENTER_COMPLETE':
      return { ...state, status: PREVIEW_STATES.PLAYING };
    case 'START_EXIT':
      return { ...state, status: PREVIEW_STATES.EXITING };
    case 'EXIT_COMPLETE':
      return { ...state, status: PREVIEW_STATES.IDLE };
    case 'RESET':
      return { status: PREVIEW_STATES.IDLE, animKey: 0 };
    default:
      return state;
  }
}

export function usePreviewPlayer({ animation, volume }) {
  const { showNotification } = useNotification();
  const [state, dispatch] = useReducer(previewReducer, {
    status: PREVIEW_STATES.IDLE,
    animKey: 0,
  });

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const wrapperRef = useRef(null);

  const applyEnterAnimation = useCallback((element, animName, duration, onComplete) => {
    if (!element || !animName || animName === 'none') {
      onComplete?.();
      return;
    }

    const className = `media-enter-${animName}`;
    element.style.animationDuration = `${duration}s`;
    element.classList.add(className);

    const onEnd = () => {
      element.classList.remove(className);
      element.removeEventListener('animationend', onEnd);
      onComplete?.();
    };
    element.addEventListener('animationend', onEnd);
  }, []);

  const applyExitAnimation = useCallback((element, animName, duration, onComplete) => {
    if (!element || !animName || animName === 'none') {
      onComplete?.();
      return;
    }

    const className = `media-exit-${animName}`;
    element.style.animationDuration = `${duration}s`;
    element.classList.add(className);

    const onEnd = () => {
      element.classList.remove(className);
      element.removeEventListener('animationend', onEnd);
      onComplete?.();
    };
    element.addEventListener('animationend', onEnd);
  }, []);

  const startPlayback = useCallback(() => {
    const vol = (volume || 100) / 100;

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.volume = vol;
      videoRef.current.play().catch(() => {
        showNotification('⚠️ Не удалось воспроизвести видео', NOTIFICATION_TYPES.WARNING, 2000);
      });
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.volume = vol;
      audioRef.current.play().catch(() => {
        showNotification('⚠️ Не удалось воспроизвести аудио', NOTIFICATION_TYPES.WARNING, 2000);
      });
    }

    dispatch({ type: 'ENTER_COMPLETE' });
  }, [volume, showNotification]);

  const stopPlayback = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const play = useCallback(() => {
    if (state.status !== PREVIEW_STATES.IDLE) return;

    dispatch({ type: 'START_ENTER' });

    const enterAnim = animation?.enter || 'none';
    const enterDur = animation?.enterDuration || 0.5;
    const wrapper = wrapperRef.current;

    if (enterAnim !== 'none' && wrapper) {
      applyEnterAnimation(wrapper, enterAnim, enterDur, startPlayback);
    } else {
      startPlayback();
    }
  }, [state.status, animation, applyEnterAnimation, startPlayback]);

  const stop = useCallback(() => {
    if (state.status !== PREVIEW_STATES.PLAYING && state.status !== PREVIEW_STATES.ENTERING) return;
    if (state.status === PREVIEW_STATES.EXITING) return;

    const exitAnim = animation?.exit || 'none';
    const exitDur = animation?.exitDuration || 0.5;
    const wrapper = wrapperRef.current;

    if (exitAnim !== 'none' && wrapper) {
      dispatch({ type: 'START_EXIT' });
      applyExitAnimation(wrapper, exitAnim, exitDur, () => {
        stopPlayback();
        dispatch({ type: 'EXIT_COMPLETE' });
      });
    } else {
      stopPlayback();
      dispatch({ type: 'EXIT_COMPLETE' });
    }
  }, [state.status, animation, applyExitAnimation, stopPlayback]);

  const handleMediaEnded = useCallback(() => {
    if (state.status === PREVIEW_STATES.PLAYING) {
      const exitAnim = animation?.exit || 'none';
      if (exitAnim !== 'none') {
        stop();
      } else {
        stopPlayback();
        dispatch({ type: 'EXIT_COMPLETE' });
      }
    }
  }, [state.status, animation, stop, stopPlayback]);

  const reset = useCallback(() => {
    stopPlayback();
    dispatch({ type: 'RESET' });
  }, [stopPlayback]);

  return {
    state,
    videoRef,
    audioRef,
    wrapperRef,
    play,
    stop,
    handleMediaEnded,
    reset,
    isIdle: state.status === PREVIEW_STATES.IDLE,
    isPlaying: state.status === PREVIEW_STATES.PLAYING || state.status === PREVIEW_STATES.ENTERING,
    isExiting: state.status === PREVIEW_STATES.EXITING,
    PREVIEW_STATES,
  };
}