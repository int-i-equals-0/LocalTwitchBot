@echo off
chcp 65001 > nul
title Local Streamer Bot - Сервер
echo ========================================
echo    Запуск сервера Local Streamer Bot
echo ========================================
echo.

cd server
echo 🚀 Запускаем сервер на http://localhost:3001
echo 📺 Оверлей доступен по адресу: http://localhost:3001/overlay
echo 📋 Логи сервера:
echo.
node index.js

pause