/**
 * @file Service d'administration de la plateforme EventHub.
 *
 * Fournit les opérations CRUD réservées aux administrateurs :
 * gestion des utilisateurs (rôles, suppression), supervision des
 * événements et modération des avis. Toutes les requêtes transitent
 * par le client Axios authentifié (`api`).
 */

import { api } from './api';

export type AdminUser = {
  id: string;
  name?: string;
  email: string;
  role: 'user' | 'organizer' | 'admin';
};

export type DashboardStats = {
  users: { total: number; byRole: Record<string, number> };
  events: { total: number };
  tickets: { total: number };
  reviews: { total: number };
};

export type AdminEventItem = {
  id: string;
  title: string;
  coverImage?: string;
  category: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  isFree?: boolean;
  price?: number;
  capacity?: number;
  organizerId?: string;
  organizerName?: string;
  participantsCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

/** Récupère les statistiques globales du tableau de bord admin (utilisateurs, événements, tickets, avis). */
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/admin/stats');
  return data;
}

/** Récupère la liste complète des utilisateurs inscrits. */
export async function getUsers(): Promise<{ users: AdminUser[] }> {
  const { data } = await api.get<{ users: AdminUser[] }>('/users');
  return data;
}

/** Met à jour le rôle d'un utilisateur (user / organizer / admin). */
export async function updateUserRole(userId: string, role: AdminUser['role']): Promise<void> {
  await api.patch(`/users/${userId}/role`, { role });
}

/** Supprime définitivement un compte utilisateur. */
export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}`);
}

/** Récupère la liste paginée des événements pour le panneau d'administration. */
export async function getAdminEvents(
  page = 1,
  limit = 20
): Promise<{
  events: AdminEventItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const { data } = await api.get<{
    events: AdminEventItem[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>('/admin/events', { params: { page, limit } });
  return data;
}

/** Supprime un événement depuis le panneau d'administration. */
export async function deleteAdminEvent(eventId: string): Promise<void> {
  await api.delete(`/admin/events/${eventId}`);
}

export type AdminReviewItem = {
  id: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Récupère la liste paginée des avis pour modération. */
export async function getAdminReviews(
  page = 1,
  limit = 20
): Promise<{
  reviews: AdminReviewItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const { data } = await api.get('/admin/reviews', { params: { page, limit } });
  return data;
}

/** Supprime un avis signalé ou inapproprié. */
export async function deleteAdminReview(reviewId: string): Promise<void> {
  await api.delete(`/admin/reviews/${reviewId}`);
}
