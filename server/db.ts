import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'mountain_feast.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    // Enable WAL mode for concurrency and durability
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA synchronous = NORMAL;');
    initializeSchema(dbInstance);
  }
  return dbInstance;
}

function initializeSchema(db: DatabaseSync) {
  // Admin users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Admin sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES admin_users (id) ON DELETE CASCADE
    );
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Site settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedDefaultData(db);
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

function seedDefaultData(db: DatabaseSync) {
  // Seed admin user: yy661003 / yy661003
  const findAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?');
  const existingAdmin = findAdmin.get('yy661003');

  if (!existingAdmin) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword('yy661003', salt);
    const insertAdmin = db.prepare('INSERT INTO admin_users (username, password_hash, salt) VALUES (?, ?, ?)');
    insertAdmin.run('yy661003', passwordHash, salt);
    console.log('[DB] Seeded admin user: yy661003 with secure PBKDF2 hash');
  }

  // Seed categories if empty
  const countCategories = db.prepare('SELECT COUNT(*) as count FROM categories');
  const row = countCategories.get() as { count: number };

  if (!row || row.count === 0) {
    const defaultCategories = [
      { name: '餐廳', sort_order: 1, is_active: 1 },
      { name: '火鍋', sort_order: 2, is_active: 1 },
      { name: '麵店', sort_order: 3, is_active: 1 },
      { name: '便利商店', sort_order: 4, is_active: 1 },
      { name: '速食', sort_order: 5, is_active: 1 },
      { name: '自訂', sort_order: 6, is_active: 1 }
    ];

    const insertCat = db.prepare('INSERT INTO categories (name, sort_order, is_active) VALUES (?, ?, ?)');
    for (const cat of defaultCategories) {
      insertCat.run(cat.name, cat.sort_order, cat.is_active);
    }
    console.log('[DB] Seeded initial categories');
  }

  // Seed site settings
  const defaultSettings: Record<string, string> = {
    siteTitle: '下山慶功宴搜尋系統',
    siteDescription: '登山下山後，以登山口為起點，透過 Google Maps 搜尋指定車程時間內的慶功宴美食店家。',
    seoTitle: '下山慶功宴搜尋系統｜登山口附近餐廳火鍋美食推薦',
    seoDescription: '登山下山後，以登山口為起點，透過 Google Maps 依實際車程時間篩選火鍋、麵店、熱炒、牛肉麵等慶功宴美食！',
    searchInterfaceText: '輸入登山口開始搜尋',
    buttonText: '開始搜尋慶功宴',
    trailheadPlaceholder: '請手動輸入登山口（例如：玉山登山口、合歡山松雪樓、奇萊登山口、向陽登山口）',
    canonicalUrl: 'https://mountain-feast-search.app',
    defaultDriveTimes: JSON.stringify([10, 20, 30, 40, 60])
  };

  const getSetting = db.prepare('SELECT value FROM site_settings WHERE key = ?');
  const insertSetting = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');

  for (const [key, val] of Object.entries(defaultSettings)) {
    const existing = getSetting.get(key);
    if (!existing) {
      insertSetting.run(key, val);
    }
  }
}
