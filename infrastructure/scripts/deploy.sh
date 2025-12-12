#!/bin/bash

###############################################################################
# HolidaiButler Deployment Script
# Deployt alle modules en services
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   🏝️  HolidaiButler Platform Deployment                 ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as correct user
if [ "$EUID" -eq 0 ]; then
   echo -e "${RED}❌ Please do not run as root${NC}"
   exit 1
fi

# Base directory
BASE_DIR="/home/user/HolidaiButler"
cd "$BASE_DIR"

echo -e "${YELLOW}📋 Pre-deployment checks...${NC}"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}Installing PM2...${NC}"
    npm install -g pm2
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"
echo -e "${GREEN}✅ NPM version: $(npm -v)${NC}"
echo -e "${GREEN}✅ PM2 version: $(pm2 -v)${NC}"

# Function to deploy a module
deploy_module() {
    local MODULE_NAME=$1
    local MODULE_PATH=$2

    echo -e "\n${YELLOW}📦 Deploying ${MODULE_NAME}...${NC}"

    if [ ! -d "$MODULE_PATH" ]; then
        echo -e "${RED}❌ Directory not found: ${MODULE_PATH}${NC}"
        return 1
    fi

    cd "$MODULE_PATH"

    # Check for .env file
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            echo -e "${YELLOW}⚠️  No .env file found, copying from .env.example${NC}"
            cp .env.example .env
            echo -e "${YELLOW}⚠️  Please configure .env file before starting${NC}"
        else
            echo -e "${RED}❌ No .env file found${NC}"
            return 1
        fi
    fi

    # Install dependencies
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install --production

    echo -e "${GREEN}✅ ${MODULE_NAME} deployed${NC}"
    cd "$BASE_DIR"
}

# Deploy Platform Core
echo -e "\n${GREEN}═══ Deploying Platform Core ═══${NC}"
deploy_module "Platform Core" "$BASE_DIR/platform-core"

# Deploy Admin Module Backend
echo -e "\n${GREEN}═══ Deploying Admin Module ═══${NC}"
deploy_module "Admin Module Backend" "$BASE_DIR/admin-module/backend"

# Deploy Ticketing Module Backend
echo -e "\n${GREEN}═══ Deploying Ticketing Module ═══${NC}"
deploy_module "Ticketing Module Backend" "$BASE_DIR/ticketing-module/backend"

# Deploy Payment Module Backend
echo -e "\n${GREEN}═══ Deploying Payment Module ═══${NC}"
deploy_module "Payment Module Backend" "$BASE_DIR/payment-module/backend"

# Create logs directories
echo -e "\n${YELLOW}📁 Creating log directories...${NC}"
mkdir -p "$BASE_DIR/platform-core/logs"
mkdir -p "$BASE_DIR/admin-module/backend/logs"
mkdir -p "$BASE_DIR/ticketing-module/backend/logs"
mkdir -p "$BASE_DIR/payment-module/backend/logs"

# Database migrations (if needed)
echo -e "\n${YELLOW}🗄️  Running database migrations...${NC}"
# Uncomment if you have migrations
# cd "$BASE_DIR/ticketing-module/backend"
# npx sequelize-cli db:migrate
# cd "$BASE_DIR/payment-module/backend"
# npx sequelize-cli db:migrate

# Stop existing PM2 processes
echo -e "\n${YELLOW}⏹️  Stopping existing processes...${NC}"
pm2 delete all 2>/dev/null || true

# Start services with PM2
echo -e "\n${GREEN}🚀 Starting services with PM2...${NC}"
cd "$BASE_DIR"
pm2 start ecosystem.config.js

# Wait for services to start
echo -e "\n${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Check health of all services
echo -e "\n${YELLOW}🏥 Health checks...${NC}"

check_health() {
    local SERVICE_NAME=$1
    local URL=$2

    if curl -sf "$URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${SERVICE_NAME} is healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ ${SERVICE_NAME} is not responding${NC}"
        return 1
    fi
}

HEALTH_CHECK_FAILED=0

check_health "Platform Core" "http://localhost:3001/health" || HEALTH_CHECK_FAILED=1
check_health "Admin Module" "http://localhost:3003/health" || HEALTH_CHECK_FAILED=1
check_health "Ticketing Module" "http://localhost:3004/health" || HEALTH_CHECK_FAILED=1
check_health "Payment Module" "http://localhost:3005/health" || HEALTH_CHECK_FAILED=1

# Show PM2 status
echo -e "\n${GREEN}📊 PM2 Process Status:${NC}"
pm2 status

# Save PM2 configuration
echo -e "\n${YELLOW}💾 Saving PM2 configuration...${NC}"
pm2 save

# Setup PM2 startup script (if not already done)
echo -e "\n${YELLOW}🔄 Setting up PM2 startup script...${NC}"
pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true

# Final summary
echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Deployment Complete                                  ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Services running:${NC}"
echo -e "  • Platform Core:    http://localhost:3001"
echo -e "  • Admin Module:     http://localhost:3003"
echo -e "  • Ticketing Module: http://localhost:3004"
echo -e "  • Payment Module:   http://localhost:3005"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  • View logs:        pm2 logs"
echo -e "  • Restart all:      pm2 restart all"
echo -e "  • Stop all:         pm2 stop all"
echo -e "  • Monitor:          pm2 monit"
echo ""

if [ $HEALTH_CHECK_FAILED -eq 1 ]; then
    echo -e "${RED}⚠️  Some services failed health checks. Please check logs:${NC}"
    echo -e "  pm2 logs"
    exit 1
fi

echo -e "${GREEN}🎉 All systems operational!${NC}"
echo ""
