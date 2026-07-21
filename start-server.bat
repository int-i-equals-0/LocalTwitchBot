@echo off
chcp 65001 > nul
title Local Twitch Bot - Сервер
echo ========================================
echo    Запуск сервера Local Twitch Bot
echo ========================================
echo.

cd server
echo 🚀 Запускаем сервер на http://127.0.0.1:3001
echo 📺 Оверлей доступен по адресу: http://127.0.0.1:3001/overlay
echo 📋 Логи сервера:
echo.
node index.js

pause
