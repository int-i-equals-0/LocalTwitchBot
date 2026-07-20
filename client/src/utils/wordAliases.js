// utils/wordAliases.js - исправленный для ES6 модулей

// Словарь подмены символов (русский -> похожие латинские/цифры)
const CHAR_MAP = {
    // Русские буквы, похожие на английские
    'а': ['a'],
    'б': ['6'],
    'в': ['b'],
    'г': ['r'],
    'е': ['e'],
    'к': ['k'],
    'м': ['m'],
    'н': ['h'],
    'о': ['o'],
    'р': ['p'],
    'с': ['c'],
    'т': ['t'],
    'у': ['y'],
    'х': ['x'],
    'ь': ['b'],

    // Латинские -> русские (только визуально идентичные)
    'a': ['а'],
    'b': ['в', 'ь'],
    'c': ['с'],
    'e': ['е'],
    'h': ['н'],
    'k': ['к'],
    'm': ['м'],
    'o': ['о'],
    'p': ['р'],
    't': ['т'],
    'r': ['г'],
    'x': ['х'],
    'y': ['у']
};

// Генерируем все возможные комбинации замен
export function generateAliases(word) {
  if (!word) return [];
  
  const original = word.toLowerCase();
  const aliases = new Set([original]); // Set для автоматического удаления дубликатов
  
  // Разбиваем слово на символы
  const chars = original.split('');
  
  // Находим все позиции, где возможна замена
  const replaceablePositions = [];
  chars.forEach((char, index) => {
    if (CHAR_MAP[char]) {
      replaceablePositions.push({
        index,
        original: char,
        replacements: CHAR_MAP[char]
      });
    }
  });
  
  if (replaceablePositions.length === 0) {
    return Array.from(aliases);
  }
  
  // Генерируем все комбинации замен
  function generateCombinations(current, position) {
    if (position === replaceablePositions.length) {
      aliases.add(current.join(''));
      return;
    }
    
    const pos = replaceablePositions[position];
    
    // Вариант с оригинальным символом
    generateCombinations([...current], position + 1);
    
    // Варианты с заменами
    for (const replacement of pos.replacements) {
      const newCurrent = [...current];
      newCurrent[pos.index] = replacement;
      generateCombinations(newCurrent, position + 1);
    }
  }
  
  generateCombinations([...chars], 0);
  
  return Array.from(aliases);
}

// Функция для создания объекта банворда с алиасами
export function createBanWord(word, type) {
  const aliases = generateAliases(word);
  
  return {
    word: word.toLowerCase(),
    type,
    aliases,
    createdAt: new Date().toISOString()
  };
}

// Также можно экспортировать словарь, если нужно где-то ещё
export { CHAR_MAP };