@echo off
REM ============================================================
REM Dynamic Train ETA - Auto Setup Script (Windows)
REM Installs Node.js 20+, dependencies, creates .env files
REM ============================================================

setlocal enabledelayedexpansion

REM Colors
set RED=
set GREEN=
set YELLOW=
set BLUE=
set NC=

REM Check if running from backend directory
if not exist "package.json" (
    echo [ERROR] Run this script from the backend\ directory
    exit /b 1
)

echo [INFO] Starting Dynamic Train ETA Backend Setup...

REM ============================================================
REM 1. Check/Install Node.js 20+
REM ============================================================
echo [INFO] Checking Node.js version...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Node.js not found. Attempting to install...
    
    REM Try winget first
    winget --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo [INFO] Installing Node.js LTS via winget...
        winget install --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
        goto :check_node_installed
    )
    
    REM Try Chocolatey
    choco --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo [INFO] Installing Node.js LTS via Chocolatey...
        choco install nodejs-lts --version=20.x -y
        goto :check_node_installed
    )
    
    REM Try Scoop
    scoop --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo [INFO] Installing Node.js LTS via Scoop...
        scoop install nodejs-lts
        goto :check_node_installed
    )
    
    echo [ERROR] No package manager found (winget, choco, or scoop).
    echo [ERROR] Please install Node.js 20+ manually from https://nodejs.org/
    echo [ERROR] Then restart terminal and run this script again.
    exit /b 1
)

:check_node_installed
REM Verify Node.js version >= 20
for /f "tokens=2 delims=v." %%a in ('node --version') do set NODE_MAJOR=%%a
if %NODE_MAJOR% LSS 20 (
    echo [WARN] Node.js version %NODE_MAJOR% found, but >=20 required.
    echo [ERROR] Please upgrade Node.js to v20+ from https://nodejs.org/
    exit /b 1
)

echo [SUCCESS] Node.js v%NODE_MAJOR% found (>=20 required)

REM ============================================================
REM 2. Install npm dependencies
REM ============================================================
echo [INFO] Installing backend dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed
    exit /b 1
)

REM ============================================================
REM 3. Create .env from template if missing
REM ============================================================
if not exist ".env" (
    echo [INFO] Creating .env from .env.example...
    copy .env.example .env >nul
    echo [WARN] IMPORTANT: Edit .env with your actual API keys!
) else (
    echo [SUCCESS] .env already exists
)

REM ============================================================
REM 4. Setup data-collector
REM ============================================================
set COLLECTOR_DIR=..\data-collector
if exist "%COLLECTOR_DIR%\" (
    echo [INFO] Setting up data-collector...
    
    if not exist "%COLLECTOR_DIR%\.env" (
        echo [INFO] Creating data-collector\.env from backend\.env...
        copy .env "%COLLECTOR_DIR%\.env" >nul
        echo [WARN] Edit data-collector\.env if keys differ from backend
    )
    
    echo [INFO] Installing data-collector dependencies...
    pushd "%COLLECTOR_DIR%"
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] data-collector npm install failed
        popd
        exit /b 1
    )
    popd
    
    echo [SUCCESS] Data collector ready
) else (
    echo [WARN] data-collector directory not found at %COLLECTOR_DIR%
)

REM ============================================================
REM 5. Test Supabase connection
REM ============================================================
echo [INFO] Testing Supabase connection...
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('train_current_status').select('count').limit(1).then(({ data, error }) => {
    if (error && error.code !== 'PGRST116') {
        console.error('[ERROR] Supabase:', error.message);
        process.exit(1);
    } else {
        console.log('[SUCCESS] Supabase connection OK');
    }
}).catch(err => {
    console.log('[WARN] Supabase test skipped - run schema_update.sql first');
});
" 2>nul || echo [WARN] Supabase test skipped (tables may not exist yet - run schema_update.sql)

REM ============================================================
REM 6. Summary
REM ============================================================
echo.
echo =========================================
echo [SUCCESS] SETUP COMPLETE
echo =========================================
echo.
echo Next steps:
echo   1. Edit backend\.env with your REAL API keys
echo   2. Run schema_update.sql in Supabase Dashboard ^> SQL Editor
echo   3. Start services (needs 2 terminals):
echo.
echo      Terminal 1 (Data Collector):
echo        cd ..\data-collector ^&^& npm start
echo.
echo      Terminal 2 (Backend API):
echo        cd backend ^&^& npm run dev
echo.
echo   4. Test: curl http://localhost:3000/health
echo.
echo For Docker deployment: cd backend ^&^& docker-compose up -d --build
echo.
pause