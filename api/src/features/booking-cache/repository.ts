import { prisma } from "../../utils/prisma.js";
import type { CachedBooking } from "./types.js";

export async function upsertBooking(
  riotintoAccountId: string,
  courtId: number,
  date: string,
  dayIndex: number,
  turno: string,
  hora: string,
  time: string,
  semana: number,
): Promise<CachedBooking> {
  const row = await prisma.bookingCache.upsert({
    where: {
      riotintoAccountId_courtId_date_hora: {
        riotintoAccountId,
        courtId,
        date,
        hora,
      },
    },
    create: {
      riotintoAccountId,
      courtId,
      date,
      dayIndex,
      turno,
      hora,
      time,
      semana,
      status: "booked",
    },
    update: {
      dayIndex,
      turno,
      time,
      semana,
      status: "booked",
      lastSynced: new Date(),
    },
  });

  return {
    id: row.id,
    riotintoAccountId: row.riotintoAccountId,
    courtId: row.courtId,
    date: row.date,
    dayIndex: row.dayIndex,
    turno: row.turno,
    hora: row.hora,
    time: row.time,
    semana: row.semana,
    status: row.status,
    lastSynced: row.lastSynced.toISOString(),
  };
}

export async function markCancelled(
  riotintoAccountId: string,
  courtId: number,
  date: string,
  hora: string,
): Promise<boolean> {
  try {
    await prisma.bookingCache.updateMany({
      where: {
        riotintoAccountId,
        courtId,
        date,
        hora,
      },
      data: { status: "cancelled" },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getBookingsByAccountIds(
  accountIds: string[],
): Promise<CachedBooking[]> {
  const rows = await prisma.bookingCache.findMany({
    where: {
      riotintoAccountId: { in: accountIds },
      status: "booked",
    },
    orderBy: [{ date: "asc" }, { hora: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    riotintoAccountId: r.riotintoAccountId,
    courtId: r.courtId,
    date: r.date,
    dayIndex: r.dayIndex,
    turno: r.turno,
    hora: r.hora,
    time: r.time,
    semana: r.semana,
    status: r.status,
    lastSynced: r.lastSynced.toISOString(),
  }));
}

export async function getUserCachedBookings(
  userId: string,
): Promise<CachedBooking[]> {
  const accounts = await prisma.riotintoAccount.findMany({
    where: { userId },
    select: { id: true },
  });

  const accountIds = accounts.map((a) => a.id);
  if (accountIds.length === 0) return [];

  return getBookingsByAccountIds(accountIds);
}

export async function getSyncTimestampsByAccountIds(
  accountIds: string[],
): Promise<Map<string, Date>> {
  const rows = await prisma.bookingCache.groupBy({
    by: ["riotintoAccountId"],
    where: {
      riotintoAccountId: { in: accountIds },
    },
    _max: { lastSynced: true },
  });

  const map = new Map<string, Date>();
  for (const row of rows) {
    if (row._max.lastSynced) {
      map.set(row.riotintoAccountId, row._max.lastSynced);
    }
  }
  return map;
}

export async function cleanupOldCancelled(daysOld = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.bookingCache.deleteMany({
    where: {
      status: "cancelled",
      lastSynced: { lt: cutoffDate },
    },
  });

  return result.count;
}
