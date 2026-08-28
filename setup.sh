#!/bin/bash
# ============================================================
# Dynamic Train ETA - Full Setup Script (Linux/Mac/WSL)
# ============================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
COLLECTOR_DIR="$PROJECT_ROOT/data-collector"

echo "=========================================="
echo "  Dynamic Train ETA - Full Setup"
echo "=========================================="
echo ""

# 1. CHECK NODE.JS
echo "[1/6] Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "  ✓ Node.js found: $NODE_VERSION"
    
    # Check version >= 20
    VERSION_NUM=$(echo $NODE_VERSION | sed 's/v//' | cut -d. -f1)
    if [ "$VERSION_NUM" -lt 20 ]; then
        echo "  ⚠️  Node.js version $VERSION_NUM < 20. Please upgrade."
    fi
else
    echo "  Node.js not found. Please install Node.js 20+ from https://nodejs.org/"
    echo "  Or use: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

# 2. CREATE .ENV FILES
echo "[2/6] Creating .env files..."

# Backend .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        echo "  ✓ Created backend/.env from template"
    else
        echo "  ⚠️  backend/.env.example not found"
    fi
else
    echo "  ✓ backend/.env already exists"
fi

# Collector .env
if [ ! -f "$COLLECTOR_DIR/.env" ]; then
    if [ -f "$BACKEND_DIR/.env" ]; then
        cp "$BACKEND_DIR/.env" "$COLLECTOR_DIR/.env"
        echo "  ✓ Created data-collector/.env from backend"
    fi
else
    echo "  ✓ data-collector/.env already exists"
fi

echo ""
echo "  ⚠️  IMPORTANT: Edit both .env files with your ACTUAL keys:"
echo "     - $BACKEND_DIR/.env"
echo "     - $COLLECTOR_DIR/.env"
echo "  Get keys from: Supabase Dashboard > Settings > API"
echo "  And: railradar.in developer portal"
echo ""

# 3. INSTALL DEPENDENCIES
echo "[3/6] Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install
echo "  ✓ Backend dependencies installed"

echo "[4/6] Installing data-collector dependencies..."
cd "$COLLECTOR_DIR"
npm install
echo "  ✓ Collector dependencies installed"

# 4. CREATE LOG DIRECTORY
echo "[5/6] Creating log directory..."
mkdir -p "$BACKEND_DIR/logs"
echo "  ✓ Created logs/ directory"

# 5. DATABASE SETUP
echo "[6/6] Database Setup"
SQL_FILE="$PROJECT_ROOT/schema_update.sql"
if [ -f "$SQL_FILE" ]; then
    echo ""
    echo "  📋 Run this SQL in Supabase Dashboard > SQL Editor:"
    echo "     File: $SQL_FILE"
    echo ""
    echo "  Steps:"
    echo "  1. Open https://supabase.com/dashboard"
    echo "  2. Select your project"
    echo "  3. Go to SQL Editor"
    echo "  4. Click 'New Query'"
    echo "  5. Paste contents of schema_update.sql"
    echo "  6. Click 'Run'"
    echo ""
fi

# SUMMARY
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "  1. Edit .env files with your keys:"
echo "     nano $BACKEND_DIR/.env"
echo "     nano $COLLECTOR_DIR/.env"
echo ""
echo "  2. Run schema_update.sql in Supabase SQL Editor"
echo ""
echo "  3. Start services (two terminals):"
echo ""
echo "     Terminal 1 (Data Collector):"
echo "     cd $COLLECTOR_DIR"
echo "     npm start"
echo ""
echo "     Terminal 2 (Backend API):"
echo "     cd $BACKEND_DIR"
echo "     npm run dev"
echo ""
echo "  4. Test: http://localhost:3000/health"
echo ""