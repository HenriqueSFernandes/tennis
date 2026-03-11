"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_server_1 = require("@hono/node-server");
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
require("dotenv/config");
const db_js_1 = require("./db.js");
const riotintoClient_js_1 = require("./riotintoClient.js");
const db = (0, db_js_1.openDb)();
const app = new hono_1.Hono();
// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    'https://tennis.henriquesf.me',
];
app.use('*', (0, cors_1.cors)({
    origin: (origin) => {
        if (!origin)
            return '*';
        if (ALLOWED_ORIGINS.includes(origin))
            return origin;
        if (origin.includes('.rio-tinto-frontend.pages.dev'))
            return origin;
        if (origin.includes('localhost') || origin.startsWith('http://127.0.0.1'))
            return origin;
        return null;
    },
    allowHeaders: ['Content-Type', 'X-App-Password'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
}));
// ── Auth middleware ───────────────────────────────────────────────────────────
app.use('/api/*', async (c, next) => {
    if (c.req.path === '/api/auth')
        return next();
    const provided = c.req.header('X-App-Password');
    if (!provided || provided !== process.env['APP_PASSWORD']) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    return next();
});
// ── POST /api/auth ────────────────────────────────────────────────────────────
app.post('/api/auth', async (c) => {
    const { password } = await c.req.json();
    if (password === process.env['APP_PASSWORD']) {
        return c.json({ ok: true });
    }
    return c.json({ ok: false }, 401);
});
// ── GET /api/accounts ─────────────────────────────────────────────────────────
app.get('/api/accounts', async (c) => {
    const accounts = (0, db_js_1.listAccounts)(db);
    return c.json(accounts);
});
// ── POST /api/accounts ────────────────────────────────────────────────────────
app.post('/api/accounts', async (c) => {
    const body = await c.req.json();
    const { username, password, displayName, phone } = body;
    if (!username || !password || !displayName || !phone) {
        return c.json({ error: 'Missing required fields: username, password, displayName, phone' }, 400);
    }
    if (!/^\d{9}$/.test(phone)) {
        return c.json({ error: 'Phone must be exactly 9 digits' }, 400);
    }
    const appPassword = process.env['APP_PASSWORD'];
    const summary = await (0, db_js_1.addAccount)(db, username, password, displayName, phone, appPassword);
    return c.json(summary, 201);
});
// ── DELETE /api/accounts/:id ──────────────────────────────────────────────────
app.delete('/api/accounts/:id', async (c) => {
    const id = c.req.param('id');
    const deleted = (0, db_js_1.deleteAccount)(db, id);
    if (!deleted)
        return c.json({ error: 'Account not found' }, 404);
    return c.json({ ok: true });
});
// ── GET /api/bookings ─────────────────────────────────────────────────────────
app.get('/api/bookings', async (c) => {
    const accounts = (0, db_js_1.listAccounts)(db);
    const appPassword = process.env['APP_PASSWORD'];
    const results = await Promise.allSettled(accounts.flatMap((acc) => [1, 2].map(async (courtId) => {
        const stored = (0, db_js_1.getStoredAccount)(db, acc.id);
        if (!stored)
            return null;
        const pwd = await (0, db_js_1.getDecryptedPassword)(db, acc.id, appPassword);
        if (!pwd)
            return null;
        const current = await (0, riotintoClient_js_1.getCurrentBooking)(db, acc.id, stored.username, pwd, courtId);
        if (!current)
            return null;
        return {
            accountId: acc.id,
            username: acc.username,
            displayName: acc.displayName,
            courtId,
            booking: current,
        };
    })));
    const bookings = results
        .filter((r) => r.status === 'fulfilled' && r.value !== null)
        .map((r) => r.value);
    return c.json(bookings);
});
// ── GET /api/schedule ─────────────────────────────────────────────────────────
app.get('/api/schedule', async (c) => {
    const weekOffset = parseInt(c.req.query('week') ?? '0', 10);
    const accounts = (0, db_js_1.listAccounts)(db);
    const appPassword = process.env['APP_PASSWORD'];
    if (accounts.length === 0) {
        return c.json({ error: 'No accounts configured' }, 400);
    }
    const firstAcc = accounts[0];
    const stored = (0, db_js_1.getStoredAccount)(db, firstAcc.id);
    if (!stored)
        return c.json({ error: 'Account data not found' }, 500);
    const pwd = await (0, db_js_1.getDecryptedPassword)(db, firstAcc.id, appPassword);
    if (!pwd)
        return c.json({ error: 'Could not decrypt credentials' }, 500);
    // Build siteUserId → SQLite accountId map from cached sessions
    const ourUsers = new Map();
    for (const acc of accounts) {
        const siteUserId = (0, db_js_1.getSiteUserId)(db, acc.id);
        if (siteUserId && siteUserId !== '0')
            ourUsers.set(siteUserId, acc.id);
    }
    const [court1, court2] = await Promise.all([
        (0, riotintoClient_js_1.getCourtSchedule)(db, firstAcc.id, stored.username, pwd, 1, weekOffset, ourUsers),
        (0, riotintoClient_js_1.getCourtSchedule)(db, firstAcc.id, stored.username, pwd, 2, weekOffset, ourUsers),
    ]);
    return c.json({ courts: [court1, court2], weekOffset });
});
// ── POST /api/book ────────────────────────────────────────────────────────────
app.post('/api/book', async (c) => {
    const body = await c.req.json();
    const { accountId, courtId, date, dayIndex, turno, hora, semana } = body;
    const appPassword = process.env['APP_PASSWORD'];
    const stored = (0, db_js_1.getStoredAccount)(db, accountId);
    if (!stored)
        return c.json({ error: 'Account not found' }, 404);
    const pwd = await (0, db_js_1.getDecryptedPassword)(db, accountId, appPassword);
    if (!pwd)
        return c.json({ error: 'Could not decrypt credentials' }, 500);
    const result = await (0, riotintoClient_js_1.makeBooking)(db, accountId, stored.username, pwd, stored.displayName, stored.phone, courtId, date, dayIndex, turno, hora, semana);
    if (!result.success) {
        return c.json({ error: result.message ?? 'Booking failed' }, 400);
    }
    return c.json({ ok: true });
});
// ── DELETE /api/book ──────────────────────────────────────────────────────────
app.delete('/api/book', async (c) => {
    const body = await c.req.json();
    const { accountId, courtId, date, dayIndex, turno, hora, semana } = body;
    const appPassword = process.env['APP_PASSWORD'];
    const stored = (0, db_js_1.getStoredAccount)(db, accountId);
    if (!stored)
        return c.json({ error: 'Account not found' }, 404);
    const pwd = await (0, db_js_1.getDecryptedPassword)(db, accountId, appPassword);
    if (!pwd)
        return c.json({ error: 'Could not decrypt credentials' }, 500);
    const result = await (0, riotintoClient_js_1.cancelBooking)(db, accountId, stored.username, pwd, stored.displayName, stored.phone, courtId, date, dayIndex, turno, hora, semana);
    if (!result.success) {
        return c.json({ error: result.message ?? 'Cancel failed' }, 400);
    }
    return c.json({ ok: true });
});
// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (c) => c.json({ status: 'ok', service: 'rio-tinto-api' }));
// ── Start server ──────────────────────────────────────────────────────────────
const port = parseInt(process.env['PORT'] ?? '3000', 10);
(0, node_server_1.serve)({ fetch: app.fetch, port }, () => {
    console.log(`API listening on port ${port}`);
});
