import axios from 'axios';
import { getApiBase } from '../config/api';

export const api = axios.create({
  baseURL: getApiBase(),
  headers: { 'Content-Type': 'application/json' },
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// Types
export type User = {
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

export type EventItem = {
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

export async function getUsers(): Promise<{ users: User[] }> {
  const { data } = await api.get<{ users: User[] }>('/users');
  return data;
}

export async function updateUserRole(userId: string, role: User['role']): Promise<void> {
  await api.patch(`/users/${userId}/role`, { role });
}

export async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}`);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/admin/stats');
  return data;
}

export async function getAdminEvents(page = 1, limit = 20): Promise<{
  events: EventItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const { data } = await api.get<{
    events: EventItem[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>('/admin/events', { params: { page, limit } });
  return data;
}

export async function deleteAdminEvent(eventId: string): Promise<void> {
  await api.delete(`/admin/events/${eventId}`);
}
