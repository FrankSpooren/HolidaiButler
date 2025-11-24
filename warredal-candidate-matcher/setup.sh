#!/bin/bash

# Warredal Candidate Matcher - Automated Setup Script
# Voor Hetzner Cloud Server

set -e

echo "=================================="
echo "Warredal Candidate Matcher Setup"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Running as root"

# Update system
echo -e "\n${YELLOW}Updating system...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✓${NC} System updated"

# Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "\n${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓${NC} Docker installed"
else
    echo -e "${GREEN}✓${NC} Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "\n${YELLOW}Installing Docker Compose...${NC}"
    apt install docker-compose -y
    echo -e "${GREEN}✓${NC} Docker Compose installed"
else
    echo -e "${GREEN}✓${NC} Docker Compose already installed"
fi

# Setup environment
echo -e "\n${YELLOW}Setting up environment...${NC}"

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Created .env file"

    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 64)

    # Update .env
    sed -i "s/ChangeMeToSecurePassword123!/$DB_PASSWORD/" .env
    sed -i "s/ChangeThisToAVeryLongRandomSecretKey123!/$JWT_SECRET/" .env

    echo -e "${GREEN}✓${NC} Generated secure passwords"
    echo -e "${YELLOW}⚠${NC}  Please edit .env and add your MailerLite API key!"
else
    echo -e "${GREEN}✓${NC} .env already exists"
fi

# Create necessary directories
echo -e "\n${YELLOW}Creating directories...${NC}"
mkdir -p backend/logs
mkdir -p nginx/ssl
echo -e "${GREEN}✓${NC} Directories created"

# Setup firewall
echo -e "\n${YELLOW}Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo -e "${GREEN}✓${NC} Firewall configured"
else
    echo -e "${YELLOW}⚠${NC}  UFW not installed, skipping firewall setup"
fi

# Build and start containers
echo -e "\n${YELLOW}Building and starting containers...${NC}"
docker-compose up -d --build

echo -e "${GREEN}✓${NC} Containers started"

# Wait for database
echo -e "\n${YELLOW}Waiting for database to be ready...${NC}"
sleep 10

# Check services
echo -e "\n${YELLOW}Checking services...${NC}"
docker-compose ps

# Display info
echo -e "\n${GREEN}=================================="
echo "Setup Complete!"
echo "==================================${NC}"
echo ""
echo -e "Backend API:  ${GREEN}http://$(hostname -I | awk '{print $1}'):5000${NC}"
echo -e "Frontend:     ${GREEN}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit .env and add your MailerLite API key"
echo "2. Restart services: docker-compose restart"
echo "3. Create admin user via API (see DEPLOYMENT.md)"
echo "4. Access frontend and login"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  View logs:        docker-compose logs -f"
echo "  Stop services:    docker-compose down"
echo "  Restart services: docker-compose restart"
echo ""
echo -e "${GREEN}Documentation:${NC} See DEPLOYMENT.md for full guide"
echo ""
