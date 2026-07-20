// client/src/components/OAuth/OAuthTab.jsx
import { useState, useEffect } from 'react';
import { FaSignOutAlt, FaCheckCircle, FaExclamationTriangle, FaSync } from 'react-icons/fa';
import Tooltip from '../Tooltip';
import { useNotification, NOTIFICATION_TYPES } from '../Notification/Notification';
import './OAuthTab.css';

function OAuthTab({ tokens, onUpdate }) {
  const { showNotification, showConfirm } = useNotification();
  const [broadcasterInfo, setBroadcasterInfo] = useState(null);
  const [botInfo, setBotInfo] = useState(null);
  const [loading, setLoading] = useState({ broadcaster: false, bot: false });
  const [refreshing, setRefreshing] = useState({ broadcaster: false, bot: false });

  useEffect(() => {
    if (tokens.broadcasterAccessToken) {
      fetchUserInfo('broadcaster', tokens.broadcasterAccessToken);
    }
    if (tokens.accessToken) {
      fetchUserInfo('bot', tokens.accessToken);
    }
  }, [tokens.broadcasterAccessToken, tokens.accessToken]);

  const fetchUserInfo = async (type, token) => {
    if (!token) return;
    
    setLoading(prev => ({ ...prev, [type]: true }));
    
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
          setBroadcasterInfo(userInfo);
          if (userInfo.login !== tokens.channelName) {
            onUpdate({ ...tokens, channelName: userInfo.login });
          }
        } else {
          setBotInfo(userInfo);
          if (userInfo.login !== tokens.botUsername) {
            onUpdate({ ...tokens, botUsername: userInfo.login });
          }
        }
      } else {
        if (type === 'broadcaster') setBroadcasterInfo(null);
        else setBotInfo(null);
      }
    } catch (error) {
      console.error(`Ошибка получения информации о ${type}:`, error);
      if (type === 'broadcaster') setBroadcasterInfo(null);
      else setBotInfo(null);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
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
            window.location.reload();
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
            window.location.reload();
          }
        }, 500);
      }
    } catch (error) {
      console.error('Ошибка:', error);
      showNotification('❌ Ошибка при открытии окна авторизации', NOTIFICATION_TYPES.ERROR, 3000);
    }
  };

  const refreshToken = async (type) => {
    setRefreshing(prev => ({ ...prev, [type]: true }));
    try {
      const response = await fetch(`http://127.0.0.1:3001/api/auth/refresh/${type}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        showNotification(`✅ Токен ${type === 'broadcaster' ? 'стримера' : 'бота'} обновлён`, NOTIFICATION_TYPES.SUCCESS, 2000);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showNotification(`❌ Ошибка обновления токена`, NOTIFICATION_TYPES.ERROR, 3000);
      }
    } catch (error) {
      showNotification('❌ Ошибка подключения к серверу', NOTIFICATION_TYPES.ERROR, 3000);
    } finally {
      setRefreshing(prev => ({ ...prev, [type]: false }));
    }
  };

  const logoutBroadcaster = () => {
    showConfirm(
      'Вы действительно хотите удалить авторизацию стримера?\n\nБот потеряет доступ к событиям (подписки, фолловеры, награды) до повторной авторизации.',
      async () => {
        const updated = { ...tokens };
        delete updated.broadcasterAccessToken;
        delete updated.broadcasterRefreshToken;
        delete updated.channelName;
        onUpdate(updated);
        setBroadcasterInfo(null);
        showNotification('🗑️ Авторизация стримера удалена. Перезапустите сервер.', NOTIFICATION_TYPES.WARNING, 4000);
      }
    );
  };

  const logoutBot = () => {
    showConfirm(
      'Вы действительно хотите удалить авторизацию бота?\n\nБот перестанет отвечать в чате до повторной авторизации.',
      async () => {
        const updated = { ...tokens };
        delete updated.accessToken;
        delete updated.refreshToken;
        delete updated.botUsername;
        onUpdate(updated);
        setBotInfo(null);
        showNotification('🗑️ Авторизация бота удалена. Перезапустите сервер.', NOTIFICATION_TYPES.WARNING, 4000);
      }
    );
  };

  return (
    <div className="oauth-tab">
      <div className="oauth-header">
        <h2>🔐 Авторизация Twitch</h2>
        <p className="oauth-description">
          Для работы бота необходимо авторизовать два аккаунта: стримера (для получения событий) и бота (для отправки сообщений в чат).
        </p>
      </div>

      <div className="oauth-two-columns">
        {/* Стример */}
        <div className="oauth-card">
          <div className="oauth-card-header">
            <h3>🎥 Стример</h3>
            <span className="oauth-badge broadcaster">Основной аккаунт</span>
          </div>
          
          <div className="oauth-card-content">
            {broadcasterInfo ? (
              <div className="oauth-auth-status success">
                <FaCheckCircle />
                <div>
                  <strong>{broadcasterInfo.login}</strong>
                  <div className="oauth-scopes">Прав: {broadcasterInfo.scopes?.length || 0}</div>
                </div>
              </div>
            ) : tokens.broadcasterAccessToken ? (
              <div className="oauth-auth-status error">
                <FaExclamationTriangle />
                <div>
                  <strong>Токен невалиден</strong>
                  <div className="oauth-scopes">Повторите авторизацию</div>
                </div>
              </div>
            ) : (
              <div className="oauth-auth-status muted">
                <div>Не авторизован</div>
              </div>
            )}
            
            {loading.broadcaster && (
              <div className="oauth-loading">Загрузка информации...</div>
            )}
            
            <div className="oauth-actions">
              {!broadcasterInfo ? (
                <button onClick={authorizeBroadcaster} className="oauth-auth-btn">
                  🔐 Авторизоваться
                </button>
              ) : (
                <>
                  <button onClick={() => refreshToken('broadcaster')} className="oauth-refresh-btn" disabled={refreshing.broadcaster}>
                    <FaSync className={refreshing.broadcaster ? 'spinning' : ''} />
                    Обновить токен
                  </button>
                  <button onClick={logoutBroadcaster} className="oauth-logout-btn">
                    <FaSignOutAlt /> Выйти
                  </button>
                </>
              )}
            </div>
            
            <div className="oauth-hint">
              💡 Необходимые права: подписки, фолловеры, награды за баллы
            </div>
          </div>
        </div>

        {/* Бот */}
        <div className="oauth-card">
          <div className="oauth-card-header">
            <h3>🤖 Бот</h3>
            <span className="oauth-badge bot">Аккаунт для чата</span>
          </div>
          
          <div className="oauth-card-content">
            {botInfo ? (
              <div className="oauth-auth-status success">
                <FaCheckCircle />
                <div>
                  <strong>{botInfo.login}</strong>
                  <div className="oauth-scopes">Прав: {botInfo.scopes?.length || 0}</div>
                </div>
              </div>
            ) : tokens.accessToken ? (
              <div className="oauth-auth-status error">
                <FaExclamationTriangle />
                <div>
                  <strong>Токен невалиден</strong>
                  <div className="oauth-scopes">Повторите авторизацию</div>
                </div>
              </div>
            ) : (
              <div className="oauth-auth-status muted">
                <div>Не авторизован</div>
              </div>
            )}
            
            {loading.bot && (
              <div className="oauth-loading">Загрузка информации...</div>
            )}
            
            <div className="oauth-actions">
              {!botInfo ? (
                <button onClick={authorizeBot} className="oauth-auth-btn">
                  🔐 Авторизоваться
                </button>
              ) : (
                <>
                  <button onClick={() => refreshToken('bot')} className="oauth-refresh-btn" disabled={refreshing.bot}>
                    <FaSync className={refreshing.bot ? 'spinning' : ''} />
                    Обновить токен
                  </button>
                  <button onClick={logoutBot} className="oauth-logout-btn">
                    <FaSignOutAlt /> Выйти
                  </button>
                </>
              )}
            </div>
            
            <div className="oauth-hint">
              💡 Необходимые права: чтение и отправка сообщений в чат, управление сообщениями
            </div>
          </div>
        </div>
      </div>

      <div className="oauth-info">
        <h4>📌 Важно</h4>
        <ul>
          <li>Авторизация происходит через официальное окно Twitch</li>
          <li>После авторизации обоих аккаунтов необходимо <strong>перезапустить сервер</strong></li>
          <li>Токены автоматически обновляются, но при длительном простое могут истечь</li>
          <li>Для работы наград за баллы требуется EventSub подключение (автоматически после авторизации стримера)</li>
        </ul>
      </div>
    </div>
  );
}

export default OAuthTab;