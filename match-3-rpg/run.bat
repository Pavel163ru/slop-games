@echo off
rem Запуск Dungeon Match локально (нужен для ES-модулей: file:// блокируется CORS)
cd /d "%~dp0"
start "" http://127.0.0.1:8000/index.html
python server.py
pause
