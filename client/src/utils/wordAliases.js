// utils/wordAliases.js

const CHAR_MAP = {
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

export function generateAliases(word) {
  if (!word) return [];
  
  const original = word.toLowerCase();
  const aliases = new Set([original]);
  
  const chars = original.split('');
  
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
  
  function generateCombinations(current, position) {
    if (position === replaceablePositions.length) {
      aliases.add(current.join(''));
      return;
    }
    
    const pos = replaceablePositions[position];
    
    generateCombinations([...current], position + 1);
    
    for (const replacement of pos.replacements) {
      const newCurrent = [...current];
      newCurrent[pos.index] = replacement;
      generateCombinations(newCurrent, position + 1);
    }
  }
  
  generateCombinations([...chars], 0);
  
  return Array.from(aliases);
}

export function createBanWord(word, type) {
  const aliases = generateAliases(word);
  
  return {
    word: word.toLowerCase(),
    type,
    aliases,
    createdAt: new Date().toISOString()
  };
}

export { CHAR_MAP };