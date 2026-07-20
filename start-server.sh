#!/usr/bin/bash
# Запуск сервера Local Streamer Bot

# Проверяем, не запущен ли сервер уже
if pgrep -f "node.*index.js" > /dev/null; then
    echo "⚠️ Сервер уже запущен!"
    echo "Используйте stop.sh для остановки"
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

# Получаем путь к директории скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Создаем временный файл для вывода
TEMP_LOG=$(mktemp)

# Открываем Konsole с запуском сервера
konsole --new-tab --hold -e bash -c "
    echo '========================================'
    echo '   Запуск сервера Local Streamer Bot'
    echo '========================================'
    echo ''
    echo '🚀 Запускаем сервер на http://localhost:3001'
    echo '📺 Оверлей доступен по адресу: http://localhost:3001/overlay'
    echo '📋 Логи сервера:'
    echo ''
    cd '$SCRIPT_DIR/server'
    node index.js
    echo ''
    echo '⚠️ Сервер остановлен'
    read -p 'Нажмите Enter для закрытия окна...'
" 2>/dev/null

# Если Konsole не найден, пробуем другой терминал
if [ $? -ne 0 ]; then
    echo "⚠️ Konsole не найден, пробуем x-terminal-emulator..."
    x-terminal-emulator -e bash -c "
        echo '========================================'
        echo '   Запуск сервера Local Streamer Bot'
        echo '========================================'
        echo ''
        echo '🚀 Запускаем сервер на http://localhost:3001'
        echo '📺 Оверлей доступен по адресу: http://localhost:3001/overlay'
        echo '📋 Логи сервера:'
        echo ''
        cd '$SCRIPT_DIR/server'
        node index.js
        echo ''
        echo '⚠️ Сервер остановлен'
        read -p 'Нажмите Enter для закрытия окна...'
    "
fi
