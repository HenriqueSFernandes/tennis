import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { CachedSession, Db } from "../types/index.js";

const SESSION_TTL_MS = 90 * 60 * 1000;

export function openDb(dataDir?: string): Db {
  const dir =
    dataDir ?? process.env["DATA_DIR"] ?? path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const dbPath = path.join(dir, "db.sqlite");

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

  return db as Db;
}

// ── Session management ────────────────────────────────────────────────────────

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

export function getSiteUserId(db: Db, accountId: string): string | null {
  const row = db
    .prepare("SELECT user_id FROM sessions WHERE account_id = ?")
    .get(accountId) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}
