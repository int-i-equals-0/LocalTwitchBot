import { useState, useEffect } from 'react';
import { FaSave, FaSignOutAlt, FaExternalLinkAlt } from 'react-icons/fa';
import OverlayManager from './OverlayManager';
import Tooltip from '../Tooltip';
import { useNotification, NOTIFICATION_TYPES } from '../Notification/Notification';
import './MainTab.css';

function MainTab({ config, onUpdate, overlays, onOverlaysUpdate }) {
  const { showNotification, showConfirm } = useNotification();

  const [localConfig, setLocalConfig] = useState({
    channelName: '',
    botUsername: '',
    accessToken: '',
    refreshToken: '',
    broadcasterAccessToken: '',
    broadcasterRefreshToken: ''
  });

  const [broadcasterUserInfo, setBroadcasterUserInfo] = useState(null);
  const [botUserInfo, setBotUserInfo] = useState(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState({ broadcaster: false, bot: false });

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  useEffect(() => {
    loadTokens();
  }, []);

  useEffect(() => {
    if (localConfig.broadcasterAccessToken) {
      fetchUserInfo('broadcaster', localConfig.broadcasterAccessToken);
    } else {
      setBroadcasterUserInfo(null);
    }
    
    if (localConfig.accessToken) {
      fetchUserInfo('bot', localConfig.accessToken);
    } else {
      setBotUserInfo(null);
    }
  }, [localConfig.broadcasterAccessToken, localConfig.accessToken]);

  const loadTokens = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/config');
      const data = await response.json();
      if (data.tokens) {
        setLocalConfig(data.tokens);
        onUpdate(data.tokens);
      }
    } catch (error) {
      console.error('Ошибка загрузки токенов:', error);
    }
  };

  const fetchUserInfo = async (type, token) => {
    if (!token) return;
    
    setLoadingUserInfo(prev => ({ ...prev, [type]: true }));
    
    try {
        const cleanToken = token.replace('oauth:', '');
        const response = await fetch('https://id.twitch.tv/oauth2/validate', {
            headers: { 'Authorization': `Bearer ${cleanToken}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const userInfo = {
                login: data.login,
                userId: data.user_id,
                scopes: data.scopes
            };
            
            if (type === 'broadcaster') {
                setBroadcasterUserInfo(userInfo);
                // Обновляем никнейм стримера в локальном состоянии
                if (userInfo.login !== localConfig.channelName) {
                    const updated = { ...localConfig, channelName: userInfo.login };
                    setLocalConfig(updated);
                    onUpdate(updated);
                    
                    // НЕМЕДЛЕННО СОХРАНЯЕМ В КОНФИГ
                    await saveChannelName(userInfo.login);
                }
            } else {
                setBotUserInfo(userInfo);
                // Обновляем никнейм бота в локальном состоянии
                if (userInfo.login !== localConfig.botUsername) {
                    const updated = { ...localConfig, botUsername: userInfo.login };
                    setLocalConfig(updated);
                    onUpdate(updated);
                    
                    // НЕМЕДЛЕННО СОХРАНЯЕМ В КОНФИГ
                    await saveBotUsername(userInfo.login);
                }
            }
        } else {
            if (type === 'broadcaster') {
                setBroadcasterUserInfo(null);
            } else {
                setBotUserInfo(null);
            }
        }
    } catch (error) {
        console.error(`Ошибка получения информации о ${type}:`, error);
        if (type === 'broadcaster') {
            setBroadcasterUserInfo(null);
        } else {
            setBotUserInfo(null);
        }
    } finally {
        setLoadingUserInfo(prev => ({ ...prev, [type]: false }));
    }
  };

  const saveChannelName = async (channelName) => {
      try {
          const response = await fetch('http://127.0.0.1:3001/api/config');
          const fullConfig = await response.json();
          
          if (!fullConfig.tokens) fullConfig.tokens = {};
          fullConfig.tokens.channelName = channelName;
          
          await fetch('http://127.0.0.1:3001/api/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fullConfig)
          });
          
          console.log(`[INFO] Сохранен никнейм стримера: ${channelName}`);
      } catch (error) {
          console.error('Ошибка сохранения никнейма стримера:', error);
      }
  };

  const saveBotUsername = async (botUsername) => {
      try {
          const response = await fetch('http://127.0.0.1:3001/api/config');
          const fullConfig = await response.json();
          
          if (!fullConfig.tokens) fullConfig.tokens = {};
          fullConfig.tokens.botUsername = botUsername;
          
          await fetch('http://127.0.0.1:3001/api/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fullConfig)
          });
          
          console.log(`[INFO] Сохранен никнейм бота: ${botUsername}`);
      } catch (error) {
          console.error('Ошибка сохранения никнейма бота:', error);
      }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/config');
      const fullConfig = await response.json();
      
      fullConfig.tokens = localConfig;
      
      const saveResponse = await fetch('http://127.0.0.1:3001/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullConfig)
      });
      
      if (saveResponse.ok) {
        showConfirm(
          '⚠️ Настройки сохранены!\n\nДля применения изменений необходимо перезапустить сервер.\n\nВыключить сервер сейчас? (После выключения запустите его снова вручную)',
          () => shutdownServer(),
          () => {
            showNotification('📝 Не забудьте перезапустить сервер позже', NOTIFICATION_TYPES.WARNING, 4000);
          }
        );
        
        onUpdate(localConfig);
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      showNotification('❌ Ошибка при сохранении настроек', NOTIFICATION_TYPES.ERROR, 3000);
    }
  };

  const authorizeBroadcaster = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/auth/twitch/broadcaster');
      const data = await response.json();
      if (data.url) {
        const authWindow = window.open(data.url, 'twitch-auth', 'width=800,height=600');
        
        const checkClosed = setInterval(async () => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            await loadTokens();
            const statusResponse = await fetch('http://127.0.0.1:3001/api/tokens/status');
            const status = await statusResponse.json();
            if (status.valid) {
              showNotification('✅ Авторизация завершена! Сервер будет перезапущен...', NOTIFICATION_TYPES.SUCCESS, 3000);
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              showNotification('⚠️ Не хватает некоторых токенов. Авторизуйте второго пользователя.', NOTIFICATION_TYPES.WARNING, 3000);
            }
          }
        }, 500);
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showNotification('❌ Ошибка при открытии окна авторизации', NOTIFICATION_TYPES.ERROR, 3000);
    }
  };

  const authorizeBot = async () => {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/auth/twitch/bot');
      const data = await response.json();
      if (data.url) {
        const authWindow = window.open(data.url, 'twitch-auth', 'width=800,height=600');
        
        const checkClosed = setInterval(async () => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            await loadTokens();
            const statusResponse = await fetch('http://127.0.0.1:3001/api/tokens/status');
            const status = await statusResponse.json();
            if (status.valid) {
              showNotification('✅ Авторизация завершена! Сервер будет перезапущен...', NOTIFICATION_TYPES.SUCCESS, 3000);
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              showNotification('⚠️ Не хватает некоторых токенов. Авторизуйте второго пользователя.', NOTIFICATION_TYPES.WARNING, 3000);
            }
          }
        }, 500);
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showNotification('❌ Ошибка при открытии окна авторизации', NOTIFICATION_TYPES.ERROR, 3000);
    }
  };

  const logoutBroadcaster = () => {
    showConfirm(
      'Вы действительно хотите удалить авторизацию стримера?\n\nБот потеряет доступ к событиям (подписки, фолловеры, награды) до повторной авторизации.',
      async () => {
        try {
          const response = await fetch('http://127.0.0.1:3001/api/config');
          const fullConfig = await response.json();
          
          delete fullConfig.tokens.broadcasterAccessToken;
          delete fullConfig.tokens.broadcasterRefreshToken;
          delete fullConfig.tokens.channelName; // Удаляем и никнейм
          
          const saveResponse = await fetch('http://127.0.0.1:3001/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullConfig)
          });
          
          if (saveResponse.ok) {
            setLocalConfig(prev => ({
              ...prev,
              channelName: '',
              broadcasterAccessToken: '',
              broadcasterRefreshToken: ''
            }));
            setBroadcasterUserInfo(null);
            onUpdate({
              ...localConfig,
              channelName: '',
              broadcasterAccessToken: '',
              broadcasterRefreshToken: ''
            });
            
            showNotification('🗑️ Авторизация стримера удалена. Перезапустите сервер для применения изменений.', NOTIFICATION_TYPES.WARNING, 4000);
          }
        } catch (error) {
          console.error('Ошибка при выходе:', error);
          showNotification('❌ Ошибка при удалении авторизации', NOTIFICATION_TYPES.ERROR, 3000);
        }
      }
    );
  };

  const logoutBot = () => {
    showConfirm(
      'Вы действительно хотите удалить авторизацию бота?\n\nБот перестанет отвечать в чате до повторной авторизации.',
      async () => {
        try {
          const response = await fetch('http://127.0.0.1:3001/api/config');
          const fullConfig = await response.json();
          
          delete fullConfig.tokens.accessToken;
          delete fullConfig.tokens.refreshToken;
          delete fullConfig.tokens.botUsername; // Удаляем и никнейм
          
          const saveResponse = await fetch('http://127.0.0.1:3001/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullConfig)
          });
          
          if (saveResponse.ok) {
            setLocalConfig(prev => ({
              ...prev,
              botUsername: '',
              accessToken: '',
              refreshToken: ''
            }));
            setBotUserInfo(null);
            onUpdate({
              ...localConfig,
              botUsername: '',
              accessToken: '',
              refreshToken: ''
            });
            
            showNotification('🗑️ Авторизация бота удалена. Перезапустите сервер для применения изменений.', NOTIFICATION_TYPES.WARNING, 4000);
          }
        } catch (error) {
          console.error('Ошибка при выходе:', error);
          showNotification('❌ Ошибка при удалении авторизации', NOTIFICATION_TYPES.ERROR, 3000);
        }
      }
    );
  };

  const shutdownServer = async () => {
    try {
      showNotification('🔄 Выключение сервера...', NOTIFICATION_TYPES.INFO, 0);
      
      const response = await fetch('http://127.0.0.1:3001/api/shutdown', {
        method: 'POST'
      });
      
      if (response.ok) {
        showNotification('✅ Сервер выключен. Запустите его снова вручную.', NOTIFICATION_TYPES.SUCCESS, 0);
      }
    } catch (error) {
      showNotification('✅ Сервер выключен. Запустите его снова вручную.', NOTIFICATION_TYPES.SUCCESS, 0);
    }
  };

  return (
    <div className="main-tab">
      <h2>⚙️ Основные настройки</h2>
      
      <div className="two-columns">
        {/* Левая колонка - Стример */}
        <div className="column">
          <div className="column-header">
            <h3>🎥 Стример</h3>
          </div>

          <div className="column-settings">
            <div className="form-group">
              <label>🎫 Авторизация стримера</label>
              <div className="auth-actions">
                <button onClick={authorizeBroadcaster} className="auth-btn">
                  🔐 Авторизоваться через Twitch
                </button>
                {localConfig.broadcasterAccessToken && (
                  <button onClick={logoutBroadcaster} className="logout-btn">
                    <FaSignOutAlt /> Разлогинить
                  </button>
                )}
              </div>
              
              {loadingUserInfo.broadcaster && (
                <div className="auth-status info">
                  ⏳ Загрузка информации...
                </div>
              )}
              
              {broadcasterUserInfo && !loadingUserInfo.broadcaster && (
                <div className="auth-status success">
                  ✅ Стример авторизован: <strong>{broadcasterUserInfo.login}</strong>
                  <div className="auth-scopes">
                    Права: {broadcasterUserInfo.scopes?.length || 0} разрешений
                  </div>
                </div>
              )}
              
              {!broadcasterUserInfo && localConfig.broadcasterAccessToken && !loadingUserInfo.broadcaster && (
                <div className="auth-status error">
                  ⚠️ Токен стримера невалиден. Повторите авторизацию.
                </div>
              )}
              
              <div className="auth-hint">
                💡 При повторной авторизации Twitch может предложить уже использованный аккаунт. 
                Чтобы войти под другим аккаунтом, нажмите "Разлогинить" и повторите попытку.
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка - Бот */}
        <div className="column">
          <div className="column-header">
            <h3>🤖 Бот</h3>
          </div>

          <div className="column-settings">
            <div className="form-group">
              <label>🤖 Авторизация бота</label>
              <div className="auth-actions">
                <button onClick={authorizeBot} className="auth-btn">
                  🔐 Авторизовать бота через Twitch
                </button>
                {localConfig.accessToken && (
                  <button onClick={logoutBot} className="logout-btn">
                    <FaSignOutAlt /> Разлогинить
                  </button>
                )}
              </div>
              
              {loadingUserInfo.bot && (
                <div className="auth-status info">
                  ⏳ Загрузка информации...
                </div>
              )}
              
              {botUserInfo && !loadingUserInfo.bot && (
                <div className="auth-status success">
                  ✅ Бот авторизован: <strong>{botUserInfo.login}</strong>
                  <div className="auth-scopes">
                    Права: {botUserInfo.scopes?.length || 0} разрешений
                  </div>
                </div>
              )}
              
              {!botUserInfo && localConfig.accessToken && !loadingUserInfo.bot && (
                <div className="auth-status error">
                  ⚠️ Токен бота невалиден. Повторите авторизацию.
                </div>
              )}
              
              <div className="auth-hint">
                💡 Для работы бота необходим отдельный аккаунт Twitch. 
                Бот будет отвечать в чате от имени этого аккаунта.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Блок с оверлеями */}
      <div className="overlays-section">
        <OverlayManager overlays={overlays} onUpdate={onOverlaysUpdate} />
      </div>

      {/* Блок статуса подключения */}
      <div className="connection-status-box">
        <h4>📊 Статус подключения</h4>
        <div className="status-items">
          <div className="status-item">
            <span className="status-label">Статус стримера:</span>
            <span className="status-value">
              {broadcasterUserInfo 
                ? `✅ ${broadcasterUserInfo.login}` 
                : localConfig.broadcasterAccessToken 
                  ? '⚠️ Токен невалиден'
                  : '✗ не авторизован'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Статус бота:</span>
            <span className="status-value">
              {botUserInfo 
                ? `✅ ${botUserInfo.login}` 
                : localConfig.accessToken 
                  ? '⚠️ Токен невалиден'
                  : '✗ не авторизован'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">EventSub:</span>
            <span className="status-value" id="eventsub-status">
              {broadcasterUserInfo ? 'Ожидание подключения...' : 'Требуется авторизация'}
            </span>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button onClick={handleSave} className="save-settings-btn">
          <FaSave /> Сохранить настройки
        </button>
      </div>
    </div>
  );
}

export default MainTab;