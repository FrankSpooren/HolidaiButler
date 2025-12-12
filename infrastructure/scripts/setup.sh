#!/bin/bash

###############################################################################
# HolidaiButler Initial Setup Script
# First-time setup voor het platform
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🏝️  HolidaiButler Platform Setup                      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

BASE_DIR="/home/user/HolidaiButler"

# Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js version OK: $(node -v)${NC}"

# Install global dependencies
echo -e "\n${YELLOW}Installing global dependencies...${NC}"
npm install -g pm2 nodemon

# Setup Platform Core
echo -e "\n${GREEN}═══ Setting up Platform Core ═══${NC}"
cd "$BASE_DIR/platform-core"

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.example .env

    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env

    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  Please configure database and MailerLite credentials in .env${NC}"
fi

npm install

# Setup other modules
for MODULE in "admin-module/backend" "ticketing-module/backend" "payment-module/backend"; do
    echo -e "\n${GREEN}═══ Setting up $MODULE ═══${NC}"
    cd "$BASE_DIR/$MODULE"

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            echo -e "${GREEN}✅ .env file created for $MODULE${NC}"
        fi
    fi

    npm install
done

# Create log directories
echo -e "\n${YELLOW}Creating log directories...${NC}"
mkdir -p "$BASE_DIR/platform-core/logs"
mkdir -p "$BASE_DIR/admin-module/backend/logs"
mkdir -p "$BASE_DIR/ticketing-module/backend/logs"
mkdir -p "$BASE_DIR/payment-module/backend/logs"

# Make scripts executable
echo -e "\n${YELLOW}Making scripts executable...${NC}"
chmod +x "$BASE_DIR/scripts/"*.sh

echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Setup Complete                                       ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Configure .env files in each module"
echo -e "  2. Setup databases (MySQL, MongoDB, Redis)"
echo -e "  3. Configure MailerLite API key"
echo -e "  4. Run deployment: ./scripts/deploy.sh"
echo ""
