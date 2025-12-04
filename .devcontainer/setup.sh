#!/bin/bash
# HolidaiButler - Codespaces Setup Script
# This script installs all dependencies for all modules

set -e

echo "=========================================="
echo "  HolidaiButler - Installing Dependencies"
echo "=========================================="

cd /workspaces/HolidaiButler

# Admin Module Backend
echo ""
echo "[1/4] Installing Admin Module Backend..."
cd /workspaces/HolidaiButler/admin-module/backend
npm install --legacy-peer-deps
echo "✅ Admin Backend dependencies installed"

# Admin Module Frontend
echo ""
echo "[2/4] Installing Admin Module Frontend..."
cd /workspaces/HolidaiButler/admin-module/frontend
npm install --legacy-peer-deps
echo "✅ Admin Frontend dependencies installed"

# Ticketing Module Backend
echo ""
echo "[3/4] Installing Ticketing Module Backend..."
cd /workspaces/HolidaiButler/ticketing-module/backend
npm install --legacy-peer-deps
echo "✅ Ticketing Backend dependencies installed"

# Customer Portal Frontend
echo ""
echo "[4/4] Installing Customer Portal Frontend..."
cd /workspaces/HolidaiButler/customer-portal/frontend
npm install --legacy-peer-deps
echo "✅ Customer Portal dependencies installed"

cd /workspaces/HolidaiButler

echo ""
echo "=========================================="
echo "  ✅ All dependencies installed!"
echo "=========================================="
echo ""
echo "To start services manually, run:"
echo "  bash .devcontainer/start-services.sh"
echo ""
echo "Or start individually:"
echo "  Admin Backend:    cd admin-module/backend && node server.js"
echo "  Admin Frontend:   cd admin-module/frontend && npx vite --host"
echo "  Ticketing:        cd ticketing-module/backend && node server.js"
echo "  Customer Portal:  cd customer-portal/frontend && npx vite --host"
echo ""
