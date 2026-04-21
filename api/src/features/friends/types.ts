export interface UserProfile {
  id: string;
  userId: string;
  username: string;
  showBookingsToFriends: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  sender?: {
    username: string;
  };
  receiver?: {
    username: string;
  };
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  createdAt: string;
  friend?: {
    username: string;
    showBookingsToFriends: boolean;
    user: {
      name: string;
    };
  };
}

export interface CachedBooking {
  id: string;
  riotintoAccountId: string;
  courtId: number;
  date: string;
  dayIndex: number;
  turno: string;
  hora: string;
  semana: number;
  status: string;
  lastSynced: string;
}

export interface SendFriendRequestRequest {
  username: string;
}

export interface UpdatePrivacyRequest {
  showBookingsToFriends: boolean;
}

export interface FriendBookingsResponse {
  friend: {
    username: string;
    displayName: string;
  };
  bookings: {
    accountId: string;
    accountDisplayName: string;
    courtId: number;
    date: string;
    dayIndex: number;
    turno: string;
    hora: string;
    semana: number;
  }[];
  lastSynced: string;
  isStale: boolean;
}
