// client/src/components/OAuth/OAuthTab.jsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { FaSignOutAlt, FaCheckCircle, FaExclamationTriangle, FaSync, FaCopy } from 'react-icons/fa';
import Tooltip from '../Tooltip';
import { useNotification, NOTIFICATION_TYPES } from '../Notification';
import './OAuthTab.css';

function OAuthTab({ tokens, onUpdate, onAutoSave }) {
  const { showNotification, showConfirm } = useNotification();
  const [broadcasterInfo, setBroadcasterInfo] = useState(null);
  const [botInfo, setBotInfo] = useState(null);
  const [loading, setLoading] = useState({ broadcaster: false, bot: false });
  const [refreshing, setRefreshing] = useState({ broadcaster: false, bot: false });
  const [copying, setCopying] = useState({ broadcaster: false, bot: false });
  const [initialLoadComplete, setInitialLoadComplete] = useState({ broadcaster: false, bot: false });
  
  const isFirstRender = useRef(true);
  const hasShownNotification = useRef({ broadcaster: false, bot: false });

  const fetchUserInfo = useCallback(async (type, token, isInitial = false) => {
    if (!token) {
      if (type === 'broadcaster') {
        setBroadcasterInfo(null);
        setInitialLoadComplete(prev => ({ ...prev, broadcaster: true }));
      } else {
        setBotInfo(null);
        setInitialLoadComplete(prev => ({ ...prev, bot: true }));
      }
      return;
    }
    
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
            const updated = { ...tokens, channelName: userInfo.login };
            onUpdate(updated);
            if (onAutoSave) onAutoSave(updated);
          }
        } else {
          setBotInfo(userInfo);
          if (userInfo.login !== tokens.botUsername) {
            const updated = { ...tokens, botUsername: userInfo.login };
            onUpdate(updated);
            if (onAutoSave) onAutoSave(updated);
          }
        }
        
        if (!isInitial && !hasShownNotification.current[type]) {
          showNotification(
            `✅ ${type === 'broadcaster' ? 'Стример' : 'Бот'} авторизован: ${userInfo.login}`,
            NOTIFICATION_TYPES.SUCCESS,
            3000
          );
          hasShownNotification.current[type] = true;
        }
      } else {
        if (type === 'broadcaster') setBroadcasterInfo(null);
        else setBotInfo(null);
        
        if (!isInitial && !hasShownNotification.current[type]) {
          showNotification(
            `⚠️ Токен ${type === 'broadcaster' ? 'стримера' : 'бота'} невалиден, требуется повторная авторизация`,
            NOTIFICATION_TYPES.WARNING,
            5000
          );
          hasShownNotification.current[type] = true;
        }
      }
    } catch (error) {
      console.error(`Ошибка получения информации о ${type}:`, error);
      if (type === 'broadcaster') setBroadcasterInfo(null);
      else setBotInfo(null);
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
      setInitialLoadComplete(prev => ({ ...prev, [type]: true }));
    }
  }, [tokens, onUpdate, onAutoSave, showNotification]);

  useEffect(() => {
    if (tokens.broadcasterAccessToken) {
      fetchUserInfo('broadcaster', tokens.broadcasterAccessToken, isFirstRender.current);
    } else {
      setBroadcasterInfo(null);
      setInitialLoadComplete(prev => ({ ...prev, broadcaster: true }));
    }
    
    if (tokens.accessToken) {
      fetchUserInfo('bot', tokens.accessToken, isFirstRender.current);
    } else {
      setBotInfo(null);
      setInitialLoadComplete(prev => ({ ...prev, bot: true }));
    }
    
    if (isFirstRender.current) {
      setTimeout(() => {
        isFirstRender.current = false;
      }, 500);
    }
  }, [tokens.broadcasterAccessToken, tokens.accessToken, fetchUserInfo]);

  useEffect(() => {
    hasShownNotification.current = { broadcaster: false, bot: false };
  }, [tokens.broadcasterAccessToken, tokens.accessToken]);

  const getAuthUrl = async (type) => {
    const endpoint = type === 'broadcaster'
      ? 'http://127.0.0.1:3001/api/auth/twitch/broadcaster'
      : 'http://127.0.0.1:3001/api/auth/twitch/bot';

    const response = await fetch(endpoint);
    const data = await response.json();

    if (!data.url) {
      throw new Error('Не удалось получить URL авторизации');
    }

    return data.url;
  };

  const authorizeAccount = async (type) => {
    const typeName = type === 'broadcaster' ? 'стримера' : 'бота';

    showNotification(
      `🔐 Открывается окно авторизации ${typeName}...`,
      NOTIFICATION_TYPES.INFO,
      2000
    );

    try {
      const url = await getAuthUrl(type);
      const authWindow = window.open(url, 'twitch-auth', 'width=800,height=600');

      if (!authWindow) {
        showNotification(
          '❌ Браузер заблокировал всплывающее окно. Разрешите всплывающие окна для этого сайта.',
          NOTIFICATION_TYPES.ERROR,
          5000
        );
        return;
      }

      showNotification(
        '🔄 Ожидайте завершения авторизации в открывшемся окне...',
        NOTIFICATION_TYPES.INFO,
        3000
      );

      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          showNotification(
            '🔄 Авторизация завершена, обновление данных...',
            NOTIFICATION_TYPES.INFO,
            2000
          );
          window.location.reload();
        }
      }, 500);
    } catch (error) {
      console.error('Ошибка:', error);
      showNotification(
        '❌ Ошибка при открытии окна авторизации. Проверьте подключение к серверу.',
        NOTIFICATION_TYPES.ERROR,
        5000
      );
    }
  };

  const copyAuthLink = async (type) => {
    const typeName = type === 'broadcaster' ? 'стримера' : 'бота';
    setCopying(prev => ({ ...prev, [type]: true }));

    try {
      const url = await getAuthUrl(type);

      await navigator.clipboard.writeText(url);
      showNotification(
        `📋 Ссылка авторизации ${typeName} скопирована! Вставьте её в нужный браузер.`,
        NOTIFICATION_TYPES.SUCCESS,
        4000
      );
    } catch (error) {
      console.error('Ошибка копирования:', error);
      showNotification(
        `❌ Не удалось скопировать ссылку. Проверьте подключение к серверу.`,
        NOTIFICATION_TYPES.ERROR,
        4000
      );
    } finally {
      setCopying(prev => ({ ...prev, [type]: false }));
    }
  };

  const refreshToken = async (type) => {
    const typeName = type === 'broadcaster' ? 'стримера' : 'бота';
    setRefreshing(prev => ({ ...prev, [type]: true }));
    
    showNotification(
      `🔄 Обновление токена ${typeName}...`,
      NOTIFICATION_TYPES.INFO,
      1500
    );
    
    try {
      const response = await fetch(`http://127.0.0.1:3001/api/auth/refresh/${type}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        showNotification(
          `✅ Токен ${typeName} успешно обновлён. Страница будет перезагружена.`,
          NOTIFICATION_TYPES.SUCCESS,
          2000
        );
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showNotification(
          `❌ Ошибка обновления токена ${typeName}: ${data.error || 'неизвестная ошибка'}`,
          NOTIFICATION_TYPES.ERROR,
          4000
        );
      }
    } catch (error) {
      console.error('Ошибка обновления токена:', error);
      showNotification(
        `❌ Ошибка подключения к серверу при обновлении токена ${typeName}`,
        NOTIFICATION_TYPES.ERROR,
        4000
      );
    } finally {
      setRefreshing(prev => ({ ...prev, [type]: false }));
    }
  };

  const logoutAccount = async (type) => {
    const typeName = type === 'broadcaster' ? 'стримера' : 'бота';
    const warningText = type === 'broadcaster'
      ? 'Вы действительно хотите удалить авторизацию стримера?\n\nБот потеряет доступ к событиям (подписки, фолловеры, награды) до повторной авторизации.'
      : 'Вы действительно хотите удалить авторизацию бота?\n\nБот перестанет отвечать в чате до повторной авторизации.';

    showConfirm(warningText, async () => {
      showNotification(`🗑️ Удаление авторизации ${typeName}...`, NOTIFICATION_TYPES.INFO, 1000);

      try {
        const response = await fetch(`http://127.0.0.1:3001/api/auth/logout/${type}`, {
          method: 'POST'
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Неизвестная ошибка сервера');
        }

        const updated = { ...tokens };
        if (type === 'broadcaster') {
          delete updated.broadcasterAccessToken;
          delete updated.broadcasterRefreshToken;
          delete updated.channelName;
          setBroadcasterInfo(null);
        } else {
          delete updated.accessToken;
          delete updated.refreshToken;
          delete updated.botUsername;
          setBotInfo(null);
        }

        onUpdate(updated);

        showNotification(
          `✅ Авторизация ${typeName} удалена. Страница будет перезагружена.`,
          NOTIFICATION_TYPES.SUCCESS,
          3000
        );

        setTimeout(() => window.location.reload(), 1500);

      } catch (error) {
        console.error('Ошибка выхода:', error);
        showNotification(
          `❌ Ошибка при удалении авторизации ${typeName}: ${error.message}`,
          NOTIFICATION_TYPES.ERROR,
          5000
        );
      }
    });
  };

  const getScopesDescription = (scopes) => {
    if (!scopes) return 'нет';
    const scopeMap = {
      'channel:manage:redemptions': '🎁 награды',
      'channel:read:redemptions': '👀 просмотр наград',
      'chat:read': '📖 чтение чата',
      'chat:edit': '✏️ отправка сообщений',
      'moderator:manage:shoutouts': '📢 шауты',
      'channel:manage:moderators': '🛡️ модерация',
      'moderator:read:followers': '👥 фолловеры',
      'channel:read:subscriptions': '📺 подписки',
    };
    
    const found = scopes
      .map(s => scopeMap[s])
      .filter(Boolean);
    
    return found.length > 0 ? found.join(', ') : `${scopes.length} прав`;
  };

  const renderAuthStatus = (type, info, hasToken, loadingComplete) => {
    if (loading[type] && !info) {
      return (
        <div className="oauth-auth-status loading">
          <div className="loading-spinner" />
          <div>
            <strong>Проверка авторизации...</strong>
            <div className="oauth-scopes">Загрузка информации</div>
          </div>
        </div>
      );
    }
    
    if (info) {
      return (
        <div className="oauth-auth-status success">
          <FaCheckCircle />
          <div>
            <strong>{info.login}</strong>
            <div className="oauth-scopes">
              Прав: {info.scopes?.length || 0}
              {info.scopes?.length > 0 && (
                <Tooltip text={getScopesDescription(info.scopes)} />
              )}
            </div>
          </div>
        </div>
      );
    }
    
    if (hasToken && loadingComplete) {
      return (
        <div className="oauth-auth-status error">
          <FaExclamationTriangle />
          <div>
            <strong>Токен невалиден</strong>
            <div className="oauth-scopes">Повторите авторизацию</div>
          </div>
        </div>
      );
    }
    
    if (!hasToken && loadingComplete) {
      return (
        <div className="oauth-auth-status muted">
          <div>Не авторизован</div>
        </div>
      );
    }
    
    return (
      <div className="oauth-auth-status muted">
        <div>Проверка...</div>
      </div>
    );
  };

  const renderActions = (type, info) => {
    const loadingComplete = initialLoadComplete[type];

    if (!info && loadingComplete) {
      return (
        <div className="oauth-actions">
          <button onClick={() => authorizeAccount(type)} className="oauth-auth-btn">
            🔐 Авторизоваться
          </button>
          <button
            onClick={() => copyAuthLink(type)}
            className="oauth-copy-btn"
            disabled={copying[type]}
            title="Скопировать ссылку авторизации для другого браузера"
          >
            <FaCopy className={copying[type] ? 'spinning' : ''} />
            {copying[type] ? 'Копирование...' : 'Скопировать ссылку'}
          </button>
        </div>
      );
    }

    if (info) {
      return (
        <div className="oauth-actions">
          <button 
            onClick={() => refreshToken(type)} 
            className="oauth-refresh-btn" 
            disabled={refreshing[type]}
            title="Обновить токен, если он скоро истечёт"
          >
            <FaSync className={refreshing[type] ? 'spinning' : ''} />
            Обновить токен
          </button>
          <button 
            onClick={() => logoutAccount(type)} 
            className="oauth-logout-btn"
            title="Удалить авторизацию"
          >
            <FaSignOutAlt /> Выйти
          </button>
        </div>
      );
    }

    return null;
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
        <div className="oauth-card">
          <div className="oauth-card-header">
            <h3>🎥 Стример</h3>
            <span className="oauth-badge broadcaster">Основной аккаунт</span>
          </div>
          
          <div className="oauth-card-content">
            {renderAuthStatus(
              'broadcaster',
              broadcasterInfo,
              !!tokens.broadcasterAccessToken,
              initialLoadComplete.broadcaster
            )}
            
            {renderActions('broadcaster', broadcasterInfo)}
            
            <div className="oauth-hint">
              💡 Необходимые права: подписки, фолловеры, награды за баллы
            </div>
          </div>
        </div>

        <div className="oauth-card">
          <div className="oauth-card-header">
            <h3>🤖 Бот</h3>
            <span className="oauth-badge bot">Аккаунт для чата</span>
          </div>
          
          <div className="oauth-card-content">
            {renderAuthStatus(
              'bot',
              botInfo,
              !!tokens.accessToken,
              initialLoadComplete.bot
            )}
            
            {renderActions('bot', botInfo)}
            
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
          <li>Если бот и стример — разные аккаунты в разных браузерах, используйте кнопку «Скопировать ссылку»</li>
          <li>После авторизации обоих аккаунтов необходимо <strong>перезапустить сервер</strong></li>
          <li>Токены автоматически обновляются, но при длительном простое могут истечь</li>
          <li>Для работы наград за баллы требуется EventSub подключение (автоматически после авторизации стримера)</li>
          <li>При проблемах с авторизацией проверьте, что всплывающие окна не блокируются браузером</li>
        </ul>
      </div>
    </div>
  );
}

export default OAuthTab;