import type { RequestHandler } from 'express';
import { timingSafeEqual } from 'crypto';

/** Constant-time compare so a wrong password leaks no timing signal. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Optional HTTP Basic auth.
 *
 * Inactive by default so local development is unchanged. Set GITPET_AUTH_USER
 * and GITPET_AUTH_PASS before exposing the server on a shared network or
 * tunnel: the live scanner reads local repositories, so an open instance
 * discloses branch names, file paths and diffs to anyone who can reach it.
 */
export function basicAuth(): RequestHandler {
  const user = process.env.GITPET_AUTH_USER;
  const pass = process.env.GITPET_AUTH_PASS;

  if (!user || !pass) {
    return (_req, _res, next) => next();
  }

  return (req, res, next) => {
    const header = req.headers.authorization ?? '';

    if (header.startsWith('Basic ')) {
      const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (
        separator > 0 &&
        safeEqual(decoded.slice(0, separator), user) &&
        safeEqual(decoded.slice(separator + 1), pass)
      ) {
        return next();
      }
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="GitPet", charset="UTF-8"');
    res.status(401).json({ error: 'Authentication required' });
  };
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.GITPET_AUTH_USER && process.env.GITPET_AUTH_PASS);
}
