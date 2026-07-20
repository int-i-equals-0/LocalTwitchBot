#!/usr/bin/bash
# Установка Local Streamer Bot для Linux

# Получаем путь к директории скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Функция для вывода с цветом
print_success() { echo -e "\e[32m✅ $1\e[0m"; }
print_error() { echo -e "\e[31m❌ $1\e[0m"; }
print_info() { echo -e "\e[34m📌 $1\e[0m"; }
print_header() { echo -e "\e[35m========================================\e[0m"; echo -e "\e[35m   $1\e[0m"; echo -e "\e[35m========================================\e[0m"; }

clear
print_header "Установка Local Streamer Bot"

# Проверяем наличие nodejs
if ! command -v node &> /dev/null; then
    print_error "Node.js не установлен!"
    echo "Установите Node.js:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "  sudo apt install -y nodejs"
    echo ""
    echo "Или: sudo apt install nodejs npm"
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

NODE_VERSION=$(node -v)
print_info "Node.js версия: $NODE_VERSION"

echo ""
echo "[1/2] Устанавливаем зависимости сервера..."
cd "$SCRIPT_DIR/server" || exit 1

npm install
if [ $? -eq 0 ]; then
    print_success "Сервер готов"
else
    print_error "Ошибка при установке зависимостей сервера"
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

echo ""
echo "[2/2] Устанавливаем зависимости клиента..."
cd "$SCRIPT_DIR/client" || exit 1

npm install
if [ $? -eq 0 ]; then
    print_success "Клиент готов"
else
    print_error "Ошибка при установке зависимостей клиента"
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

# Делаем все .sh скрипты исполняемыми
chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null

echo ""
print_header "Установка завершена успешно!"
echo ""
print_info "Для запуска бота:"
echo "   ./start-server.sh  - запуск сервера"
echo "   ./start-client.sh  - запуск клиента (в браузере)"
echo "   ./stop.sh          - остановка всех процессов"
echo ""
read -p "Нажмите Enter для выхода..."