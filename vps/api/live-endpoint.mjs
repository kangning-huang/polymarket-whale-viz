#!/usr/bin/env node

/**
 * Live SSE Endpoint for Polybot Arena
 *
 * Serves real-time price and trade data via Server-Sent Events (SSE).
 * Consumes in-memory state from ws_live_aggregator.cjs.
 *
 * Run with: node live-endpoint.mjs
 * Default port: 3001
 */

import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Configuration
const PORT = process.env.PORT || 3001;
const HEARTBEAT_INTERVAL = 30000; // 30s keepalive
const MAX_CONNECTIONS = 500;

const app = express();

// CORS configuration - restrict to production domain
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://polybot-arena.com',
      'https://www.polybot-arena.com',
      'http://localhost:5173', // Development
      'http://127.0.0.1:5173',
    ];

    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Load live state from aggregator
let liveState;
try {
  liveState = require('../ws_live_aggregator.cjs');
  console.log('[SSE] Connected to live aggregator state');
} catch (err) {
  console.error('[SSE] Failed to load aggregator state:', err.message);
  console.error('[SSE] Make sure ws_live_aggregator.cjs is running');
  process.exit(1);
}

// Track active SSE connections
const connections = new Map();
let connectionIdCounter = 0;

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connections: connections.size,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    lastUpdate: liveState.lastUpdate,
  });
});

/**
 * SSE endpoint: /api/live/:coin/:botName
 * Streams real-time price and trade data for a specific bot and coin
 */
app.get('/api/live/:coin/:botName', (req, res) => {
  const { coin, botName } = req.params;

  // Validate parameters
  if (!['btc', 'eth', 'sol'].includes(coin)) {
    return res.status(400).json({ error: 'Invalid coin. Must be btc, eth, or sol' });
  }

  // Check connection limit
  if (connections.size >= MAX_CONNECTIONS) {
    return res.status(503).json({
      error: 'Server at capacity',
      message: 'Too many active connections. Please try again later.',
    });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

  // Assign connection ID
  const connectionId = ++connectionIdCounter;
  const client = {
    id: connectionId,
    coin,
    botName,
    res,
    startTime: Date.now(),
  };

  connections.set(connectionId, client);
  console.log(`[SSE] Client ${connectionId} connected (${botName}/${coin}). Total: ${connections.size}`);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    connectionId,
    coin,
    botName,
    timestamp: Date.now(),
  })}\n\n`);

  // Send initial state snapshot
  sendInitialState(client);

  // Set up heartbeat
  const heartbeat = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(heartbeat);
      return;
    }
    res.write(`: keepalive\n\n`);
  }, HEARTBEAT_INTERVAL);

  // Set up data broadcast (every 1s)
  const broadcast = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(broadcast);
      return;
    }
    sendUpdates(client);
  }, 1000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(broadcast);
    connections.delete(connectionId);
    console.log(`[SSE] Client ${connectionId} disconnected. Total: ${connections.size}`);
  });
});

/**
 * Send initial state snapshot to new client
 */
function sendInitialState(client) {
  const { coin, botName, res } = client;

  try {
    // Send last 15 minutes of price data (900s window)
    const durations = [900]; // Default to 15m
    for (const duration of durations) {
      const prices = liveState.prices[coin]?.[duration] || [];
      if (prices.length > 0) {
        res.write(`data: ${JSON.stringify({
          type: 'initial_prices',
          duration,
          data: prices,
        })}\n\n`);
      }
    }

    // Send recent trades for this bot
    const trades = liveState.trades[coin]?.[botName] || [];
    if (trades.length > 0) {
      res.write(`data: ${JSON.stringify({
        type: 'initial_trades',
        data: trades.slice(0, 20), // Last 20 trades
      })}\n\n`);
    }
  } catch (err) {
    console.error(`[SSE] Error sending initial state:`, err.message);
  }
}

/**
 * Send incremental updates to client
 */
function sendUpdates(client) {
  const { coin, botName, res } = client;

  try {
    // Send latest price point
    const duration = 900; // 15m default
    const prices = liveState.prices[coin]?.[duration] || [];
    if (prices.length > 0) {
      const latestPrice = prices[prices.length - 1];
      res.write(`data: ${JSON.stringify({
        type: 'price',
        data: latestPrice,
        timestamp: Date.now(),
      })}\n\n`);
    }

    // Send new trades (if any appeared in last 2 seconds)
    const trades = liveState.trades[coin]?.[botName] || [];
    const recentTrades = trades.filter(t => {
      const tradeAge = Date.now() / 1000 - t.ts;
      return tradeAge < 2; // Trades from last 2 seconds
    });

    for (const trade of recentTrades) {
      res.write(`data: ${JSON.stringify({
        type: 'trade',
        data: trade,
        timestamp: Date.now(),
      })}\n\n`);
    }
  } catch (err) {
    console.error(`[SSE] Error sending updates:`, err.message);
  }
}

/**
 * Debug endpoint to inspect current state
 */
app.get('/api/debug/state', (req, res) => {
  const summary = {
    prices: Object.keys(liveState.prices).reduce((acc, coin) => {
      acc[coin] = Object.keys(liveState.prices[coin]).reduce((durAcc, dur) => {
        durAcc[dur] = liveState.prices[coin][dur].length;
        return durAcc;
      }, {});
      return acc;
    }, {}),
    trades: Object.keys(liveState.trades).reduce((acc, coin) => {
      acc[coin] = Object.keys(liveState.trades[coin]).reduce((botAcc, bot) => {
        botAcc[bot] = liveState.trades[coin][bot].length;
        return botAcc;
      }, {});
      return acc;
    }, {}),
    connections: connections.size,
    lastUpdate: liveState.lastUpdate,
  };

  res.json(summary);
});

/**
 * Connection metrics endpoint
 */
app.get('/api/metrics', (req, res) => {
  const metrics = {
    activeConnections: connections.size,
    maxConnections: MAX_CONNECTIONS,
    utilizationPercent: Math.round((connections.size / MAX_CONNECTIONS) * 100),
    clientsByBot: {},
    clientsByCoin: {},
    uptime: process.uptime(),
  };

  // Aggregate by bot and coin
  for (const client of connections.values()) {
    metrics.clientsByBot[client.botName] = (metrics.clientsByBot[client.botName] || 0) + 1;
    metrics.clientsByCoin[client.coin] = (metrics.clientsByCoin[client.coin] || 0) + 1;
  }

  res.json(metrics);
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`[SSE] Live endpoint listening on port ${PORT}`);
  console.log(`[SSE] Max connections: ${MAX_CONNECTIONS}`);
  console.log(`[SSE] Heartbeat interval: ${HEARTBEAT_INTERVAL}ms`);
  console.log(`[SSE] CORS allowed origins: polybot-arena.com, localhost:5173`);
  console.log(`[SSE] Health check: http://localhost:${PORT}/health`);
  console.log(`[SSE] Metrics: http://localhost:${PORT}/api/metrics`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SSE] SIGTERM received, closing server...');
  // Close all SSE connections
  for (const client of connections.values()) {
    client.res.end();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SSE] SIGINT received, closing server...');
  for (const client of connections.values()) {
    client.res.end();
  }
  process.exit(0);
});
