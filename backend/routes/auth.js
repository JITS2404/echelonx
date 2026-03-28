import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { query } from '../config/database.js';
import logger, { audit } from '../config/logger.js';
import {
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  rejectBots,
} from '../middleware/rateLimiter.js';

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';
const EMAIL_TOKEN_EXPIRY_MINUTES = 60;
const RESET_TOKEN_EXPIRY_MINUTES = 15;

// ── Email transporter ─────────────────────────────────────────
function getMailTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const transporter = getMailTransporter();
  await transporter.sendMail({
    from: `"EchelonX" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify your EchelonX account',
    html: `<p>Click the link below to verify your email. It expires in ${EMAIL_TOKEN_EXPIRY_MINUTES} minutes.</p>
           <a href="${verifyUrl}">${verifyUrl}</a>`,
  });
}

async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  const transporter = getMailTransporter();
  await transporter.sendMail({
    from: `"EchelonX" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset your EchelonX password',
    html: `<p>Click the link below to reset your password. It expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.</p>
           <a href="${resetUrl}">${resetUrl}</a>
           <p>If you did not request this, ignore this email.</p>`,
  });
}

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', rejectBots, registerLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      // Return same message to avoid user enumeration
      return res.status(200).json({ message: 'If that email is new, a verification link has been sent.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userResult = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [email.toLowerCase(), passwordHash]
    );
    const userId = userResult.rows[0].id;

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EMAIL_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    await query(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    audit.register(email, req.ip, req.requestId);
    await sendVerificationEmail(email.toLowerCase(), token);

    res.status(200).json({ message: 'If that email is new, a verification link has been sent.' });
  } catch (err) {
    logger.error('REGISTER_ERROR', { message: err.message, requestId: req.requestId });
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// ── GET /api/auth/verify-email ────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token is required.' });

    const result = await query(
      `SELECT evt.user_id, evt.expires_at
       FROM email_verification_tokens evt
       WHERE evt.token = $1`,
      [token]
    );

    if (!result.rows.length) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }

    const { user_id, expires_at } = result.rows[0];
    if (new Date() > new Date(expires_at)) {
      await query('DELETE FROM email_verification_tokens WHERE token = $1', [token]);
      return res.status(400).json({ error: 'Verification token has expired. Please register again.' });
    }

    await query('UPDATE users SET is_verified = TRUE WHERE id = $1', [user_id]);
    await query('DELETE FROM email_verification_tokens WHERE token = $1', [token]);

    logger.info('AUTH_EMAIL_VERIFIED', { userId: user_id, requestId: req.requestId });
    res.json({ message: 'Email verified. You can now log in.' });
  } catch (err) {
    logger.error('VERIFY_EMAIL_ERROR', { message: err.message, requestId: req.requestId });
    res.status(500).json({ error: 'Verification failed.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', rejectBots, loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await query(
      'SELECT id, password_hash, is_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always run bcrypt to prevent timing attacks
    const dummyHash = '$2b$12$invalidhashfortimingprotectiononly000000000000000000000';
    const storedHash = result.rows[0]?.password_hash ?? dummyHash;
    const passwordMatch = await bcrypt.compare(password, storedHash);

    if (!result.rows.length || !passwordMatch) {
      audit.loginFailure(email, req.ip, req.requestId, 'invalid_credentials');
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    if (!user.is_verified) {
      audit.loginFailure(email, req.ip, req.requestId, 'email_not_verified');
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: email.toLowerCase() },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_EXPIRY }
    );

    // Refresh token in httpOnly cookie — never exposed to JS
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    audit.loginSuccess(email, req.ip, req.requestId);
    res.json({ accessToken, expiresIn: JWT_EXPIRY });
  } catch (err) {
    logger.error('LOGIN_ERROR', { message: err.message, requestId: req.requestId });
    res.status(500).json({ error: 'Login failed.' });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────
router.post('/refresh', (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: 'No refresh token.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
    audit.tokenRefresh(payload.userId, req.ip, req.requestId);
    res.json({ accessToken, expiresIn: JWT_EXPIRY });
  } catch (err) {
    audit.tokenInvalid(req.ip, req.requestId, 'refresh_token_invalid');
    res.clearCookie('refresh_token');
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', (req, res) => {
  // userId may not be set here (no requireAuth on logout) — read from cookie payload if present
  res.clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict' });
  audit.logout(req.user?.userId ?? 'anonymous', req.ip, req.requestId);
  res.json({ message: 'Logged out.' });
});

// ── POST /api/auth/forgot-password ───────────────────────────
router.post('/forgot-password', rejectBots, passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    // Always return same message to prevent user enumeration
    const genericResponse = { message: 'If that email exists, a reset link has been sent.' };

    const result = await query('SELECT id FROM users WHERE email = $1 AND is_verified = TRUE', [email.toLowerCase()]);
    if (!result.rows.length) return res.json(genericResponse);

    const userId = result.rows[0].id;

    // Invalidate any existing reset tokens for this user
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);
    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    await sendPasswordResetEmail(email.toLowerCase(), token);
    audit.passwordReset(email, req.ip, req.requestId);
    res.json(genericResponse);
  } catch (err) {
    logger.error('FORGOT_PASSWORD_ERROR', { message: err.message, requestId: req.requestId });
    res.status(500).json({ error: 'Request failed.' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const result = await query(
      'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = $1',
      [token]
    );

    if (!result.rows.length) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const { user_id, expires_at, used } = result.rows[0];

    if (used) {
      return res.status(400).json({ error: 'Reset token has already been used.' });
    }
    if (new Date() > new Date(expires_at)) {
      await query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
      return res.status(400).json({ error: 'Reset token has expired.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, user_id]);
    await query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);

    // Invalidate all refresh cookies by clearing reset tokens
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user_id]);

    logger.info('AUTH_PASSWORD_RESET_COMPLETE', { userId: user_id, requestId: req.requestId });
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    logger.error('RESET_PASSWORD_ERROR', { message: err.message, requestId: req.requestId });
    res.status(500).json({ error: 'Password reset failed.' });
  }
});

export default router;
