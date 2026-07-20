// client/src/App.jsx
import { useState, useEffect } from 'react';
import Sidebar from './components/Layout/Sidebar';
import MainContent from './components/Layout/MainContent';
import { NotificationProvider, useNotification, NOTIFICATION_TYPES } from './components/Notification/Notification';
import './App.css';

const TABS = {
  OAUTH: 'oauth',
  OVERLAYS: 'overlays',
  COMMANDS: 'commands',
  REWARDS: 'rewards',
  EVENTS: 'events',
  SHOUTOUTS: 'shoutouts',
  PERIODIC: 'periodic',
  BANWORDS: 'banwords',
  LOGS: 'logs'
};

function AppContent() {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState(TABS.OAUTH);
  const [loading, setLoading] = useState(true);
  
  // Все состояния конфига
  const [tokens, setTokens] = useState({});
  const [commands, setCommands] = useState({});
  const [rewards, setRewards] = useState({});
  const [events, setEvents] = useState({});
  const [autoshoutout, setAutoshoutout] = useState([]);
  const [periodicEvents, setPeriodicEvents] = useState({});
  const [banWords, setBanWords] = useState([]);
  const [overlays, setOverlays] = useState([]);
  const [configVersion, setConfigVersion] = useState(0);

  useEffect(() => {
    loadFullConfig();
  }, []);

  const loadFullConfig = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/config');
      const data = await response.json();
      
      if (data.tokens) setTokens(data.tokens);
      if (data.commands) setCommands(data.commands);
      if (data.rewards) setRewards(data.rewards);
      if (data.events) setEvents(data.events);
      if (data.autoshoutout) setAutoshoutout(data.autoshoutout);
      if (data.periodicEvents) setPeriodicEvents(data.periodicEvents);
      if (data.banwords) setBanWords(data.banwords.words || []);
      if (data.overlays) setOverlays(data.overlays);
      
      setConfigVersion(prev => prev + 1);
    } catch (error) {
      console.error('Ошибка загрузки конфига:', error);
      showNotification('❌ Ошибка подключения к серверу', NOTIFICATION_TYPES.ERROR, 3000);
    } finally {
      setLoading(false);
    }
  };

  const saveFullConfig = async () => {
    try {
      const fullConfig = {
        tokens,
        commands,
        banwords: { words: banWords },
        periodicEvents,
        overlays,
        rewards,
        events,
        autoshoutout
      };
      
      const response = await fetch('http://127.0.0.1:3001/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullConfig)
      });
      
      if (response.ok) {
        showNotification('✅ Конфиг сохранён', NOTIFICATION_TYPES.SUCCESS, 2000);
        setConfigVersion(prev => prev + 1);
      } else {
        showNotification('❌ Ошибка сохранения конфига', NOTIFICATION_TYPES.ERROR, 3000);
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      showNotification('❌ Ошибка подключения к серверу', NOTIFICATION_TYPES.ERROR, 3000);
    }
  };

  const loadConfigFromFile = (config) => {
    let updated = false;
    if (config.tokens) { setTokens(config.tokens); updated = true; }
    if (config.commands) { setCommands(config.commands); updated = true; }
    if (config.rewards) { setRewards(config.rewards); updated = true; }
    if (config.events) { setEvents(config.events); updated = true; }
    if (config.autoshoutout) { setAutoshoutout(config.autoshoutout); updated = true; }
    if (config.periodicEvents) { setPeriodicEvents(config.periodicEvents); updated = true; }
    if (config.banwords) { setBanWords(config.banwords.words || []); updated = true; }
    if (config.overlays) { setOverlays(config.overlays); updated = true; }
    
    if (updated) {
      setConfigVersion(prev => prev + 1);
      showNotification('📂 Конфиг загружен', NOTIFICATION_TYPES.SUCCESS, 2000);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Загрузка конфигурации...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onSaveConfig={saveFullConfig}
        onLoadConfig={loadConfigFromFile}
      />
      <MainContent
        activeTab={activeTab}
        tokens={tokens}
        setTokens={setTokens}
        overlays={overlays}
        setOverlays={setOverlays}
        commands={commands}
        setCommands={setCommands}
        rewards={rewards}
        setRewards={setRewards}
        events={events}
        setEvents={setEvents}
        autoshoutout={autoshoutout}
        setAutoshoutout={setAutoshoutout}
        periodicEvents={periodicEvents}
        setPeriodicEvents={setPeriodicEvents}
        banWords={banWords}
        setBanWords={setBanWords}
        configVersion={configVersion}
      />
    </div>
  );
}

function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;