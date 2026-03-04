#!/bin/bash

# Deploy Frontend to VPS for Testing
# Serves built frontend on port 8080

set -e

SSH_KEY="../config/config_US_east_VPS/id_ed25519"
VPS_HOST="root@76.13.103.1"
VPS_DIR="/opt/polymarket/frontend"
LOCAL_DIST_DIR="../dist"

SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"
SCP_CMD="scp -i $SSH_KEY -o StrictHostKeyChecking=no"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   🚀 Deploying Frontend to VPS (TEST MODE)               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "VPS: $VPS_HOST"
echo "Target: $VPS_DIR"
echo "Access: http://76.13.103.1:8080"
echo ""

# Step 1: Create directory on VPS
echo "[1/4] Creating directory on VPS..."
$SSH_CMD "$VPS_HOST" "mkdir -p $VPS_DIR"

# Step 2: Upload dist folder
echo "[2/4] Uploading built frontend..."
$SCP_CMD -r "$LOCAL_DIST_DIR"/* "$VPS_HOST:$VPS_DIR/"

# Step 3: Install serve if not present
echo "[3/4] Ensuring static file server is installed..."
$SSH_CMD "$VPS_HOST" "which serve || npm install -g serve"

# Step 4: Start static file server with PM2
echo "[4/4] Starting static file server..."
$SSH_CMD "$VPS_HOST" "pm2 delete frontend 2>/dev/null || true"
$SSH_CMD "$VPS_HOST" "cd $VPS_DIR && pm2 start 'serve -s . -l 8080' --name frontend"

# Verify
sleep 2
$SSH_CMD "$VPS_HOST" "pm2 list | grep frontend"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ✅ Frontend Deployment Complete                         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Access your site:"
echo "  http://76.13.103.1:8080"
echo ""
echo "Backend API:"
echo "  http://76.13.103.1:3001"
echo ""
echo "View logs:"
echo "  ssh $VPS_HOST 'pm2 logs frontend'"
echo ""
