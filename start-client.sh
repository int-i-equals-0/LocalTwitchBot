#!/usr/bin/bash
# Запуск клиента Local Streamer Bot

# Получаем путь к директории скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Проверяем доступность сервера
echo "🔍 Проверка доступности сервера (порт 3001)..."

SERVER_FOUND=0
for i in {1..5}; do
    if curl -s http://127.0.0.1:3001/api/health > /dev/null 2>&1; then
        SERVER_FOUND=1
        echo "✅ Сервер найден на 127.0.0.1:3001"
        break
    fi
    sleep 1
    echo -n "."
done

if [ $SERVER_FOUND -eq 0 ]; then
    echo ""
    echo "   ⚠️ ВНИМАНИЕ: Сервер на порту 3001 не найден!"
    echo "   ----------------------------------------"
    echo "   Убедитесь, что сервер запущен:"
    echo "   - Запустите ./start-server.sh в отдельном окне"
    echo "   ----------------------------------------"
    echo ""
    echo "   Хотите продолжить запуск клиента?"
    echo "   1. Да, продолжить (сервер не нужен)"
    echo "   2. Нет, выйти и проверить сервер"
    echo ""
    read -p "👉 Выберите действие (1/2): " choice

    if [ "$choice" != "1" ]; then
        echo ""
        echo "❌ Выход из программы..."
        echo "   Запустите сначала сервер, затем снова клиент."
        read -p "Нажмите Enter для выхода..."
        exit 0
    fi

    echo ""
    echo "⏩ Продолжаем запуск клиента в автономном режиме..."
    echo "   Некоторые функции могут быть недоступны без сервера."
fi

echo ""
echo "🌐 Открываем клиент в браузере..."
sleep 1

# Открываем браузер
if command -v xdg-open &> /dev/null; then
    xdg-open http://127.0.0.1:3000 2>/dev/null
elif command -v sensible-browser &> /dev/null; then
    sensible-browser http://127.0.0.1:3000
else
    echo "⚠️ Не удалось открыть браузер автоматически"
    echo "   Откройте вручную: http://127.0.0.1:3000"
fi

# Путь к npm (исправьте на ваш)
NPM_PATH="$HOME/.nvm/versions/node/v22.18.0/bin/npm"

# Открываем Konsole с запуском клиента
konsole --new-tab --hold -e bash -c "
    # Загружаем профиль для доступа к npm
    if [ -f ~/.bashrc ]; then
        source ~/.bashrc
    fi

    # Если npm всё ещё не найден, используем полный путь
    if ! command -v npm &> /dev/null; then
        export PATH=\"$HOME/.nvm/versions/node/v22.18.0/bin:\$PATH\"
    fi

    echo '========================================'
    echo '   Запуск клиента Local Streamer Bot'
    echo '========================================'
    echo ''
    echo '🚀 Запускаем клиент на http://127.0.0.1:3000'
    echo ''
    echo 'ТЕКУЩИЙ СТАТУС:'
    echo '------------------------------------'
    if [ $SERVER_FOUND -eq 1 ]; then
        echo '📡 Сервер:    ✅ ДОСТУПЕН'
    else
        echo '📡 Сервер:    ❌ НЕ ДОСТУПЕН'
    fi
    echo '💻 Клиент:    http://127.0.0.1:3000'
    echo '------------------------------------'
    if [ $SERVER_FOUND -eq 0 ]; then
        echo '⚠️ Режим: Автономный (ограниченная функциональность)'
    else
        echo '⚠️ Режим: Полный (сервер подключен)'
    fi
    echo '========================================'
    echo ''

    # Переходим в директорию клиента
    cd '$SCRIPT_DIR/client'

    # Запускаем npm
    echo \"Используется npm: \$(which npm)\"
    echo \"Используется node: \$(which node)\"
    echo ''

    npm run dev -- --host 127.0.0.1

    echo ''
    echo '⚠️ Клиент остановлен'
    read -p 'Нажмите Enter для закрытия окна...'
" 2>/dev/null

# Если Konsole не найден
if [ $? -ne 0 ]; then
    echo "⚠️ Konsole не найден, запускаем в фоне..."
    cd "$SCRIPT_DIR/client"

    # Загружаем окружение
    if [ -f ~/.bashrc ]; then
        source ~/.bashrc
    fi

    npm run dev -- --host 127.0.0.1 &
    echo "Клиент запущен в фоне (PID: $!)"
    echo "Для остановки используйте: ./stop.sh"
    echo ""
    read -p "Нажмите Enter для выхода..."
fi
