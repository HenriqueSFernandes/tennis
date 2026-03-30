import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import "dotenv/config";

import { PORT } from "./config/index.js";
import {
  handleAddAccount,
  handleDeleteAccount,
  handleListAccounts,
  handleUpdateAccount,
} from "./features/accounts/routes.js";
import { authMiddleware } from "./features/auth/middleware.js";
import {
  handleBook,
  handleCancel,
  handleGetBookings,
} from "./features/bookings/routes.js";
import { handleBulkBook } from "./features/bulk-book/routes.js";
import {
  handleAddFavorite,
  handleDeleteFavorite,
  handleListFavorites,
  handleUpdateFavorite,
} from "./features/favorites/routes.js";
import { handleExportBookings } from "./features/ics-export/routes.js";
import { handleGetSchedule } from "./features/schedule/routes.js";

// ── App setup ────────────────────────────────────────────────────────────────

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      if (
        origin === "https://tennis.henriquesf.me" ||
        origin === "https://riotinto.henriquesf.me"
      )
        return origin;
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

app.use("/api/*", authMiddleware);

// ── Auth ─────────────────────────────────────────────────────────────────────

app.post("/api/auth", async (c) => {
  const { password } = await c.req.json<{ password: string }>();
  if (password === process.env["APP_PASSWORD"]) {
    return c.json({ ok: true });
  }
  return c.json({ ok: false }, 401);
});

// ── Accounts ─────────────────────────────────────────────────────────────────

app.get("/api/accounts", handleListAccounts);
app.post("/api/accounts", handleAddAccount);
app.delete("/api/accounts/:id", handleDeleteAccount);
app.put("/api/accounts/:id", handleUpdateAccount);

// ── Bookings ──────────────────────────────────────────────────────────────────

app.get("/api/bookings", handleGetBookings);
app.post("/api/book", handleBook);
app.delete("/api/book", handleCancel);
app.get("/api/bookings/export", handleExportBookings);

// ── Schedule ─────────────────────────────────────────────────────────────────

app.get("/api/schedule", handleGetSchedule);

// ── Favorites ─────────────────────────────────────────────────────────────────

app.get("/api/favorites", handleListFavorites);
app.post("/api/favorites", handleAddFavorite);
app.put("/api/favorites/:id", handleUpdateFavorite);
app.delete("/api/favorites/:id", handleDeleteFavorite);

// ── Bulk Book ─────────────────────────────────────────────────────────────────

app.post("/api/bulk-book", handleBulkBook);

// ── Health check ─────────────────────────────────────────────────────────────

app.get("/", (c) => c.json({ status: "ok", service: "rio-tinto-api" }));

// ── Start server ─────────────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`API listening on port ${PORT}`);
});
