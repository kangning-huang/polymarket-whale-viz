# Polybot Arena Live Backend - VPS Deployment Guide

This directory contains the backend infrastructure for the live trading view feature.

## Architecture

```
┌─────────────────────────────────────────┐
│ Polymarket CLOB WebSocket (existing)    │
│ /opt/polymarket/bots/ws_price_recorder  │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ ws_live_aggregator.cjs (NEW)            │
│ - Reads price files from recorder       │
│ - Polls Data API for trades (0.7s)      │
│ - Maintains in-memory rolling window    │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ live-endpoint.mjs (NEW)                 │
│ Express SSE server on port 3001         │
│ - Serves /api/live/:coin/:botName       │
│ - Broadcasts price + trade updates      │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ Nginx Reverse Proxy                     │
│ api.polybot-arena.com → localhost:3001  │
│ SSL termination (Let's Encrypt)         │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ Frontend (polybot-arena.com)            │
│ EventSource SSE connection              │
└─────────────────────────────────────────┘
```

## Prerequisites

- VPS with Node.js 18+ (current: root@76.13.103.1)
- Existing `ws_price_recorder.cjs` running
- Data directory: `/opt/polymarket/data/raw/prices/`
- Traders config: `/opt/polymarket/bots/scripts/traders.json`

## Installation

### 1. DNS Configuration

```bash
# Add A record (via your DNS provider, e.g., Cloudflare):
api.polybot-arena.com → A → 76.13.103.1

# Verify:
dig api.polybot-arena.com +short
# Should return: 76.13.103.1
```

### 2. Deploy to VPS

```bash
# SSH into VPS
ssh root@76.13.103.1

# Create directory
mkdir -p /opt/polymarket/bots/live-backend
cd /opt/polymarket/bots/live-backend

# Copy files from this directory (vps/) to VPS
# Using scp from your local machine:
```

From your local machine:
```bash
cd /path/to/polymarket-whale-viz/vps
scp -r * root@76.13.103.1:/opt/polymarket/bots/live-backend/
```

Back on VPS:
```bash
cd /opt/polymarket/bots/live-backend

# Install dependencies
npm install

# Install PM2 globally (if not already installed)
npm install -g pm2
```

### 3. Configure Nginx

```bash
# Copy Nginx config
sudo cp nginx/api.polybot-arena.conf /etc/nginx/sites-available/polybot-api

# Create symlink
sudo ln -s /etc/nginx/sites-available/polybot-api /etc/nginx/sites-enabled/

# Get SSL certificate (Let's Encrypt)
sudo certbot certonly --nginx -d api.polybot-arena.com

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 4. Start Services

```bash
# Start with PM2
pm2 start ecosystem.config.cjs

# Save PM2 config for auto-restart on reboot
pm2 save
pm2 startup

# Monitor logs
pm2 logs
```

## Verification

### 1. Check Services

```bash
# View PM2 processes
pm2 list

# Should show:
# ┌──────────────────┬────┬──────┬───────┐
# │ name             │ id │ mode │ status│
# ├──────────────────┼────┼──────┼───────┤
# │ live-aggregator  │ 0  │ fork │ online│
# │ live-api         │ 1  │ fork │ online│
# └──────────────────┴────┴──────┴───────┘
```

### 2. Test SSE Endpoint

```bash
# From VPS (localhost)
curl -N http://localhost:3001/health

# From anywhere (via Nginx)
curl -N https://api.polybot-arena.com/health

# Test SSE stream (should show continuous data)
curl -N https://api.polybot-arena.com/api/live/btc/Archer
# Press Ctrl+C to stop after seeing data
```

### 3. Check Metrics

```bash
curl https://api.polybot-arena.com/api/metrics
```

Expected response:
```json
{
  "activeConnections": 0,
  "maxConnections": 500,
  "utilizationPercent": 0,
  "uptime": 123.456
}
```

### 4. Test CORS

From browser console on https://polybot-arena.com:
```javascript
const es = new EventSource('https://api.polybot-arena.com/api/live/btc/Archer');
es.onmessage = (e) => console.log('Received:', e.data);
es.onerror = (e) => console.error('Error:', e);
```

## Monitoring

### View Logs

```bash
# Live tail all logs
pm2 logs

# Specific service
pm2 logs live-aggregator
pm2 logs live-api

# Nginx access logs
sudo tail -f /var/log/nginx/api.polybot-arena.access.log

# Nginx error logs
sudo tail -f /var/log/nginx/api.polybot-arena.error.log
```

### Resource Usage

```bash
# PM2 monitoring dashboard
pm2 monit

# Memory usage
pm2 list
free -h

# CPU usage
top -bn1 | grep -E '(live-aggregator|live-api|node)'

# Connection count
netstat -an | grep :3001 | grep ESTABLISHED | wc -l
```

### Health Checks

```bash
# Check if services are running
pm2 status

# Restart if needed
pm2 restart all

# View recent errors
pm2 logs --err --lines 50
```

## Scaling & Capacity

### Current VPS Capacity
- **Safe limit:** 150-200 concurrent SSE connections
- **Memory per connection:** ~50 KB
- **CPU per connection:** ~0.1% during broadcasts
- **Network per connection:** ~10 KB/s

### Monitoring Alerts

Set up alerts when:
- Active connections > 150 (sustained for 1+ week)
- Memory usage > 70%
- CPU load > 1.0
- SSE connection timeouts increasing

### Upgrade to KVM 8

When sustained >150 concurrent viewers OR revenue >$100/month:

```bash
# Hostinger KVM 8 specs:
# - 8 vCPU, 16 GB RAM, 200 GB NVMe
# - Capacity: 500-1000 concurrent viewers
# - Cost: ~$50/month
```

## Troubleshooting

### Issue: No SSE data streaming

```bash
# Check aggregator is reading price files
pm2 logs live-aggregator | grep "Updated prices"

# Check if ws_price_recorder.cjs is running
ps aux | grep ws_price_recorder

# Check price files exist
ls -lh /opt/polymarket/data/raw/prices/ | head -20
```

### Issue: CORS errors in browser

```bash
# Check Nginx CORS headers
curl -I https://api.polybot-arena.com/health

# Should see:
# Access-Control-Allow-Origin: https://polybot-arena.com
```

### Issue: SSL certificate expired

```bash
# Renew Let's Encrypt cert
sudo certbot renew

# Reload Nginx
sudo systemctl reload nginx
```

### Issue: High memory usage

```bash
# Restart services
pm2 restart all

# Check for memory leaks
pm2 logs | grep "memory"

# Monitor memory over time
watch -n 5 'free -h && pm2 list'
```

### Issue: Connection timeouts

```bash
# Check Nginx timeout settings
sudo nano /etc/nginx/sites-available/polybot-api
# Ensure proxy_read_timeout is 3600s

# Check firewall
sudo ufw status
sudo ufw allow 443/tcp
```

## Maintenance

### Daily

- Monitor PM2 logs for errors: `pm2 logs --err --lines 100`
- Check connection count: `curl https://api.polybot-arena.com/api/metrics`

### Weekly

- Review resource usage trends
- Check for PM2 restarts (sign of crashes): `pm2 list`
- Verify SSL cert validity: `sudo certbot certificates`

### Monthly

- Update dependencies: `npm update`
- Restart services: `pm2 restart all`
- Clean old logs: `pm2 flush`

## Security

### Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (redirects to HTTPS)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Rate Limiting (Optional)

Add to Nginx config:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/live/ {
    limit_req zone=api_limit burst=20 nodelay;
    # ... existing proxy config
}
```

### IP Blocking (if abuse detected)

```bash
# Block specific IP in Nginx
sudo nano /etc/nginx/sites-available/polybot-api

# Add before location blocks:
# deny 1.2.3.4;

sudo systemctl reload nginx
```

## Rollback

If issues occur, quickly disable live backend:

```bash
# Stop services
pm2 stop all

# Or remove Nginx config
sudo rm /etc/nginx/sites-enabled/polybot-api
sudo systemctl reload nginx
```

Frontend will auto-fallback to historical mode after 10s of no SSE connection.

## Support

- PM2 docs: https://pm2.keymetrics.io/docs/usage/quick-start/
- Let's Encrypt: https://certbot.eff.org/
- Nginx SSE guide: https://nginx.org/en/docs/http/ngx_http_core_module.html#chunked_transfer_encoding
