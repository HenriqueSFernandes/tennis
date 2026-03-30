import { decrypt, encrypt } from "../../core/crypto.js";
import {
  clearSession,
  getCachedSession,
  getSiteUserId,
  openDb,
  saveSession,
} from "../../core/db.js";
import type {
  AccountSummary,
  AddFavoriteRequest,
  Favorite,
  StoredAccount,
} from "../../types/index.js";

const db = openDb();

export { clearSession, db, getCachedSession, getSiteUserId, saveSession };

// ── Accounts ──────────────────────────────────────────────────────────────────

export function listAccounts(): AccountSummary[] {
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

export function getStoredAccount(id: string): StoredAccount | null {
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

export function deleteAccount(id: string): boolean {
  const result = db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
  if (result.changes === 0) return false;
  clearSession(db, id);
  return true;
}

export function updateAccount(
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
  id: string,
  appPassword: string,
): Promise<string | null> {
  const acc = getStoredAccount(id);
  if (!acc) return null;
  return decrypt(
    {
      ciphertext: acc.encryptedPassword,
      salt: acc.salt,
      iv: acc.iv,
    },
    appPassword,
  );
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export function listFavorites(accountId?: string): Favorite[] {
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

export function addFavorite(data: AddFavoriteRequest): Favorite {
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

export function updateFavorite(id: string, name: string): boolean {
  const result = db
    .prepare("UPDATE favorites SET name = ? WHERE id = ?")
    .run(name, id);
  return result.changes > 0;
}

export function deleteFavorite(id: string): boolean {
  const result = db.prepare("DELETE FROM favorites WHERE id = ?").run(id);
  return result.changes > 0;
}

export function isFavorite(
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
