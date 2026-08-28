<# 
.SYNOPSIS
    Complete setup script for Dynamic Train ETA project
.DESCRIPTION
    Installs Node.js, creates .env files, installs dependencies, runs database setup
#>

param(
    [switch]$SkipNodeInstall,
    [switch]$SkipDbSetup
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Dynamic Train ETA - Full Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "C:\Users\manvish p\Downloads\dynamic-train-eta-main\dynamic-train-eta-main"
$backendDir = Join-Path $projectRoot "backend"
$collectorDir = Join-Path $projectRoot "data-collector"

# ============================================================
# 1. CHECK/INSTALL NODE.JS
# ============================================================
Write-Host "[1/6] Checking Node.js..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js found: $nodeVersion" -ForegroundColor Green
    
    # Check version >= 20
    $versionNum = [int]($nodeVersion.TrimStart('v').Split('.')[0])
    if ($versionNum -lt 20) {
        Write-Warning "  Node.js version $versionNum < 20. Please upgrade."
    }
} catch {
    if ($SkipNodeInstall) {
        Write-Error "Node.js not found. Install from https://nodejs.org/ (LTS v20+)"
        exit 1
    }
    
    Write-Host "  Node.js not found. Installing via winget..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
    
    # Refresh PATH
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
    
    try {
        $nodeVersion = node --version
        Write-Host "  ✓ Node.js installed: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Error "Failed to install Node.js. Please install manually from https://nodejs.org/"
        exit 1
    }
}

# ============================================================
# 2. CREATE .ENV FILES
# ============================================================
Write-Host "[2/6] Creating .env files..." -ForegroundColor Yellow

# Backend .env
$backendEnv = Join-Path $backendDir ".env"
$backendExample = Join-Path $backendDir ".env.example"

if (-not (Test-Path $backendEnv)) {
    if (Test-Path $backendExample) {
        Copy-Item $backendExample $backendEnv
        Write-Host "  ✓ Created backend/.env from template" -ForegroundColor Green
    } else {
        Write-Warning "  backend/.env.example not found"
    }
} else {
    Write-Host "  ✓ backend/.env already exists" -ForegroundColor Green
}

# Collector .env
$collectorEnv = Join-Path $collectorDir ".env"
if (-not (Test-Path $collectorEnv)) {
    # Create from backend .env (same keys needed)
    if (Test-Path $backendEnv) {
        Copy-Item $backendEnv $collectorEnv
        Write-Host "  ✓ Created data-collector/.env from backend" -ForegroundColor Green
    }
} else {
    Write-Host "  ✓ data-collector/.env already exists" -ForegroundColor Green
}

Write-Warning ""
Write-Warning "  ⚠️  IMPORTANT: Edit both .env files with your ACTUAL keys:"
Write-Warning "     - $backendEnv"
Write-Warning "     - $collectorEnv"
Write-Warning "  Get keys from: Supabase Dashboard > Settings > API"
Write-Warning "  And: railradar.in developer portal"
Write-Warning ""

# ============================================================
# 3. INSTALL DEPENDENCIES
# ============================================================
Write-Host "[3/6] Installing backend dependencies..." -ForegroundColor Yellow
Set-Location $backendDir
npm install 2>&1 | Out-Null
Write-Host "  ✓ Backend dependencies installed" -ForegroundColor Green

Write-Host "[4/6] Installing data-collector dependencies..." -ForegroundColor Yellow
Set-Location $collectorDir
npm install 2>&1 | Out-Null
Write-Host "  ✓ Collector dependencies installed" -ForegroundColor Green

# ============================================================
# 4. CREATE LOG DIRECTORY
# ============================================================
Write-Host "[5/6] Creating log directory..." -ForegroundColor Yellow
$logDir = Join-Path $backendDir "logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
    Write-Host "  ✓ Created logs/ directory" -ForegroundColor Green
}

# ============================================================
# 5. DATABASE SETUP REMINDER
# ============================================================
Write-Host "[6/6] Database Setup" -ForegroundColor Yellow

if (-not $SkipDbSetup) {
    $sqlFile = Join-Path $projectRoot "schema_update.sql"
    if (Test-Path $sqlFile) {
        Write-Host ""
        Write-Host "  📋 Run this SQL in Supabase Dashboard > SQL Editor:" -ForegroundColor Cyan
        Write-Host "     File: $sqlFile" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  Steps:" -ForegroundColor Cyan
        Write-Host "  1. Open https://supabase.com/dashboard" -ForegroundColor Cyan
        Write-Host "  2. Select your project" -ForegroundColor Cyan
        Write-Host "  3. Go to SQL Editor" -ForegroundColor Cyan
        Write-Host "  4. Click 'New Query'" -ForegroundColor Cyan
        Write-Host "  5. Paste contents of schema_update.sql" -ForegroundColor Cyan
        Write-Host "  6. Click 'Run'" -ForegroundColor Cyan
        Write-Host ""
    }
}

# ============================================================
# SUMMARY
# ============================================================
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Edit .env files with your keys:" -ForegroundColor Yellow
Write-Host "     notepad $backendEnv" -ForegroundColor Gray
Write-Host "     notepad $collectorEnv" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Run schema_update.sql in Supabase SQL Editor" -ForegroundColor Yellow
Write-Host ""
Write-Host "  3. Start services (two terminals):" -ForegroundColor Yellow
Write-Host ""
Write-Host "     Terminal 1 (Data Collector):" -ForegroundColor Cyan
Write-Host "     cd $collectorDir" -ForegroundColor Gray
Write-Host "     npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "     Terminal 2 (Backend API):" -ForegroundColor Cyan
Write-Host "     cd $backendDir" -ForegroundColor Gray
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Test: http://localhost:3000/health" -ForegroundColor Yellow
Write-Host ""