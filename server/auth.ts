import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { getDb } from './db.ts';

export interface AuthSession {
  token: string;
  userId: number;
  username: string;
  expiresAt: number;
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const calculatedHash = hashPassword(password, salt);
  const bufA = Buffer.from(calculatedHash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createSession(userId: number): string {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

  const insertSession = db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)');
  insertSession.run(token, userId, expiresAt);

  return token;
}

export function verifySession(token: string): { userId: number; username: string } | null {
  if (!token) return null;
  const db = getDb();

  // Clean expired sessions occasionally
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());

  const stmt = db.prepare(`
    SELECT s.user_id, s.expires_at, u.username 
    FROM sessions s 
    JOIN admin_users u ON s.user_id = u.id 
    WHERE s.token = ? AND s.expires_at > ?
  `);

  const session = stmt.get(token, Date.now()) as { user_id: number; username: string; expires_at: number } | undefined;
  if (!session) return null;

  return {
    userId: session.user_id,
    username: session.username
  };
}

export function deleteSession(token: string): void {
  if (!token) return;
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check authorization header or cookie
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.admin_session) {
    token = req.cookies.admin_session;
  }

  const session = verifySession(token);
  if (!session) {
    res.status(401).json({ success: false, error: '未授權或登入已逾期，請重新登入管理後台' });
    return;
  }

  // Attach session user info to request
  (req as any).adminUser = session;
  next();
}
