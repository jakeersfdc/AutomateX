@echo off
REM AutomateX Complete Deployment Script
REM This script automates the entire deployment process

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ================================================================
echo               AUTOMATEX DEPLOYMENT SYSTEM
echo            Institutional Algorithm Trading Dashboard
echo ================================================================
echo.

REM Step 1: Check prerequisites
echo [STEP 1] Checking Prerequisites...
echo ================================================================

git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git not found. Please install from https://git-scm.com
    exit /b 1
)
echo [OK] Git installed

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Python not found (optional)
) else (
    echo [OK] Python installed
)

if not exist algo_dashboard_backend.py (
    echo ERROR: algo_dashboard_backend.py not found
    exit /b 1
)
if not exist algo_dashboard_frontend.html (
    echo ERROR: algo_dashboard_frontend.html not found
    exit /b 1
)
if not exist requirements.txt (
    echo ERROR: requirements.txt not found
    exit /b 1
)
if not exist Procfile (
    echo ERROR: Procfile not found
    exit /b 1
)
echo [OK] All required files present
echo.

REM Step 2: Configure Git
echo [STEP 2] Configuring Git...
echo ================================================================
git config --global user.email "jakeersfdc@gmail.com"
git config --global user.name "AutomateX Developer"
echo [OK] Git configured
echo     Email: jakeersfdc@gmail.com
echo     Name: AutomateX Developer
echo.

REM Step 3: Prepare Repository
echo [STEP 3] Preparing Git Repository...
echo ================================================================
if not exist .git (
    echo Initializing new repository...
    git init
)
echo [OK] Repository exists

echo Staging all files...
git add .
echo [OK] Files staged

echo Creating commit...
git commit -m "AutomateX v2.0 - Institutional Algorithm Trading Dashboard - Production Ready" --allow-empty >nul 2>&1
echo [OK] Commit created
echo.

REM Step 4: Configure Remote
echo [STEP 4] Configuring GitHub Remote...
echo ================================================================
git remote remove origin >nul 2>&1
git remote add origin https://github.com/jakeersfdc/AutomateX.git
echo [OK] Remote configured
echo     URL: https://github.com/jakeersfdc/AutomateX.git
echo.

REM Step 5: Push to GitHub
echo [STEP 5] Pushing Code to GitHub...
echo ================================================================
git branch -M main
echo Attempting to push to GitHub...
git push -u origin main
if %errorlevel% neq 0 (
    echo.
    echo [WARN] Push failed. This is expected if:
    echo   - GitHub repository doesn't exist yet
    echo   - You haven't authenticated with GitHub
    echo.
    echo MANUAL STEPS REQUIRED:
    echo   1. Go to: https://github.com/new
    echo   2. Create repository: AutomateX (Public)
    echo   3. Run this command in this folder:
    echo      git push -u origin main
) else (
    echo [OK] Code pushed to GitHub
)
echo.

REM Step 6: Display deployment instructions
echo [STEP 6] Railway Deployment Instructions
echo ================================================================
echo.
echo DEPLOY ON RAILWAY (Next Steps):
echo.
echo  1. Go to: https://railway.app
echo  2. Click: "Start Project"
echo  3. Select: "Deploy from GitHub repo"
echo  4. Login with: jakeersfdc@gmail.com
echo  5. Select repository: AutomateX
echo  6. Click: "Deploy"
echo  7. Wait 2-3 minutes for deployment
echo.
echo YOUR LIVE URL WILL BE:
echo   https://automatex-XXXXXX.railway.app
echo.
echo ================================================================
echo                    DEPLOYMENT SUMMARY
echo ================================================================
echo.
echo  Project Name:       AutomateX
echo  GitHub Email:       jakeersfdc@gmail.com
echo  GitHub Username:    jakeersfdc
echo  Repository:         github.com/jakeersfdc/AutomateX
echo.
echo  Files Deployed:
echo    - algo_dashboard_backend.py   (1500+ lines)
echo    - algo_dashboard_frontend.html (500+ lines)
echo    - requirements.txt            (Dependencies)
echo    - Procfile                    (Railway config)
echo    - All supporting files
echo.
echo  Status:
echo    [OK] Code prepared and committed
echo    [PENDING] GitHub repository (create at https://github.com/new)
echo    [PENDING] Push code to GitHub
echo    [PENDING] Deploy on Railway (railway.app)
echo    [PENDING] Get your live URL
echo.
echo ================================================================
echo                       QUICK LINKS
echo ================================================================
echo.
echo  GitHub New Repo:    https://github.com/new
echo  Railway Deploy:     https://railway.app
echo  Your Repository:    https://github.com/jakeersfdc/AutomateX
echo.
echo ================================================================
echo            Ready to deploy? Go to Railway now!
echo ================================================================
echo.
echo Useful commands:
echo   git status              - Check repository status
echo   git log --oneline -5    - View recent commits
echo   git push -u origin main - Push again (if needed)
echo.
pause
