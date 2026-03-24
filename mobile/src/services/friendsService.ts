/**
 * @file Service de gestion des relations d'amitié.
 *
 * Couche d'abstraction au-dessus des Cloud Functions Firebase pour
 * l'envoi, la réception, l'acceptation et le refus de demandes
 * d'amis, ainsi que la récupération de la liste d'amis.
 */

import { 
  sendFriendRequestViaFunctions,
  getFriendRequestsViaFunctions,
  acceptFriendRequestViaFunctions,
  rejectFriendRequestViaFunctions,
  getFriendsViaFunctions
} from './functionsService';

export interface FriendUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  photoURL?: string;
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

/** Envoyer une demande d'ami (toUserId = Firebase UID de l'utilisateur) */
export const sendFriendRequest = async (toUserId: string): Promise<void> => {
  await sendFriendRequestViaFunctions(toUserId);
};

/** Liste des demandes reçues (en attente) */
export const getIncomingFriendRequests = async (): Promise<FriendRequestItem[]> => {
  const result = await getFriendRequestsViaFunctions();
  return (result.requests || []).map((r: any) => ({
    id: r.id,
    fromUser: r.fromUser || { id: '', name: 'Inconnu' },
    status: 'pending',
    createdAt: r.createdAt?.toISOString?.() || new Date().toISOString(),
  }));
};

/** Accepter une demande (requestId = id de la FriendRequest) */
export const acceptFriendRequest = async (requestId: string): Promise<FriendUser> => {
  await acceptFriendRequestViaFunctions(requestId);
  // La fonction ne retourne pas les infos de l'ami, on retourne un objet minimal
  return { id: requestId, name: 'Ami' };
};

/** Refuser une demande */
export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  await rejectFriendRequestViaFunctions(requestId);
};

/** Liste de mes amis */
export const getFriends = async (): Promise<FriendUser[]> => {
  const result = await getFriendsViaFunctions();
  return result.friends || [];
};
