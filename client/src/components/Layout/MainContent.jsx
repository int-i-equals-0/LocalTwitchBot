// client/src/components/Layout/MainContent.jsx

import OAuthTab from '../OAuth/OAuthTab';
import OverlaysTab from '../Overlays/OverlaysTab';
import CommandsTab from '../Commands/CommandsTab';
import RewardsTab from '../Rewards/RewardsTab';
import EventsTab from '../Events/EventsTab';
import ShoutoutsTab from '../Shoutouts/ShoutoutsTab';
import PeriodicTab from '../Periodic/PeriodicTab';
import BanWordsTab from '../BanWords/BanWordsTab';
import NotesTab from '../Notes/NotesTab';
import LogsTab from '../Logs/LogsTab';
import './MainContent.css';

function MainContent({
  activeTab,
  tokens,
  setTokens,
  overlays,
  setOverlays,
  obs,
  setObs,
  commands,
  setCommands,
  rewards,
  setRewards,
  events,
  setEvents,
  autoshoutout,
  setAutoshoutout,
  periodicEvents,
  setPeriodicEvents,
  banWords,
  setBanWords,
  notes,
  setNotes,
  configVersion,
  autoSaveNotes,
  autoSaveTokens,
}) {
  const renderContent = () => {
    switch (activeTab) {
      case 'oauth':
        return (
          <OAuthTab
            key={`oauth-${configVersion}`}
            tokens={tokens}
            onUpdate={setTokens}
            onAutoSave={autoSaveTokens}
          />
        );
      case 'overlays':
        return (
          <OverlaysTab
            key={`overlays-${configVersion}`}
            overlays={overlays}
            onUpdate={setOverlays}
            obs={obs}
            onObsUpdate={setObs}
          />
        );
      case 'commands':
        return (
          <CommandsTab
            key={`commands-${configVersion}`}
            commands={commands}
            onUpdate={setCommands}
            overlays={overlays}
          />
        );
      case 'rewards':
        return (
          <RewardsTab
            key={`rewards-${configVersion}`}
            rewards={rewards}
            onUpdate={setRewards}
            overlays={overlays}
          />
        );
      case 'events':
        return (
          <EventsTab
            key={`events-${configVersion}`}
            events={events}
            onUpdate={setEvents}
            overlays={overlays}
          />
        );
      case 'shoutouts':
        return (
          <ShoutoutsTab
            key={`shoutouts-${configVersion}`}
            autoshoutout={autoshoutout}
            onUpdate={setAutoshoutout}
          />
        );
      case 'periodic':
        return (
          <PeriodicTab
            key={`periodic-${configVersion}`}
            events={periodicEvents}
            onUpdate={setPeriodicEvents}
            overlays={overlays}
          />
        );
      case 'banwords':
        return (
          <BanWordsTab
            key={`banwords-${configVersion}`}
            words={banWords}
            onUpdate={setBanWords}
          />
        );
      case 'notes':
        return (
          <NotesTab
            key={`notes-${configVersion}`}
            notes={notes}
            onUpdate={setNotes}
            onAutoSave={autoSaveNotes}
          />
        );
      case 'logs':
        return <LogsTab key="logs" />;
      default:
        return null;
    }
  };

  return (
    <main className="main-content">
      <div className="main-content-container">
        {renderContent()}
      </div>
    </main>
  );
}

export default MainContent;