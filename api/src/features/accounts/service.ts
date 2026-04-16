import { APP_PASSWORD } from "../../config/index.js";
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

export function listAccounts() {
  return repoListAccounts();
}

export async function createAccount(data: AddAccountRequest) {
  return repoAddAccount(
    data.username,
    data.password,
    data.displayName,
    data.phone,
    APP_PASSWORD,
  );
}

export function removeAccount(id: string) {
  return repoDeleteAccount(id);
}

export function editAccount(id: string, data: UpdateAccountRequest) {
  return repoUpdateAccount(id, data.displayName, data.phone);
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export async function getSchedule(
  weekOffset: number,
): Promise<{ courts: CourtSchedule[]; weekOffset: number } | null> {
  const accounts = repoListAccounts();
  if (accounts.length === 0) return null;

  const firstAcc = accounts[0]!;
  const stored = getStoredAccount(firstAcc.id);
  if (!stored) return null;

  const pwd = await getDecryptedPassword(firstAcc.id, APP_PASSWORD);
  if (!pwd) return null;

  await getSession(firstAcc.id, stored.username, pwd);

  const ourUsers = new Map<string, string>();
  for (const acc of accounts) {
    const siteUserId = getSiteUserId(acc.id);
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

export async function getBookings() {
  const accounts = repoListAccounts();

  const results = await Promise.allSettled(
    accounts.flatMap((acc) =>
      [1, 2].map(async (courtId) => {
        const stored = getStoredAccount(acc.id);
        if (!stored) return null;
        const pwd = await getDecryptedPassword(acc.id, APP_PASSWORD);
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
  accountId: string,
  courtId: number,
  date: string,
  dayIndex: number,
  turno: number,
  hora: number,
  semana: number,
) {
  const stored = getStoredAccount(accountId);
  if (!stored) return { success: false, error: "Account not found" };

  const pwd = await getDecryptedPassword(accountId, APP_PASSWORD);
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
  accountId: string,
  courtId: number,
  date: string,
  dayIndex: number,
  turno: number,
  hora: number,
  semana: number,
) {
  const stored = getStoredAccount(accountId);
  if (!stored) return { success: false, error: "Account not found" };

  const pwd = await getDecryptedPassword(accountId, APP_PASSWORD);
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

export function listFavorites(accountId?: string) {
  return repoListFavorites(accountId);
}

export function addFavorite(
  accountId: string,
  courtId: number,
  dayOfWeek: number,
  time: string,
  name?: string,
) {
  const existing = repoIsFavorite(accountId, courtId, dayOfWeek, time);
  if (existing) return { error: "Favorite already exists" };

  const favorite = repoAddFavorite({
    accountId,
    courtId,
    dayOfWeek,
    time,
    name,
  });
  return { favorite };
}

export function updateFavorite(id: string, name: string) {
  return repoUpdateFavorite(id, name);
}

export function removeFavorite(id: string) {
  return repoDeleteFavorite(id);
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
  bookings: BulkBookItem[],
  forceCancel: boolean,
): Promise<BulkBookResult> {
  const result: BulkBookResult = {
    success: [],
    skipped: [],
    failed: [],
  };

  const accounts = repoListAccounts();
  const ourUsers = new Map<string, string>();
  for (const acc of accounts) {
    const siteUserId = getSiteUserId(acc.id);
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

        const stored = getStoredAccount(accountId);
        if (!stored) {
          result.failed.push({
            accountId,
            courtId,
            date,
            error: "Account not found",
          });
          continue;
        }

        const pwd = await getDecryptedPassword(accountId, APP_PASSWORD);
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
