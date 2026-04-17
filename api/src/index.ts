import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import "dotenv/config";

import { PORT } from "./config/index";
import {
  handleAddAccount,
  handleDeleteAccount,
  handleListAccounts,
  handleUpdateAccount,
} from "./features/accounts/routes";
import { authMiddleware } from "./features/auth/middleware";
import {
  handleBook,
  handleCancel,
  handleGetBookings,
} from "./features/bookings/routes";
import { handleBulkBook } from "./features/bulk-book/routes";
import {
  handleAddFavorite,
  handleDeleteFavorite,
  handleListFavorites,
  handleUpdateFavorite,
} from "./features/favorites/routes";
import { handleExportBookings } from "./features/ics-export/routes";
import { handleGetSchedule } from "./features/schedule/routes";
import { auth } from "./utils/auth";

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
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 86400,
  }),
);

// ── Better Auth ──────────────────────────────────────────────────────────────

// Mount Better Auth handler for all auth routes
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// ── Protected Routes ─────────────────────────────────────────────────────────

app.use("/api/riotinto-accounts/*", authMiddleware);
app.use("/api/bookings/*", authMiddleware);
app.use("/api/book/*", authMiddleware);
app.use("/api/schedule", authMiddleware);
app.use("/api/favorites/*", authMiddleware);
app.use("/api/bulk-book", authMiddleware);

// ── Riotinto Accounts ────────────────────────────────────────────────────────

app.get("/api/riotinto-accounts", handleListAccounts);
app.post("/api/riotinto-accounts", handleAddAccount);
app.delete("/api/riotinto-accounts/:id", handleDeleteAccount);
app.put("/api/riotinto-accounts/:id", handleUpdateAccount);

// ── Bookings ─────────────────────────────────────────────────────────────────

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
