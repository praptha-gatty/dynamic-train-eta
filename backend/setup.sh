#!/bin/bash
# ============================================================
# Dynamic Train ETA - Auto Setup Script
# Installs Node.js 20+, dependencies, creates .env files
# ============================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running from backend directory
if [[ ! -f "package.json" ]] || [[ ! -f ".env.example" ]]; then
    log_error "Run this script from the backend/ directory"
    exit 1
fi

log_info "Starting Dynamic Train ETA Backend Setup..."

# ============================================================
# 1. Check/Install Node.js 20+
# ============================================================
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | sed 's/v//')
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)
        if [[ $MAJOR_VERSION -ge 20 ]]; then
            log_success "Node.js $NODE_VERSION found (>=20 required)"
            return 0
        else
            log_warn "Node.js $NODE_VERSION found, but >=20 required"
            return 1
        fi
    else
        log_warn "Node.js not found"
        return 1
    fi
}

install_node() {
    log_info "Installing Node.js 20+..."
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux - try multiple methods
        if command -v apt-get &> /dev/null; then
            log_info "Installing via apt (Ubuntu/Debian)..."
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v dnf &> /dev/null; then
            log_info "Installing via dnf (Fedora/RHEL)..."
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            sudo dnf install -y nodejs
        elif command -v pacman &> /dev/null; then
            log_info "Installing via pacman (Arch)..."
            sudo pacman -S nodejs npm
        else
            log_error "Unsupported Linux distro. Install Node.js 20+ manually from nodejs.org"
            exit 1
        fi
        
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            log_info "Installing via Homebrew..."
            brew install node@20
            brew link --force --overwrite node@20
        else
            log_error "Homebrew not found. Install from nodejs.org or install Homebrew first"
            exit 1
        fi
        
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # Windows (Git Bash / WSL)
        if command -v winget &> /dev/null; then
            log_info "Installing via winget..."
            winget install OpenJS.NodeJS.LTS
        elif command -v choco &> /dev/null; then
            log_info "Installing via Chocolatey..."
            choco install nodejs-lts --version=20.x
        elif command -v scoop &> /dev/null; then
            log_info "Installing via Scoop..."
            scoop install nodejs-lts
        else
            log_error "No package manager found. Install Node.js 20+ manually from nodejs.org"
            log_info "After installing, restart your terminal and run this script again"
            exit 1
        fi
    else
        log_error "Unsupported OS: $OSTYPE. Install Node.js 20+ manually from nodejs.org"
        exit 1
    fi
    
    # Verify installation
    if check_node; then
        log_success "Node.js installed successfully"
    else
        log_error "Node.js installation failed. Please install manually from nodejs.org"
        exit 1
    fi
}

# Run Node.js check/install
if ! check_node; then
    install_node
fi

# ============================================================
# 2. Install npm dependencies
# ============================================================
log_info "Installing backend dependencies..."
npm install

# ============================================================
# 3. Create .env from template if missing
# ============================================================
if [[ ! -f ".env" ]]; then
    log_info "Creating .env from .env.example..."
    cp .env.example .env
    log_warn "IMPORTANT: Edit .env with your actual API keys!"
else
    log_success ".env already exists"
fi

# ============================================================
# 4. Setup data-collector
# ============================================================
COLLECTOR_DIR="../data-collector"
if [[ -d "$COLLECTOR_DIR" ]]; then
    log_info "Setting up data-collector..."
    
    # Create .env for collector if missing
    if [[ ! -f "$COLLECTOR_DIR/.env" ]]; then
        log_info "Creating data-collector/.env from backend/.env..."
        cp .env "$COLLECTOR_DIR/.env"
        log_warn "Edit data-collector/.env if keys differ from backend"
    fi
    
    # Install collector dependencies
    log_info "Installing data-collector dependencies..."
    cd "$COLLECTOR_DIR"
    npm install
    cd - > /dev/null
    
    log_success "Data collector ready"
else
    log_warn "data-collector directory not found at $COLLECTOR_DIR"
fi

# ============================================================
# 5. Verify Supabase connection
# ============================================================
log_info "Testing Supabase connection..."
node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.from('train_current_status').select('count').limit(1);
if (error && error.code !== 'PGRST116') {
    console.error('❌ Supabase error:', error.message);
    process.exit(1);
} else {
    console.log('✅ Supabase connection OK');
}
" 2>/dev/null || log_warn "Supabase test skipped (tables may not exist yet - run schema_update.sql)"

# ============================================================
# 6. Summary
# ============================================================
echo ""
log_success "=== SETUP COMPLETE ==="
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your REAL API keys"
echo "  2. Run schema_update.sql in Supabase Dashboard → SQL Editor"
echo "  3. Start services (needs 2 terminals):"
echo ""
echo "     Terminal 1 (Data Collector):"
echo "       cd ../data-collector && npm start"
echo ""
echo "     Terminal 2 (Backend API):"
echo "       cd backend && npm run dev"
echo ""
echo "  4. Test: curl http://localhost:3000/health"
echo ""
log_info "For Docker deployment: cd backend && docker-compose up -d --build"