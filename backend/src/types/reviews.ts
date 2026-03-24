/**
 * @module types/reviews
 * @description Types pour le système d'avis et de notation des événements.
 *
 * Permet aux participants de laisser un avis après un événement.
 * Les statistiques (ReviewStats) sont pré-calculées et stockées dans Firestore
 * pour éviter de recalculer la moyenne et la distribution à chaque affichage,
 * ce qui serait coûteux en lectures Firestore sur les événements populaires.
 *
 * @exports Review - Un avis individuel avec note et commentaire
 * @exports ReviewStats - Statistiques agrégées pré-calculées
 * @exports CreateReviewRequest - Payload de création d'un avis
 * @exports UpdateReviewRequest - Payload de mise à jour partielle
 */

/** Avis laissé par un participant sur un événement */
export interface Review {
  id: string;
  eventId: string;
  userId: string;
  /** Dénormalisé depuis le profil pour éviter une jointure à l'affichage */
  userName: string;
  userAvatar?: string;
  /** Note de 1 à 5 étoiles */
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Statistiques agrégées des avis pour un événement donné.
 * Maintenues à jour via un pattern de compteur incrémental
 * lors de la création/modification/suppression d'un avis.
 */
export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  /** Nombre d'avis par note (1 à 5) pour afficher un histogramme */
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface CreateReviewRequest {
  eventId: string;
  rating: number;
  comment: string;
}

/** Mise à jour partielle : seuls les champs fournis sont modifiés */
export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
}
