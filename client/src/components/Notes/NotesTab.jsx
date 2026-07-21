// client/src/components/Notes/NotesTab.jsx

import { useState, useCallback } from 'react';
import { FaPlus, FaTrash, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { useNotification, NOTIFICATION_TYPES } from '../Notification';
import './NotesTab.css';

const NOTE_STATUSES = {
  active: { label: '📌 В процессе', className: 'active' },
  done: { label: '✅ Выполнено', className: 'done' },
  cancelled: { label: '❌ Отменено', className: 'cancelled' },
};

function generateNoteId() {
  return 'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
}

function NotesTab({ notes = [], onUpdate, onAutoSave }) {
  const { showNotification, showConfirm } = useNotification();
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newText, setNewText] = useState('');

  const updateAndSave = useCallback((nextNotes) => {
    onUpdate(nextNotes);
    if (onAutoSave) onAutoSave(nextNotes);
  }, [onUpdate, onAutoSave]);

  const startCreating = () => {
    setIsCreating(true);
    setNewText('');
    setEditingId(null);
    setEditText('');
  };

  const cancelCreating = () => {
    setIsCreating(false);
    setNewText('');
  };

  const saveNewNote = () => {
    const trimmed = newText.trim();
    if (!trimmed) {
      showNotification('⚠️ Заметка не может быть пустой', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    const newNote = {
      id: generateNoteId(),
      text: trimmed,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateAndSave([newNote, ...notes]);
    setIsCreating(false);
    setNewText('');
    showNotification('✅ Заметка создана', NOTIFICATION_TYPES.SUCCESS, 1500);
  };

  const startEditing = (note) => {
    setEditingId(note.id);
    setEditText(note.text);
    setIsCreating(false);
    setNewText('');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEditing = () => {
    const trimmed = editText.trim();
    if (!trimmed) {
      showNotification('⚠️ Заметка не может быть пустой', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    updateAndSave(
      notes.map((n) =>
        n.id === editingId
          ? { ...n, text: trimmed, updatedAt: new Date().toISOString() }
          : n,
      ),
    );
    setEditingId(null);
    setEditText('');
    showNotification('✅ Заметка обновлена', NOTIFICATION_TYPES.SUCCESS, 1500);
  };

  const deleteNote = (note) => {
    const preview =
      note.text.length > 40 ? note.text.substring(0, 40) + '...' : note.text;

    showConfirm(`Удалить заметку?\n\n"${preview}"`, () => {
      updateAndSave(notes.filter((n) => n.id !== note.id));
      if (editingId === note.id) {
        setEditingId(null);
        setEditText('');
      }
      showNotification('🗑️ Заметка удалена', NOTIFICATION_TYPES.WARNING, 1500);
    });
  };

  const setNoteStatus = (noteId, status) => {
    updateAndSave(
      notes.map((n) =>
        n.id === noteId
          ? { ...n, status, updatedAt: new Date().toISOString() }
          : n,
      ),
    );
  };

  const deleteAllByStatus = (status) => {
    const statusLabel = NOTE_STATUSES[status]?.label || status;
    const count = notes.filter((n) => (n.status || 'active') === status).length;

    if (count === 0) {
      showNotification('ℹ️ Нечего удалять', NOTIFICATION_TYPES.INFO, 1500);
      return;
    }

    showConfirm(
      `Удалить все заметки со статусом "${statusLabel}"?\n\nБудет удалено: ${count}`,
      () => {
        updateAndSave(notes.filter((n) => (n.status || 'active') !== status));
        showNotification(
          `🗑️ Удалено ${count} заметок`,
          NOTIFICATION_TYPES.WARNING,
          2000,
        );
      },
    );
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeNotes = notes.filter((n) => (n.status || 'active') === 'active');
  const doneNotes = notes.filter((n) => n.status === 'done');
  const cancelledNotes = notes.filter((n) => n.status === 'cancelled');

  const renderStatusButtons = (note) => {
    const currentStatus = note.status || 'active';

    return (
      <div className="note-status-buttons">
        {currentStatus !== 'active' && (
          <button
            className="note-status-btn status-active"
            onClick={() => setNoteStatus(note.id, 'active')}
            title="В процессе"
          >
            📌
          </button>
        )}
        {currentStatus !== 'done' && (
          <button
            className="note-status-btn status-done"
            onClick={() => setNoteStatus(note.id, 'done')}
            title="Выполнено"
          >
            ✅
          </button>
        )}
        {currentStatus !== 'cancelled' && (
          <button
            className="note-status-btn status-cancelled"
            onClick={() => setNoteStatus(note.id, 'cancelled')}
            title="Отменено"
          >
            ❌
          </button>
        )}
      </div>
    );
  };

  const renderNoteCard = (note) => {
    const currentStatus = note.status || 'active';
    const isEditing = editingId === note.id;

    return (
      <div key={note.id} className={`note-card ${currentStatus}`}>
        {isEditing ? (
          <>
            <textarea
              className="note-textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="note-editor-actions">
              <button className="note-save-btn" onClick={saveEditing}>
                <FaSave /> Сохранить
              </button>
              <button className="note-cancel-btn" onClick={cancelEditing}>
                <FaTimes /> Отмена
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="note-content">
              <pre className="note-text">{note.text}</pre>
            </div>
            <div className="note-footer">
              <span className="note-date">
                {formatDate(note.updatedAt || note.createdAt)}
              </span>
              <div className="note-actions">
                {renderStatusButtons(note)}
                {currentStatus === 'active' && (
                  <button
                    className="note-action-btn edit"
                    onClick={() => startEditing(note)}
                    title="Редактировать"
                  >
                    <FaEdit />
                  </button>
                )}
                <button
                  className="note-action-btn delete"
                  onClick={() => deleteNote(note)}
                  title="Удалить"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="notes-tab">
      <div className="notes-header">
        <h2>📝 Заметки</h2>
        <p className="notes-description">
          Быстрые записи для стрима: идеи, задачи, напоминания.
        </p>
      </div>

      {!isCreating && (
        <button className="create-note-btn" onClick={startCreating}>
          <FaPlus /> Новая заметка
        </button>
      )}

      {isCreating && (
        <div className="note-editor-card creating">
          <div className="note-editor-header">
            <h3>📝 Новая заметка</h3>
          </div>
          <textarea
            className="note-textarea"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Что нужно запомнить?..."
            rows={4}
            autoFocus
          />
          <div className="note-editor-actions">
            <button className="note-save-btn" onClick={saveNewNote}>
              <FaSave /> Сохранить
            </button>
            <button className="note-cancel-btn" onClick={cancelCreating}>
              <FaTimes /> Отмена
            </button>
          </div>
        </div>
      )}

      {activeNotes.length === 0 &&
        doneNotes.length === 0 &&
        cancelledNotes.length === 0 &&
        !isCreating && (
          <div className="empty-notes">
            <p>📭 Заметок пока нет</p>
            <p className="hint">
              Нажмите «Новая заметка», чтобы создать первую
            </p>
          </div>
        )}

      {activeNotes.length > 0 && (
        <div className="notes-section">
          <h3 className="notes-section-title">
            📌 В процессе ({activeNotes.length})
          </h3>
          <div className="notes-list">
            {activeNotes.map((note) => renderNoteCard(note))}
          </div>
        </div>
      )}

      {doneNotes.length > 0 && (
        <div className="notes-section done-section">
          <div className="notes-section-header">
            <h3 className="notes-section-title">
              ✅ Выполнено ({doneNotes.length})
            </h3>
            <button
              className="bulk-delete-btn"
              onClick={() => deleteAllByStatus('done')}
            >
              <FaTrash /> Удалить все выполненные
            </button>
          </div>
          <div className="notes-list">
            {doneNotes.map((note) => renderNoteCard(note))}
          </div>
        </div>
      )}

      {cancelledNotes.length > 0 && (
        <div className="notes-section cancelled-section">
          <div className="notes-section-header">
            <h3 className="notes-section-title">
              ❌ Отменено ({cancelledNotes.length})
            </h3>
            <button
              className="bulk-delete-btn"
              onClick={() => deleteAllByStatus('cancelled')}
            >
              <FaTrash /> Удалить все отменённые
            </button>
          </div>
          <div className="notes-list">
            {cancelledNotes.map((note) => renderNoteCard(note))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotesTab;