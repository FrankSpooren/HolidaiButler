#!/bin/bash
# HolidaiButler - Start All Services
# Run this script to start all backend and frontend services

echo "=========================================="
echo "  HolidaiButler - Starting Services"
echo "=========================================="
echo ""
echo "Starting services in background..."
echo "Check the PORTS tab to access the applications."
echo ""

cd /workspaces/HolidaiButler

# Start Admin Backend (port 3003)
echo "[1/4] Starting Admin Backend on port 3003..."
cd /workspaces/HolidaiButler/admin-module/backend
nohup node server.js > /tmp/admin-backend.log 2>&1 &
ADMIN_BACKEND_PID=$!
echo "  PID: $ADMIN_BACKEND_PID"

# Wait a moment for backend to start
sleep 2

# Start Ticketing Backend (port 3004)
echo "[2/4] Starting Ticketing Backend on port 3004..."
cd /workspaces/HolidaiButler/ticketing-module/backend
nohup node server.js > /tmp/ticketing-backend.log 2>&1 &
TICKETING_PID=$!
echo "  PID: $TICKETING_PID"

# Wait a moment
sleep 2

# Start Admin Frontend (port 5173)
echo "[3/4] Starting Admin Frontend on port 5173..."
cd /workspaces/HolidaiButler/admin-module/frontend
nohup npx vite --host > /tmp/admin-frontend.log 2>&1 &
ADMIN_FRONTEND_PID=$!
echo "  PID: $ADMIN_FRONTEND_PID"

# Start Customer Portal (port 5174)
echo "[4/4] Starting Customer Portal on port 5174..."
cd /workspaces/HolidaiButler/customer-portal/frontend
nohup npx vite --host --port 5174 > /tmp/customer-portal.log 2>&1 &
CUSTOMER_PORTAL_PID=$!
echo "  PID: $CUSTOMER_PORTAL_PID"

cd /workspaces/HolidaiButler

echo ""
echo "=========================================="
echo "  ✅ All services starting!"
echo "=========================================="
echo ""
echo "Services:"
echo "  Admin Backend:    http://localhost:3003 (PID: $ADMIN_BACKEND_PID)"
echo "  Ticketing API:    http://localhost:3004 (PID: $TICKETING_PID)"
echo "  Admin Frontend:   http://localhost:5173 (PID: $ADMIN_FRONTEND_PID)"
echo "  Customer Portal:  http://localhost:5174 (PID: $CUSTOMER_PORTAL_PID)"
echo ""
echo "IMPORTANT: In Codespaces, use the PORTS tab to access these URLs!"
echo "Make sure ports 3003 and 3004 are set to PUBLIC for login to work."
echo ""
echo "Logs:"
echo "  tail -f /tmp/admin-backend.log"
echo "  tail -f /tmp/ticketing-backend.log"
echo "  tail -f /tmp/admin-frontend.log"
echo "  tail -f /tmp/customer-portal.log"
echo ""
echo "To stop all services:"
echo "  pkill -f 'node server.js' && pkill -f 'vite'"
echo ""
