'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// ---------------------------------------------------------------------------
// Route imports
// ---------------------------------------------------------------------------
const objectsRouter = require('./routes/objects');
const clusterRouter = require('./routes/cluster');
const chaosRouter   = require('./routes/chaos');

// ---------------------------------------------------------------------------
// Service daemon imports
// ---------------------------------------------------------------------------
const { startHeartbeatDaemon } = require('./services/heartbeat');
const { startHealerDaemon }    = require('./services/healer');
const { startScrubberDaemon }  = require('./services/scrubber');

// ---------------------------------------------------------------------------
// App + HTTP server + Socket.IO
// ---------------------------------------------------------------------------
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});

// Export io so services / routes can emit events
module.exports.io = io;

// ---------------------------------------------------------------------------
// Security & Hardening Middleware
// ---------------------------------------------------------------------------
// Enterprise HTTP Security Headers (OWASP Top 10 compliance)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data: blob:; connect-src 'self' https: wss: ws:;"
  );
  res.removeHeader('X-Powered-By');
  next();
});

// In-Memory Sliding Window Rate Limiter (Protects against DoS / brute force)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 300;

function apiRateLimiter(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW_MS;
  } else {
    record.count++;
  }
  rateLimitMap.set(ip, record);

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count));

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please retry in a few moments.',
      retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
    });
  }
  next();
}

// CORS & Parsing
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply Rate Limiting to API Routes
app.use('/api/', apiRateLimiter);

// Serve static frontend bundle
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.use(express.static(path.join(__dirname, '../frontend'), { maxAge: '1h' }));

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/v1/objects', objectsRouter);
app.use('/api/v1/cluster', clusterRouter);
app.use('/api/v1/chaos',   chaosRouter);

// Health check probe
app.get('/api/health', (_req, res) =>
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '5.2.0',
    platform: 'Vault Distributed Storage Platform'
  })
);

// Catch-all: serve the SPA index for unmatched GET routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found', path: req.path });
  }
  const indexPath = path.join(__dirname, 'public/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next(err);
  });
});

// Centralized Secure Error Boundary (Prevents Stack Trace Leakage)
app.use((err, _req, res, _next) => {
  console.error('Unhandled Application Error:', err.message);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isDev ? err.message : 'An unexpected security-verified error occurred.',
    timestamp: new Date().toISOString()
  });
});

// ---------------------------------------------------------------------------
// WebSocket connection handling
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`📡  Client connected    : ${socket.id}`);
  socket.on('disconnect', () =>
    console.log(`📴  Client disconnected : ${socket.id}`)
  );
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🔐  Vault Gateway running at http://localhost:${PORT}`);
  console.log(`📡  WebSocket server ready`);
  console.log(`🗄️   Database: ${process.env.DB_PATH || './vault.db'}\n`);

  // Background daemons
  startHeartbeatDaemon(io);
  startHealerDaemon(io);
  startScrubberDaemon(io);
});
