import { useState, useEffect } from 'react';
import Tabs from './components/Layout/Tabs';
import MainTab from './components/Main/MainTab';
import CommandsTab from './components/Commands/CommandsTab';
import BanWordsTab from './components/BanWords/BanWordsTab';
import PeriodicTab from './components/Periodic/PeriodicTab';
import RewardsTab from './components/Rewards/RewardsTab';
import EventsTab from './components/Events/EventsTab';
import LogsTab from './components/Logs/LogsTab';
import ConfigControls from './components/ConfigControls';
import { NotificationProvider, useNotification, NOTIFICATION_TYPES } from './components/Notification/Notification';
import './App.css';

function AppContent() {
  const { showNotification } = useNotification();
  const [commands, setCommands] = useState({});
  const [banWords, setBanWords] = useState([]);
  const [periodicEvents, setPeriodicEvents] = useState({});
  const [overlays, setOverlays] = useState([]);
  const [rewards, setRewards] = useState({});
  const [events, setEvents] = useState({});
  const [autoshoutout, setAutoshoutout] = useState([]);
  const [tokens, setTokens] = useState({ channelName: '', botUsername: '', clientId: '', accessToken: '', refreshToken: '' });
  const [loading, setLoading] = useState(true);
  const [configVersion, setConfigVersion] = useState(0);

  const tabs = [
    { id: 'main', label: '⚙️ Основное' },
    { id: 'commands', label: '🤖 Команды' },
    { id: 'rewards', label: '🎁 Баллы канала' },
    { id: 'events', label: '🎉 События' },
    { id: 'periodic', label: '⏰ Периодическое' },
    { id: 'banwords', label: '🚫 Банворды' },
    { id: 'logs', label: '📋 Логи' }
  ];

  useEffect(() => { loadFullConfig(); }, []);

  const loadFullConfig = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/config');
      const data = await response.json();
      if (data.tokens) setTokens(data.tokens);
      if (data.commands) setCommands(data.commands);
      if (data.banwords) setBanWords(data.banwords.words || []);
      if (data.periodicEvents) setPeriodicEvents(data.periodicEvents);
      if (data.overlays) setOverlays(data.overlays);
      if (data.rewards) setRewards(data.rewards);
      if (data.events) setEvents(data.events);
      if (data.autoshoutout) setAutoshoutout(data.autoshoutout);
      setConfigVersion(p => p + 1);
    } catch (e) { console.error('Ошибка:', e); }
    finally { setLoading(false); }
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
      const response = await fetch('http://127.0.0.1:3001/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fullConfig) });
      if (response.ok) showNotification('✅ Конфиг сохранён', NOTIFICATION_TYPES.SUCCESS, 2000);
    } catch (e) { showNotification('❌ Ошибка сохранения', NOTIFICATION_TYPES.ERROR, 3000); }
  };

  const loadConfigFromFile = (config) => {
    let updated = false;
    if (config.tokens) { setTokens(config.tokens); updated = true; }
    if (config.commands) { setCommands(config.commands); updated = true; }
    if (config.banwords) { setBanWords(config.banwords.words || []); updated = true; }
    if (config.periodicEvents) { setPeriodicEvents(config.periodicEvents); updated = true; }
    if (config.overlays) { setOverlays(config.overlays); updated = true; }
    if (config.rewards) { setRewards(config.rewards); updated = true; }
    if (config.events) { setEvents(config.events); updated = true; }
    if (config.autoshoutout) { setAutoshoutout(config.autoshoutout); updated = true; }
    if (updated) { setConfigVersion(p => p + 1); showNotification('📂 Конфиг загружен', NOTIFICATION_TYPES.SUCCESS, 2000); }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="app">
      <header>
        <h1>🎮 Local Twitch Bot</h1>
        <div className="header-controls">
          <ConfigControls onSave={saveFullConfig} onLoad={loadConfigFromFile} />
        </div>
      </header>

      <Tabs tabs={tabs} defaultTab="main">
        {{
          main: <MainTab key={`m-${configVersion}`} config={tokens} onUpdate={setTokens} overlays={overlays} onOverlaysUpdate={setOverlays} />,
          commands: <CommandsTab key={`c-${configVersion}`} commands={commands} onUpdate={setCommands} overlays={overlays} />,
          rewards: <RewardsTab key={`r-${configVersion}`} rewards={rewards} onUpdate={setRewards} overlays={overlays} />,
          events: <EventsTab key={`e-${configVersion}`} events={events} onEventsUpdate={setEvents} autoshoutout={autoshoutout} onAutoshoutoutUpdate={setAutoshoutout} overlays={overlays} />,
          periodic: <PeriodicTab key={`p-${configVersion}`} events={periodicEvents} onUpdate={setPeriodicEvents} overlays={overlays} />,
          banwords: <BanWordsTab key={`b-${configVersion}`} words={banWords} onUpdate={setBanWords} />,
          logs: <LogsTab key="logs" />
        }}
      </Tabs>
    </div>
  );
}

function App() {
  return <NotificationProvider><AppContent /></NotificationProvider>;
}

export default App;