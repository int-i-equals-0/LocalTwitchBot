// client/src/components/Notification/Notification.jsx
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { FaCheck, FaExclamationTriangle, FaInfo, FaTimes } from 'react-icons/fa';
import './Notification.css';

// Типы уведомлений
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  CONFIRM: 'confirm'
};

function Notification({ 
  type = NOTIFICATION_TYPES.INFO, 
  message, 
  duration = 3000, 
  onClose,
  onConfirm,
  showConfirmButtons = false
}) {
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
      case NOTIFICATION_TYPES.SUCCESS:
        return <FaCheck className="notification-icon success" />;
      case NOTIFICATION_TYPES.ERROR:
        return <FaTimes className="notification-icon error" />;
      case NOTIFICATION_TYPES.WARNING:
        return <FaExclamationTriangle className="notification-icon warning" />;
      case NOTIFICATION_TYPES.CONFIRM:
        return <FaExclamationTriangle className="notification-icon warning" />;
      default:
        return <FaInfo className="notification-icon info" />;
    }
  };

  if (type === NOTIFICATION_TYPES.CONFIRM) {
    return (
      <div className="modal-overlay" onClick={() => setVisible(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            {getIcon()}
            <h3>Подтверждение</h3>
            <button className="modal-close" onClick={() => setVisible(false)}>
              <FaTimes />
            </button>
          </div>
          <div className="modal-body">
            <p>{message}</p>
          </div>
          <div className="modal-footer">
            <button className="modal-btn cancel" onClick={() => {
              setVisible(false);
              onClose?.();
            }}>
              Отмена
            </button>
            <button className="modal-btn confirm" onClick={() => {
              setVisible(false);
              onConfirm?.();
            }}>
              Подтвердить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`notification ${type}`} onClick={() => setVisible(false)}>
      <div className="notification-content">
        {getIcon()}
        <span className="notification-message">{message}</span>
        <button className="notification-close" onClick={(e) => {
          e.stopPropagation();
          setVisible(false);
          onClose?.();
        }}>
          <FaTimes />
        </button>
      </div>
      {duration && (
        <div className="notification-progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

// Контекст для управления уведомлениями
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
  const [modals, setModals] = useState([]);

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
    const id = Date.now() + Math.random();
    setModals(prev => [...prev, { id, message, onConfirm, onCancel }]);
    return id;
  }, []);

  const closeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const closeModal = useCallback((id) => {
    setModals(prev => prev.filter(m => m.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      showNotification, 
      showConfirm, 
      closeNotification,
      closeModal,
      notifications,
      modals
    }}>
      {children}
      
      <div className="notifications-container">
        {notifications.map(({ id, message, type, duration }) => (
          <Notification
            key={id}
            type={type}
            message={message}
            duration={duration}
            onClose={() => closeNotification(id)}
          />
        ))}
      </div>

      <div className="modals-container">
        {modals.map(({ id, message, onConfirm, onCancel }) => (
          <Notification
            key={id}
            type={NOTIFICATION_TYPES.CONFIRM}
            message={message}
            showConfirmButtons={true}
            onConfirm={() => {
              onConfirm?.();
              closeModal(id);
            }}
            onClose={() => {
              onCancel?.();
              closeModal(id);
            }}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default Notification;