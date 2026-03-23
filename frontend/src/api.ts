import type {
  AccountSummary,
  AddAccountRequest,
  UpdateAccountRequest,
  ScheduleResponse,
  CurrentBookingInfo,
  BookRequest,
  CancelRequest,
} from './types';

const API_BASE =
  (import.meta.env.VITE_API_URL ?? 'https://api.riotinto.henriquesf.me') + '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  password: string,
  options: RequestInit = {},
): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-App-Password': password,
      ...options.headers,
    },
  });

  if (!resp.ok) {
    let message = `HTTP ${resp.status}`;
    try {
      const body = (await resp.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse error
    }
    throw new ApiError(resp.status, message);
  }

  return resp.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function verifyPassword(password: string): Promise<boolean> {
  const resp = await fetch(`${API_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return resp.ok;
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function getAccounts(password: string): Promise<AccountSummary[]> {
  return request<AccountSummary[]>('/accounts', password);
}

export async function addAccount(
  password: string,
  data: AddAccountRequest,
): Promise<AccountSummary> {
  return request<AccountSummary>('/accounts', password, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAccount(password: string, id: string): Promise<void> {
  await request<{ ok: boolean }>(`/accounts/${id}`, password, { method: 'DELETE' });
}

export async function updateAccount(
  password: string,
  id: string,
  data: UpdateAccountRequest,
): Promise<AccountSummary> {
  return request<AccountSummary>(`/accounts/${id}`, password, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export async function getSchedule(password: string, weekOffset: number): Promise<ScheduleResponse> {
  return request<ScheduleResponse>(`/schedule?week=${weekOffset}`, password);
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export async function getBookings(password: string): Promise<CurrentBookingInfo[]> {
  return request<CurrentBookingInfo[]>('/bookings', password);
}

export async function book(password: string, data: BookRequest): Promise<void> {
  await request<{ ok: boolean }>('/book', password, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function cancelBook(password: string, data: CancelRequest): Promise<void> {
  await request<{ ok: boolean }>('/book', password, {
    method: 'DELETE',
    body: JSON.stringify(data),
  });
}

export { ApiError };
