import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR   = path.join(__dirname, '..', 'logs');
const LEVEL     = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// ── Masking: strip secrets from log metadata ──────────────────
const SENSITIVE_KEYS = new Set([
  'password', 'password_hash', 'token', 'accessToken', 'refreshToken',
  'authorization', 'cookie', 'jwt_secret', 'db_password', 'smtp_pass',
]);

function maskObject(obj, depth = 0) {
  if (depth > 5 || obj === null || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : maskObject(v, depth + 1);
  }
  return out;
}

// Mask email to show only first 2 chars + domain: je***@example.com
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '[unknown]';
  const [local, domain] = email.split('@');
  if (!domain) return '[invalid-email]';
  return `${local.slice(0, 2)}***@${domain}`;
}

// ── Custom format: timestamp + level + requestId + masked meta ─
const structuredFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const masked = maskObject(meta);
    const metaStr = Object.keys(masked).length ? ' ' + JSON.stringify(masked) : '';
    const rid = requestId ? ` [${requestId}]` : '';
    return `${timestamp} ${level.toUpperCase()}${rid}: ${message}${metaStr}`;
  })
);

const jsonFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

// ── Transports ────────────────────────────────────────────────
const fileTransportOptions = {
  datePattern:  'YYYY-MM-DD',
  zippedArchive: true,
  maxSize:      '20m',
  maxFiles:     '30d',
};

const logger = createLogger({
  level: LEVEL,
  format: process.env.NODE_ENV === 'production' ? jsonFormat : structuredFormat,
  transports: [
    // All logs
    new DailyRotateFile({
      ...fileTransportOptions,
      dirname:  LOG_DIR,
      filename: 'combined-%DATE%.log',
    }),
    // Errors only — separate file for alerting
    new DailyRotateFile({
      ...fileTransportOptions,
      dirname:  LOG_DIR,
      filename: 'error-%DATE%.log',
      level:    'error',
    }),
    // Auth audit trail — separate file, never rotated away for < 90 days
    new DailyRotateFile({
      ...fileTransportOptions,
      dirname:  LOG_DIR,
      filename: 'audit-%DATE%.log',
      maxFiles: '90d',
    }),
  ],
});

// Console output in development only
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(format.colorize(), structuredFormat),
  }));
}

// ── Convenience audit logger ──────────────────────────────────
export const audit = {
  loginSuccess:  (email, ip, requestId) =>
    logger.info('AUTH_LOGIN_SUCCESS',  { event: 'login_success',  email: maskEmail(email), ip, requestId }),

  loginFailure:  (email, ip, requestId, reason) =>
    logger.warn('AUTH_LOGIN_FAILURE',  { event: 'login_failure',  email: maskEmail(email), ip, reason, requestId }),

  loginBlocked:  (ip, requestId) =>
    logger.warn('AUTH_RATE_LIMITED',   { event: 'rate_limited',   ip, requestId }),

  register:      (email, ip, requestId) =>
    logger.info('AUTH_REGISTER',       { event: 'register',       email: maskEmail(email), ip, requestId }),

  logout:        (userId, ip, requestId) =>
    logger.info('AUTH_LOGOUT',         { event: 'logout',         userId, ip, requestId }),

  passwordReset: (email, ip, requestId) =>
    logger.info('AUTH_PASSWORD_RESET', { event: 'password_reset', email: maskEmail(email), ip, requestId }),

  tokenRefresh:  (userId, ip, requestId) =>
    logger.info('AUTH_TOKEN_REFRESH',  { event: 'token_refresh',  userId, ip, requestId }),

  tokenInvalid:  (ip, requestId, reason) =>
    logger.warn('AUTH_TOKEN_INVALID',  { event: 'token_invalid',  ip, reason, requestId }),

  ownershipDenied: (userId, resource, requestId) =>
    logger.warn('AUTHZ_OWNERSHIP_DENIED', { event: 'ownership_denied', userId, resource, requestId }),
};

export default logger;
