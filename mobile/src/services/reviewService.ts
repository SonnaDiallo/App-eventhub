import { api } from './api';

export interface Review {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export const createReview = async (eventId: string, rating: number, comment: string): Promise<Review> => {
  const response = await api.post('/reviews', { eventId, rating, comment });
  return response.data.review;
};

export const getEventReviews = async (eventId: string, page: number = 1, limit: number = 10): Promise<{ reviews: Review[]; pagination: any }> => {
  const response = await api.get(`/reviews/event/${eventId}`, { params: { page, limit } });
  return response.data;
};

export const getEventReviewStats = async (eventId: string): Promise<ReviewStats> => {
  const response = await api.get(`/reviews/event/${eventId}/stats`);
  return response.data;
};

export const getUserReview = async (eventId: string): Promise<Review | null> => {
  try {
    const response = await api.get(`/reviews/event/${eventId}/user`);
    return response.data.review;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const updateReview = async (reviewId: string, rating?: number, comment?: string): Promise<Review> => {
  const response = await api.put(`/reviews/${reviewId}`, { rating, comment });
  return response.data.review;
};

export const deleteReview = async (reviewId: string): Promise<void> => {
  await api.delete(`/reviews/${reviewId}`);
};
