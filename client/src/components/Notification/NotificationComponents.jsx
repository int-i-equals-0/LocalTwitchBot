// client/src/components/Notification/NotificationComponents.jsx

import React, { useState, useEffect } from 'react';
import { FaCheck, FaExclamationTriangle, FaInfo, FaTimes, FaQuestionCircle } from 'react-icons/fa';
import { NOTIFICATION_TYPES } from './NotificationConstants';
import './Notification.css';

export function NotificationItem({ type, message, duration, onClose }) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration && type !== NOTIFICATION_TYPES.CONFIRM) {
      const interval = 50;
      const steps = duration / interval;
      const decrement = 100 / steps;

      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev <= 0) {
            clearInterval(timer);
            return 0;
          }
          return prev - decrement;
        });
      }, interval);

      const closeTimer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);

      return () => {
        clearInterval(timer);
        clearTimeout(closeTimer);
      };
    }
  }, [duration, type, onClose]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS: return <FaCheck />;
      case NOTIFICATION_TYPES.ERROR: return <FaTimes />;
      case NOTIFICATION_TYPES.WARNING: return <FaExclamationTriangle />;
      case NOTIFICATION_TYPES.CONFIRM: return <FaQuestionCircle />;
      default: return <FaInfo />;
    }
  };

  return (
    <div className={`notification ${type}`} onClick={() => { setVisible(false); onClose?.(); }}>
      <div className="notification-content">
        <div className="notification-icon">{getIcon()}</div>
        <span className="notification-message">{message}</span>
        <button className="notification-close" onClick={(e) => { e.stopPropagation(); setVisible(false); onClose?.(); }}>
          <FaTimes />
        </button>
      </div>
      {duration && type !== NOTIFICATION_TYPES.CONFIRM && (
        <div className="notification-progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

export function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-header">
          <FaExclamationTriangle className="confirm-icon warning" />
          <h3>Подтверждение</h3>
          <button className="confirm-close-btn" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        <div className="confirm-footer">
          <button className="confirm-btn cancel" onClick={onCancel}>Отмена</button>
          <button className="confirm-btn confirm" onClick={onConfirm}>Подтвердить</button>
        </div>
      </div>
    </div>
  );
}