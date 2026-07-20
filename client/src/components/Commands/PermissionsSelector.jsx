// client/src/components/Commands/PermissionsSelector.jsx
import { useState } from 'react';
import Tooltip from '../Tooltip';

function PermissionsSelector({ value = [], onChange }) {
  const [newUser, setNewUser] = useState('');

  const toggleRole = (role) => {
    const newValue = value.includes(role)
      ? value.filter(r => r !== role)
      : [...value, role];
    onChange(newValue);
  };

  const addUser = () => {
    const username = newUser.trim().toLowerCase();
    if (username && !value.includes(`user:${username}`)) {
      onChange([...value, `user:${username}`]);
      setNewUser('');
    }
  };

  const removeUser = (user) => {
    onChange(value.filter(item => item !== user));
  };

  return (
    <div className="permissions-selector">
      <label>
        🔒 Разрешено для
        <Tooltip text="Кто может использовать эту команду. Если не выбрано ничего — доступно всем." />
      </label>

      <div className="role-buttons">
        <button type="button" className={`role-btn ${value.includes('broadcaster') ? 'active' : ''}`} onClick={() => toggleRole('broadcaster')}>
          👑 Стример
        </button>
        <button type="button" className={`role-btn ${value.includes('moderators') ? 'active' : ''}`} onClick={() => toggleRole('moderators')}>
          🛡️ Модераторы
        </button>
        <button type="button" className={`role-btn ${value.includes('vips') ? 'active' : ''}`} onClick={() => toggleRole('vips')}>
          ⭐ VIP
        </button>
        <button type="button" className={`role-btn ${value.includes('subscribers') ? 'active' : ''}`} onClick={() => toggleRole('subscribers')}>
          📺 Подписчики
        </button>
        <button type="button" className={`role-btn ${value.includes('everyone') ? 'active' : ''}`} onClick={() => toggleRole('everyone')}>
          🌍 Все
        </button>
      </div>

      <div className="users-section">
        <div className="users-list">
          {value.filter(item => item.startsWith('user:')).map(user => {
            const username = user.replace('user:', '');
            return (
              <div key={user} className="user-tag">
                👤 {username}
                <button onClick={() => removeUser(user)} className="remove-user">×</button>
              </div>
            );
          })}
        </div>

        <div className="add-user">
          <input
            type="text"
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            placeholder="Имя пользователя"
            onKeyDown={(e) => e.key === 'Enter' && addUser()}
          />
          <button onClick={addUser} className="add-user-btn">➕ Добавить</button>
        </div>
      </div>

      {value.length === 0 && (
        <div className="permissions-warning">
          ⚠️ Если не выбрано ничего, команда доступна всем
        </div>
      )}
    </div>
  );
}

export default PermissionsSelector;