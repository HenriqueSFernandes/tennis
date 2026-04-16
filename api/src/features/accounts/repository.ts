import { decrypt, encrypt } from "../../core/crypto.js";
import {
  clearSession,
  getCachedSession,
  getSiteUserId,
  saveSession,
} from "../../core/db.js";
import type {
  AccountSummary,
  AddFavoriteRequest,
  Favorite,
  StoredAccount,
} from "../../types/index.js";
import { prisma } from "../../utils/prisma.js";

export { clearSession, getCachedSession, getSiteUserId, saveSession };

// ── Accounts ──────────────────────────────────────────────────────────────────

export function listAccounts(): AccountSummary[] {
  const rows = prisma.account.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      phone: true,
      createdAt: true,
    },
  });

  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    displayName: r.displayName,
    phone: r.phone,
    createdAt: r.createdAt.toISOString(),
  }));
}

export function getStoredAccount(id: string): StoredAccount | null {
  const row = prisma.account.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      displayName: true,
      phone: true,
      encryptedPassword: true,
      salt: true,
      iv: true,
      createdAt: true,
    },
  });

  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    phone: row.phone,
    encryptedPassword: row.encryptedPassword,
    salt: row.salt,
    iv: row.iv,
    createdAt: row.createdAt.toISOString(),
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
  const createdAt = new Date();

  const row = await prisma.account.create({
    data: {
      id,
      username,
      displayName,
      phone,
      encryptedPassword: blob.ciphertext,
      salt: blob.salt,
      iv: blob.iv,
      createdAt,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      phone: true,
      createdAt: true,
    },
  });

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
  };
}

export function deleteAccount(id: string): boolean {
  try {
    prisma.account.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export function updateAccount(
  id: string,
  displayName: string,
  phone: string,
): boolean {
  try {
    prisma.account.update({
      where: { id },
      data: { displayName, phone },
    });
    return true;
  } catch {
    return false;
  }
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
  const rows = prisma.favorite.findMany({
    where: accountId ? { accountId } : undefined,
    orderBy: [{ courtId: "asc" }, { dayOfWeek: "asc" }, { time: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    accountId: r.accountId,
    courtId: r.courtId,
    dayOfWeek: r.dayOfWeek,
    time: r.time,
    name: r.name,
    createdAt: r.createdAt.toISOString(),
  }));
}

export function addFavorite(data: AddFavoriteRequest): Favorite {
  const id = crypto.randomUUID();
  const createdAt = new Date();

  const row = prisma.favorite.create({
    data: {
      id,
      accountId: data.accountId,
      courtId: data.courtId,
      dayOfWeek: data.dayOfWeek,
      time: data.time,
      name: data.name ?? null,
      createdAt,
    },
  });

  return {
    id: row.id,
    accountId: row.accountId,
    courtId: row.courtId,
    dayOfWeek: row.dayOfWeek,
    time: row.time,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export function updateFavorite(id: string, name: string): boolean {
  try {
    prisma.favorite.update({
      where: { id },
      data: { name },
    });
    return true;
  } catch {
    return false;
  }
}

export function deleteFavorite(id: string): boolean {
  try {
    prisma.favorite.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export function isFavorite(
  accountId: string,
  courtId: number,
  dayOfWeek: number,
  time: string,
): Favorite | null {
  const row = prisma.favorite.findUnique({
    where: {
      accountId_courtId_dayOfWeek_time: {
        accountId,
        courtId,
        dayOfWeek,
        time,
      },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    accountId: row.accountId,
    courtId: row.courtId,
    dayOfWeek: row.dayOfWeek,
    time: row.time,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}
