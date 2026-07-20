import { useState, useEffect, useRef } from 'react';
import { FaTrash, FaPause, FaPlay, FaDownload } from 'react-icons/fa';
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
    if (log.includes('❌') || log.includes('Error') || log.includes('Ошибка')) {
      return 'log-error';
    }
    if (log.includes('⚠️') || log.includes('Warning') || log.includes('предупрежд')) {
      return 'log-warning';
    }
    if (log.includes('✅') || log.includes('Success') || log.includes('успешно')) {
      return 'log-success';
    }
    if (log.includes('📨') || log.includes('Command') || log.includes('Команда')) {
      return 'log-command';
    }
    if (log.includes('🎬') || log.includes('Media') || log.includes('Медиа')) {
      return 'log-media';
    }
    if (log.includes('🚫') || log.includes('Ban') || log.includes('Бан')) {
      return 'log-ban';
    }
    return 'log-info';
  };

  const filteredLogs = logs.filter(log => {
    if (filter && !log.toLowerCase().includes(filter.toLowerCase())) {
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

  // ИСПРАВЛЕНО: очищаем таймер при размонтировании
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

  // ИСПРАВЛЕНО: функция подключения с защитой от дублирования
  const connectWebSocket = () => {
    // Если уже подключены или подключаемся, не создаем новое соединение
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      console.log('WebSocket уже подключен или подключается');
      return;
    }

    try {
      wsRef.current = new WebSocket('ws://localhost:8081');
      
      wsRef.current.onopen = () => {
        console.log('✅ Подключен к серверу логов');
        setConnectionStatus('connected');
        // Очищаем таймер переподключения при успешном подключении
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };
      
      wsRef.current.onmessage = (event) => {
        if (!paused) {
          try {
            const logData = JSON.parse(event.data);
            // ИСПРАВЛЕНО: Добавляем проверку на дубликаты (по времени и сообщению)
            setLogs(prev => {
              const newLog = `[${new Date(logData.timestamp).toLocaleTimeString()}] ${logData.message}`;
              
              // Проверяем, не дублируется ли последний лог
              if (prev.length > 0 && prev[prev.length - 1] === newLog) {
                return prev; // Пропускаем дубликат
              }
              
              return [...prev, newLog].slice(-1000);
            });
          } catch (e) {
            console.error('Ошибка парсинга лога:', e);
          }
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket ошибка:', error);
        setConnectionStatus('error');
      };
      
      wsRef.current.onclose = () => {
        setConnectionStatus('disconnected');
        
        // Переподключаемся только если нет активного таймера
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
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bot-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
  };

  return (
    <div className="logs-tab">
      <div className="logs-header">
        <h2>📋 Логи сервера</h2>
        <div className="connection-status">
          <span className={`status-dot ${connectionStatus}`}></span>
          {connectionStatus === 'connected' && '🟢 Подключено'}
          {connectionStatus === 'disconnected' && '🔴 Отключено'}
          {connectionStatus === 'error' && '🟡 Ошибка'}
        </div>
      </div>

      <div className="logs-controls">
        <div className="search-box">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Фильтр логов..."
            className="filter-input"
          />
        </div>

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

        <button 
          onClick={() => setAutoScroll(!autoScroll)} 
          className={`control-btn ${autoScroll ? 'active' : ''}`}
          title="Автоскролл"
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

      <div className="logs-container">
        {filteredLogs.length === 0 ? (
          <div className="logs-empty">
            {logs.length === 0 ? (
              <>
                <p>📭 Логов пока нет</p>
                <p className="empty-hint">Логи будут появляться здесь по мере работы бота</p>
              </>
            ) : (
              <p>🔍 Нет логов, соответствующих фильтру</p>
            )}
          </div>
        ) : (
          <div className="logs-list">
            {filteredLogs.map((log, index) => (
              <div key={`${log}-${index}`} className={`log-entry ${getLogClass(log)}`}>
                <span className="log-timestamp">{log.split(']')[0]}]</span>
                <span className="log-message">{log.split(']').slice(1).join(']')}</span>
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
      </div>
    </div>
  );
}

export default LogsTab;