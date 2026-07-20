import { useState } from 'react';
import './Tabs.css';

function Tabs({ tabs, defaultTab, children }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className="tabs-container">
      <div className="tabs-header">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {children[activeTab]}
      </div>
    </div>
  );
}

export default Tabs;