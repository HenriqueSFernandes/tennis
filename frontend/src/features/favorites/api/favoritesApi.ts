// Favorites API

import { request } from "../../../core/api/client";
import type {
  AddFavoriteRequest,
  BulkBookRequest,
  BulkBookResult,
  Favorite,
  UpdateFavoriteRequest,
} from "../../../types";

export async function getFavorites(accountId?: string): Promise<Favorite[]> {
  const queryParams = accountId ? `?accountId=${accountId}` : "";
  return request<Favorite[]>(`/favorites${queryParams}`);
}

export async function addFavorite(data: AddFavoriteRequest): Promise<Favorite> {
  return request<Favorite>("/favorites", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFavorite(
  id: string,
  data: UpdateFavoriteRequest,
): Promise<Favorite> {
  return request<Favorite>(`/favorites/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteFavorite(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/favorites/${id}`, {
    method: "DELETE",
  });
}

export async function bulkBook(data: BulkBookRequest): Promise<BulkBookResult> {
  return request<BulkBookResult>("/bulk-book", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
