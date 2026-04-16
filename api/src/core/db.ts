import type { CachedSession } from "../types/index.js";
import { prisma } from "../utils/prisma.js";

const SESSION_TTL_MS = 90 * 60 * 1000;

export function getCachedSession(accountId: string): CachedSession | null {
  const row = prisma.session.findUnique({
    where: { accountId },
  });

  if (!row) return null;

  if (Date.now() - Number(row.cachedAt) > SESSION_TTL_MS) {
    prisma.session.delete({ where: { accountId } }).catch(() => {});
    return null;
  }

  return {
    cookies: row.cookies,
    csrfToken: row.csrfToken,
    userId: row.userId,
    cachedAt: Number(row.cachedAt),
  };
}

export function saveSession(accountId: string, session: CachedSession): void {
  prisma.session.upsert({
    where: { accountId },
    update: {
      cookies: session.cookies,
      csrfToken: session.csrfToken,
      userId: session.userId,
      cachedAt: session.cachedAt,
    },
    create: {
      accountId,
      cookies: session.cookies,
      csrfToken: session.csrfToken,
      userId: session.userId,
      cachedAt: session.cachedAt,
    },
  });
}

export function clearSession(accountId: string): void {
  prisma.session.delete({ where: { accountId } }).catch(() => {});
}

export function getSiteUserId(accountId: string): string | null {
  const row = prisma.session.findUnique({
    where: { accountId },
    select: { userId: true },
  });
  return row?.userId ?? null;
}
