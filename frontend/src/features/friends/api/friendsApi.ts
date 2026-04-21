import { request } from "../../../core/api/client";
import type { FriendBooking } from "../../../types";
import type {
  FriendBookingsResponse,
  FriendRequest,
  FriendSearchResult,
  Friendship,
  UserProfile,
} from "../types";

export async function searchFriends(
  query: string,
): Promise<FriendSearchResult[]> {
  return request<FriendSearchResult[]>(
    `/friends/search?q=${encodeURIComponent(query)}`,
  );
}

export async function sendFriendRequest(
  username: string,
): Promise<{ id: string }> {
  return request<{ id: string }>("/friends/request", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  await request<{ ok: boolean }>(`/friends/request/${requestId}/accept`, {
    method: "POST",
  });
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await request<{ ok: boolean }>(`/friends/request/${requestId}/reject`, {
    method: "POST",
  });
}

export async function removeFriend(friendId: string): Promise<void> {
  await request<{ ok: boolean }>(`/friends/${friendId}`, {
    method: "DELETE",
  });
}

export async function getFriends(): Promise<Friendship[]> {
  return request<Friendship[]>("/friends");
}

export async function getIncomingRequests(): Promise<FriendRequest[]> {
  return request<FriendRequest[]>("/friends/requests/incoming");
}

export async function getOutgoingRequests(): Promise<FriendRequest[]> {
  return request<FriendRequest[]>("/friends/requests/outgoing");
}

export async function getFriendBookings(
  friendId: string,
): Promise<FriendBookingsResponse> {
  return request<FriendBookingsResponse>(`/friends/${friendId}/bookings`);
}

export async function updatePrivacy(
  showBookingsToFriends: boolean,
): Promise<void> {
  await request<{ ok: boolean }>("/friends/privacy", {
    method: "PUT",
    body: JSON.stringify({ showBookingsToFriends }),
  });
}

export async function getMyProfile(): Promise<UserProfile> {
  return request<UserProfile>("/friends/me");
}

export async function updateUsername(username: string): Promise<void> {
  await request<{ ok: boolean }>("/friends/username", {
    method: "PUT",
    body: JSON.stringify({ username }),
  });
}

export async function getFriendsBookings(
  weekOffset: number,
): Promise<FriendBooking[]> {
  const result = await request<{ bookings: FriendBooking[] }>(
    `/friends/bookings?week=${weekOffset}`,
  );
  return result.bookings;
}
