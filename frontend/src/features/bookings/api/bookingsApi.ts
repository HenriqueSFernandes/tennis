// Bookings API

import { fetchBlob, request } from "../../../core/api/client";
import type {
  BookRequest,
  CancelRequest,
  CurrentBookingInfo,
} from "../../../types";

export async function getBookings(): Promise<CurrentBookingInfo[]> {
  return request<CurrentBookingInfo[]>("/bookings");
}

export async function exportBookings(accountId?: string): Promise<Blob> {
  const queryParams = accountId ? `?accountId=${accountId}` : "";
  return fetchBlob(`/bookings/export${queryParams}`);
}

export async function book(data: BookRequest): Promise<void> {
  await request<{ ok: boolean }>("/book", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function cancelBook(data: CancelRequest): Promise<void> {
  await request<{ ok: boolean }>("/book", {
    method: "DELETE",
    body: JSON.stringify(data),
  });
}
