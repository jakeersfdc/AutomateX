#!/usr/bin/env python3
"""
AutomateX - Get Your Live Dashboard URL
This script helps you retrieve your Railway deployment URL
"""

import webbrowser
import time
from pathlib import Path

print("\n" + "="*70)
print("       🚀 AUTOMATEX - GET YOUR LIVE DASHBOARD URL")
print("="*70 + "\n")

print("📋 DEPLOYMENT CHECKLIST:\n")
print("  ✅ Step 1: Code pushed to GitHub")
print("  ✅ Step 2: Railway configuration ready")
print("  ⏳ Step 3: Deploy on Railway (NEXT)\n")

print("="*70)
print("            🎯 3 WAYS TO GET YOUR LIVE URL")
print("="*70 + "\n")

print("METHOD 1: Quick Railway Deployment (RECOMMENDED - 2 minutes)\n")
print("  1. Go to: https://railway.app")
print("  2. Click: 'Start Project' or 'New'")
print("  3. Select: 'Deploy from GitHub repo'")
print("  4. Authorize with GitHub (if prompted)")
print("  5. Select: 'jakeersfdc/AutomateX' repository")
print("  6. Click: 'Deploy'")
print("  7. Wait 2-3 minutes...")
print("  8. Your URL appears in 'Domain' section:")
print("     https://automatex-XXXXXX.railway.app\n")

print("METHOD 2: Using Railway CLI (Advanced)\n")
print("  Prerequisites: npm install -g @railway/cli")
print("  1. Run: railway login")
print("  2. Run: railway link")
print("  3. Run: railway up")
print("  4. Copy the generated URL\n")

print("METHOD 3: Check Repository Settings\n")
print("  1. Go to: https://github.com/jakeersfdc/AutomateX")
print("  2. Click: 'Deployments' tab")
print("  3. Look for Railway deployment status\n")

print("="*70)
print("              📊 YOUR PROJECT STRUCTURE")
print("="*70 + "\n")

print("Repository: https://github.com/jakeersfdc/AutomateX\n")
print("Files Deployed:")
print("  ✅ algo_dashboard_backend.py   (1500+ lines, FastAPI server)")
print("  ✅ algo_dashboard_frontend.html (500+ lines, Web dashboard)")
print("  ✅ requirements.txt             (Python dependencies)")
print("  ✅ Procfile                     (Railway config)")
print("  ✅ railway.json                 (Railway settings)")
print("  ✅ .github/workflows/deploy.yml (Auto-deployment)\n")

print("="*70)
print("              🎯 EXPECTED LIVE URL FORMAT")
print("="*70 + "\n")

print("  https://automatex-XXXXXX.railway.app\n")

print("Where:")
print("  - XXXXXX = Random deployment ID (assigned by Railway)")
print("  - This URL is public and accessible 24/7")
print("  - No authentication required")
print("  - Auto-scales with traffic\n")

print("="*70)
print("            ✨ WHAT'S AVAILABLE AT YOUR URL")
print("="*70 + "\n")

print("Once deployed, your dashboard includes:\n")

features = [
    ("Real-time Signals", "NIFTY, BANKNIFTY, Bitcoin, EUR/USD"),
    ("Multi-Market Analysis", "Smart Money Concepts detection"),
    ("Trade Setup Display", "Entry, SL, Target, Risk:Reward"),
    ("Live Alerts", "Push notifications for new signals"),
    ("Professional UI", "Dark theme, responsive design"),
    ("24/7 Operation", "Auto-scaling production server"),
    ("Secure HTTPS", "Railway domain with SSL"),
    ("WebSocket Support", "Real-time data streaming"),
]

for feature, description in features:
    print(f"  ✅ {feature:.<25} {description}")

print("\n" + "="*70)
print("              🚀 DEPLOY NOW")
print("="*70 + "\n")

# Offer to open Railway
response = input("Would you like to open Railway.app now? (yes/no): ").strip().lower()

if response in ['yes', 'y', '1', 'true']:
    print("\nOpening Railway.app in your browser...")
    time.sleep(1)
    webbrowser.open('https://railway.app')
    print("✅ Railway opened!")
    print("\nNext steps:")
    print("  1. Click 'Start Project'")
    print("  2. Select 'Deploy from GitHub repo'")
    print("  3. Select 'jakeersfdc/AutomateX'")
    print("  4. Click 'Deploy'")
    print("  5. Wait 2-3 minutes")
    print("  6. Copy your URL from the 'Domain' section")
else:
    print("\nManual steps:")
    print("  1. Visit: https://railway.app")
    print("  2. Create new project from GitHub")
    print("  3. Select: AutomateX repository")

print("\n" + "="*70)
print("              📝 VERIFICATION STEPS")
print("="*70 + "\n")

print("Once your URL is live, test it:\n")

print("  1. Visit your URL: https://automatex-XXXXXX.railway.app")
print("     - Dashboard should load")
print("     - Markets should be visible")
print("     - Signals should update every 5 seconds")
print("")
print("  2. Check API health:")
print("     https://automatex-XXXXXX.railway.app/api/health")
print("     - Should return: {'status': 'ok'}")
print("")
print("  3. Test signals endpoint:")
print("     https://automatex-XXXXXX.railway.app/api/signal/nifty")
print("     - Should return: signal data with BUY/SELL/WAIT\n")

print("="*70)
print("              💡 IMPORTANT NOTES")
print("="*70 + "\n")

notes = [
    "Railway Free Tier: $5/month credits included",
    "After credits: ~$15/month for continuous operation",
    "Deployment takes 2-3 minutes from start to live",
    "URL is permanent and doesn't change",
    "Auto-scales on demand - no manual scaling needed",
    "Logs available in Railway dashboard for debugging",
]

for i, note in enumerate(notes, 1):
    print(f"  {i}. {note}")

print("\n" + "="*70)
print("              🎉 YOU'RE READY!")
print("="*70 + "\n")

print("Your AutomateX trading dashboard is production-ready!")
print("Deploy now on Railway to get your live URL!")
print("\n✅ All code is prepared at: https://github.com/jakeersfdc/AutomateX")
print("✅ Configuration files included: railway.json, Procfile")
print("✅ Auto-deployment workflow ready: .github/workflows/deploy.yml")
print("\n")
