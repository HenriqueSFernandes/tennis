import type { Context } from "hono";
import { getUserIdFromContext } from "../auth/middleware.js";
import {
  getFriendCachedBookings,
  syncUserBookings,
} from "../booking-cache/service.js";
import {
  acceptFriendRequest,
  checkFriendshipExists,
  getAllFriendsBookings,
  getIncomingRequests,
  getOrCreateProfile,
  getOutgoingRequests,
  getProfileById,
  listFriends,
  rejectFriendRequest,
  removeFriendship,
  searchUsers,
  sendFriendRequest,
  updatePrivacy,
  updateUsername,
} from "./repository.js";

export async function handleSearchUsers(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const query = c.req.query("q");
    if (!query || query.length < 2) {
      return c.json({ error: "Query must be at least 2 characters" }, 400);
    }

    const users = await searchUsers(query, userId);
    return c.json(users);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Search error: ${message}` }, 500);
  }
}

export async function handleSendRequest(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    await getOrCreateProfile(userId);

    const body = await c.req.json<{ username: string }>();
    const { username } = body;

    if (!username) {
      return c.json({ error: "Username is required" }, 400);
    }

    const result = await sendFriendRequest(userId, username);
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json(result.request, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Send request error: ${message}` }, 500);
  }
}

export async function handleAcceptRequest(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    await getOrCreateProfile(userId);

    const requestId = c.req.param("id");
    if (!requestId) return c.json({ error: "Request ID is required" }, 400);
    const result = await acceptFriendRequest(requestId, userId);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Accept error: ${message}` }, 500);
  }
}

export async function handleRejectRequest(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    await getOrCreateProfile(userId);

    const requestId = c.req.param("id");
    if (!requestId) return c.json({ error: "Request ID is required" }, 400);
    const result = await rejectFriendRequest(requestId, userId);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Reject error: ${message}` }, 500);
  }
}

export async function handleRemoveFriend(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const friendId = c.req.param("friendId");
    if (!friendId) return c.json({ error: "Friend ID is required" }, 400);
    const result = await removeFriendship(userId, friendId);

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Remove friend error: ${message}` }, 500);
  }
}

export async function handleListFriends(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    await getOrCreateProfile(userId);

    const friends = await listFriends(userId);
    return c.json(friends);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `List friends error: ${message}` }, 500);
  }
}

export async function handleIncomingRequests(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    await getOrCreateProfile(userId);

    const requests = await getIncomingRequests(userId);
    return c.json(requests);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Incoming requests error: ${message}` }, 500);
  }
}

export async function handleOutgoingRequests(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    await getOrCreateProfile(userId);

    const requests = await getOutgoingRequests(userId);
    return c.json(requests);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Outgoing requests error: ${message}` }, 500);
  }
}

export async function handleGetFriendBookings(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const friendProfileId = c.req.param("friendId");
    if (!friendProfileId)
      return c.json({ error: "Friend ID is required" }, 400);

    const isFriend = await checkFriendshipExists(userId, friendProfileId);
    if (!isFriend) {
      return c.json({ error: "Not friends with this user" }, 403);
    }

    const friendProfile = await getProfileById(friendProfileId);
    if (!friendProfile) {
      return c.json({ error: "Friend not found" }, 404);
    }

    if (!friendProfile.showBookingsToFriends) {
      return c.json({ error: "Friend is not sharing bookings" }, 403);
    }

    await syncUserBookings(friendProfile.userId);

    const bookingsData = await getFriendCachedBookings(friendProfile.userId);

    return c.json({
      friend: {
        username: friendProfile.username,
        displayName: friendProfile.user.name,
      },
      ...bookingsData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Friend bookings error: ${message}` }, 500);
  }
}

export async function handleUpdatePrivacy(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json<{ showBookingsToFriends: boolean }>();
    const { showBookingsToFriends } = body;

    if (typeof showBookingsToFriends !== "boolean") {
      return c.json({ error: "showBookingsToFriends must be a boolean" }, 400);
    }

    const result = await updatePrivacy(userId, showBookingsToFriends);
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Privacy update error: ${message}` }, 500);
  }
}

export async function handleGetMyProfile(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const profile = await getOrCreateProfile(userId);
    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Profile error: ${message}` }, 500);
  }
}

export async function handleUpdateUsername(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const body = await c.req.json<{ username: string }>();
    const { username } = body;

    if (!username) {
      return c.json({ error: "Username is required" }, 400);
    }

    const result = await updateUsername(userId, username);
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Username update error: ${message}` }, 500);
  }
}

export async function handleGetAllFriendsBookings(c: Context) {
  try {
    const userId = getUserIdFromContext(c);
    if (!userId) return c.json({ error: "Unauthorized" }, 401);

    const weekParam = c.req.query("week");
    const weekOffset = weekParam ? parseInt(weekParam, 10) : 0;

    if (weekOffset !== 0 && weekOffset !== 1) {
      return c.json({ error: "Week must be 0 or 1" }, 400);
    }

    const bookings = await getAllFriendsBookings(userId, weekOffset);
    return c.json({ bookings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Friends bookings error: ${message}` }, 500);
  }
}
