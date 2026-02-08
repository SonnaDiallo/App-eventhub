import { api } from './api';

export interface FriendUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface FriendRequestItem {
  id: string;
  fromUser: FriendUser;
  status: string;
  createdAt: string;
}

export interface FriendRequestResponse {
  requests: FriendRequestItem[];
}

export interface FriendsResponse {
  friends: FriendUser[];
}

/** Envoyer une demande d'ami (toUserId = MongoDB ObjectId de l'utilisateur) */
export const sendFriendRequest = async (toUserId: string): Promise<void> => {
  await api.post('/friends/request', { toUserId });
};

/** Liste des demandes reçues (en attente) */
export const getIncomingFriendRequests = async (): Promise<FriendRequestItem[]> => {
  const res = await api.get<FriendRequestResponse>('/friends/requests');
  return res.data.requests || [];
};

/** Accepter une demande (requestId = id de la FriendRequest) */
export const acceptFriendRequest = async (requestId: string): Promise<FriendUser> => {
  const res = await api.post<{ friend: FriendUser }>(`/friends/requests/${requestId}/accept`);
  return res.data.friend;
};

/** Refuser une demande */
export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  await api.post(`/friends/requests/${requestId}/reject`);
};

/** Liste de mes amis */
export const getFriends = async (): Promise<FriendUser[]> => {
  const res = await api.get<FriendsResponse>('/friends');
  return res.data.friends || [];
};
