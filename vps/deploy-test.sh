#!/bin/bash

# Deploy Live Trading Backend to VPS for Testing
# NO DNS setup - access via IP only

set -e

# SSH configuration
SSH_KEY="../config/config_US_east_VPS/id_ed25519"
VPS_HOST="root@76.13.103.1"
VPS_DIR="/opt/polymarket/bots/live-api"
LOCAL_VPS_DIR="$(dirname "$0")"

# SSH command with key
SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"
SCP_CMD="scp -i $SSH_KEY -o StrictHostKeyChecking=no"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   🚀 Deploying Live Trading Backend to VPS (TEST MODE)   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "VPS: $VPS_HOST"
echo "Target: $VPS_DIR"
echo "Access: http://76.13.103.1:3001 (NO DNS yet)"
echo ""

# Step 1: Create directories on VPS
echo "[1/6] Creating directories on VPS..."
$SSH_CMD "$VPS_HOST" "mkdir -p $VPS_DIR/api $VPS_DIR/scripts"

# Step 2: Upload backend files
echo "[2/6] Uploading backend files..."
$SCP_CMD "$LOCAL_VPS_DIR/ws_live_aggregator.cjs" "$VPS_HOST:$VPS_DIR/"
$SCP_CMD "$LOCAL_VPS_DIR/api/live-endpoint.mjs" "$VPS_HOST:$VPS_DIR/api/"
$SCP_CMD "$LOCAL_VPS_DIR/package.json" "$VPS_HOST:$VPS_DIR/"
$SCP_CMD "$LOCAL_VPS_DIR/ecosystem.config.cjs" "$VPS_HOST:$VPS_DIR/"
$SCP_CMD "$LOCAL_VPS_DIR/../scripts/traders.json" "$VPS_HOST:$VPS_DIR/scripts/"

# Step 3: Install dependencies
echo "[3/6] Installing dependencies on VPS..."
$SSH_CMD "$VPS_HOST" "cd $VPS_DIR && npm install"

# Step 3.5: Install PM2 globally if not present
echo "[3.5/6] Ensuring PM2 is installed..."
$SSH_CMD "$VPS_HOST" "which pm2 || npm install -g pm2"

# Step 4: Stop any existing services
echo "[4/6] Stopping existing services (if any)..."
$SSH_CMD "$VPS_HOST" "pm2 delete live-aggregator live-api 2>/dev/null || true"

# Step 5: Start services with PM2
echo "[5/6] Starting services with PM2..."
$SSH_CMD "$VPS_HOST" "cd $VPS_DIR && pm2 start ecosystem.config.cjs"

# Step 6: Verify services
echo "[6/6] Verifying services..."
sleep 2
$SSH_CMD "$VPS_HOST" "pm2 list | grep -E 'live-aggregator|live-api'"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ✅ Deployment Complete                                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Test endpoints:"
echo "  Health:  curl http://76.13.103.1:3001/health"
echo "  SSE:     curl -N http://76.13.103.1:3001/api/live/btc/distinct-baguette"
echo ""
echo "View logs:"
echo "  ssh $VPS_HOST 'pm2 logs live-api'"
echo ""
echo "Next: Update .env.development to use VPS IP"
