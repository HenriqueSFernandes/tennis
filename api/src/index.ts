import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import "dotenv/config";
import {
  addAccount,
  deleteAccount,
  getDecryptedPassword,
  getSiteUserId,
  getStoredAccount,
  listAccounts,
  openDb,
  updateAccount,
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
  BookRequest,
  CancelRequest,
  UpdateAccountRequest,
} from "./types.js";

const db = openDb();

const app = new Hono();

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
  } catch (e) {
    console.error("[schedule] fetch failed:", e);
    return c.json({ courts: [], weekOffset });
  }
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

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/", (c) => c.json({ status: "ok", service: "rio-tinto-api" }));

// ── Start server ──────────────────────────────────────────────────────────────
const port = parseInt(process.env["PORT"] ?? "3000", 10);
serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on port ${port}`);
});
