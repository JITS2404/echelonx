import pg from 'pg';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const { Pool } = pg;

// SSL config: required in production, disabled in development
const sslConfig = process.env.NODE_ENV === 'production'
  ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      // Set DB_SSL_CA to the path of your CA cert for mutual TLS
      ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : {}),
    }
  : false;

export const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      sslConfig,

  // Connection pool limits
  max:                    10,   // max simultaneous connections
  min:                    2,    // keep 2 warm connections ready
  idleTimeoutMillis:      30_000,
  connectionTimeoutMillis: 5_000,

  // Kill runaway queries after 30 seconds — prevents DB DoS
  statement_timeout:       30_000,
  // Kill idle transactions after 60 seconds
  idle_in_transaction_session_timeout: 60_000,
});

// Log pool errors — a pool error means a background client died
pool.on('error', (err) => {
  logger.error('DB_POOL_ERROR', { message: err.message, stack: err.stack });
});

pool.on('connect', () => {
  logger.debug('DB_POOL_CONNECT', { message: 'New DB client connected' });
});

// Wrapped query with structured error logging and request ID propagation
export async function query(text, params, requestId) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn('DB_SLOW_QUERY', {
        duration,
        // Log only first 120 chars of query — never log params (may contain PII)
        query: text.slice(0, 120),
        requestId,
      });
    }
    return result;
  } catch (err) {
    logger.error('DB_QUERY_ERROR', {
      message: err.message,
      query:   text.slice(0, 120),
      requestId,
    });
    throw err;
  }
}

export default pool;
