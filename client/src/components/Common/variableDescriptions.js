// client/src/components/Common/variableDescriptions.js

export const VARIABLE_DESCRIPTIONS = {
  user: 'Пользователь, который вызвал команду, событие или награду.',
  username: 'Имя пользователя, связанного с действием.',
  target: 'Первый аргумент после команды. Если аргумент не указан, бот может выбрать случайного зрителя.',
  message: 'Текст сообщения или текст, введённый пользователем при активации награды.',
  tier: 'Уровень платной подписки: Tier 1, Tier 2 или Tier 3.',
  tierRaw: 'Исходный Twitch-код уровня подписки: 1000, 2000 или 3000.',
  isGift: 'Показывает, была ли подписка подарочной: true или false.',
  months: 'Общее количество месяцев подписки пользователя.',
  streakMonths: 'Количество месяцев подряд в текущей серии подписки.',
  total: 'Количество подаренных подписок.',
  isAnonymous: 'Показывает, было ли действие анонимным: true или false.',
  bits: 'Количество Bits, отправленных пользователем.',
  viewers: 'Количество зрителей во входящем рейде.',
  fromUserId: 'Twitch ID пользователя, который совершил рейд.',
  userId: 'Twitch ID пользователя, связанного с событием.',
  streakCount: 'Количество стримов подряд, которые зритель посмотрел в watch streak.',
  channelPointsAwarded: 'Количество channel points, начисленных Twitch за watch streak.',
  systemMessage: 'Системный текст Twitch-уведомления о событии.',
};

export function getVariableDescription(name, fallback) {
  const normalized = String(name || '').replace(/[{}]/g, '');
  return fallback || VARIABLE_DESCRIPTIONS[normalized] || `Переменная {${normalized}}.`;
}
