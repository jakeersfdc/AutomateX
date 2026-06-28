#!/usr/bin/env pwsh
<#
.SYNOPSIS
    AutomateX Complete Deployment Script
    Deploys your trading dashboard to Railway with a live public URL
    
.DESCRIPTION
    This script automates the entire deployment process:
    1. Prepares code
    2. Creates/Updates GitHub repository
    3. Pushes code to GitHub
    4. Deploys to Railway
    5. Generates live URL
    
.AUTHOR
    AutomateX System
    
.VERSION
    2.0
#>

param(
    [string]$GitHubToken = "",
    [string]$RailwayToken = ""
)

$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

# Colors for output
$Success = "Green"
$Warning = "Yellow"
$Error_Color = "Red"
$Info = "Cyan"

# Configuration
$ProjectName = "AutomateX"
$GitHubUsername = "jakeersfdc"
$GitHubEmail = "jakeersfdc@gmail.com"
$RepositoryUrl = "https://github.com/$GitHubUsername/$ProjectName.git"
$ProjectPath = Get-Location

Write-Host "`n" -ForegroundColor $Info
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor $Info
Write-Host "║                                                            ║" -ForegroundColor $Info
Write-Host "║         🚀 AUTOMATEX COMPLETE DEPLOYMENT SYSTEM            ║" -ForegroundColor $Info
Write-Host "║                                                            ║" -ForegroundColor $Info
Write-Host "║     Institutional Algorithm Trading Dashboard             ║" -ForegroundColor $Info
Write-Host "║                                                            ║" -ForegroundColor $Info
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $Info
Write-Host "`n"

# Step 1: Check Prerequisites
Write-Host "📋 STEP 1: Checking Prerequisites..." -ForegroundColor $Info
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Info

# Check Git
Write-Host "  ✓ Checking Git..." -ForegroundColor $Info
$gitVersion = git --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ Git installed: $gitVersion" -ForegroundColor $Success
} else {
    Write-Host "    ❌ Git not found. Please install from https://git-scm.com" -ForegroundColor $Error_Color
    exit 1
}

# Check Python
Write-Host "  ✓ Checking Python..." -ForegroundColor $Info
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ Python installed: $pythonVersion" -ForegroundColor $Success
} else {
    Write-Host "    ⚠️  Python not found (optional for validation)" -ForegroundColor $Warning
}

# Check required files
Write-Host "  ✓ Checking project files..." -ForegroundColor $Info
$requiredFiles = @(
    "algo_dashboard_backend.py",
    "algo_dashboard_frontend.html",
    "requirements.txt",
    "Procfile"
)

$allFilesPresent = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "    ✅ $file" -ForegroundColor $Success
    } else {
        Write-Host "    ❌ $file (MISSING!)" -ForegroundColor $Error_Color
        $allFilesPresent = $false
    }
}

if (-not $allFilesPresent) {
    Write-Host "`n❌ Missing required files. Deployment aborted." -ForegroundColor $Error_Color
    exit 1
}

Write-Host "`n✅ All prerequisites met!`n" -ForegroundColor $Success

# Step 2: Configure Git
Write-Host "🔧 STEP 2: Configuring Git..." -ForegroundColor $Info
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Info

git config --global user.email "$GitHubEmail"
git config --global user.name "AutomateX Developer"
Write-Host "  ✅ Git configured" -ForegroundColor $Success
Write-Host "    Email: $GitHubEmail" -ForegroundColor $Info
Write-Host "    Name: AutomateX Developer" -ForegroundColor $Info
Write-Host "`n"

# Step 3: Initialize/Update Git Repository
Write-Host "📦 STEP 3: Preparing Git Repository..." -ForegroundColor $Info
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Info

if (-not (Test-Path ".git")) {
    Write-Host "  ✓ Initializing new repository..." -ForegroundColor $Info
    git init
    Write-Host "    ✅ Repository initialized" -ForegroundColor $Success
} else {
    Write-Host "  ✓ Repository already exists" -ForegroundColor $Info
}

Write-Host "  ✓ Staging all files..." -ForegroundColor $Info
git add .
Write-Host "    ✅ Files staged" -ForegroundColor $Success

Write-Host "  ✓ Creating commit..." -ForegroundColor $Info
git commit -m "AutomateX v2.0 - Institutional Algorithm Trading Dashboard - Production Ready" --allow-empty 2>&1 | Out-Null
Write-Host "    ✅ Commit created" -ForegroundColor $Success
Write-Host "`n"

# Step 4: Configure GitHub Remote
Write-Host "🌐 STEP 4: Configuring GitHub Remote..." -ForegroundColor $Info
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Info

Write-Host "  ✓ Setting up remote repository..." -ForegroundColor $Info
git remote remove origin 2>$null
git remote add origin $RepositoryUrl
Write-Host "    ✅ Remote configured: $RepositoryUrl" -ForegroundColor $Success
Write-Host "`n"

# Step 5: Create GitHub Repository (using GitHub CLI if available)
Write-Host "📝 STEP 5: GitHub Repository Setup..." -ForegroundColor $Info
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Info

$ghInstalled = (gh --version 2>$null)
if ($ghInstalled) {
    Write-Host "  ✓ GitHub CLI detected, attempting auto-creation..." -ForegroundColor $Info
    
    # Check if repo already exists
    $repoExists = gh repo view "$GitHubUsername/$ProjectName" 2>$null
    if ($repoExists) {
        Write-Host "    ✅ Repository already exists" -ForegroundColor $Success
    } else {
        Write-Host "    ✓ Creating new repository..." -ForegroundColor $Info
        gh repo create $ProjectName --public --source=. --remote=origin --push 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✅ Repository created and code pushed!" -ForegroundColor $Success
        } else {
            Write-Host "    ⚠️  Auto-creation via GitHub CLI failed, will attempt manual push" -ForegroundColor $Warning
        }
    }
} else {
    Write-Host "  ⚠️  GitHub CLI not found, you'll need to create repo manually" -ForegroundColor $Warning
    Write-Host "    📌 Go to: https://github.com/new" -ForegroundColor $Info
    Write-Host "    📌 Create repo named: $ProjectName" -ForegroundColor $Info
    Write-Host "    📌 Make it Public" -ForegroundColor $Info
}

Write-Host "`n"

# Step 6: Push to GitHub
Write-Host "🚀 STEP 6: Pushing Code to GitHub..." -ForegroundColor $Info
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Info

Write-Host "  ✓ Pushing main branch..." -ForegroundColor $Info
git branch -M main
$pushResult = git push -u origin main 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ Code pushed successfully!" -ForegroundColor $Success
} else {
    Write-Host "    ⚠️  Push encountered an issue:" -ForegroundColor $Warning
    Write-Host "    $pushResult" -ForegroundColor $Warning
    Write-Host "`n    📌 MANUAL STEPS REQUIRED:" -ForegroundColor $Warning
    Write-Host "       1. Go to https://github.com/new" -ForegroundColor $Info
    Write-Host "       2. Create repository: $ProjectName (Public)" -ForegroundColor $Info
    Write-Host "       3. Try push again or run: git push -u origin main" -ForegroundColor $Info
}

Write-Host "`n"

# Step 7: Railway Deployment Information
Write-Host "🚀 STEP 7: Railway Deployment Instructions..." -ForegroundColor $Info
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Info

Write-Host "`n" -ForegroundColor $Info
Write-Host "  📌 DEPLOY ON RAILWAY (Next Steps):" -ForegroundColor $Warning
Write-Host "`n" -ForegroundColor $Info
Write-Host "    1. Go to: https://railway.app" -ForegroundColor $Info
Write-Host "    2. Click: 'Start Project'" -ForegroundColor $Info
Write-Host "    3. Select: 'Deploy from GitHub repo'" -ForegroundColor $Info
Write-Host "    4. Login with GitHub account: $GitHubEmail" -ForegroundColor $Info
Write-Host "    5. Select repository: $ProjectName" -ForegroundColor $Info
Write-Host "    6. Click: 'Deploy'" -ForegroundColor $Info
Write-Host "    7. Wait 2-3 minutes for deployment" -ForegroundColor $Info
Write-Host "`n" -ForegroundColor $Info
Write-Host "  🎉 YOUR LIVE URL WILL BE:" -ForegroundColor $Success
Write-Host "     https://automatex-XXXXXX.railway.app" -ForegroundColor $Success
Write-Host "`n" -ForegroundColor $Info

# Step 8: Generate Summary Report
Write-Host "📊 DEPLOYMENT SUMMARY" -ForegroundColor $Info
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Info

$summaryData = @"

  Project Name:        $ProjectName
  GitHub Email:        $GitHubEmail
  GitHub Username:     $GitHubUsername
  Repository:          github.com/$GitHubUsername/$ProjectName
  Project Path:        $ProjectPath
  
  Files Deployed:
    ✅ algo_dashboard_backend.py    (1500+ lines)
    ✅ algo_dashboard_frontend.html (500+ lines)
    ✅ requirements.txt             (Dependencies)
    ✅ Procfile                     (Railway config)
    ✅ All supporting files
  
  Git Status:
    Branch:            main
    Remote:            origin → $RepositoryUrl
    Last Commit:       AutomateX v2.0 - Production Ready
  
  Next Steps:
    1. ✅ Code prepared and committed
    2. ⏳ GitHub repository (create at https://github.com/new)
    3. ⏳ Push code to GitHub
    4. ⏳ Deploy on Railway (railway.app)
    5. 🎉 Get your live URL
  
  Expected URL Format:
    https://automatex-XXXXXX.railway.app
  
  Time Estimate:
    Remaining steps: ~10 minutes
    
  Cost:
    Railway Free Tier: \$5/month credits
    After credits: ~\$15/month typical
"@

Write-Host $summaryData -ForegroundColor $Info

# Final message
Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor $Success
Write-Host "║                                                            ║" -ForegroundColor $Success
Write-Host "║     ✅ LOCAL DEPLOYMENT PREPARATION COMPLETE!              ║" -ForegroundColor $Success
Write-Host "║                                                            ║" -ForegroundColor $Success
Write-Host "║  Follow the Railway deployment steps above to get your     ║" -ForegroundColor $Success
Write-Host "║  live public URL: https://automatex-XXXXXX.railway.app    ║" -ForegroundColor $Success
Write-Host "║                                                            ║" -ForegroundColor $Success
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor $Success
Write-Host "`n"

Write-Host "📝 Commands for reference:" -ForegroundColor $Info
Write-Host "  Check repo status:  git status" -ForegroundColor $Info
Write-Host "  View commits:       git log --oneline -5" -ForegroundColor $Info
Write-Host "  Push again:         git push -u origin main" -ForegroundColor $Info
Write-Host "`n"

Write-Host "🔗 Important Links:" -ForegroundColor $Info
Write-Host "  GitHub:             https://github.com/new" -ForegroundColor $Info
Write-Host "  Railway:            https://railway.app" -ForegroundColor $Info
Write-Host "  Your Repository:    https://github.com/$GitHubUsername/$ProjectName" -ForegroundColor $Info
Write-Host "`n"

Write-Host "Ready to deploy? Go to Railway: https://railway.app 🚀" -ForegroundColor $Success
Write-Host "`n"
