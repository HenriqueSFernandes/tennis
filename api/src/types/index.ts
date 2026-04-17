// Stored account (encrypted credentials)
export interface StoredAccount {
  id: string;
  username: string;
  displayName: string;
  phone: string;
  encryptedPassword: string;
  salt: string;
  iv: string;
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
  cookies: string;
  csrfToken: string;
  userId: string;
  cachedAt: number;
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
  data: string;
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
  date: string;
  time: string;
  turno: string;
  hora: string;
  nome: string;
  telefone: string;
  obs: string;
}

// A time slot in the schedule grid
export interface ScheduleSlot {
  time: string;
  turno: number;
  hora: number;
  date: string;
  dayIndex: number;
  bookedBy: string | null;
  bookedByName: string | null;
  isOurs: boolean;
  ourAccountId: string | null;
}

// Court schedule for a week
export interface CourtSchedule {
  courtId: number;
  courtName: string;
  weekDates: string[];
  slots: ScheduleSlot[];
}

// Request body for POST /api/accounts
export interface AddAccountRequest {
  username: string;
  password: string;
  displayName: string;
  phone: string;
}

// Request body for PUT /api/accounts/:id
export interface UpdateAccountRequest {
  displayName: string;
  phone: string;
}

// Request body for POST /api/book
export interface BookRequest {
  accountId: string;
  courtId: number;
  date: string;
  dayIndex: number;
  turno: number;
  hora: number;
  semana: number;
}

// Request body for DELETE /api/book
export interface CancelRequest {
  accountId: string;
  courtId: number;
  date: string;
  dayIndex: number;
  turno: number;
  hora: number;
  semana: number;
}

// Favorites
export interface Favorite {
  id: string;
  accountId: string;
  courtId: number;
  dayOfWeek: number;
  time: string;
  name: string | null;
  createdAt: string;
}

export interface AddFavoriteRequest {
  accountId: string;
  courtId: number;
  dayOfWeek: number;
  time: string;
  name?: string;
}

export interface UpdateFavoriteRequest {
  name: string;
}

// Bulk Book
export interface BulkBookItem {
  accountId: string;
  courtId: number;
  date: string;
  dayIndex: number;
  turno: number;
  hora: number;
  semana: number;
}

export interface BulkBookRequest {
  bookings: BulkBookItem[];
  forceCancel: boolean;
}

export interface BulkBookResult {
  success: {
    favoriteId?: string;
    accountId: string;
    courtId: number;
    date: string;
    dayIndex: number;
    turno: number;
    hora: number;
  }[];
  skipped: {
    accountId: string;
    courtId: number;
    date: string;
    reason:
      | "already-booked-by-us"
      | "booked-by-others"
      | "past"
      | "force-cancel-declined";
  }[];
  failed: {
    accountId: string;
    courtId: number;
    date: string;
    error: string;
  }[];
}

// For ICS export
export interface BookingWithAccount {
  accountId: string;
  username: string;
  displayName: string;
  phone: string;
  courtId: number;
  date: string;
  time: string;
  nome: string;
}
