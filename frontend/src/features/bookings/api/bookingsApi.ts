// Bookings API

import { fetchBlob, request } from "../../../core/api/client";
import type {
  BookRequest,
  CancelRequest,
  CurrentBookingInfo,
} from "../../../types";

export async function getBookings(
  password: string,
): Promise<CurrentBookingInfo[]> {
  return request<CurrentBookingInfo[]>("/bookings", password);
}

export async function exportBookings(
  password: string,
  accountId?: string,
): Promise<Blob> {
  const queryParams = accountId ? `?accountId=${accountId}` : "";
  return fetchBlob(`/bookings/export${queryParams}`, password);
}

export async function book(password: string, data: BookRequest): Promise<void> {
  await request<{ ok: boolean }>("/book", password, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function cancelBook(
  password: string,
  data: CancelRequest,
): Promise<void> {
  await request<{ ok: boolean }>("/book", password, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
}
