@echo off
chcp 65001 > nul
title Local Streamer Bot - Установка
echo ========================================
echo    Установка Local Streamer Bot
echo ========================================
echo.

echo [1/3] Проверка Node.js...
where node > nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js не найден в системе!
    echo.
    echo Для работы бота необходим Node.js.
    echo Открываю страницу загрузки...
    timeout /t 2 > nul
    start https://nodejs.org/en/download
    echo.
    echo После установки Node.js запустите этот файл снова.
    echo.
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%a in ('node -v') do set node_version=%%a
echo ✅ Node.js найден (версия: %node_version%)
echo.

echo [2/3] Устанавливаем зависимости сервера...
cd server
call npm install
if errorlevel 1 (
    echo ❌ Ошибка при установке зависимостей сервера
    pause
    exit /b 1
)
echo ✅ Сервер готов
echo.

echo [3/3] Устанавливаем зависимости клиента...
cd ..\client
call npm install
call npm audit fix --force
if errorlevel 1 (
    echo ❌ Ошибка при установке зависимостей клиента
    pause
    exit /b 1
)
echo ✅ Клиент готов
echo.


echo ========================================
echo ✅ Установка завершена успешно!
echo.
echo Для запуска бота используйте start.bat
echo ========================================
echo.
pause