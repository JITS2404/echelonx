/**
 * Enforces HTTPS in production.
 * Place this as the very first middleware after app.set('trust proxy').
 *
 * In development (NODE_ENV !== 'production') this is a no-op so local
 * development over HTTP still works.
 */
export function httpsRedirect(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();

  // req.secure is set by Express when trust proxy is enabled and the
  // X-Forwarded-Proto header says 'https'
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    // Already on HTTPS — add HSTS so browsers remember for 1 year
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    return next();
  }

  // Redirect HTTP → HTTPS, preserving the full URL
  const httpsUrl = `https://${req.hostname}${req.originalUrl}`;
  return res.redirect(301, httpsUrl);
}
