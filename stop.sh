#!/usr/bin/bash
# Остановка Local Streamer Bot

echo "========================================"
echo "   Остановка Local Streamer Bot"
echo "========================================"
echo ""

echo "🔍 Ищем процессы Node.js..."
NODE_PIDS=$(pgrep -f "node.*index.js|vite")

if [ -n "$NODE_PIDS" ]; then
    echo "Найдены процессы: $NODE_PIDS"
    kill $NODE_PIDS 2>/dev/null
    sleep 1

    # Проверяем, остались ли процессы
    STILL_RUNNING=$(pgrep -f "node.*index.js|vite")
    if [ -n "$STILL_RUNNING" ]; then
        echo "⚠️ Процессы не остановились, пробуем принудительно..."
        kill -9 $STILL_RUNNING 2>/dev/null
    fi

    echo "✅ Все процессы Node.js остановлены"
else
    echo "ℹ️ Процессы Node.js не найдены"
fi

echo ""
echo "========================================"
echo "✅ Готово"
echo "========================================"
sleep 2
