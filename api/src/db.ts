import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { decrypt, encrypt } from "./crypto.js";
import type {
  AccountSummary,
  AddFavoriteRequest,
  CachedSession,
  Db,
  Favorite,
  StoredAccount,
} from "./types.js";

const SESSION_TTL_MS = 90 * 60 * 1000; // 90 minutes

// ── Initialisation ────────────────────────────────────────────────────────────

export function openDb(): Db {
  const dataDir = process.env["DATA_DIR"] ?? path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, "db.sqlite");

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

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

    CREATE TABLE IF NOT EXISTS favorites (
      id           TEXT PRIMARY KEY,
      account_id   TEXT NOT NULL,
      court_id     INTEGER NOT NULL,
      day_of_week  INTEGER NOT NULL,
      time         TEXT NOT NULL,
      name         TEXT,
      created_at   TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      UNIQUE(account_id, court_id, day_of_week, time)
    );
  `);

  return db;
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export function listAccounts(db: Db): AccountSummary[] {
  const rows = db
    .prepare(
      "SELECT id, username, display_name, phone, created_at FROM accounts ORDER BY created_at ASC",
    )
    .all() as Array<{
    id: string;
    username: string;
    display_name: string;
    phone: string;
    created_at: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    phone: r.phone,
    createdAt: r.created_at,
  }));
}

export function getStoredAccount(db: Db, id: string): StoredAccount | null {
  const row = db
    .prepare(
      "SELECT id, username, display_name, phone, encrypted_password, salt, iv, created_at FROM accounts WHERE id = ?",
    )
    .get(id) as
    | {
        id: string;
        username: string;
        display_name: string;
        phone: string;
        encrypted_password: string;
        salt: string;
        iv: string;
        created_at: string;
      }
    | undefined;

  if (!row) return null;
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

export async function addAccount(
  db: Db,
  username: string,
  password: string,
  displayName: string,
  phone: string,
  appPassword: string,
): Promise<AccountSummary> {
  const id = crypto.randomUUID();
  const blob = await encrypt(password, appPassword);
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO accounts (id, username, display_name, phone, encrypted_password, salt, iv, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    username,
    displayName,
    phone,
    blob.ciphertext,
    blob.salt,
    blob.iv,
    createdAt,
  );

  return { id, username, displayName, phone, createdAt };
}

export function deleteAccount(db: Db, id: string): boolean {
  const result = db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
  if (result.changes === 0) return false;
  db.prepare("DELETE FROM sessions WHERE account_id = ?").run(id);
  return true;
}

export function updateAccount(
  db: Db,
  id: string,
  displayName: string,
  phone: string,
): boolean {
  const result = db
    .prepare("UPDATE accounts SET display_name = ?, phone = ? WHERE id = ?")
    .run(displayName, phone, id);
  return result.changes > 0;
}

export async function getDecryptedPassword(
  db: Db,
  id: string,
  appPassword: string,
): Promise<string | null> {
  const acc = getStoredAccount(db, id);
  if (!acc) return null;
  return decrypt(
    { ciphertext: acc.encryptedPassword, salt: acc.salt, iv: acc.iv },
    appPassword,
  );
}

// ── Session cache ─────────────────────────────────────────────────────────────

export function getCachedSession(
  db: Db,
  accountId: string,
): CachedSession | null {
  const row = db
    .prepare(
      "SELECT cookies, csrf_token, user_id, cached_at FROM sessions WHERE account_id = ?",
    )
    .get(accountId) as
    | {
        cookies: string;
        csrf_token: string;
        user_id: string;
        cached_at: number;
      }
    | undefined;

  if (!row) return null;

  // Evict expired sessions
  if (Date.now() - row.cached_at > SESSION_TTL_MS) {
    db.prepare("DELETE FROM sessions WHERE account_id = ?").run(accountId);
    return null;
  }

  return {
    cookies: row.cookies,
    csrfToken: row.csrf_token,
    userId: row.user_id,
    cachedAt: row.cached_at,
  };
}

export function saveSession(
  db: Db,
  accountId: string,
  session: CachedSession,
): void {
  db.prepare(
    `INSERT INTO sessions (account_id, cookies, csrf_token, user_id, cached_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(account_id) DO UPDATE SET
       cookies    = excluded.cookies,
       csrf_token = excluded.csrf_token,
       user_id    = excluded.user_id,
       cached_at  = excluded.cached_at`,
  ).run(
    accountId,
    session.cookies,
    session.csrfToken,
    session.userId,
    session.cachedAt,
  );
}

export function clearSession(db: Db, accountId: string): void {
  db.prepare("DELETE FROM sessions WHERE account_id = ?").run(accountId);
}

// Returns the site's numeric user ID for an account from its cached session, or null if no session.
export function getSiteUserId(db: Db, accountId: string): string | null {
  const row = db
    .prepare("SELECT user_id FROM sessions WHERE account_id = ?")
    .get(accountId) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}

// ── Favorites ──────────────────────────────────────────────────────────────────

export function listFavorites(db: Db, accountId?: string): Favorite[] {
  let rows: Array<{
    id: string;
    account_id: string;
    court_id: number;
    day_of_week: number;
    time: string;
    name: string | null;
    created_at: string;
  }>;

  if (accountId) {
    rows = db
      .prepare(
        "SELECT id, account_id, court_id, day_of_week, time, name, created_at FROM favorites WHERE account_id = ? ORDER BY court_id ASC, day_of_week ASC, time ASC",
      )
      .all(accountId) as Array<{
      id: string;
      account_id: string;
      court_id: number;
      day_of_week: number;
      time: string;
      name: string | null;
      created_at: string;
    }>;
  } else {
    rows = db
      .prepare(
        "SELECT id, account_id, court_id, day_of_week, time, name, created_at FROM favorites ORDER BY court_id ASC, day_of_week ASC, time ASC",
      )
      .all() as Array<{
      id: string;
      account_id: string;
      court_id: number;
      day_of_week: number;
      time: string;
      name: string | null;
      created_at: string;
    }>;
  }

  return rows.map((r) => ({
    id: r.id,
    accountId: r.account_id,
    courtId: r.court_id,
    dayOfWeek: r.day_of_week,
    time: r.time,
    name: r.name,
    createdAt: r.created_at,
  }));
}

export function addFavorite(db: Db, data: AddFavoriteRequest): Favorite {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO favorites (id, account_id, court_id, day_of_week, time, name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    data.accountId,
    data.courtId,
    data.dayOfWeek,
    data.time,
    data.name ?? null,
    createdAt,
  );

  return {
    id,
    accountId: data.accountId,
    courtId: data.courtId,
    dayOfWeek: data.dayOfWeek,
    time: data.time,
    name: data.name ?? null,
    createdAt,
  };
}

export function updateFavorite(db: Db, id: string, name: string): boolean {
  const result = db
    .prepare("UPDATE favorites SET name = ? WHERE id = ?")
    .run(name, id);
  return result.changes > 0;
}

export function deleteFavorite(db: Db, id: string): boolean {
  const result = db.prepare("DELETE FROM favorites WHERE id = ?").run(id);
  return result.changes > 0;
}

export function isFavorite(
  db: Db,
  accountId: string,
  courtId: number,
  dayOfWeek: number,
  time: string,
): Favorite | null {
  const row = db
    .prepare(
      "SELECT id, account_id, court_id, day_of_week, time, name, created_at FROM favorites WHERE account_id = ? AND court_id = ? AND day_of_week = ? AND time = ?",
    )
    .get(accountId, courtId, dayOfWeek, time) as
    | {
        id: string;
        account_id: string;
        court_id: number;
        day_of_week: number;
        time: string;
        name: string | null;
        created_at: string;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    accountId: row.account_id,
    courtId: row.court_id,
    dayOfWeek: row.day_of_week,
    time: row.time,
    name: row.name,
    createdAt: row.created_at,
  };
}
