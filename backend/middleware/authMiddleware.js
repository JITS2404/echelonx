import jwt from 'jsonwebtoken';
import { audit } from '../config/logger.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    audit.tokenInvalid(req.ip, req.requestId, 'missing_bearer');
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      audit.tokenInvalid(req.ip, req.requestId, 'token_expired');
      return res.status(401).json({ error: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    }
    audit.tokenInvalid(req.ip, req.requestId, 'token_invalid');
    return res.status(401).json({ error: 'Invalid token.' });
  }
}
