import { getCurrentBooking as riotintoGetCurrentBooking } from "../../integrations/riotinto/index.js";
import { prisma } from "../../utils/prisma.js";
import {
  getDecryptedPassword,
  getStoredAccount,
  listAccounts,
} from "../accounts/repository.js";
import {
  getBookingsByAccountIds,
  markCancelled,
  upsertBooking,
} from "./repository.js";
import type { CachedBooking, SyncResult } from "./types.js";

export async function syncUserBookings(userId: string): Promise<SyncResult> {
  const accounts = await listAccounts(userId);
  let synced = 0;
  let removed = 0;

  for (const acc of accounts) {
    try {
      const stored = await getStoredAccount(userId, acc.id);
      if (!stored) continue;

      const pwd = await getDecryptedPassword(userId, acc.id);
      if (!pwd) continue;

      const currentBookings = new Map<string, CachedBooking>();

      for (const courtId of [1, 2]) {
        const current = await riotintoGetCurrentBooking(
          acc.id,
          stored.username,
          pwd,
          courtId,
        );

        if (current) {
          const key = `${acc.id}-${courtId}-${current.date}-${current.time}`;
          const dayIndex = parseDayIndex(current.date);
          const semana = 0;
          const turno = "0";

          const cached = await upsertBooking(
            acc.id,
            courtId,
            current.date,
            dayIndex,
            turno,
            current.time,
            semana,
          );
          currentBookings.set(key, cached);
          synced++;
        }
      }

      const existing = await getBookingsByAccountIds([acc.id]);
      for (const existingBooking of existing) {
        const key = `${existingBooking.riotintoAccountId}-${existingBooking.courtId}-${existingBooking.date}-${existingBooking.hora}`;
        if (!currentBookings.has(key)) {
          await markCancelled(
            existingBooking.riotintoAccountId,
            existingBooking.courtId,
            existingBooking.date,
            existingBooking.hora,
          );
          removed++;
        }
      }
    } catch (e) {
      console.error(`Failed to sync bookings for account ${acc.id}:`, e);
    }
  }

  return { synced, removed };
}

export async function getFriendCachedBookings(friendUserId: string): Promise<{
  bookings: {
    accountId: string;
    accountDisplayName: string;
    courtId: number;
    date: string;
    dayIndex: number;
    turno: string;
    hora: string;
    semana: number;
  }[];
  lastSynced: string;
  isStale: boolean;
}> {
  const accounts = await prisma.riotintoAccount.findMany({
    where: { userId: friendUserId },
    select: { id: true, displayName: true },
  });

  const accountIds = accounts.map((a) => a.id);
  if (accountIds.length === 0) {
    return { bookings: [], lastSynced: "", isStale: false };
  }

  const bookings = await getBookingsByAccountIds(accountIds);
  const accountMap = new Map(accounts.map((a) => [a.id, a.displayName]));

  const formatted = bookings.map((b) => ({
    accountId: b.riotintoAccountId,
    accountDisplayName: accountMap.get(b.riotintoAccountId) ?? "",
    courtId: b.courtId,
    date: b.date,
    dayIndex: b.dayIndex,
    turno: b.turno,
    hora: b.hora,
    semana: b.semana,
  }));

  const lastSynced =
    bookings.length > 0 ? bookings[bookings.length - 1]!.lastSynced : "";

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const isStale = bookings.some((b) => new Date(b.lastSynced) < fiveMinutesAgo);

  return { bookings: formatted, lastSynced, isStale };
}

export function onBookingSuccess(
  accountId: string,
  courtId: number,
  date: string,
  dayIndex: number,
  turno: string,
  hora: string,
  semana: number,
) {
  return upsertBooking(accountId, courtId, date, dayIndex, turno, hora, semana);
}

export function onBookingCancelled(
  accountId: string,
  courtId: number,
  date: string,
  hora: string,
) {
  return markCancelled(accountId, courtId, date, hora);
}

function parseDayIndex(dateStr: string): number {
  const [dd, mm, yyyy] = dateStr.split("-").map(Number);
  const date = new Date(yyyy ?? 0, (mm ?? 1) - 1, dd ?? 0);
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}
