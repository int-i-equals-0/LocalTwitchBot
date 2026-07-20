// client/src/components/Layout/Sidebar.jsx
import { FaKey, FaLayerGroup, FaRobot, FaGift, FaCalendarAlt, FaBullhorn, FaClock, FaBan, FaFileAlt } from 'react-icons/fa';
import ConfigControls from '../ConfigControls';
import './Sidebar.css';

const MENU_ITEMS = [
  { id: 'oauth', label: 'Авторизация', icon: FaKey },
  { id: 'overlays', label: 'Оверлеи', icon: FaLayerGroup },
  { id: 'commands', label: 'Команды', icon: FaRobot },
  { id: 'rewards', label: 'Баллы канала', icon: FaGift },
  { id: 'events', label: 'События', icon: FaCalendarAlt },
  { id: 'shoutouts', label: 'Шатауты', icon: FaBullhorn },
  { id: 'periodic', label: 'Периодическое', icon: FaClock },
  { id: 'banwords', label: 'Банворды', icon: FaBan },
  { id: 'logs', label: 'Логи', icon: FaFileAlt }
];

function Sidebar({ activeTab, onTabChange, onSaveConfig, onLoadConfig }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>🎮 Twitch Bot</h1>
        <p className="sidebar-subtitle">Управление ботом</p>
        <ConfigControls onSave={onSaveConfig} onLoad={onLoadConfig} />
      </div>
      
      <nav className="sidebar-nav">
        {MENU_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`sidebar-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <div className="sidebar-btn-icon">
                <Icon />
              </div>
              <span className="sidebar-btn-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;