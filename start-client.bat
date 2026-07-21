@echo off
chcp 65001 > nul
title Local Twitch Bot - Клиент
echo ========================================
echo    Запуск клиента Local Twitch Bot
echo ========================================
echo.

cd client

echo 🚀 Запускаем клиент на http://127.0.0.1:3000
echo.

REM Запускаем клиент
start "Local Twitch Bot Client" cmd /c npm run dev -- --host 127.0.0.1

echo ⏳ Проверка доступности сервера (порт 3001)...
echo.

set SERVER_FOUND=0

:CHECK_SERVER
timeout /t 1 /nobreak > nul

echo 🔍 Проверяем различные варианты подключения...

REM Проверяем IPv4
netstat -an | find "127.0.0.1:3001" | find "LISTENING" > nul
if not errorlevel 1 (
    set SERVER_FOUND=1
    echo   ✅ Найден на 127.0.0.1:3001
    goto SERVER_FOUND
)

REM Проверяем IPv6
netstat -an | find "[::1]:3001" | find "LISTENING" > nul
if not errorlevel 1 (
    set SERVER_FOUND=1
    echo   ✅ Найден на [::1]:3001
    goto SERVER_FOUND
)

REM Проверяем все интерфейсы
netstat -an | find "0.0.0.0:3001" | find "LISTENING" > nul
if not errorlevel 1 (
    set SERVER_FOUND=1
    echo   ✅ Найден на 0.0.0.0:3001
    goto SERVER_FOUND
)

REM Проверяем через localhost
netstat -an | find "localhost:3001" | find "LISTENING" > nul
if not errorlevel 1 (
    set SERVER_FOUND=1
    echo   ✅ Найден на localhost:3001
    goto SERVER_FOUND
)

echo   ❌ Сервер не найден ни по одному адресу
goto SERVER_NOT_FOUND

:SERVER_FOUND
echo.
echo ✅ Сервер успешно найден!
echo.
goto OPEN_CLIENT

:SERVER_NOT_FOUND
echo.
echo    ⚠️ ВНИМАНИЕ: Сервер на порту 3001 не найден!
echo    ----------------------------------------
echo    Убедитесь, что сервер запущен отдельно:
echo    - Запустите server.bat в отдельном окне
echo    - Или выполните 'node index.js' в папке server
echo    ----------------------------------------
echo.
echo    Хотите продолжить запуск клиента?
echo    1. Да, продолжить (сервер не нужен) [автоматически через 3 сек]
echo    2. Нет, выйти и проверить сервер
echo.

choice /c 12 /t 3 /d 1 /m "👉 Выберите действие: "

if errorlevel 2 (
    echo.
    echo ❌ Выход из программы...
    echo    Запустите сначала сервер, затем снова клиент.
    timeout /t 3 /nobreak > nul
    exit /b
)

echo.
echo ⏩ Продолжаем запуск клиента в автономном режиме...
echo    Некоторые функции могут быть недоступны без сервера.

:OPEN_CLIENT
timeout /t 2 /nobreak > nul
echo.
echo 🌐 Открываем клиент в браузере...
start http://127.0.0.1:3000

echo.
echo ========================================
echo    ТЕКУЩИЙ СТАТУС:
echo    ------------------------------------
if %SERVER_FOUND%==1 (
    echo    📡 Сервер:    ✅ ДОСТУПЕН
) else (
    echo    📡 Сервер:    ❌ НЕ ДОСТУПЕН
)
echo    💻 Клиент:    http://127.0.0.1:3000
echo    ------------------------------------
if %SERVER_FOUND%==0 (
    echo    ⚠️ Режим: Автономный (ограниченная функциональность)
) else (
    echo    ⚠️ Режим: Полный (сервер подключен)
)
echo ========================================
echo.
echo Нажмите любую клавишу для остановки клиента...
pause > nul

echo.
echo 🛑 Останавливаем клиент...
taskkill /F /IM node.exe > nul 2>&1
echo ✅ Клиент остановлен.
timeout /t 2 /nobreak > nul
