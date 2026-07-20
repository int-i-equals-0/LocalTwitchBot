// client/src/components/Notification/NotificationProvider.jsx

import React, { useState, useCallback } from 'react';
import { NOTIFICATION_TYPES } from './NotificationConstants';
import { NotificationContext } from './NotificationContext';
import { NotificationItem, ConfirmModal } from './NotificationComponents';

export function NotificationProvider({ children }) {
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
}