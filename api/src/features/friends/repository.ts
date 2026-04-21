import { generateUsername } from "../../utils/generateUsername.js";
import { prisma } from "../../utils/prisma.js";
import type { FriendRequest, Friendship, UserProfile } from "./types.js";

export async function getOrCreateProfile(
  userId: string,
): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  if (!user) return null;

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      username: generateUsername(userId, user.name),
    },
    update: {},
  });

  return {
    id: profile.id,
    userId: profile.userId,
    username: profile.username,
    showBookingsToFriends: profile.showBookingsToFriends,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function getProfileByUsername(
  username: string,
): Promise<(UserProfile & { user: { name: string } }) | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { username },
    include: { user: { select: { name: true } } },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    userId: profile.userId,
    username: profile.username,
    showBookingsToFriends: profile.showBookingsToFriends,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    user: { name: profile.user.name },
  };
}

export async function getProfileByUserId(
  userId: string,
): Promise<(UserProfile & { user: { name: string } }) | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    include: { user: { select: { name: true } } },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    userId: profile.userId,
    username: profile.username,
    showBookingsToFriends: profile.showBookingsToFriends,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    user: { name: profile.user.name },
  };
}

export async function searchUsers(
  query: string,
  excludeUserId: string,
): Promise<{ id: string; username: string; displayName: string }[]> {
  const profiles = await prisma.userProfile.findMany({
    where: {
      username: { contains: query, mode: "insensitive" },
      userId: { not: excludeUserId },
    },
    include: { user: { select: { name: true } } },
    take: 20,
  });

  return profiles.map((p) => ({
    id: p.userId,
    username: p.username,
    displayName: p.user.name,
  }));
}

export async function sendFriendRequest(
  senderId: string,
  receiverUsername: string,
): Promise<{
  success: boolean;
  error?: string;
  request?: FriendRequest;
}> {
  const receiver = await getProfileByUsername(receiverUsername);
  if (!receiver) {
    return { success: false, error: "User not found" };
  }

  if (receiver.userId === senderId) {
    return { success: false, error: "Cannot send request to yourself" };
  }

  const existingRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId, receiverId: receiver.id },
        { senderId: receiver.id, receiverId: senderId },
      ],
      status: "pending",
    },
  });

  if (existingRequest) {
    return { success: false, error: "Friend request already pending" };
  }

  const existingFriendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: senderId, friendId: receiver.id },
        { userId: receiver.id, friendId: senderId },
      ],
    },
  });

  if (existingFriendship) {
    return { success: false, error: "Already friends" };
  }

  const senderProfile = await getProfileByUserId(senderId);
  if (!senderProfile) {
    return { success: false, error: "Sender profile not found" };
  }

  const request = await prisma.friendRequest.create({
    data: {
      senderId: senderProfile.id,
      receiverId: receiver.id,
    },
  });

  return {
    success: true,
    request: {
      id: request.id,
      senderId: request.senderId,
      receiverId: request.receiverId,
      status: request.status,
      createdAt: request.createdAt.toISOString(),
    },
  };
}

export async function acceptFriendRequest(
  requestId: string,
  receiverUserId: string,
): Promise<{ success: boolean; error?: string }> {
  const receiverProfile = await getProfileByUserId(receiverUserId);
  if (!receiverProfile) {
    return { success: false, error: "Receiver profile not found" };
  }

  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    include: { sender: true, receiver: true },
  });

  if (!request || request.receiverId !== receiverProfile.id) {
    return { success: false, error: "Request not found" };
  }

  if (request.status !== "pending") {
    return { success: false, error: "Request already processed" };
  }

  await prisma.$transaction([
    prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: "accepted" },
    }),
    prisma.friendship.create({
      data: {
        userId: request.senderId,
        friendId: request.receiverId,
      },
    }),
    prisma.friendship.create({
      data: {
        userId: request.receiverId,
        friendId: request.senderId,
      },
    }),
  ]);

  return { success: true };
}

export async function rejectFriendRequest(
  requestId: string,
  receiverUserId: string,
): Promise<{ success: boolean; error?: string }> {
  const receiverProfile = await getProfileByUserId(receiverUserId);
  if (!receiverProfile) {
    return { success: false, error: "Receiver profile not found" };
  }

  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.receiverId !== receiverProfile.id) {
    return { success: false, error: "Request not found" };
  }

  await prisma.friendRequest.delete({ where: { id: requestId } });

  return { success: true };
}

export async function removeFriendship(
  userId: string,
  friendId: string,
): Promise<{ success: boolean; error?: string }> {
  const userProfile = await getProfileByUserId(userId);
  if (!userProfile) {
    return { success: false, error: "User profile not found" };
  }

  const friendProfile = await getProfileByUserId(friendId);
  if (!friendProfile) {
    return { success: false, error: "Friend profile not found" };
  }

  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { userId: userProfile.id, friendId: friendProfile.id },
        { userId: friendProfile.id, friendId: userProfile.id },
      ],
    },
  });

  return { success: true };
}

export async function listFriends(userId: string): Promise<Friendship[]> {
  const profile = await getProfileByUserId(userId);
  if (!profile) return [];

  const friendships = await prisma.friendship.findMany({
    where: { userId: profile.id },
    include: {
      friend: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return friendships.map((f) => ({
    id: f.id,
    userId: f.userId,
    friendId: f.friendId,
    createdAt: f.createdAt.toISOString(),
    friend: {
      username: f.friend.username,
      showBookingsToFriends: f.friend.showBookingsToFriends,
      user: { name: f.friend.user.name },
    },
  }));
}

export async function getIncomingRequests(
  userId: string,
): Promise<FriendRequest[]> {
  const profile = await getProfileByUserId(userId);
  if (!profile) return [];

  const requests = await prisma.friendRequest.findMany({
    where: { receiverId: profile.id, status: "pending" },
    include: {
      sender: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => ({
    id: r.id,
    senderId: r.senderId,
    receiverId: r.receiverId,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    sender: {
      username: r.sender.username,
    },
  }));
}

export async function getOutgoingRequests(
  userId: string,
): Promise<FriendRequest[]> {
  const profile = await getProfileByUserId(userId);
  if (!profile) return [];

  const requests = await prisma.friendRequest.findMany({
    where: { senderId: profile.id, status: "pending" },
    include: {
      receiver: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return requests.map((r) => ({
    id: r.id,
    senderId: r.senderId,
    receiverId: r.receiverId,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    receiver: {
      username: r.receiver.username,
    },
  }));
}

export async function updatePrivacy(
  userId: string,
  showBookingsToFriends: boolean,
): Promise<{ success: boolean; error?: string }> {
  const profile = await getProfileByUserId(userId);
  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  await prisma.userProfile.update({
    where: { id: profile.id },
    data: { showBookingsToFriends },
  });

  return { success: true };
}

export async function checkFriendshipExists(
  userId: string,
  friendProfileId: string,
): Promise<boolean> {
  const userProfile = await getProfileByUserId(userId);
  if (!userProfile) return false;

  const friendship = await prisma.friendship.findUnique({
    where: {
      userId_friendId: {
        userId: userProfile.id,
        friendId: friendProfileId,
      },
    },
  });

  return !!friendship;
}

export async function getProfileById(
  profileId: string,
): Promise<(UserProfile & { user: { name: string } }) | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { name: true } } },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    userId: profile.userId,
    username: profile.username,
    showBookingsToFriends: profile.showBookingsToFriends,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    user: { name: profile.user.name },
  };
}

export { generateUsername } from "../../utils/generateUsername.js";

export async function updateUsername(
  userId: string,
  username: string,
): Promise<{ success: boolean; error?: string }> {
  const normalized = username.toLowerCase().trim();

  if (!/^[a-z0-9_.]{3,20}$/.test(normalized)) {
    return {
      success: false,
      error:
        "Username must be 3-20 characters, only letters, numbers, underscores, and dots",
    };
  }

  const existing = await prisma.userProfile.findUnique({
    where: { username: normalized },
  });
  if (existing) {
    return { success: false, error: "Username already taken" };
  }

  const profile = await getProfileByUserId(userId);
  if (!profile) return { success: false, error: "Profile not found" };

  await prisma.userProfile.update({
    where: { id: profile.id },
    data: { username: normalized },
  });

  return { success: true };
}

export interface FriendBooking {
  friendId: string;
  friendName: string;
  friendUsername: string;
  courtId: number;
  date: string;
  dayIndex: number;
  turno: string;
  hora: string;
  time: string;
  semana: number;
}

export async function getAllFriendsBookings(
  userId: string,
  weekOffset: number,
): Promise<FriendBooking[]> {
  const profile = await getProfileByUserId(userId);
  if (!profile) return [];

  const friendships = await prisma.friendship.findMany({
    where: { userId: profile.id },
    include: {
      friend: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });

  const sharingFriends = friendships.filter(
    (f) => f.friend.showBookingsToFriends,
  );

  if (sharingFriends.length === 0) return [];

  const friendUserIds = sharingFriends.map((f) => f.friend.userId);

  const accounts = await prisma.riotintoAccount.findMany({
    where: { userId: { in: friendUserIds } },
    select: { id: true, userId: true },
  });

  const accountMap = new Map<string, string>();
  for (const acc of accounts) {
    accountMap.set(acc.id, acc.userId);
  }

  const accountIds = accounts.map((a) => a.id);
  if (accountIds.length === 0) return [];

  const bookings = await prisma.bookingCache.findMany({
    where: {
      riotintoAccountId: { in: accountIds },
      status: "booked",
    },
    orderBy: [{ date: "asc" }, { hora: "asc" }],
  });

  const friendProfileMap = new Map<
    string,
    { name: string; username: string }
  >();
  for (const f of sharingFriends) {
    friendProfileMap.set(f.friend.userId, {
      name: f.friend.user.name,
      username: f.friend.username,
    });
  }

  const result: FriendBooking[] = [];
  for (const booking of bookings) {
    const friendUserId = accountMap.get(booking.riotintoAccountId);
    if (!friendUserId) continue;

    const friend = friendProfileMap.get(friendUserId);
    if (!friend) continue;

    if (weekOffset === 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [dd, mm, yyyy] = booking.date.split("-").map(Number);
      const bookingDate = new Date(yyyy ?? 0, (mm ?? 1) - 1, dd ?? 0);
      const diffDays = Math.floor(
        (bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays < 0 || diffDays > 6) continue;
    } else if (weekOffset === 1) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [dd, mm, yyyy] = booking.date.split("-").map(Number);
      const bookingDate = new Date(yyyy ?? 0, (mm ?? 1) - 1, dd ?? 0);
      const diffDays = Math.floor(
        (bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays < 7 || diffDays > 13) continue;
    }

    result.push({
      friendId: friendUserId,
      friendName: friend.name,
      friendUsername: friend.username,
      courtId: booking.courtId,
      date: booking.date,
      dayIndex: booking.dayIndex,
      turno: booking.turno,
      hora: booking.hora,
      time: booking.time,
      semana: weekOffset,
    });
  }

  return result;
}
