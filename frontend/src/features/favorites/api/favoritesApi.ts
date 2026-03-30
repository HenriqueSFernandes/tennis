// Favorites API

import { request } from "../../../core/api/client";
import type {
  AddFavoriteRequest,
  BulkBookRequest,
  BulkBookResult,
  Favorite,
  UpdateFavoriteRequest,
} from "../../../types";

export async function getFavorites(
  password: string,
  accountId?: string,
): Promise<Favorite[]> {
  const queryParams = accountId ? `?accountId=${accountId}` : "";
  return request<Favorite[]>(`/favorites${queryParams}`, password);
}

export async function addFavorite(
  password: string,
  data: AddFavoriteRequest,
): Promise<Favorite> {
  return request<Favorite>("/favorites", password, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFavorite(
  password: string,
  id: string,
  data: UpdateFavoriteRequest,
): Promise<Favorite> {
  return request<Favorite>(`/favorites/${id}`, password, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteFavorite(
  password: string,
  id: string,
): Promise<void> {
  await request<{ ok: boolean }>(`/favorites/${id}`, password, {
    method: "DELETE",
  });
}

export async function bulkBook(
  password: string,
  data: BulkBookRequest,
): Promise<BulkBookResult> {
  return request<BulkBookResult>("/bulk-book", password, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
