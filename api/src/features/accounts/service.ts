import {
  getSession,
  cancelBooking as riotintoCancelBooking,
  getCourtSchedule as riotintoGetCourtSchedule,
  getCurrentBooking as riotintoGetCurrentBooking,
  makeBooking as riotintoMakeBooking,
} from "../../integrations/riotinto/index.js";
import type {
  AddAccountRequest,
  BulkBookItem,
  BulkBookResult,
  CourtSchedule,
  UpdateAccountRequest,
} from "../../types/index.js";
import { isPastDate } from "../../utils/index.js";
import {
  getDecryptedPassword,
  getSiteUserId,
  getStoredAccount,
  addAccount as repoAddAccount,
  addFavorite as repoAddFavorite,
  deleteAccount as repoDeleteAccount,
  deleteFavorite as repoDeleteFavorite,
  isFavorite as repoIsFavorite,
  listAccounts as repoListAccounts,
  listFavorites as repoListFavorites,
  updateAccount as repoUpdateAccount,
  updateFavorite as repoUpdateFavorite,
} from "./repository.js";

// ── Accounts ──────────────────────────────────────────────────────────────────

export function listAccounts(userId: string) {
  return repoListAccounts(userId);
}

export async function createAccount(userId: string, data: AddAccountRequest) {
  return repoAddAccount(
    userId,
    data.username,
    data.password,
    data.displayName,
    data.phone,
  );
}

export function removeAccount(userId: string, id: string) {
  return repoDeleteAccount(userId, id);
}

export function editAccount(
  userId: string,
  id: string,
  data: UpdateAccountRequest,
) {
  return repoUpdateAccount(userId, id, data.displayName, data.phone);
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export async function getSchedule(
  userId: string,
  weekOffset: number,
): Promise<{ courts: CourtSchedule[]; weekOffset: number } | null> {
  const accounts = await repoListAccounts(userId);
  if (accounts.length === 0) return null;

  const firstAcc = accounts[0]!;
  const stored = await getStoredAccount(userId, firstAcc.id);
  if (!stored) return null;

  const pwd = await getDecryptedPassword(userId, firstAcc.id);
  if (!pwd) return null;

  await getSession(firstAcc.id, stored.username, pwd);

  const ourUsers = new Map<string, string>();
  for (const acc of accounts) {
    const siteUserId = await getSiteUserId(acc.id);
    if (siteUserId && siteUserId !== "0") ourUsers.set(siteUserId, acc.id);
  }

  const [court1, court2] = await Promise.all([
    riotintoGetCourtSchedule(
      firstAcc.id,
      stored.username,
      pwd,
      1,
      weekOffset,
      ourUsers,
    ),
    riotintoGetCourtSchedule(
      firstAcc.id,
      stored.username,
      pwd,
      2,
      weekOffset,
      ourUsers,
    ),
  ]);

  return { courts: [court1, court2], weekOffset };
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export async function getBookings(userId: string) {
  const accounts = await repoListAccounts(userId);

  const results = await Promise.allSettled(
    accounts.flatMap((acc) =>
      [1, 2].map(async (courtId) => {
        const stored = await getStoredAccount(userId, acc.id);
        if (!stored) return null;
        const pwd = await getDecryptedPassword(userId, acc.id);
        if (!pwd) return null;
        const current = await riotintoGetCurrentBooking(
          acc.id,
          stored.username,
          pwd,
          courtId,
        );
        if (!current) return null;
        return {
          accountId: acc.id,
          username: acc.username,
          displayName: acc.displayName,
          courtId,
          booking: current,
        };
      }),
    ),
  );

  return results
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => (r as PromiseFulfilledResult<unknown>).value);
}

export async function book(
  userId: string,
  accountId: string,
  courtId: number,
  date: string,
  dayIndex: number,
  turno: number,
  hora: number,
  semana: number,
) {
  const stored = await getStoredAccount(userId, accountId);
  if (!stored) return { success: false, error: "Account not found" };

  const pwd = await getDecryptedPassword(userId, accountId);
  if (!pwd) return { success: false, error: "Could not decrypt credentials" };

  const result = await riotintoMakeBooking(
    accountId,
    stored.username,
    pwd,
    stored.displayName,
    stored.phone,
    courtId,
    date,
    dayIndex,
    turno,
    hora,
    semana,
  );

  if (!result.success) {
    return { success: false, error: result.message ?? "Booking failed" };
  }
  return { success: true };
}

export async function cancel(
  userId: string,
  accountId: string,
  courtId: number,
  date: string,
  dayIndex: number,
  turno: number,
  hora: number,
  semana: number,
) {
  const stored = await getStoredAccount(userId, accountId);
  if (!stored) return { success: false, error: "Account not found" };

  const pwd = await getDecryptedPassword(userId, accountId);
  if (!pwd) return { success: false, error: "Could not decrypt credentials" };

  const result = await riotintoCancelBooking(
    accountId,
    stored.username,
    pwd,
    stored.displayName,
    stored.phone,
    courtId,
    date,
    dayIndex,
    turno,
    hora,
    semana,
  );

  if (!result.success) {
    return { success: false, error: result.message ?? "Cancel failed" };
  }
  return { success: true };
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export function listFavorites(userId: string, accountId?: string) {
  return repoListFavorites(userId, accountId);
}

export async function addFavorite(
  userId: string,
  accountId: string,
  courtId: number,
  dayOfWeek: number,
  time: string,
  name?: string,
) {
  const existing = await repoIsFavorite(
    userId,
    accountId,
    courtId,
    dayOfWeek,
    time,
  );
  if (existing) return { error: "Favorite already exists" };

  const favorite = await repoAddFavorite(userId, {
    accountId,
    courtId,
    dayOfWeek,
    time,
    name,
  });
  return { favorite };
}

export function updateFavorite(userId: string, id: string, name: string) {
  return repoUpdateFavorite(userId, id, name);
}

export function removeFavorite(userId: string, id: string) {
  return repoDeleteFavorite(userId, id);
}

// ── Bulk Book ─────────────────────────────────────────────────────────────────

const bookingLocks = new Map<string, Promise<unknown>>();

async function withBookingLock<T>(
  accountId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const current = bookingLocks.get(accountId);
  const lock = (async () => {
    if (current) await current;
    try {
      return await fn();
    } finally {
      bookingLocks.delete(accountId);
    }
  })();
  bookingLocks.set(accountId, lock);
  return lock as Promise<T>;
}

export async function bulkBook(
  userId: string,
  bookings: BulkBookItem[],
  forceCancel: boolean,
): Promise<BulkBookResult> {
  const result: BulkBookResult = {
    success: [],
    skipped: [],
    failed: [],
  };

  const accounts = await repoListAccounts(userId);
  const ourUsers = new Map<string, string>();
  for (const acc of accounts) {
    const siteUserId = await getSiteUserId(acc.id);
    if (siteUserId && siteUserId !== "0") ourUsers.set(siteUserId, acc.id);
  }

  const byAccount = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const existing = byAccount.get(booking.accountId) ?? [];
    existing.push(booking);
    byAccount.set(booking.accountId, existing);
  }

  for (const [accountId, accountBookings] of byAccount) {
    await withBookingLock(accountId, async () => {
      for (const booking of accountBookings) {
        const { courtId, date, dayIndex, turno, hora, semana } = booking;

        const stored = await getStoredAccount(userId, accountId);
        if (!stored) {
          result.failed.push({
            accountId,
            courtId,
            date,
            error: "Account not found",
          });
          continue;
        }

        const pwd = await getDecryptedPassword(userId, accountId);
        if (!pwd) {
          result.failed.push({
            accountId,
            courtId,
            date,
            error: "Could not decrypt credentials",
          });
          continue;
        }

        if (isPastDate(date)) {
          result.skipped.push({ accountId, courtId, date, reason: "past" });
          continue;
        }

        try {
          const schedule = await riotintoGetCourtSchedule(
            accountId,
            stored.username,
            pwd,
            courtId,
            semana,
            ourUsers,
          );
          const slot = schedule.slots.find(
            (s) => s.date === date && s.turno === turno && s.hora === hora,
          );
          if (slot?.bookedBy && !slot.isOurs) {
            result.skipped.push({
              accountId,
              courtId,
              date,
              reason: "booked-by-others",
            });
            continue;
          }
        } catch (_e) {}

        if (forceCancel) {
          await riotintoCancelBooking(
            accountId,
            stored.username,
            pwd,
            stored.displayName,
            stored.phone,
            courtId,
            date,
            dayIndex,
            turno,
            hora,
            semana,
          );
        }

        const bookResult = await riotintoMakeBooking(
          accountId,
          stored.username,
          pwd,
          stored.displayName,
          stored.phone,
          courtId,
          date,
          dayIndex,
          turno,
          hora,
          semana,
        );

        if (!bookResult.success) {
          const errorMsg = bookResult.message ?? "";
          if (
            (errorMsg.includes("já") && errorMsg.includes("reservado")) ||
            errorMsg.includes("ocupado")
          ) {
            result.skipped.push({
              accountId,
              courtId,
              date,
              reason: forceCancel
                ? "force-cancel-declined"
                : "booked-by-others",
            });
          } else {
            result.failed.push({
              accountId,
              courtId,
              date,
              error: errorMsg || "Booking failed",
            });
          }
          continue;
        }

        result.success.push({
          accountId,
          courtId,
          date,
          dayIndex,
          turno,
          hora,
        });
      }
    });
  }

  return result;
}
