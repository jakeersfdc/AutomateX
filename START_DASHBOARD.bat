@echo off
REM ============================================================
REM NIFTY Institutional SmartMoney Dashboard - Quick Start
REM ============================================================

title NIFTY Dashboard - Quick Launcher
color 0A

cls
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║        🚀 NIFTY INSTITUTIONAL SMARTMONEY DASHBOARD       ║
echo ║                                                          ║
echo ║              Production-Ready Algo Trading              ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo ⚙️  Creating virtual environment...
    python -m venv venv
    echo ✓ Virtual environment created
    echo.
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat
echo ✓ Virtual environment activated
echo.

REM Install dependencies if needed
echo 📦 Checking dependencies...
pip show fastapi >nul 2>&1
if %errorlevel% neq 0 (
    echo 📥 Installing dependencies...
    pip install -q -r requirements.txt
    echo ✓ Dependencies installed
) else (
    echo ✓ Dependencies already installed
)
echo.

REM Start backend server
echo 🚀 Starting backend server...
echo.
start cmd /k "cd /d %cd% && venv\Scripts\python.exe algo_dashboard_backend.py"
echo ✓ Backend server started (Port: 8000)
echo.

timeout /t 3 /nobreak

REM Open frontend
echo 🌐 Opening dashboard in browser...
timeout /t 2 /nobreak

set "DASHBOARD_PATH=%cd%\algo_dashboard_frontend.html"
start "" "%DASHBOARD_PATH%"

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║               ✅ DASHBOARD LOADED SUCCESSFULLY            ║
echo ║                                                          ║
echo ║  Backend URL:    http://localhost:8000                   ║
echo ║  API Docs:       http://localhost:8000/docs              ║
echo ║  Dashboard:      Open in browser (should be automatic)   ║
echo ║                                                          ║
echo ║  Markets Available:                                      ║
echo ║  • 📊 NIFTY 50                                           ║
echo ║  • 🏦 BANKNIFTY                                          ║
echo ║  • ₿ Bitcoin (Crypto)                                    ║
echo ║  • 💱 EUR/USD (Forex)                                    ║
echo ║                                                          ║
echo ║  Trading Hours: 09:15 - 15:30 IST (Mon-Fri)             ║
echo ║                                                          ║
echo ║  🎯 Signals: BUY | SELL | WAIT                          ║
echo ║                                                          ║
echo ║  📢 Alerts: Enabled with Browser Notifications           ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo 📖 For detailed documentation, see: README_ALGO_DASHBOARD.md
echo.
echo Waiting for dashboard... (press CTRL+C to exit this window)
pause >nul
