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

// ── Riotinto Accounts ─────────────────────────────────────────────────────────

export async function listAccounts(userId: string): Promise<AccountSummary[]> {
  const rows = await prisma.riotintoAccount.findMany({
    where: { userId },
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

export async function getStoredAccount(
  userId: string,
  id: string,
): Promise<StoredAccount | null> {
  const row = await prisma.riotintoAccount.findFirst({
    where: { id, userId },
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
  userId: string,
  username: string,
  password: string,
  displayName: string,
  phone: string,
): Promise<AccountSummary> {
  const id = crypto.randomUUID();
  const blob = await encrypt(password);
  const createdAt = new Date();

  const row = await prisma.riotintoAccount.create({
    data: {
      id,
      userId,
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

export async function deleteAccount(
  userId: string,
  id: string,
): Promise<boolean> {
  try {
    await prisma.riotintoAccount.deleteMany({
      where: { id, userId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function updateAccount(
  userId: string,
  id: string,
  displayName: string,
  phone: string,
): Promise<boolean> {
  try {
    await prisma.riotintoAccount.updateMany({
      where: { id, userId },
      data: { displayName, phone },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getDecryptedPassword(
  userId: string,
  id: string,
): Promise<string | null> {
  const acc = await getStoredAccount(userId, id);
  if (!acc) return null;
  return decrypt({
    ciphertext: acc.encryptedPassword,
    salt: acc.salt,
    iv: acc.iv,
  });
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export async function listFavorites(
  userId: string,
  accountId?: string,
): Promise<Favorite[]> {
  const where: { accountId?: string; account: { userId: string } } = {
    account: { userId },
  };
  if (accountId) {
    where.accountId = accountId;
  }

  const rows = await prisma.riotintoFavorite.findMany({
    where,
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

export async function addFavorite(
  userId: string,
  data: AddFavoriteRequest,
): Promise<Favorite | null> {
  // Verify the account belongs to the user
  const account = await prisma.riotintoAccount.findFirst({
    where: { id: data.accountId, userId },
  });
  if (!account) return null;

  const id = crypto.randomUUID();
  const createdAt = new Date();

  const row = await prisma.riotintoFavorite.create({
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

export async function updateFavorite(
  userId: string,
  id: string,
  name: string,
): Promise<boolean> {
  try {
    // Verify the favorite belongs to the user through the account
    const favorite = await prisma.riotintoFavorite.findFirst({
      where: { id },
      include: { account: true },
    });
    if (!favorite || favorite.account.userId !== userId) return false;

    await prisma.riotintoFavorite.update({
      where: { id },
      data: { name },
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteFavorite(
  userId: string,
  id: string,
): Promise<boolean> {
  try {
    // Verify the favorite belongs to the user through the account
    const favorite = await prisma.riotintoFavorite.findFirst({
      where: { id },
      include: { account: true },
    });
    if (!favorite || favorite.account.userId !== userId) return false;

    await prisma.riotintoFavorite.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function isFavorite(
  userId: string,
  accountId: string,
  courtId: number,
  dayOfWeek: number,
  time: string,
): Promise<Favorite | null> {
  // Verify the account belongs to the user
  const account = await prisma.riotintoAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) return null;

  const row = await prisma.riotintoFavorite.findUnique({
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
