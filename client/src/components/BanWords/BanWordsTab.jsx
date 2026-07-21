// client/src/components/BanWords/BanWordsTab.jsx

import { useState } from 'react';
import { FaTrash, FaPlus, FaEye, FaEyeSlash, FaCopy } from 'react-icons/fa';
import { useNotification, NOTIFICATION_TYPES } from '../Notification';
import './BanWordsTab.css';

function generateAliases(word) {
  if (!word) return [];
  const CHAR_MAP = {
    'а': ['a'], 'б': ['6'], 'в': ['b'], 'г': ['r'], 'е': ['e'],
    'к': ['k'], 'м': ['m'], 'н': ['h'], 'о': ['o'], 'р': ['p'],
    'с': ['c'], 'т': ['t'], 'у': ['y'], 'х': ['x'], 'ь': ['b'],
    'a': ['а'], 'b': ['в', 'ь'], 'c': ['с'], 'e': ['е'], 'h': ['н'],
    'k': ['к'], 'm': ['м'], 'o': ['о'], 'p': ['р'], 't': ['т'],
    'r': ['г'], 'x': ['х'], 'y': ['у']
  };
  const original = word.toLowerCase();
  const aliases = new Set([original]);
  const chars = original.split('');
  const positions = [];
  chars.forEach((char, i) => {
    if (CHAR_MAP[char]) positions.push({ index: i, replacements: CHAR_MAP[char] });
  });
  if (positions.length === 0) return Array.from(aliases);
  function gen(current, pos) {
    if (pos === positions.length) { aliases.add(current.join('')); return; }
    const p = positions[pos];
    gen([...current], pos + 1);
    for (const r of p.replacements) {
      const n = [...current];
      n[p.index] = r;
      gen(n, pos + 1);
    }
  }
  gen([...chars], 0);
  return Array.from(aliases);
}

function BanWordsTab({ words, onUpdate }) {
  const { showNotification, showConfirm } = useNotification();
  const [newWord, setNewWord] = useState('');
  const [newType, setNewType] = useState('hard');
  const [expandedAliases, setExpandedAliases] = useState({});

  const addWord = () => {
    if (!newWord.trim()) {
      showNotification('⚠️ Введите слово!', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    const existingWord = words.find(w => w.word.toLowerCase() === newWord.trim().toLowerCase());
    if (existingWord) {
      showNotification('❌ Такое слово уже есть в списке!', NOTIFICATION_TYPES.ERROR, 3000);
      return;
    }

    const aliases = generateAliases(newWord.trim());

    const updated = [...words, {
      word: newWord.trim().toLowerCase(),
      type: newType,
      aliases: aliases
    }];

    onUpdate(updated);
    setNewWord('');

    showNotification(
      `✅ Слово "${newWord}" добавлено!\nСгенерировано ${aliases.length} вариантов`,
      NOTIFICATION_TYPES.SUCCESS,
      3000
    );
  };

  const removeWord = (index, word) => {
    showConfirm(
      `Вы действительно хотите удалить слово "${word}" из списка банвордов?`,
      () => {
        const updated = words.filter((_, i) => i !== index);
        onUpdate(updated);
        showNotification(`🗑️ Слово "${word}" удалено`, NOTIFICATION_TYPES.WARNING, 2000);
      }
    );
  };

  const updateWordType = (index, type) => {
    const updated = [...words];
    updated[index].type = type;
    onUpdate(updated);
    showNotification(
      `🔄 Тип контроля изменён на ${type === 'hard' ? 'жёсткий' : 'мягкий'}`,
      NOTIFICATION_TYPES.INFO,
      1500
    );
  };

  const toggleAliases = (index) => {
    setExpandedAliases(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const copyAliases = (word, aliases) => {
    const text = `Варианты слова "${word}":\n${aliases.join(', ')}`;
    navigator.clipboard.writeText(text);
    showNotification(`📋 Алиасы для "${word}" скопированы`, NOTIFICATION_TYPES.SUCCESS, 2000);
  };

  const regenerateAliases = (index) => {
    const wordItem = words[index];
    const newAliases = generateAliases(wordItem.word);

    const updated = [...words];
    updated[index] = { ...wordItem, aliases: newAliases };

    onUpdate(updated);
    showNotification(
      `🔄 Алиасы для "${wordItem.word}" обновлены (${newAliases.length} вариантов)`,
      NOTIFICATION_TYPES.INFO,
      2000
    );
  };

  const totalAliases = words.reduce((acc, w) => acc + (w.aliases?.length || 1), 0);

  return (
    <div className="banwords-tab">
      <div className="banwords-header">
        <h2>🚫 Банворды с защитой от обхода</h2>
        <p className="banwords-description">
          Автоматическое удаление сообщений с запрещёнными словами.
          Система генерирует варианты с подменой букв (а→a, е→e, б→6 и т.д.)
        </p>
      </div>

      <div className="info-stats">
        <div className="stat-card">
          <span className="stat-value">{words.length}</span>
          <span className="stat-label">Слов в списке</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{totalAliases}</span>
          <span className="stat-label">Вариантов написания</span>
        </div>
      </div>

      <div className="rules-info">
        <div className="rule-item">
          <span className="badge hard">🔴 Жёсткий контроль</span>
          <span>Удаляет сообщение, если слово встречается где угодно (даже как часть другого слова)</span>
        </div>
        <div className="rule-item">
          <span className="badge soft">🟡 Мягкий контроль</span>
          <span>Удаляет только если слово является отдельным словом</span>
        </div>
        <div className="rule-item">
          <span className="badge alias">🛡️ Защита от обхода</span>
          <span>Автоматически генерируются все возможные варианты замены русских букв на похожие латинские и цифры</span>
        </div>
      </div>

      <div className="words-list">
        {words.length === 0 ? (
          <div className="empty-words">
            <p>🚫 Список банвордов пуст</p>
            <p className="hint">Добавьте слова, которые нужно автоматически удалять из чата</p>
          </div>
        ) : (
          words.map((item, index) => (
            <div key={index} className="word-card">
              <div className="word-card-header">
                <div className="word-info">
                  <span className="word-text">{item.word}</span>
                  <select
                    value={item.type}
                    onChange={(e) => updateWordType(index, e.target.value)}
                    className={`word-type-select ${item.type}`}
                  >
                    <option value="hard">🔴 Жёсткий</option>
                    <option value="soft">🟡 Мягкий</option>
                  </select>
                  <span className="aliases-count">{item.aliases?.length || 0} вариантов</span>
                </div>
                <div className="word-actions">
                  <button onClick={() => toggleAliases(index)} className="show-aliases-btn" title={expandedAliases[index] ? "Скрыть варианты" : "Показать варианты"}>
                    {expandedAliases[index] ? <FaEyeSlash /> : <FaEye />}
                    <span>{expandedAliases[index] ? 'Скрыть' : `${item.aliases?.length || 0}`}</span>
                  </button>
                  {item.aliases && item.aliases.length > 0 && (
                    <button onClick={() => copyAliases(item.word, item.aliases)} className="copy-aliases-btn" title="Копировать варианты">
                      <FaCopy />
                    </button>
                  )}
                  <button onClick={() => regenerateAliases(index)} className="regenerate-aliases-btn" title="Перегенерировать варианты">
                    🔄
                  </button>
                  <button onClick={() => removeWord(index, item.word)} className="remove-word-btn" title="Удалить слово">
                    <FaTrash />
                  </button>
                </div>
              </div>

              {expandedAliases[index] && item.aliases && (
                <div className="aliases-list">
                  <div className="aliases-header">
                    <strong>Варианты написания для "{item.word}":</strong>
                  </div>
                  <div className="aliases-grid">
                    {item.aliases.map((alias, i) => (
                      <span key={i} className="alias-item">{alias}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="add-word-form">
        <h3>➕ Добавить слово с защитой</h3>
        <div className="form-row">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="например, спам"
            onKeyDown={(e) => e.key === 'Enter' && addWord()}
          />
          <select value={newType} onChange={(e) => setNewType(e.target.value)}>
            <option value="hard">🔴 Жёсткий контроль</option>
            <option value="soft">🟡 Мягкий контроль</option>
          </select>
          <button onClick={addWord} className="add-word-btn">
            <FaPlus /> Добавить
          </button>
        </div>
        <div className="form-hint">
          ⚡️ Автоматически сгенерируются варианты с подменой букв:
          а→a, е→e, б→6, р→p, с→c, и многие другие
        </div>
      </div>
    </div>
  );
}

export default BanWordsTab;