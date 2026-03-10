import type Database from 'better-sqlite3';

export type Db = InstanceType<typeof Database>;

// Stored account (encrypted credentials)
export interface StoredAccount {
  id: string;
  username: string;
  displayName: string;
  phone: string; // 9-digit phone for bookings
  encryptedPassword: string; // base64
  salt: string; // base64
  iv: string; // base64
  createdAt: string;
}

// Account as returned to the frontend (no sensitive data)
export interface AccountSummary {
  id: string;
  username: string;
  displayName: string;
  phone: string;
  createdAt: string;
}

// Cached session after riotinto.pt login
export interface CachedSession {
  cookies: string; // raw Cookie header value
  csrfToken: string;
  userId: string;
  cachedAt: number; // unix ms
}

// A single booking slot as returned by getReservasLocal
export interface ReservaSlot {
  turnoreserva: string;
  ordemreserva: string;
  user: string;
  username: string;
  nome: string;
  telefone: string;
  obs: string;
  compareceu: string;
}

// A day's reservations
export interface DayReservas {
  data: string; // "DD-MM-YYYY"
  reservas: ReservaSlot[];
}

// Response from getReservasLocal (false if no bookings at all)
export type ReservasResponse = false | { reservas: DayReservas[] };

// Current booking for an account (from reserva_actual in getDadosLocal)
export interface CurrentBooking {
  accountId: string;
  username: string;
  displayName: string;
  courtId: number;
  date: string; // "DD-MM-YYYY"
  time: string; // "HH:MM"
  turno: string;
  hora: string;
  nome: string;
  telefone: string;
  obs: string;
}

// A time slot in the schedule grid
export interface ScheduleSlot {
  time: string; // "HH:MM"
  turno: number;
  hora: number;
  date: string; // "DD-MM-YYYY"
  dayIndex: number; // 0=Mon ... 6=Sun
  bookedBy: string | null; // username or null if free
  bookedByName: string | null;
  isOurs: boolean; // belongs to one of our accounts
  ourAccountId: string | null;
}

// Court schedule for a week
export interface CourtSchedule {
  courtId: number;
  courtName: string;
  weekDates: string[]; // 7 dates "DD-MM-YYYY" Mon..Sun
  slots: ScheduleSlot[];
}

// Request body for POST /api/accounts
export interface AddAccountRequest {
  username: string;
  password: string;
  displayName: string;
  phone: string;
}

// Request body for POST /api/book
export interface BookRequest {
  accountId: string;
  courtId: number;
  date: string; // "DD-MM-YYYY"
  dayIndex: number;
  turno: number;
  hora: number;
  semana: number;
}

// Request body for DELETE /api/book
export interface CancelRequest {
  accountId: string;
  courtId: number;
  date: string; // "DD-MM-YYYY"
  dayIndex: number;
  turno: number;
  hora: number;
  semana: number;
}
