/**
 * Proxy client for www.riotinto.pt com_agenda booking system.
 *
 * All API calls on the site use JSONP. We handle this by:
 * 1. Sending a fixed callback name ("cb")
 * 2. Receiving a text response like: cb({...})
 * 3. Stripping the wrapper and parsing the inner JSON
 */

import type { CachedSession, CourtSchedule, ScheduleSlot, Db } from './types.js';
import { getCachedSession, saveSession, clearSession } from './db.js';

const BASE_URL = 'https://www.riotinto.pt';
const CALLBACK = 'cb';

// ── JSONP response parser ─────────────────────────────────────────────────────

function parseJsonp(text: string): unknown {
  const match = text.match(/^[^(]+\(([\s\S]*)\)\s*;?\s*$/);
  if (!match || !match[1]) throw new Error(`Unexpected JSONP response: ${text.slice(0, 100)}`);
  return JSON.parse(match[1]);
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

function extractCookies(headers: Headers): string {
  // headers.get('set-cookie') only returns the first Set-Cookie header in Node.js fetch (undici).
  // getSetCookie() correctly returns all of them as an array (Node.js 18+).
  const setCookieHeaders =
    (headers as unknown as { getSetCookie?(): string[] }).getSetCookie?.() ??
    (headers.get('set-cookie') ? [headers.get('set-cookie')!] : []);

  return setCookieHeaders
    .map((h) => h.split(';')[0]?.trim() ?? '')
    .filter(Boolean)
    .join('; ');
}

function mergeCookies(existing: string, incoming: string): string {
  const map = new Map<string, string>();
  for (const pair of existing.split(';')) {
    const [k, v] = pair.trim().split('=');
    if (k) map.set(k.trim(), v?.trim() ?? '');
  }
  for (const pair of incoming.split(';')) {
    const [k, v] = pair.trim().split('=');
    if (k) map.set(k.trim(), v?.trim() ?? '');
  }
  return Array.from(map.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function login(username: string, password: string): Promise<CachedSession> {
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
  if (freshCookies) cookies = mergeCookies(cookies, freshCookies);

  return { cookies, csrfToken: bookingCsrf, userId, cachedAt: Date.now() };
}

// ── Session management ────────────────────────────────────────────────────────

export async function getSession(
  db: Db,
  accountId: string,
  username: string,
  password: string,
): Promise<CachedSession> {
  const cached = getCachedSession(db, accountId);
  if (cached) return cached;

  const session = await login(username, password);
  saveSession(db, accountId, session);
  return session;
}

export function invalidateSession(db: Db, accountId: string): void {
  clearSession(db, accountId);
}

// ── JSONP POST helper ─────────────────────────────────────────────────────────

async function jsonpPost(
  urlPath: string,
  session: CachedSession,
  params: Record<string, string>,
): Promise<unknown> {
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

// ── getDadosLocal types ───────────────────────────────────────────────────────

interface DadosLocalResponse {
  idlocal: number;
  local: {
    id: string;
    nome: string;
    horario: unknown[];
    segunda: string;
    terca: string;
    quarta: string;
    quinta: string;
    sexta: string;
    sabado: string;
    domingo: string;
  };
  reserva_actual: null | {
    user: string;
    obs: string;
    nome: string;
    telefone: string;
    datareserva: string;   // "YYYY-MM-DD"
    turnoreserva: string;  // turno index
    ordemreserva: string;  // hora index within turno
  };
}

const DAY_KEYS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] as const;

interface DaySchedule {
  horainicio: string[];
  quantreservas: string[];
  duracao: string[];
}

function parseDaySchedule(raw: string): DaySchedule {
  return JSON.parse(raw) as DaySchedule;
}

function buildDaySlots(
  daySchedule: DaySchedule,
  _dayIndex: number,
  _date: string,
): { time: string; turno: number; hora: number }[] {
  const slots: { time: string; turno: number; hora: number }[] = [];
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

type RawReservasResponse =
  | false
  | {
      reservas: Array<{
        data: string;
        reservas: Array<{
          turnoreserva: string;
          ordemreserva: string;
          user: string;
          username: string;
          nome: string;
          telefone: string;
          obs: string;
          compareceu: string;
        }>;
      }>;
    };

// ── Public API ────────────────────────────────────────────────────────────────

export async function getCourtSchedule(
  db: Db,
  accountId: string,
  username: string,
  password: string,
  courtId: number,
  weekOffset: number,
  ourUsers: Map<string, string>, // siteUserId → SQLite accountId
): Promise<CourtSchedule> {
  const session = await getSession(db, accountId, username, password);

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + weekOffset * 7);
  const isoDate = targetDate.toISOString().slice(0, 10);

  const dadosRaw = (await jsonpPost(
    '/index.php?option=com_agenda&task=ajax.getDadosLocal&format=json',
    session,
    { idlocal: courtId.toString(), source: 'sitefe' },
  )) as DadosLocalResponse;

  const reservasRaw = (await jsonpPost(
    '/index.php?option=com_agenda&task=ajax.getReservasLocal&format=json',
    session,
    { idlocal: courtId.toString(), day: isoDate },
  )) as RawReservasResponse;

  // bookedMap key: "YYYY-MM-DD-turno-hora" (keyed by date, not array index)
  const bookedMap = new Map<string, { user: string; username: string; nome: string }>();

  if (reservasRaw !== false && reservasRaw.reservas) {
    reservasRaw.reservas.forEach((day) => {
      for (const r of day.reservas) {
        const key = `${day.data}-${r.turnoreserva}-${r.ordemreserva}`;
        bookedMap.set(key, { user: r.user, username: r.username, nome: r.nome });
      }
    });
  }

  const weekDates: string[] = [];
  const dow = targetDate.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  for (let i = 0; i < 7; i++) {
    const d = new Date(targetDate);
    d.setDate(targetDate.getDate() + mondayOffset + i);
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    weekDates.push(`${dd}-${mm}-${d.getFullYear()}`);
  }

  const slots: ScheduleSlot[] = [];
  DAY_KEYS.forEach((dayKey, dayIndex) => {
    const rawDay = dadosRaw.local[dayKey];
    if (!rawDay) return;
    const daySchedule = parseDaySchedule(rawDay);
    const daySlots = buildDaySlots(daySchedule, dayIndex, weekDates[dayIndex] ?? '');
    // weekDates[dayIndex] is "DD-MM-YYYY"; convert to "YYYY-MM-DD" for bookedMap lookup
    const slotDate = weekDates[dayIndex] ?? '';
    const [dd, mm, yyyy] = slotDate.split('-');
    const isoDate = (dd && mm && yyyy) ? `${yyyy}-${mm}-${dd}` : '';
    for (const s of daySlots) {
      const key = `${isoDate}-${s.turno}-${s.hora}`;
      const booking = bookedMap.get(key) ?? null;
      slots.push({
        time: s.time,
        turno: s.turno,
        hora: s.hora,
        date: slotDate,
        dayIndex,
        bookedBy: booking?.username ?? null,
        bookedByName: booking?.nome ?? null,
        isOurs: booking !== null && ourUsers.has(booking.user),
        ourAccountId:
          booking !== null ? (ourUsers.get(booking.user) ?? null) : null,
      });
    }
  });

  return { courtId, courtName: dadosRaw.local.nome, weekDates, slots };
}

// Convert "DD-MM-YYYY" → "YYYY-MM-DD" for the changeReserva data parameter
function toIsoDate(ddmmyyyy: string): string {
  const [dd, mm, yyyy] = ddmmyyyy.split('-');
  return (dd && mm && yyyy) ? `${yyyy}-${mm}-${dd}` : ddmmyyyy;
}

export async function makeBooking(
  db: Db,
  accountId: string,
  username: string,
  password: string,
  displayName: string,
  phone: string,
  courtId: number,
  date: string,
  dayIndex: number,
  turno: number,
  hora: number,
  semana: number,
): Promise<{ success: boolean; message?: string }> {
  const session = await getSession(db, accountId, username, password);

  const raw = (await jsonpPost(
    '/index.php?option=com_agenda&task=ajax.changeReserva&format=json',
    session,
    {
      idlocal: courtId.toString(),
      data: toIsoDate(date),
      semana: semana.toString(),
      dia: dayIndex.toString(),
      turno: turno.toString(),
      hora: hora.toString(),
      nome: displayName,
      telefone: phone,
      obs: '',
      reservar: '1',
    },
  )) as { success: boolean; message?: string };

  if (!raw.success && raw.message?.toLowerCase().includes('sessão')) {
    invalidateSession(db, accountId);
  }

  return raw;
}

export async function cancelBooking(
  db: Db,
  accountId: string,
  username: string,
  password: string,
  displayName: string,
  phone: string,
  courtId: number,
  date: string,
  dayIndex: number,
  turno: number,
  hora: number,
  semana: number,
): Promise<{ success: boolean; message?: string }> {
  const session = await getSession(db, accountId, username, password);

  const raw = (await jsonpPost(
    '/index.php?option=com_agenda&task=ajax.changeReserva&format=json',
    session,
    {
      idlocal: courtId.toString(),
      data: toIsoDate(date),
      semana: semana.toString(),
      dia: dayIndex.toString(),
      turno: turno.toString(),
      hora: hora.toString(),
      nome: displayName,
      telefone: phone,
      obs: '',
      reservar: '0',
    },
  )) as { success: boolean; message?: string };

  if (!raw.success && raw.message?.toLowerCase().includes('sessão')) {
    invalidateSession(db, accountId);
  }

  return raw;
}

export interface ResolvedBooking {
  nome: string;
  date: string; // "DD-MM-YYYY"
  time: string; // "HH:MM"
}

export async function getCurrentBooking(
  db: Db,
  accountId: string,
  username: string,
  password: string,
  courtId: number,
): Promise<ResolvedBooking | null> {
  const session = await getSession(db, accountId, username, password);

  const dados = (await jsonpPost(
    '/index.php?option=com_agenda&task=ajax.getDadosLocal&format=json',
    session,
    { idlocal: courtId.toString(), source: 'sitefe' },
  )) as DadosLocalResponse;

  const raw = dados.reserva_actual;
  if (!raw) return null;

  // Convert datareserva "YYYY-MM-DD" → "DD-MM-YYYY"
  const [y, m, d] = raw.datareserva.split('-');
  const date = (y && m && d) ? `${d}-${m}-${y}` : '';

  // Resolve turnoreserva+ordemreserva indices → time string
  // turnoreserva is 0-based; ordemreserva is 1-based from the website API.
  const turnoIdx = parseInt(raw.turnoreserva, 10);
  const horaIdx = parseInt(raw.ordemreserva, 10) - 1;
  let time = '';
  for (const dayKey of DAY_KEYS) {
    const rawDay = dados.local[dayKey];
    if (!rawDay) continue;
    const daySchedule = parseDaySchedule(rawDay);
    const slots = buildDaySlots(daySchedule, 0, '');
    const match = slots.find((s) => s.turno === turnoIdx && s.hora === horaIdx);
    if (match) {
      time = match.time;
      break;
    }
  }

  return {
    nome: raw.nome,
    date,
    time,
  };
}
