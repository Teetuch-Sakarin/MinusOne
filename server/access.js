import { createHash, timingSafeEqual } from 'node:crypto';

// A shared access gate for the hosted demo, not per-user or tenant authentication.
export function demoAccess(password) {
  const expected = createHash('sha256').update(`minusone:${password}`).digest();
  return (req, res, next) => {
    // Render must be able to check liveness without a password or a session.
    if (req.method === 'GET' && req.path === '/api/health') return next();
    const header = req.get('authorization') || '';
    if (header.length <= 4096 && /^Basic [A-Za-z0-9+/]+=*$/i.test(header)) {
      const supplied = Buffer.from(header.slice(6), 'base64');
      const digest = createHash('sha256').update(supplied).digest();
      if (timingSafeEqual(digest, expected)) return next();
    }
    res.set('Cache-Control', 'no-store');
    res.set('WWW-Authenticate', 'Basic realm="MinusOne demo", charset="UTF-8"');
    return res.status(401).json({ error: 'Sign in with the shared demo access credentials.' });
  };
}
