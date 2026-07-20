import { useState } from 'react';
import { FaTrash, FaPlus, FaQuestionCircle, FaCopy, FaEye } from 'react-icons/fa';
import Tooltip from '../Tooltip';
import { useNotification, NOTIFICATION_TYPES } from '../Notification/Notification';
import { generateAliases } from '../../utils/wordAliases';
import './BanWordsTab.css';

function BanWordsTab({ words, onUpdate }) {
  const { showNotification, showConfirm } = useNotification();
  const [newWord, setNewWord] = useState('');
  const [newType, setNewType] = useState('hard');
  const [showAliases, setShowAliases] = useState({});

  const addWord = () => {
    if (!newWord.trim()) {
      showNotification('⚠️ Введите слово!', NOTIFICATION_TYPES.WARNING, 2000);
      return;
    }

    // Проверка на дубликаты
    const existingWord = words.find(w => w.word.toLowerCase() === newWord.trim().toLowerCase());
    if (existingWord) {
      showNotification('❌ Такое слово уже есть в списке!', NOTIFICATION_TYPES.ERROR, 3000);
      return;
    }

    // Генерируем алиасы для нового слова
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
    setShowAliases(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const copyAliases = (word, aliases) => {
    const text = `Варианты слова "${word}":\n${aliases.join(', ')}`;
    navigator.clipboard.writeText(text);
    showNotification(`📋 Алиасы для "${word}" скопированы`, NOTIFICATION_TYPES.SUCCESS, 2000);
  };

  const regenerateAliases = (index) => {
    const word = words[index];
    const newAliases = generateAliases(word.word);
    
    const updated = [...words];
    updated[index] = {
      ...word,
      aliases: newAliases
    };
    
    onUpdate(updated);
    showNotification(
      `🔄 Алиасы для "${word.word}" обновлены (${newAliases.length} вариантов)`,
      NOTIFICATION_TYPES.INFO,
      2000
    );
  };

  return (
    <div className="banwords-tab">
      <h2>🚫 Банворды с защитой от обхода</h2>

      <div className="info-box">
        <strong>ℹ️ Как это работает:</strong>
        <ul>
          <li>
            <span className="badge hard">🔴 Жёсткий контроль</span> - удаляет сообщение, если слово встречается 
            где угодно (даже как часть другого слова)
          </li>
          <li>
            <span className="badge soft">🟡 Мягкий контроль</span> - удаляет только если слово является отдельным словом
          </li>
          <li>
            <span className="badge alias">🛡️ Защита от обхода</span> - автоматически генерируются все возможные варианты 
            замены русских букв на похожие латинские и цифры
          </li>
        </ul>
        <div className="info-stats">
          <strong>📊 Статистика:</strong>
          <span>Всего слов: {words.length}</span>
          <span>Всего алиасов: {words.reduce((acc, w) => acc + (w.aliases?.length || 1), 0)}</span>
        </div>
      </div>

      {/* Список банвордов */}
      <div className="words-list">
        {words.length === 0 ? (
          <div className="empty-state">
            <p>🚫 Список банвордов пуст</p>
            <p className="empty-hint">Добавьте слова, которые нужно автоматически удалять из чата</p>
          </div>
        ) : (
          words.map((item, index) => (
            <div key={index} className="word-item-container">
              <div className="word-item">
                <span className="word-text">{item.word}</span>
                <select
                  value={item.type}
                  onChange={(e) => updateWordType(index, e.target.value)}
                  className={`word-type ${item.type}`}
                >
                  <option value="hard">🔴 Жёсткий</option>
                  <option value="soft">🟡 Мягкий</option>
                </select>
                
                <div className="word-actions">
                  <button 
                    onClick={() => toggleAliases(index)}
                    className="show-aliases-btn"
                    title="Показать алиасы"
                  >
                    <FaEye /> {showAliases[index] ? 'Скрыть' : `${item.aliases?.length || 0} вар.`}
                  </button>
                  
                  {item.aliases && (
                    <button 
                      onClick={() => copyAliases(item.word, item.aliases)}
                      className="copy-aliases-btn"
                      title="Копировать алиасы"
                    >
                      <FaCopy />
                    </button>
                  )}
                  
                  <button 
                    onClick={() => regenerateAliases(index)}
                    className="regenerate-aliases-btn"
                    title="Перегенерировать алиасы"
                  >
                    🔄
                  </button>
                  
                  <button 
                    onClick={() => removeWord(index, item.word)} 
                    className="remove-word"
                    title="Удалить слово"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              
              {/* Раскрывающийся список алиасов */}
              {showAliases[index] && item.aliases && (
                <div className="aliases-list">
                  <strong>Варианты написания:</strong>
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

      {/* Форма добавления */}
      <div className="add-word-form">
        <h3>➕ Добавить слово с защитой</h3>
        <div className="form-row">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="например, спам"
            onKeyPress={(e) => e.key === 'Enter' && addWord()}
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