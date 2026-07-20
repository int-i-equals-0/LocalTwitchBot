@echo off
chcp 65001 > nul
title Local Streamer Bot - Остановка
echo ========================================
echo    Остановка Local Streamer Bot
echo ========================================
echo.

echo 🔍 Ищем процессы Node.js...
taskkill /f /im node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ Все процессы Node.js остановлены
) else (
    echo ℹ️ Процессы Node.js не найдены
)

echo.
echo ========================================
echo ✅ Готово
echo ========================================
timeout /t 2 /nobreak >nul