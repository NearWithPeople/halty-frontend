import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.resolve(process.cwd(), 'server', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'halty.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode for high concurrency
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
    avatar TEXT NOT NULL,
    company_name TEXT,
    rating REAL DEFAULT 5.0,
    completed_shifts INTEGER DEFAULT 0,
    punctuality TEXT DEFAULT '100%',
    tg_username TEXT,
    tg_connected INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vacancies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    employer_name TEXT DEFAULT 'АДМИН',
    salary TEXT NOT NULL,
    category TEXT NOT NULL,
    category_label TEXT NOT NULL,
    attachment_type TEXT DEFAULT 'building' CHECK (attachment_type IN ('building', 'ground_zone')),
    lng REAL NOT NULL,
    lat REAL NOT NULL,
    address TEXT,
    location_name TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements_json TEXT NOT NULL,
    schedule TEXT NOT NULL,
    payout_type TEXT NOT NULL,
    color TEXT NOT NULL,
    accent_color TEXT NOT NULL,
    icon_type TEXT NOT NULL,
    building_height REAL DEFAULT 24,
    zone_radius REAL DEFAULT 80,
    created_by_role TEXT DEFAULT 'admin',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    vacancy_id TEXT NOT NULL,
    vacancy_role TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    worker_name TEXT NOT NULL,
    worker_phone TEXT NOT NULL,
    worker_rating REAL DEFAULT 4.9,
    worker_punctuality TEXT DEFAULT '100%',
    worker_avatar TEXT DEFAULT 'ЕМ',
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration_hours INTEGER NOT NULL,
    pay TEXT NOT NULL,
    pay_rate REAL NOT NULL,
    status TEXT NOT NULL,
    step INTEGER DEFAULT 1,
    unread INTEGER DEFAULT 0,
    rejection_reason TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(vacancy_id) REFERENCES vacancies(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin', 'system')),
    sender_name TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL,
    vacancy_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, vacancy_id),
    FOREIGN KEY(vacancy_id) REFERENCES vacancies(id) ON DELETE CASCADE
  );
`);

console.log(`[SQLite Database] Initialized and connected at ${dbPath}`);
