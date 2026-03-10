"use strict";
/**
 * Proxy client for www.riotinto.pt com_agenda booking system.
 *
 * All API calls on the site use JSONP. We handle this by:
 * 1. Sending a fixed callback name ("cb")
 * 2. Receiving a text response like: cb({...})
 * 3. Stripping the wrapper and parsing the inner JSON
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSession = getSession;
exports.invalidateSession = invalidateSession;
exports.getCourtSchedule = getCourtSchedule;
exports.makeBooking = makeBooking;
exports.cancelBooking = cancelBooking;
exports.getCurrentBooking = getCurrentBooking;
const db_js_1 = require("./db.js");
const BASE_URL = 'https://www.riotinto.pt';
const CALLBACK = 'cb';
// ── JSONP response parser ─────────────────────────────────────────────────────
function parseJsonp(text) {
    const match = text.match(/^[^(]+\(([\s\S]*)\)\s*;?\s*$/);
    if (!match || !match[1])
        throw new Error(`Unexpected JSONP response: ${text.slice(0, 100)}`);
    return JSON.parse(match[1]);
}
// ── Cookie helpers ────────────────────────────────────────────────────────────
function extractCookies(headers) {
    const cookies = [];
    const raw = headers.get('set-cookie');
    if (!raw)
        return '';
    for (const part of raw.split(',')) {
        const nameVal = part.trim().split(';')[0];
        if (nameVal)
            cookies.push(nameVal.trim());
    }
    return cookies.join('; ');
}
function mergeCookies(existing, incoming) {
    const map = new Map();
    for (const pair of existing.split(';')) {
        const [k, v] = pair.trim().split('=');
        if (k)
            map.set(k.trim(), v?.trim() ?? '');
    }
    for (const pair of incoming.split(';')) {
        const [k, v] = pair.trim().split('=');
        if (k)
            map.set(k.trim(), v?.trim() ?? '');
    }
    return Array.from(map.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
}
// ── Login ─────────────────────────────────────────────────────────────────────
async function login(username, password) {
    const getResp = await fetch(`${BASE_URL}/area-reservada`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RioTintoApp/1.0)',
            Accept: 'text/html',
        },
        redirect: 'follow',
    });
    const html = await getResp.text();
    let cookies = extractCookies(getResp.headers);
    const csrfMatch = html.match(/"csrf\.token"\s*:\s*"([a-f0-9]+)"/);
    if (!csrfMatch || !csrfMatch[1]) {
        throw new Error('Could not extract CSRF token from login page');
    }
    const csrfToken = csrfMatch[1];
    const body = new URLSearchParams({
        username,
        password,
        remember: 'yes',
        return: '',
        [csrfToken]: '1',
    });
    const postResp = await fetch(`${BASE_URL}/area-reservada?task=user.login`, {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RioTintoApp/1.0)',
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: cookies,
            Referer: `${BASE_URL}/area-reservada`,
        },
        body: body.toString(),
        redirect: 'manual',
    });
    const newCookies = extractCookies(postResp.headers);
    cookies = mergeCookies(cookies, newCookies);
    if (!cookies.includes('joomla_user_state=logged_in')) {
        throw new Error('Login failed: joomla_user_state not set to logged_in');
    }
    const bookingResp = await fetch(`${BASE_URL}/reservas-campos`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RioTintoApp/1.0)',
            Cookie: cookies,
        },
        redirect: 'follow',
    });
    const bookingHtml = await bookingResp.text();
    const bookingCsrfMatch = bookingHtml.match(/"csrf\.token"\s*:\s*"([a-f0-9]+)"/);
    const bookingCsrf = bookingCsrfMatch?.[1] ?? csrfToken;
    const useridMatch = bookingHtml.match(/var\s+userid\s*=\s*(\d+)/);
    const userId = useridMatch?.[1] ?? '0';
    const freshCookies = extractCookies(bookingResp.headers);
    if (freshCookies)
        cookies = mergeCookies(cookies, freshCookies);
    return { cookies, csrfToken: bookingCsrf, userId, cachedAt: Date.now() };
}
// ── Session management ────────────────────────────────────────────────────────
async function getSession(db, accountId, username, password) {
    const cached = (0, db_js_1.getCachedSession)(db, accountId);
    if (cached)
        return cached;
    const session = await login(username, password);
    (0, db_js_1.saveSession)(db, accountId, session);
    return session;
}
function invalidateSession(db, accountId) {
    (0, db_js_1.clearSession)(db, accountId);
}
// ── JSONP POST helper ─────────────────────────────────────────────────────────
async function jsonpPost(urlPath, session, params) {
    const body = new URLSearchParams({ token: session.csrfToken, ...params });
    const url = `${BASE_URL}${urlPath}&callback=${CALLBACK}`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Cookie: session.cookies,
            'User-Agent': 'Mozilla/5.0 (compatible; RioTintoApp/1.0)',
            'X-Requested-With': 'XMLHttpRequest',
            Referer: `${BASE_URL}/reservas-campos`,
        },
        body: body.toString(),
    });
    return parseJsonp(await resp.text());
}
const DAY_KEYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
function parseDaySchedule(raw) {
    return JSON.parse(raw);
}
function buildDaySlots(daySchedule, _dayIndex, _date) {
    const slots = [];
    daySchedule.horainicio.forEach((startTime, turnoIdx) => {
        const count = parseInt(daySchedule.quantreservas[turnoIdx] ?? '0', 10);
        const duration = parseInt(daySchedule.duracao[turnoIdx] ?? '60', 10);
        const [hh, mm] = startTime.split(':').map(Number);
        for (let i = 0; i < count; i++) {
            const totalMins = (hh ?? 0) * 60 + (mm ?? 0) + i * duration;
            const slotH = Math.floor(totalMins / 60).toString().padStart(2, '0');
            const slotM = (totalMins % 60).toString().padStart(2, '0');
            slots.push({ time: `${slotH}:${slotM}`, turno: turnoIdx, hora: i });
        }
    });
    return slots;
}
// ── Public API ────────────────────────────────────────────────────────────────
async function getCourtSchedule(db, accountId, username, password, courtId, weekOffset, ourAccountIds) {
    const session = await getSession(db, accountId, username, password);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + weekOffset * 7);
    const isoDate = targetDate.toISOString().slice(0, 10);
    const dadosRaw = (await jsonpPost('/index.php?option=com_agenda&task=ajax.getDadosLocal&format=json', session, { idlocal: courtId.toString(), source: 'sitefe' }));
    const reservasRaw = (await jsonpPost('/index.php?option=com_agenda&task=ajax.getReservasLocal&format=json', session, { idlocal: courtId.toString(), day: isoDate }));
    const bookedMap = new Map();
    const dateMap = new Map();
    if (reservasRaw !== false && reservasRaw.reservas) {
        reservasRaw.reservas.forEach((day, idx) => {
            dateMap.set(idx, day.data);
            for (const r of day.reservas) {
                const key = `${idx}-${r.turnoreserva}-${r.ordemreserva}`;
                bookedMap.set(key, { user: r.user, username: r.username, nome: r.nome });
            }
        });
    }
    const weekDates = [];
    const dow = targetDate.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    for (let i = 0; i < 7; i++) {
        const d = new Date(targetDate);
        d.setDate(targetDate.getDate() + mondayOffset + i);
        const dd = d.getDate().toString().padStart(2, '0');
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        weekDates.push(`${dd}-${mm}-${d.getFullYear()}`);
    }
    for (const [idx, date] of dateMap.entries()) {
        if (idx >= 0 && idx < 7)
            weekDates[idx] = date;
    }
    const slots = [];
    DAY_KEYS.forEach((dayKey, dayIndex) => {
        const rawDay = dadosRaw.local[dayKey];
        if (!rawDay)
            return;
        const daySchedule = parseDaySchedule(rawDay);
        const daySlots = buildDaySlots(daySchedule, dayIndex, weekDates[dayIndex] ?? '');
        for (const s of daySlots) {
            const key = `${dayIndex}-${s.turno}-${s.hora}`;
            const booking = bookedMap.get(key) ?? null;
            slots.push({
                time: s.time,
                turno: s.turno,
                hora: s.hora,
                date: weekDates[dayIndex] ?? '',
                dayIndex,
                bookedBy: booking?.username ?? null,
                bookedByName: booking?.nome ?? null,
                isOurs: booking !== null && ourAccountIds.includes(booking.user),
                ourAccountId: booking !== null && ourAccountIds.includes(booking.user) ? booking.user : null,
            });
        }
    });
    return { courtId, courtName: dadosRaw.local.nome, weekDates, slots };
}
async function makeBooking(db, accountId, username, password, displayName, phone, courtId, date, dayIndex, turno, hora, semana) {
    const session = await getSession(db, accountId, username, password);
    const raw = (await jsonpPost('/index.php?option=com_agenda&task=ajax.changeReserva&format=json', session, {
        idlocal: courtId.toString(),
        data: date,
        semana: semana.toString(),
        dia: dayIndex.toString(),
        turno: turno.toString(),
        hora: hora.toString(),
        nome: displayName,
        telefone: phone,
        obs: '',
        reservar: '1',
    }));
    if (!raw.success && raw.message?.toLowerCase().includes('sessão')) {
        invalidateSession(db, accountId);
    }
    return raw;
}
async function cancelBooking(db, accountId, username, password, displayName, phone, courtId, date, dayIndex, turno, hora, semana) {
    const session = await getSession(db, accountId, username, password);
    const raw = (await jsonpPost('/index.php?option=com_agenda&task=ajax.changeReserva&format=json', session, {
        idlocal: courtId.toString(),
        data: date,
        semana: semana.toString(),
        dia: dayIndex.toString(),
        turno: turno.toString(),
        hora: hora.toString(),
        nome: displayName,
        telefone: phone,
        obs: '',
        reservar: '0',
    }));
    if (!raw.success && raw.message?.toLowerCase().includes('sessão')) {
        invalidateSession(db, accountId);
    }
    return raw;
}
async function getCurrentBooking(db, accountId, username, password, courtId) {
    const session = await getSession(db, accountId, username, password);
    const dados = (await jsonpPost('/index.php?option=com_agenda&task=ajax.getDadosLocal&format=json', session, { idlocal: courtId.toString(), source: 'sitefe' }));
    return dados.reserva_actual;
}
