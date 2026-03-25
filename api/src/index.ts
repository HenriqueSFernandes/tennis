import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import "dotenv/config";
import * as ics from "ics";
import {
  addAccount,
  addFavorite,
  deleteAccount,
  deleteFavorite,
  getDecryptedPassword,
  getSiteUserId,
  getStoredAccount,
  isFavorite,
  listAccounts,
  listFavorites,
  openDb,
  updateAccount,
  updateFavorite,
} from "./db.js";
import {
  cancelBooking,
  getCourtSchedule,
  getCurrentBooking,
  getSession,
  makeBooking,
} from "./riotintoClient.js";
import type {
  AddAccountRequest,
  AddFavoriteRequest,
  BookRequest,
  BulkBookRequest,
  BulkBookResult,
  CancelRequest,
  UpdateAccountRequest,
  UpdateFavoriteRequest,
} from "./types.js";

const db = openDb();

const app = new Hono();

// ── Per-account booking mutex ──────────────────────────────────────────────────
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

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = ["https://tennis.henriquesf.me"];

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
      if (origin.includes(".rio-tinto-frontend.pages.dev")) return origin;
      if (origin.includes("localhost") || origin.startsWith("http://127.0.0.1"))
        return origin;
      return null;
    },
    allowHeaders: ["Content-Type", "X-App-Password"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    maxAge: 86400,
  }),
);

// ── Auth middleware ───────────────────────────────────────────────────────────
app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/auth") return next();

  const provided = c.req.header("X-App-Password");
  if (!provided || provided !== process.env["APP_PASSWORD"]) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return next();
});

// ── POST /api/auth ────────────────────────────────────────────────────────────
app.post("/api/auth", async (c) => {
  const { password } = await c.req.json<{ password: string }>();
  if (password === process.env["APP_PASSWORD"]) {
    return c.json({ ok: true });
  }
  return c.json({ ok: false }, 401);
});

// ── GET /api/accounts ─────────────────────────────────────────────────────────
app.get("/api/accounts", async (c) => {
  const accounts = listAccounts(db);
  return c.json(accounts);
});

// ── POST /api/accounts ────────────────────────────────────────────────────────
app.post("/api/accounts", async (c) => {
  const body = await c.req.json<AddAccountRequest>();
  const { username, password, displayName, phone } = body;

  if (!username || !password || !displayName || !phone) {
    return c.json(
      {
        error:
          "Missing required fields: username, password, displayName, phone",
      },
      400,
    );
  }
  if (!/^\d{9}$/.test(phone)) {
    return c.json({ error: "Phone must be exactly 9 digits" }, 400);
  }

  const appPassword = process.env["APP_PASSWORD"]!;
  const summary = await addAccount(
    db,
    username,
    password,
    displayName,
    phone,
    appPassword,
  );
  return c.json(summary, 201);
});

// ── DELETE /api/accounts/:id ──────────────────────────────────────────────────
app.delete("/api/accounts/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = deleteAccount(db, id);
  if (!deleted) return c.json({ error: "Account not found" }, 404);
  return c.json({ ok: true });
});

// ── PUT /api/accounts/:id ────────────────────────────────────────────────────
app.put("/api/accounts/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<UpdateAccountRequest>();
  const { displayName, phone } = body;

  if (!displayName || !phone) {
    return c.json(
      { error: "Missing required fields: displayName, phone" },
      400,
    );
  }
  if (!/^\d{9}$/.test(phone)) {
    return c.json({ error: "Phone must be exactly 9 digits" }, 400);
  }

  const updated = updateAccount(db, id, displayName, phone);
  if (!updated) return c.json({ error: "Account not found" }, 404);

  const accounts = listAccounts(db);
  const account = accounts.find((a) => a.id === id);
  return c.json(account);
});

// ── GET /api/bookings ─────────────────────────────────────────────────────────
app.get("/api/bookings", async (c) => {
  const accounts = listAccounts(db);
  const appPassword = process.env["APP_PASSWORD"]!;

  const results = await Promise.allSettled(
    accounts.flatMap((acc) =>
      [1, 2].map(async (courtId) => {
        const stored = getStoredAccount(db, acc.id);
        if (!stored) return null;
        const pwd = await getDecryptedPassword(db, acc.id, appPassword);
        if (!pwd) return null;
        const current = await getCurrentBooking(
          db,
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

  const bookings = results
    .filter((r) => r.status === "fulfilled" && r.value !== null)
    .map((r) => (r as PromiseFulfilledResult<unknown>).value);

  return c.json(bookings);
});

// ── GET /api/schedule ─────────────────────────────────────────────────────────
app.get("/api/schedule", async (c) => {
  const weekOffset = parseInt(c.req.query("week") ?? "0", 10);
  const accounts = listAccounts(db);
  const appPassword = process.env["APP_PASSWORD"]!;

  if (accounts.length === 0) {
    return c.json({ error: "No accounts configured" }, 400);
  }

  const firstAcc = accounts[0]!;
  const stored = getStoredAccount(db, firstAcc.id);
  if (!stored) return c.json({ error: "Account data not found" }, 500);

  const pwd = await getDecryptedPassword(db, firstAcc.id, appPassword);
  if (!pwd) return c.json({ error: "Could not decrypt credentials" }, 500);

  try {
    // Warm the first account's session explicitly so its user_id is in the DB
    // before we build ourUsers. Other accounts' user_ids come from their own
    // cached sessions (populated when they log in via /api/bookings etc.).
    await getSession(db, firstAcc.id, stored.username, pwd);

    // Build siteUserId → SQLite accountId map from all cached sessions
    const ourUsers = new Map<string, string>();
    for (const acc of accounts) {
      const siteUserId = getSiteUserId(db, acc.id);
      if (siteUserId && siteUserId !== "0") ourUsers.set(siteUserId, acc.id);
    }

    const [court1, court2] = await Promise.all([
      getCourtSchedule(
        db,
        firstAcc.id,
        stored.username,
        pwd,
        1,
        weekOffset,
        ourUsers,
      ),
      getCourtSchedule(
        db,
        firstAcc.id,
        stored.username,
        pwd,
        2,
        weekOffset,
        ourUsers,
      ),
    ]);

    return c.json({ courts: [court1, court2], weekOffset });
  } catch (e) {}
});

// ── POST /api/book ────────────────────────────────────────────────────────────
app.post("/api/book", async (c) => {
  const body = await c.req.json<BookRequest>();
  const { accountId, courtId, date, dayIndex, turno, hora, semana } = body;
  const appPassword = process.env["APP_PASSWORD"]!;

  const stored = getStoredAccount(db, accountId);
  if (!stored) return c.json({ error: "Account not found" }, 404);

  const pwd = await getDecryptedPassword(db, accountId, appPassword);
  if (!pwd) return c.json({ error: "Could not decrypt credentials" }, 500);

  const result = await makeBooking(
    db,
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
    return c.json({ error: result.message ?? "Booking failed" }, 400);
  }
  return c.json({ ok: true });
});

// ── DELETE /api/book ──────────────────────────────────────────────────────────
app.delete("/api/book", async (c) => {
  const body = await c.req.json<CancelRequest>();
  const { accountId, courtId, date, dayIndex, turno, hora, semana } = body;
  const appPassword = process.env["APP_PASSWORD"]!;

  const stored = getStoredAccount(db, accountId);
  if (!stored) return c.json({ error: "Account not found" }, 404);

  const pwd = await getDecryptedPassword(db, accountId, appPassword);
  if (!pwd) return c.json({ error: "Could not decrypt credentials" }, 500);

  const result = await cancelBooking(
    db,
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
    return c.json({ error: result.message ?? "Cancel failed" }, 400);
  }
  return c.json({ ok: true });
});

// ── GET /api/favorites ────────────────────────────────────────────────────────
app.get("/api/favorites", async (c) => {
  const accountId = c.req.query("accountId");
  const favorites = listFavorites(db, accountId ?? undefined);
  return c.json(favorites);
});

// ── POST /api/favorites ───────────────────────────────────────────────────────
app.post("/api/favorites", async (c) => {
  const body = await c.req.json<AddFavoriteRequest>();
  const { accountId, courtId, dayOfWeek, time, name } = body;

  if (!accountId || courtId === undefined || dayOfWeek === undefined || !time) {
    return c.json(
      {
        error: "Missing required fields: accountId, courtId, dayOfWeek, time",
      },
      400,
    );
  }

  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return c.json({ error: "dayOfWeek must be between 0 and 6" }, 400);
  }

  const stored = getStoredAccount(db, accountId);
  if (!stored) return c.json({ error: "Account not found" }, 404);

  const existing = isFavorite(db, accountId, courtId, dayOfWeek, time);
  if (existing) {
    return c.json({ error: "Favorite already exists" }, 409);
  }

  const favorite = addFavorite(db, {
    accountId,
    courtId,
    dayOfWeek,
    time,
    name,
  });
  return c.json(favorite, 201);
});

// ── PUT /api/favorites/:id ───────────────────────────────────────────────────
app.put("/api/favorites/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<UpdateFavoriteRequest>();
  const { name } = body;

  if (!name) {
    return c.json({ error: "Missing required field: name" }, 400);
  }

  const updated = updateFavorite(db, id, name);
  if (!updated) return c.json({ error: "Favorite not found" }, 404);

  const favorites = listFavorites(db);
  const favorite = favorites.find((f) => f.id === id);
  return c.json(favorite);
});

// ── DELETE /api/favorites/:id ─────────────────────────────────────────────────
app.delete("/api/favorites/:id", async (c) => {
  const id = c.req.param("id");
  const deleted = deleteFavorite(db, id);
  if (!deleted) return c.json({ error: "Favorite not found" }, 404);
  return c.json({ ok: true });
});

// ── POST /api/bulk-book ─────────────────────────────────────────────────────────
app.post("/api/bulk-book", async (c) => {
  const body = await c.req.json<BulkBookRequest>();
  const { bookings, forceCancel } = body;
  const appPassword = process.env["APP_PASSWORD"]!;

  const result: BulkBookResult = {
    success: [],
    skipped: [],
    failed: [],
  };

  const requestId = Math.random().toString(36).slice(2, 10);
  const startMs = Date.now();

  // Build ourUsers map for pre-check
  const accounts = listAccounts(db);
  const ourUsers = new Map<string, string>();
  for (const acc of accounts) {
    const siteUserId = getSiteUserId(db, acc.id);
    if (siteUserId && siteUserId !== "0") ourUsers.set(siteUserId, acc.id);
  }

  // Group bookings by accountId for mutex
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
        const slotKey = `${date}-${courtId}-${turno}-${hora}`;
        const ts = new Date().toISOString();

        const stored = getStoredAccount(db, accountId);
        if (!stored) {
          result.failed.push({
            accountId,
            courtId,
            date,
            error: "Account not found",
          });
          continue;
        }

        const pwd = await getDecryptedPassword(db, accountId, appPassword);
        if (!pwd) {
          result.failed.push({
            accountId,
            courtId,
            date,
            error: "Could not decrypt credentials",
          });
          continue;
        }

        // Check if slot is in the past
        const [dd, mm, yyyy] = date.split("-").map(Number);
        const slotDate = new Date(yyyy!, mm! - 1, dd!);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (slotDate < today) {
          result.skipped.push({ accountId, courtId, date, reason: "past" });
          continue;
        }

        // Pre-check availability
        try {
          const schedule = await getCourtSchedule(
            db,
            stored.id,
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
        } catch (e) {
        }

        // If forceCancel is true, first cancel any existing booking for this slot
        if (forceCancel) {
          await cancelBooking(
            db,
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

        // Make the booking
        const bookResult = await makeBooking(
          db,
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

  const elapsed = Date.now() - startMs;

  return c.json(result);
});

// ── Helper functions for iCal export ──────────────────────────────────────────

function parseDateTime(dateStr: string, timeStr: string): Date {
  const [dd = 1, mm = 1, yyyy = 1970] = dateStr.split("-").map(Number);
  const [hh = 0, min = 0] = timeStr.split(":").map(Number);
  return new Date(yyyy, mm - 1, dd, hh, min);
}

function dateToIcsArray(date: Date): ics.DateArray {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ];
}

interface BookingWithAccount {
  accountId: string;
  username: string;
  displayName: string;
  phone: string;
  courtId: number;
  date: string;
  time: string;
  gnome: string;
}

async function fetchAllBookings(
  appPassword: string,
): Promise<BookingWithAccount[]> {
  const accounts = listAccounts(db);

  const results = await Promise.allSettled(
    accounts.flatMap((acc) =>
      [1, 2].map(async (courtId) => {
        const stored = getStoredAccount(db, acc.id);
        if (!stored) return null;
        const pwd = await getDecryptedPassword(db, acc.id, appPassword);
        if (!pwd) return null;
        const current = await getCurrentBooking(
          db,
          acc.id,
          stored.username,
          pwd,
          courtId,
        );
        if (!current) return null;
        return {
          accountId: acc.id,
          username: stored.username,
          displayName: stored.displayName,
          phone: stored.phone,
          courtId,
          date: current.date,
          time: current.time,
          gnome: current.gnome,
        };
      }),
    ),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<BookingWithAccount | null> =>
        r.status === "fulfilled",
    )
    .map((r) => r.value)
    .filter((booking): booking is BookingWithAccount => booking !== null);
}

function generateIcsContent(bookings: BookingWithAccount[]): string {
  const events: ics.EventAttributes[] = bookings.map((booking) => {
    const startDate = parseDateTime(booking.date, booking.time);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    return {
      start: dateToIcsArray(startDate),
      end: dateToIcsArray(endDate),
      title: `Tennis Court ${booking.courtId}`,
      location: "Rio Tinto",
      description: `Court ${booking.courtId} booking\nAccount: ${booking.displayName} (${booking.username})\nPhone: ${booking.phone}`,
      uid: `${booking.accountId}-${booking.courtId}-${booking.date.replace(/-/g, "")}-${booking.time.replace(/:/g, "")}@riotinto.pt`,
    };
  });

  const { error, value } = ics.createEvents(events);
  if (error || !value) {
    throw new Error(error ? String(error) : "Failed to generate ICS file");
  }

  return value;
}

// ── GET /api/bookings/export ──────────────────────────────────────────────────
app.get("/api/bookings/export", async (c) => {
  const appPassword = process.env["APP_PASSWORD"]!;
  const accountId = c.req.query("accountId");

  try {
    let bookings = await fetchAllBookings(appPassword);

    // Filter by accountId if specified
    if (accountId) {
      bookings = bookings.filter((b) => b.accountId === accountId);
    }

    if (bookings.length === 0) {
      return c.json({ error: "No bookings found" }, 404);
    }

    const icsContent = generateIcsContent(bookings);

    c.header("Content-Type", "text/calendar; charset=utf-8");
    c.header(
      "Content-Disposition",
      'attachment; filename="riotinto-bookings.ics"',
    );
    return c.body(icsContent);
  } catch (e) {
    return c.json({ error: "Failed to generate calendar file" }, 500);
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (c) => c.json({ status: "ok", service: "rio-tinto-api" }));

// ── Start server ──────────────────────────────────────────────────────────────
const port = parseInt(process.env["PORT"] ?? "3000", 10);
serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on port ${port}`);
});
