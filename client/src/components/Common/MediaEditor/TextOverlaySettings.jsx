// client/src/components/Common/MediaEditor/TextOverlaySettings.jsx

import { useState } from 'react';
import Tooltip from '../../Tooltip';
import { useNotification, NOTIFICATION_TYPES } from '../../Notification';
import { FONT_FAMILIES, TEXT_ANIMATIONS } from './utils';
import './MediaEditor.css';

function TextOverlaySettings({ text = {}, onChange }) {
  const { showNotification } = useNotification();
  const [fontSelectionMode, setFontSelectionMode] = useState('preset');

  const enabled = text.enabled || false;
  const font = text.font || {};
  const textAnimation = text.animation || 'none';
  const amplitude = text.animationAmplitude || 1;

  const update = (updates) => {
    onChange({ ...text, ...updates });
  };

  const updateFont = (updates) => {
    update({ font: { ...font, ...updates } });
  };

  const toggleEnabled = (checked) => {
    update({ enabled: checked });
    showNotification(
      checked ? '📝 Текст включён' : '📝 Текст выключен',
      NOTIFICATION_TYPES.INFO,
      1000,
    );
  };

  return (
    <div className="media-text-section">
      <div className="section-header">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => toggleEnabled(e.target.checked)}
            className="toggle-checkbox"
          />
          <span className="toggle-text">📝 Показывать текст на оверлее</span>
          <Tooltip text="Добавить текст поверх медиа или рядом с ним. Можно использовать переменную {user}." />
        </label>
      </div>

      {enabled && (
        <div className="text-settings">
          <div className="text-vars-block">
            <div className="text-vars-label">
              <span>📌 Доступные переменные:</span>
            </div>
            <div className="text-vars-badges">
              <code className="text-var-badge">{'{user}'}</code>
              <span className="text-var-note">— имя пользователя</span>
            </div>
          </div>

          <div className="text-input-group">
            <label>Текст</label>
            <textarea
              value={text.content || ''}
              onChange={(e) => update({ content: e.target.value })}
              placeholder="Текст для отображения... Используйте {user} для имени пользователя"
              rows="3"
              className="text-content-input"
            />
          </div>

          <div className="position-selector">
            <label>Позиция текста</label>
            <div className="position-buttons">
              {['above', 'below', 'left', 'right', 'overlay'].map((pos) => (
                <button
                  key={pos}
                  type="button"
                  className={`position-btn ${text.position === pos ? 'active' : ''}`}
                  onClick={() => update({ position: pos })}
                >
                  {pos === 'above' && '⬆️ Сверху'}
                  {pos === 'below' && '⬇️ Снизу'}
                  {pos === 'left' && '⬅️ Слева'}
                  {pos === 'right' && '➡️ Справа'}
                  {pos === 'overlay' && '🎯 Поверх'}
                </button>
              ))}
            </div>
          </div>

          <div className="text-animation-selector">
            <label>🎭 Анимация текста</label>
            <div className="animation-select-row">
              <select
                value={textAnimation}
                onChange={(e) => update({ animation: e.target.value })}
                className="animation-select"
              >
                {TEXT_ANIMATIONS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
              {textAnimation !== 'none' && (
                <div className="amplitude-control">
                  <label>Сила анимации</label>
                  <input
                    type="range"
                    min="0.3"
                    max="2"
                    step="0.1"
                    value={amplitude}
                    onChange={(e) => update({ animationAmplitude: parseFloat(e.target.value) })}
                    className="amplitude-slider"
                  />
                  <span className="amplitude-value">{amplitude.toFixed(1)}x</span>
                </div>
              )}
            </div>
          </div>

          <div className="font-settings">
            <h4>🔤 Настройки шрифта</h4>
            <div className="font-settings-grid">
              <div className="font-setting-item">
                <label>Режим выбора шрифта</label>
                <div className="font-mode-buttons">
                  <button
                    type="button"
                    className={`font-mode-btn ${fontSelectionMode === 'preset' ? 'active' : ''}`}
                    onClick={() => {
                      setFontSelectionMode('preset');
                      updateFont({ fontFamily: "'Segoe UI', sans-serif" });
                    }}
                  >
                    📋 Из списка
                  </button>
                  <button
                    type="button"
                    className={`font-mode-btn ${fontSelectionMode === 'custom' ? 'active' : ''}`}
                    onClick={() => setFontSelectionMode('custom')}
                  >
                    ✏️ Свой шрифт
                  </button>
                </div>
              </div>

              {fontSelectionMode === 'preset' ? (
                <div className="font-setting-item">
                  <label>Семейство</label>
                  <select
                    value={font.fontFamily || "'Segoe UI', sans-serif"}
                    onChange={(e) => updateFont({ fontFamily: e.target.value })}
                    className="font-select"
                  >
                    {FONT_FAMILIES.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="font-setting-item">
                  <label>Название шрифта</label>
                  <input
                    type="text"
                    value={font.fontFamily?.replace(/'/g, '').replace(', sans-serif', '') || ''}
                    onChange={(e) => updateFont({ fontFamily: `'${e.target.value}', sans-serif` })}
                    placeholder="например: Roboto, Montserrat"
                    className="custom-font-input"
                  />
                </div>
              )}

              <div className="font-setting-item">
                <label>Размер: {font.fontSize || 32}px</label>
                <input
                  type="range"
                  min="12"
                  max="120"
                  value={font.fontSize || 32}
                  onChange={(e) => updateFont({ fontSize: parseInt(e.target.value) })}
                />
              </div>

              <div className="font-setting-item">
                <label>Цвет текста</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={font.color || '#ffffff'}
                    onChange={(e) => updateFont({ color: e.target.value })}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={font.color || '#ffffff'}
                    onChange={(e) => updateFont({ color: e.target.value })}
                    className="color-text-input"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TextOverlaySettings;