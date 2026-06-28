@echo off
REM ============================================================
REM AutomateX Dashboard - Git & Railway Deployment Script
REM For: jakeersfdc@gmail.com
REM ============================================================

title AutomateX Dashboard - Deployment Script
color 0B

cls
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║           🚀 AUTOMATEX DASHBOARD DEPLOYMENT              ║
echo ║                                                          ║
echo ║         Institutional Algorithm Trading System           ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

REM Check if git is installed
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git not found! Please install Git from https://git-scm.com
    echo.
    pause
    exit /b 1
)

echo ✓ Git detected
echo.

REM Configure git
echo 🔧 Configuring Git...
git config --global user.email "jakeersfdc@gmail.com"
git config --global user.name "AutomateX Developer"
echo ✓ Git configured
echo.

REM Initialize repository
echo 📦 Initializing Git repository...
if exist .git (
    echo ✓ Repository already initialized
) else (
    git init
    echo ✓ Repository initialized
)
echo.

REM Add all files
echo 📥 Adding files to staging...
git add .
echo ✓ Files added
echo.

REM Create commit
echo 💾 Creating commit...
git commit -m "AutomateX v2.0 - Institutional Algorithm Trading Dashboard" || echo ✓ Files already committed
echo.

REM Configure remote
echo 🌐 Configuring remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/jakeersfdc/AutomateX.git
echo ✓ Remote configured: github.com/jakeersfdc/AutomateX
echo.

REM Push to GitHub
echo 🚀 Pushing to GitHub...
echo.
echo ⚠️  FIRST TIME DEPLOYMENT:
echo    You may be prompted to authenticate with GitHub.
echo    A browser window will open - approve the authentication.
echo.
git branch -M main
git push -u origin main

if %errorlevel% neq 0 (
    echo.
    echo ❌ Push failed! Check if:
    echo    1. Repository exists on GitHub
    echo    2. You have internet connection
    echo    3. GitHub authentication works
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║           ✅ CODE PUSHED TO GITHUB SUCCESSFULLY          ║
echo ║                                                          ║
echo ║    Repository: github.com/jakeersfdc/AutomateX          ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

echo.
echo 📋 NEXT STEPS FOR RAILWAY DEPLOYMENT:
echo.
echo 1. Go to: https://railway.app
echo 2. Login with GitHub account (jakeersfdc@gmail.com)
echo 3. Click "Start Project" or "New Project"
echo 4. Click "Deploy from GitHub repo"
echo 5. Select: AutomateX repository
echo 6. Click "Deploy"
echo 7. Wait 2-3 minutes for deployment
echo 8. Your URL will be: https://automatex-XXXXXX.railway.app
echo.

echo 📱 Test Your Dashboard:
echo    https://automatex-XXXXXX.railway.app
echo.

echo 🔄 Update Dashboard (Auto-Deploy):
echo    1. Make changes locally
echo    2. Run this script again
echo    3. Railway auto-redeploys!
echo.

pause
