import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  createReviewViaFunctions, 
  getEventReviewsViaFunctions, 
  deleteReviewViaFunctions 
} from './functionsService';

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
  const result = await createReviewViaFunctions(eventId, rating, comment);
  // Retourner un objet Review minimal
  return {
    id: result.reviewId,
    eventId,
    userId: auth.currentUser?.uid || '',
    userName: auth.currentUser?.displayName || 'Utilisateur',
    rating,
    comment,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export const getEventReviews = async (eventId: string, page: number = 1, limitNum: number = 10): Promise<{ reviews: Review[]; pagination: any }> => {
  const result = await getEventReviewsViaFunctions(eventId, page, limitNum);
  return {
    reviews: result.reviews.map((r: any) => ({
      ...r,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
    })),
    pagination: result.pagination,
  };
};

export const getEventReviewStats = async (eventId: string): Promise<ReviewStats> => {
  // Récupérer les stats via la même fonction
  const result = await getEventReviewsViaFunctions(eventId, 1, 1000);
  
  // Calculer la distribution
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  result.reviews.forEach((r: any) => {
    const rating = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
    if (rating >= 1 && rating <= 5) {
      distribution[rating]++;
    }
  });

  return {
    averageRating: result.stats.averageRating,
    totalReviews: result.stats.total,
    ratingDistribution: distribution,
  };
};

export const getUserReview = async (eventId: string): Promise<Review | null> => {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;

    // Chercher directement dans Firestore
    const reviewsRef = collection(db, 'reviews');
    const q = query(
      reviewsRef,
      where('eventId', '==', eventId),
      where('userId', '==', userId),
      limit(1)
    );
    const snap = await getDocs(q);
    
    if (snap.empty) return null;
    
    const doc = snap.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      eventId: data.eventId,
      userId: data.userId,
      userName: data.userName,
      userAvatar: data.userAvatar,
      rating: data.rating,
      comment: data.comment,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
  } catch (error: any) {
    console.error('Error getting user review:', error);
    return null;
  }
};

export const updateReview = async (reviewId: string, rating?: number, comment?: string): Promise<Review> => {
  // Pour l'update, on supprime et recrée (simplification)
  // Note: Idéalement créer une Cloud Function updateReview
  throw new Error('Update review not implemented - please delete and create a new review');
};

export const deleteReview = async (reviewId: string): Promise<void> => {
  await deleteReviewViaFunctions(reviewId);
};
