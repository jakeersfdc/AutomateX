# ProfitForce Deployment Script
# Handles cross-platform path issues and runs build + Vercel deploy

param(
    [switch]$Prod = $false,
    [switch]$SkipBuild = $false
)

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Write-Host "🚀 ProfitForce Deployment" -ForegroundColor Cyan
Write-Host "Project Root: $ProjectRoot" -ForegroundColor Gray

try {
    # Change directory using proper PowerShell syntax
    Push-Location $ProjectRoot
    
    # Build if not skipped
    if (-not $SkipBuild) {
        Write-Host "`n📦 Building application..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "Build failed with exit code $LASTEXITCODE"
        }
        Write-Host "✅ Build succeeded" -ForegroundColor Green
    }
    
    # Deploy to Vercel
    Write-Host "`n🌐 Deploying to Vercel..." -ForegroundColor Yellow
    if ($Prod) {
        npx vercel deploy --prod --yes
    } else {
        npx vercel deploy --yes
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
    } else {
        throw "Deploy failed with exit code $LASTEXITCODE"
    }
} 
catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
