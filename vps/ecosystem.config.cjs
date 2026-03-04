/**
 * PM2 Ecosystem Configuration for Polybot Arena Live Backend
 *
 * Manages two processes:
 * 1. ws_live_aggregator.cjs - Data aggregation from WebSocket and API
 * 2. live-endpoint.mjs - Express SSE server
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 logs
 *   pm2 restart all
 *   pm2 stop all
 */

module.exports = {
  apps: [
    {
      name: 'live-aggregator',
      script: './ws_live_aggregator.cjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        RUNTIME_SEC: 0, // Run indefinitely
      },
      error_file: '/var/log/pm2/live-aggregator-error.log',
      out_file: '/var/log/pm2/live-aggregator-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'live-api',
      script: './api/live-endpoint.mjs',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/pm2/live-api-error.log',
      out_file: '/var/log/pm2/live-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
