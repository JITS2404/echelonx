import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

// Thresholds for anomaly detection
const SLOW_REQUEST_MS      = 3000;   // warn if a request takes longer than 3s
const ERROR_WINDOW_MS      = 60_000; // 1-minute rolling window
const ERROR_SPIKE_THRESHOLD = 20;    // warn if >20 errors in 1 minute from same IP

// Rolling error counter per IP — lightweight in-process tracker
const errorCounts = new Map(); // ip -> [timestamp, ...]

function recordError(ip) {
  const now = Date.now();
  const times = (errorCounts.get(ip) || []).filter(t => now - t < ERROR_WINDOW_MS);
  times.push(now);
  errorCounts.set(ip, times);
  return times.length;
}

// Purge stale entries every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of errorCounts.entries()) {
    const fresh = times.filter(t => now - t < ERROR_WINDOW_MS);
    if (fresh.length === 0) errorCounts.delete(ip);
    else errorCounts.set(ip, fresh);
  }
}, 5 * 60 * 1000);

export function httpLogger(req, res, next) {
  // Attach a unique request ID — propagated to all log lines for this request
  const requestId = uuidv4();
  req.requestId   = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start  = Date.now();
  const ip     = req.ip || req.socket?.remoteAddress || 'unknown';
  const method = req.method;
  const url    = req.originalUrl || req.url;

  // Log on response finish so we capture the final status code and duration
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status   = res.statusCode;
    const userId   = req.user?.userId ?? null;

    const meta = { method, url, status, duration, ip, userId, requestId };

    // Slow request anomaly
    if (duration > SLOW_REQUEST_MS) {
      logger.warn('SLOW_REQUEST', { ...meta, threshold: SLOW_REQUEST_MS });
    }

    // Error spike anomaly — track 4xx/5xx per IP
    if (status >= 400) {
      const count = recordError(ip);
      if (count >= ERROR_SPIKE_THRESHOLD) {
        logger.warn('ERROR_SPIKE_DETECTED', {
          ip, errorCount: count, windowMs: ERROR_WINDOW_MS, requestId,
        });
      }
    }

    // Standard request log
    if (status >= 500) {
      logger.error('HTTP_REQUEST', meta);
    } else if (status >= 400) {
      logger.warn('HTTP_REQUEST', meta);
    } else {
      logger.info('HTTP_REQUEST', meta);
    }
  });

  next();
}
