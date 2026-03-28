import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { audit } from '../config/logger.js';
import logger from '../config/logger.js';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Key generator that uses the authenticated user ID when available,
 * falling back to IP. This prevents a single user from bypassing
 * per-IP limits by rotating IPs, and prevents all users behind a
 * shared NAT/proxy from sharing one bucket.
 */
function userOrIpKey(req) {
  return req.user?.userId
    ? `uid:${req.user.userId}`
    : `ip:${ipKeyGenerator(req)}`;
}

/** Key by IP only — used for unauthenticated routes (login, register). */
function ipKey(req) {
  return `ip:${ipKeyGenerator(req)}`;
}

/**
 * Key by normalised email + IP — used for login/register so a
 * distributed attack against one account is caught even across IPs.
 * Falls back to IP if no email in body.
 */
function emailAndIpKey(req) {
  const email = (req.body?.email ?? '').toLowerCase().trim();
  const ip = ipKeyGenerator(req);
  return email ? `email:${email}|ip:${ip}` : `ip:${ip}`;
}

/** Shared handler factory — logs the block and returns a consistent 429. */
function makeHandler(event, message) {
  return (req, res) => {
    const retryAfter = Math.ceil(
      (res.getHeader('X-RateLimit-Reset') - Date.now() / 1000)
    ) || 60;

    logger.warn(`RATE_LIMIT_${event}`, {
      ip:        req.ip,
      userId:    req.user?.userId ?? null,
      path:      req.originalUrl,
      requestId: req.requestId,
    });

    if (event === 'LOGIN') audit.loginBlocked(req.ip, req.requestId);

    res.set('Retry-After', String(retryAfter));
    res.status(429).json({ error: message, retryAfter });
  };
}

/** Shared options applied to every limiter. */
const BASE_OPTIONS = {
  standardHeaders: true,   // RateLimit-* headers (RFC 6585)
  legacyHeaders:   false,  // disable X-RateLimit-* legacy headers
  skipSuccessfulRequests: false,
};

// ─────────────────────────────────────────────────────────────
// Bot / scraper fingerprint rejection
// ─────────────────────────────────────────────────────────────

// Known bad User-Agent substrings — bots, scrapers, scanners
const BOT_UA_PATTERNS = [
  /python-requests/i,
  /go-http-client/i,
  /curl\//i,
  /wget\//i,
  /scrapy/i,
  /httpx/i,
  /axios\/0\.[0-9]/i,   // very old axios versions used by scripts
  /java\/[0-9]/i,
  /libwww-perl/i,
  /masscan/i,
  /nikto/i,
  /sqlmap/i,
  /nmap/i,
  /zgrab/i,
  /nuclei/i,
];

/**
 * Middleware that rejects requests from known bot/scanner User-Agents.
 * Legitimate browsers and the frontend app always send a real UA.
 * Applied only to public/unauthenticated routes — authenticated API
 * calls are already protected by JWT.
 */
export function rejectBots(req, res, next) {
  const ua = req.headers['user-agent'] ?? '';

  // Completely missing User-Agent is a strong bot signal on public routes
  if (!ua) {
    logger.warn('BOT_NO_UA', { ip: req.ip, path: req.originalUrl, requestId: req.requestId });
    return res.status(400).json({ error: 'Bad request.' });
  }

  if (BOT_UA_PATTERNS.some(p => p.test(ua))) {
    logger.warn('BOT_UA_BLOCKED', { ip: req.ip, ua, path: req.originalUrl, requestId: req.requestId });
    return res.status(403).json({ error: 'Forbidden.' });
  }

  next();
}

// ─────────────────────────────────────────────────────────────
// Auth route limiters  (unauthenticated — key by email + IP)
// ─────────────────────────────────────────────────────────────

/**
 * Login: 5 attempts per email+IP per 15 minutes.
 * Stops credential-stuffing and password-spraying even when the
 * attacker rotates IPs.
 */
export const loginLimiter = rateLimit({
  ...BASE_OPTIONS,
  windowMs: parseInt(process.env.RATE_LOGIN_WINDOW_MS  ?? '900000', 10),  // 15 min
  max:      parseInt(process.env.RATE_LOGIN_MAX         ?? '5',      10),
  keyGenerator: emailAndIpKey,
  handler: makeHandler('LOGIN', 'Too many login attempts. Try again in 15 minutes.'),
});

/**
 * Register: 5 accounts per IP per hour.
 * Prevents mass account creation from a single source.
 */
export const registerLimiter = rateLimit({
  ...BASE_OPTIONS,
  windowMs: parseInt(process.env.RATE_REGISTER_WINDOW_MS ?? '3600000', 10), // 1 hr
  max:      parseInt(process.env.RATE_REGISTER_MAX        ?? '5',       10),
  keyGenerator: ipKey,
  handler: makeHandler('REGISTER', 'Too many registration attempts. Try again later.'),
});

/**
 * Password reset: 5 requests per IP per hour.
 * Prevents email flooding / reset-link enumeration.
 */
export const passwordResetLimiter = rateLimit({
  ...BASE_OPTIONS,
  windowMs: parseInt(process.env.RATE_RESET_WINDOW_MS ?? '3600000', 10), // 1 hr
  max:      parseInt(process.env.RATE_RESET_MAX        ?? '5',       10),
  keyGenerator: ipKey,
  handler: makeHandler('PASSWORD_RESET', 'Too many password reset requests. Try again later.'),
});

// ─────────────────────────────────────────────────────────────
// General authenticated API limiter  (key by user ID or IP)
// ─────────────────────────────────────────────────────────────

/**
 * General API: 200 requests per user per minute.
 * Stops bulk scraping of country/historical/dashboard data.
 * Keyed by user ID so one user can't exhaust the bucket for others.
 */
export const apiLimiter = rateLimit({
  ...BASE_OPTIONS,
  windowMs: parseInt(process.env.RATE_API_WINDOW_MS ?? '60000', 10),  // 1 min
  max:      parseInt(process.env.RATE_API_MAX        ?? '200',   10),
  keyGenerator: userOrIpKey,
  handler: makeHandler('API', 'Too many requests. Please slow down.'),
});

// ─────────────────────────────────────────────────────────────
// Heavy / AI / compute endpoint limiters
// ─────────────────────────────────────────────────────────────

/**
 * Simulation (Monte Carlo / AI): 10 runs per user per minute.
 * Each run is CPU-intensive (up to 5000 iterations). Without this,
 * a single user can saturate the Node.js event loop.
 */
export const simulationLimiter = rateLimit({
  ...BASE_OPTIONS,
  windowMs: parseInt(process.env.RATE_SIMULATION_WINDOW_MS ?? '60000', 10),  // 1 min
  max:      parseInt(process.env.RATE_SIMULATION_MAX        ?? '10',    10),
  keyGenerator: userOrIpKey,
  handler: makeHandler('SIMULATION', 'Simulation rate limit reached. Wait before running another simulation.'),
});

/**
 * Backtest: 10 runs per user per minute.
 * Backtests hit the DB heavily (multi-year historical queries + writes).
 */
export const backtestLimiter = rateLimit({
  ...BASE_OPTIONS,
  windowMs: parseInt(process.env.RATE_BACKTEST_WINDOW_MS ?? '60000', 10),  // 1 min
  max:      parseInt(process.env.RATE_BACKTEST_MAX        ?? '10',    10),
  keyGenerator: userOrIpKey,
  handler: makeHandler('BACKTEST', 'Backtest rate limit reached. Wait before running another backtest.'),
});

/**
 * Data ingest: 5 per user per 10 minutes.
 * Each ingest call fetches from the World Bank API — external quota risk.
 */
export const ingestLimiter = rateLimit({
  ...BASE_OPTIONS,
  windowMs: parseInt(process.env.RATE_INGEST_WINDOW_MS ?? '600000', 10),  // 10 min
  max:      parseInt(process.env.RATE_INGEST_MAX        ?? '5',      10),
  keyGenerator: userOrIpKey,
  handler: makeHandler('INGEST', 'Data ingest rate limit reached. Wait before ingesting again.'),
});

/**
 * Calibration: 5 per user per 10 minutes.
 * Calibration runs linear regression over years of historical data.
 */
export const calibrationLimiter = rateLimit({
  ...BASE_OPTIONS,
  windowMs: parseInt(process.env.RATE_CALIBRATION_WINDOW_MS ?? '600000', 10),  // 10 min
  max:      parseInt(process.env.RATE_CALIBRATION_MAX        ?? '5',      10),
  keyGenerator: userOrIpKey,
  handler: makeHandler('CALIBRATION', 'Calibration rate limit reached. Wait before calibrating again.'),
});

/**
 * Country creation: 10 per user per hour.
 * Each add triggers a World Bank fetch + bulk DB inserts.
 */
export const countryAddLimiter = rateLimit({
  ...BASE_OPTIONS,
  windowMs: parseInt(process.env.RATE_COUNTRY_ADD_WINDOW_MS ?? '3600000', 10),  // 1 hr
  max:      parseInt(process.env.RATE_COUNTRY_ADD_MAX        ?? '10',      10),
  keyGenerator: userOrIpKey,
  handler: makeHandler('COUNTRY_ADD', 'Country creation rate limit reached. Try again later.'),
});

/**
 * Data refresh: 5 per user per 10 minutes.
 * Refresh re-fetches from World Bank — same external quota risk as ingest.
 */
export const refreshDataLimiter = rateLimit({
  ...BASE_OPTIONS,
  windowMs: parseInt(process.env.RATE_REFRESH_WINDOW_MS ?? '600000', 10),  // 10 min
  max:      parseInt(process.env.RATE_REFRESH_MAX        ?? '5',      10),
  keyGenerator: userOrIpKey,
  handler: makeHandler('REFRESH_DATA', 'Data refresh rate limit reached. Wait before refreshing again.'),
});

/**
 * Read-heavy data endpoints (historical, dashboard, correlation):
 * 120 per user per minute — generous for normal use, blocks scrapers.
 */
export const readLimiter = rateLimit({
  ...BASE_OPTIONS,
  windowMs: parseInt(process.env.RATE_READ_WINDOW_MS ?? '60000', 10),  // 1 min
  max:      parseInt(process.env.RATE_READ_MAX        ?? '120',   10),
  keyGenerator: userOrIpKey,
  handler: makeHandler('READ', 'Too many read requests. Please slow down.'),
});
