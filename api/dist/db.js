"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openDb = openDb;
exports.listAccounts = listAccounts;
exports.getStoredAccount = getStoredAccount;
exports.addAccount = addAccount;
exports.deleteAccount = deleteAccount;
exports.updateAccount = updateAccount;
exports.getDecryptedPassword = getDecryptedPassword;
exports.getCachedSession = getCachedSession;
exports.saveSession = saveSession;
exports.clearSession = clearSession;
exports.getSiteUserId = getSiteUserId;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const crypto_js_1 = require("./crypto.js");
const SESSION_TTL_MS = 90 * 60 * 1000; // 90 minutes
// ── Initialisation ────────────────────────────────────────────────────────────
function openDb() {
    const dataDir = process.env['DATA_DIR'] ?? node_path_1.default.join(process.cwd(), 'data');
    node_fs_1.default.mkdirSync(dataDir, { recursive: true });
    const dbPath = node_path_1.default.join(dataDir, 'db.sqlite');
    const db = new better_sqlite3_1.default(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id                TEXT PRIMARY KEY,
      username          TEXT NOT NULL UNIQUE,
      display_name      TEXT NOT NULL,
      phone             TEXT NOT NULL,
      encrypted_password TEXT NOT NULL,
      salt              TEXT NOT NULL,
      iv                TEXT NOT NULL,
      created_at        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      account_id  TEXT PRIMARY KEY,
      cookies     TEXT NOT NULL,
      csrf_token  TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      cached_at   INTEGER NOT NULL
    );
  `);
    return db;
}
// ── Accounts ──────────────────────────────────────────────────────────────────
function listAccounts(db) {
    const rows = db
        .prepare('SELECT id, username, display_name, phone, created_at FROM accounts ORDER BY created_at ASC')
        .all();
    return rows.map((r) => ({
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        phone: r.phone,
        createdAt: r.created_at,
    }));
}
function getStoredAccount(db, id) {
    const row = db
        .prepare('SELECT id, username, display_name, phone, encrypted_password, salt, iv, created_at FROM accounts WHERE id = ?')
        .get(id);
    if (!row)
        return null;
    return {
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        phone: row.phone,
        encryptedPassword: row.encrypted_password,
        salt: row.salt,
        iv: row.iv,
        createdAt: row.created_at,
    };
}
async function addAccount(db, username, password, displayName, phone, appPassword) {
    const id = crypto.randomUUID();
    const blob = await (0, crypto_js_1.encrypt)(password, appPassword);
    const createdAt = new Date().toISOString();
    db.prepare(`INSERT INTO accounts (id, username, display_name, phone, encrypted_password, salt, iv, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, username, displayName, phone, blob.ciphertext, blob.salt, blob.iv, createdAt);
    return { id, username, displayName, phone, createdAt };
}
function deleteAccount(db, id) {
    const result = db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    if (result.changes === 0)
        return false;
    db.prepare('DELETE FROM sessions WHERE account_id = ?').run(id);
    return true;
}
function updateAccount(db, id, displayName, phone) {
    const result = db
        .prepare('UPDATE accounts SET display_name = ?, phone = ? WHERE id = ?')
        .run(displayName, phone, id);
    return result.changes > 0;
}
async function getDecryptedPassword(db, id, appPassword) {
    const acc = getStoredAccount(db, id);
    if (!acc)
        return null;
    return (0, crypto_js_1.decrypt)({ ciphertext: acc.encryptedPassword, salt: acc.salt, iv: acc.iv }, appPassword);
}
// ── Session cache ─────────────────────────────────────────────────────────────
function getCachedSession(db, accountId) {
    const row = db
        .prepare('SELECT cookies, csrf_token, user_id, cached_at FROM sessions WHERE account_id = ?')
        .get(accountId);
    if (!row)
        return null;
    // Evict expired sessions
    if (Date.now() - row.cached_at > SESSION_TTL_MS) {
        db.prepare('DELETE FROM sessions WHERE account_id = ?').run(accountId);
        return null;
    }
    return {
        cookies: row.cookies,
        csrfToken: row.csrf_token,
        userId: row.user_id,
        cachedAt: row.cached_at,
    };
}
function saveSession(db, accountId, session) {
    db.prepare(`INSERT INTO sessions (account_id, cookies, csrf_token, user_id, cached_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(account_id) DO UPDATE SET
       cookies    = excluded.cookies,
       csrf_token = excluded.csrf_token,
       user_id    = excluded.user_id,
       cached_at  = excluded.cached_at`).run(accountId, session.cookies, session.csrfToken, session.userId, session.cachedAt);
}
function clearSession(db, accountId) {
    db.prepare('DELETE FROM sessions WHERE account_id = ?').run(accountId);
}
// Returns the site's numeric user ID for an account from its cached session, or null if no session.
function getSiteUserId(db, accountId) {
    const row = db
        .prepare('SELECT user_id FROM sessions WHERE account_id = ?')
        .get(accountId);
    return row?.user_id ?? null;
}
