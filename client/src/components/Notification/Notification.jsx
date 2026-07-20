// client/src/components/Notification/Notification.jsx
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { FaCheck, FaExclamationTriangle, FaInfo, FaTimes, FaQuestionCircle } from 'react-icons/fa';
import './Notification.css';

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  CONFIRM: 'confirm'
};

function NotificationItem({ type, message, duration, onClose }) {
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

function ConfirmModal({ message, onConfirm, onCancel }) {
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

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);

  const showNotification = useCallback((message, type = NOTIFICATION_TYPES.INFO, duration = 3000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type, duration }]);

    if (type !== NOTIFICATION_TYPES.CONFIRM) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const showConfirm = useCallback((message, onConfirm, onCancel) => {
    setConfirmModal({ message, onConfirm, onCancel });
  }, []);

  const closeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmModal?.onConfirm) confirmModal.onConfirm();
    setConfirmModal(null);
  }, [confirmModal]);

  const handleCancel = useCallback(() => {
    if (confirmModal?.onCancel) confirmModal.onCancel();
    setConfirmModal(null);
  }, [confirmModal]);

  return (
    <NotificationContext.Provider value={{ showNotification, showConfirm, closeNotification }}>
      {children}

      <div className="notifications-container">
        {notifications.map(({ id, message, type, duration }) => (
          <NotificationItem
            key={id}
            type={type}
            message={message}
            duration={duration}
            onClose={() => closeNotification(id)}
          />
        ))}
      </div>

      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </NotificationContext.Provider>
  );
};

export default Notification;