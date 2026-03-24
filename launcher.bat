@echo off
echo Starting ZeroOne Trading Bot Launcher...

if not exist .venv (
    echo [ERROR] Virtual environment not found. Please run setup.bat first.
    pause
    exit /b 1
)

call .venv\Scripts\activate
python launcher.py
pause
