import type { CachedSession } from "../types/index";
import { prisma } from "../utils/prisma";

const SESSION_TTL_MS = 90 * 60 * 1000;

export async function getCachedSession(
  accountId: string,
): Promise<CachedSession | null> {
  const row = await prisma.riotintoSession.findUnique({
    where: { accountId },
  });

  if (!row) return null;

  if (Date.now() - Number(row.cachedAt) > SESSION_TTL_MS) {
    await prisma.riotintoSession
      .delete({ where: { accountId } })
      .catch(() => {});
    return null;
  }

  return {
    cookies: row.cookies,
    csrfToken: row.csrfToken,
    userId: row.userId,
    cachedAt: Number(row.cachedAt),
  };
}

export async function saveSession(
  accountId: string,
  session: CachedSession,
): Promise<void> {
  await prisma.riotintoSession.upsert({
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

export async function clearSession(accountId: string): Promise<void> {
  await prisma.riotintoSession.delete({ where: { accountId } }).catch(() => {});
}

export async function getSiteUserId(accountId: string): Promise<string | null> {
  const row = await prisma.riotintoSession.findUnique({
    where: { accountId },
    select: { userId: true },
  });
  return row?.userId ?? null;
}
