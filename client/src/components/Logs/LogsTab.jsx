// client/src/components/Logs/LogsTab.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { FaTrash, FaPause, FaPlay, FaDownload, FaFilter, FaSearch } from 'react-icons/fa';
import './LogsTab.css';

function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [logLevel, setLogLevel] = useState('all');
  const logsEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const getLogClass = (log) => {
    const message = log.message || log;
    if (message.includes('❌') || message.includes('Error') || message.includes('Ошибка')) {
      return 'log-error';
    }
    if (message.includes('⚠️') || message.includes('Warning') || message.includes('предупрежд')) {
      return 'log-warning';
    }
    if (message.includes('✅') || message.includes('Success') || message.includes('успешно')) {
      return 'log-success';
    }
    if (message.includes('📨') || message.includes('Command') || message.includes('Команда')) {
      return 'log-command';
    }
    if (message.includes('🎬') || message.includes('Media') || message.includes('Медиа')) {
      return 'log-media';
    }
    if (message.includes('🚫') || message.includes('Ban') || message.includes('Бан')) {
      return 'log-ban';
    }
    return 'log-info';
  };

  const filteredLogs = logs.filter(log => {
    const message = log.message || log;
    if (filter && !message.toLowerCase().includes(filter.toLowerCase())) {
      return false;
    }
    
    if (logLevel !== 'all') {
      const logClass = getLogClass(log);
      if (logLevel === 'info' && !['log-info', 'log-success', 'log-command', 'log-media'].includes(logClass)) return false;
      if (logLevel === 'warning' && logClass !== 'log-warning') return false;
      if (logLevel === 'error' && logClass !== 'log-error') return false;
    }
    
    return true;
  });

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      wsRef.current = new WebSocket('ws://localhost:8081');
      
      wsRef.current.onopen = () => {
        setConnectionStatus('connected');
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };
      
      wsRef.current.onmessage = (event) => {
        if (!paused) {
          try {
            const logData = JSON.parse(event.data);
            setLogs(prev => {
              const newLog = {
                timestamp: logData.timestamp,
                message: logData.message,
                timeStr: new Date(logData.timestamp).toLocaleTimeString()
              };
              
              if (prev.length > 0 && prev[prev.length - 1].message === newLog.message) {
                return prev;
              }
              
              return [...prev, newLog].slice(-1000);
            });
          } catch (e) {
            console.error('Ошибка парсинга лога:', e);
          }
        }
      };
      
      wsRef.current.onerror = () => {
        setConnectionStatus('error');
      };
      
      wsRef.current.onclose = () => {
        setConnectionStatus('disconnected');
        
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            connectWebSocket();
          }, 3000);
        }
      };
    } catch (error) {
      console.error('Ошибка подключения к логам:', error);
      setConnectionStatus('error');
    }
  }, [paused]);

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const logText = logs.map(log => `[${log.timeStr}] ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bot-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢';
      case 'disconnected': return '🔴';
      case 'error': return '🟡';
      default: return '⚪';
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Подключено';
      case 'disconnected': return 'Отключено';
      case 'error': return 'Ошибка';
      default: return 'Неизвестно';
    }
  };

  return (
    <div className="logs-tab">
      <div className="logs-header">
        <div className="logs-title">
          <h2>📋 Логи сервера</h2>
          <div className={`connection-status ${connectionStatus}`}>
            <span className="connection-dot"></span>
            <span>{getConnectionText()}</span>
          </div>
        </div>
      </div>

      <div className="logs-controls">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Поиск по логам..."
            className="filter-input"
          />
          {filter && (
            <button className="search-clear" onClick={() => setFilter('')}>✕</button>
          )}
        </div>

        <div className="filter-group">
          <FaFilter className="filter-icon" />
          <select 
            value={logLevel} 
            onChange={(e) => setLogLevel(e.target.value)}
            className="level-select"
          >
            <option value="all">Все уровни</option>
            <option value="info">ℹ️ Инфо</option>
            <option value="warning">⚠️ Предупреждения</option>
            <option value="error">❌ Ошибки</option>
          </select>
        </div>

        <div className="control-buttons">
          <button 
            onClick={() => setAutoScroll(!autoScroll)} 
            className={`control-btn ${autoScroll ? 'active' : ''}`}
            title={autoScroll ? 'Автоскролл вкл' : 'Автоскролл выкл'}
          >
            {autoScroll ? <FaPlay /> : <FaPause />}
          </button>

          <button 
            onClick={() => setPaused(!paused)} 
            className={`control-btn ${paused ? 'paused' : ''}`}
            title={paused ? 'Возобновить' : 'Пауза'}
          >
            {paused ? <FaPlay /> : <FaPause />}
          </button>

          <button onClick={clearLogs} className="control-btn" title="Очистить">
            <FaTrash />
          </button>

          <button onClick={exportLogs} className="control-btn" title="Экспорт">
            <FaDownload />
          </button>
        </div>
      </div>

      <div className="logs-container">
        {filteredLogs.length === 0 ? (
          <div className="logs-empty">
            {logs.length === 0 ? (
              <>
                <p>📭 Логов пока нет</p>
                <p className="empty-hint">Логи будут появляться здесь по мере работы бота</p>
              </>
            ) : (
              <>
                <p>🔍 Нет логов, соответствующих фильтру</p>
                <button onClick={() => setFilter('')} className="clear-filter-btn">
                  Очистить фильтр
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="logs-list">
            {filteredLogs.map((log, index) => (
              <div key={`${log.timestamp}-${index}`} className={`log-entry ${getLogClass(log)}`}>
                <span className="log-timestamp">{log.timeStr}</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      <div className="logs-footer">
        <span>Всего логов: {logs.length}</span>
        <span>Отображено: {filteredLogs.length}</span>
        {paused && <span className="paused-indicator">⏸️ Пауза</span>}
        {filter && <span className="filter-indicator">🔍 Фильтр: "{filter}"</span>}
      </div>
    </div>
  );
}

export default LogsTab;