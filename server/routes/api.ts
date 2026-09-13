import { Router } from 'express';
import { getDb } from '../db.ts';
import { verifyPassword, hashPassword, createSession, deleteSession, adminAuthMiddleware } from '../auth.ts';
import { searchTrailheadFeast } from '../maps.ts';
import crypto from 'node:crypto';

export const apiRouter = Router();

// 1. Google Maps Config for frontend Maps JavaScript API
apiRouter.get('/config/maps-config', (req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  res.json({
    hasKey: Boolean(apiKey && apiKey.trim().length > 0),
    apiKey: apiKey || null
  });
});

// 2. Search Trailhead Feast
apiRouter.post('/search', async (req, res) => {
  const { trailhead, category, customKeyword, maxDriveTimeMinutes } = req.body;

  if (!trailhead || typeof trailhead !== 'string' || !trailhead.trim()) {
    res.status(400).json({ success: false, error: '請輸入登山口名稱' });
    return;
  }

  const driveMinutes = Number(maxDriveTimeMinutes);
  if (isNaN(driveMinutes) || driveMinutes <= 0) {
    res.status(400).json({ success: false, error: '請設定有效的車程時間（分鐘）' });
    return;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    res.status(400).json({
      success: false,
      missingApiKey: true,
      error: '系統尚未設定 GOOGLE_MAPS_API_KEY 環境變數。請在 Google Cloud Console 啟用 Geocoding API、Places API (New)、Routes API 與 Maps JavaScript API，並於伺服器環境變數中設定 GOOGLE_MAPS_API_KEY。'
    });
    return;
  }

  const startTime = Date.now();
  try {
    const result = await searchTrailheadFeast(
      trailhead.trim(),
      category || '餐廳',
      customKeyword,
      driveMinutes,
      apiKey.trim()
    );

    res.json({
      success: true,
      origin: result.origin,
      results: result.results,
      totalFound: result.results.length,
      searchTimeMs: Date.now() - startTime,
      query: {
        trailhead: trailhead.trim(),
        category,
        customKeyword,
        maxDriveTimeMinutes: driveMinutes
      }
    });
  } catch (err: any) {
    console.error('[API /search error]:', err);
    res.status(500).json({
      success: false,
      error: err.message || '搜尋失敗，請稍後再試。'
    });
  }
});

// 3. Public: Get active categories
apiRouter.get('/categories', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, name, sort_order, is_active FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
  res.json({ success: true, categories: rows });
});

// 4. Public: Get site settings
apiRouter.get('/settings', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM site_settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, any> = {};

  for (const row of rows) {
    if (row.key === 'defaultDriveTimes') {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = [10, 20, 30, 40, 60];
      }
    } else {
      settings[row.key] = row.value;
    }
  }

  res.json({ success: true, settings });
});

// 5. Admin Authentication: Login
apiRouter.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ success: false, error: '請輸入帳號與密碼' });
    return;
  }

  const db = getDb();
  const stmt = db.prepare('SELECT id, username, password_hash, salt FROM admin_users WHERE username = ?');
  const user = stmt.get(username) as { id: number; username: string; password_hash: string; salt: string } | undefined;

  if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
    res.status(401).json({ success: false, error: '帳號或密碼錯誤' });
    return;
  }

  const token = createSession(user.id);

  // Set HTTP-only secure cookie
  res.cookie('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username }
  });
});

// 6. Admin Authentication: Logout
apiRouter.post('/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.admin_session) {
    token = req.cookies.admin_session;
  }

  if (token) {
    deleteSession(token);
  }
  res.clearCookie('admin_session');
  res.json({ success: true, message: '已登出' });
});

// 7. Admin: Get Current User profile
apiRouter.get('/admin/me', adminAuthMiddleware, (req, res) => {
  const adminUser = (req as any).adminUser;
  res.json({ success: true, user: adminUser });
});

// 8. Admin: List all categories (both active and inactive)
apiRouter.get('/admin/categories', adminAuthMiddleware, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT id, name, sort_order, is_active, created_at, updated_at FROM categories ORDER BY sort_order ASC, id ASC').all();
  res.json({ success: true, categories: rows });
});

// 9. Admin: Create category
apiRouter.post('/admin/categories', adminAuthMiddleware, (req, res) => {
  const { name, sort_order, is_active } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ success: false, error: '請輸入分類名稱' });
    return;
  }

  const db = getDb();
  const sort = typeof sort_order === 'number' ? sort_order : 0;
  const active = is_active === 0 ? 0 : 1;

  const stmt = db.prepare('INSERT INTO categories (name, sort_order, is_active) VALUES (?, ?, ?)');
  const result = stmt.run(name.trim(), sort, active);

  res.json({
    success: true,
    category: {
      id: Number(result.lastInsertRowid),
      name: name.trim(),
      sort_order: sort,
      is_active: active
    }
  });
});

// 10. Admin: Update category
apiRouter.put('/admin/categories/:id', adminAuthMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const { name, sort_order, is_active } = req.body;

  if (isNaN(id)) {
    res.status(400).json({ success: false, error: '無效的分類編號' });
    return;
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ success: false, error: '請輸入分類名稱' });
    return;
  }

  const db = getDb();
  const sort = typeof sort_order === 'number' ? sort_order : 0;
  const active = is_active === 0 ? 0 : 1;

  const stmt = db.prepare('UPDATE categories SET name = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(name.trim(), sort, active, id);

  res.json({ success: true, message: '分類已更新' });
});

// 11. Admin: Delete category
apiRouter.delete('/admin/categories/:id', adminAuthMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: '無效的分類編號' });
    return;
  }

  const db = getDb();
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ success: true, message: '分類已刪除' });
});

// 12. Admin: Update settings
apiRouter.put('/admin/settings', adminAuthMiddleware, (req, res) => {
  const settings = req.body;
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ success: false, error: '設定格式錯誤' });
    return;
  }

  const db = getDb();
  const upsertStmt = db.prepare(`
    INSERT INTO site_settings (key, value, updated_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  for (const [key, val] of Object.entries(settings)) {
    if (typeof val === 'string') {
      upsertStmt.run(key, val);
    } else if (Array.isArray(val) || typeof val === 'object') {
      upsertStmt.run(key, JSON.stringify(val));
    }
  }

  res.json({ success: true, message: '設定已更新' });
});

// 13. Admin: Change Password
apiRouter.put('/admin/change-password', adminAuthMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminUser = (req as any).adminUser;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, error: '請提供目前密碼與新密碼' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ success: false, error: '新密碼長度至少需 6 個字元' });
    return;
  }

  const db = getDb();
  const userStmt = db.prepare('SELECT id, password_hash, salt FROM admin_users WHERE id = ?');
  const user = userStmt.get(adminUser.userId) as { id: number; password_hash: string; salt: string } | undefined;

  if (!user || !verifyPassword(currentPassword, user.password_hash, user.salt)) {
    res.status(400).json({ success: false, error: '目前密碼不正確' });
    return;
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = hashPassword(newPassword, newSalt);

  db.prepare('UPDATE admin_users SET password_hash = ?, salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    newHash,
    newSalt,
    user.id
  );

  res.json({ success: true, message: '密碼已成功變更' });
});
