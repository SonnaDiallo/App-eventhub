/**
 * Catégories d'événements (max 6)
 */
export enum EventCategory {
  MUSIC = 'music',
  SPORTS = 'sports',
  ARTS = 'arts',
  FOOD = 'food',
  FAMILY = 'family',
  OTHER = 'other',
}

export interface CategoryInfo {
  id: EventCategory;
  name: string;
  nameFr: string;
  defaultImage: string;
  description?: string;
}

export const CATEGORIES: Record<EventCategory, CategoryInfo> = {
  [EventCategory.MUSIC]: {
    id: EventCategory.MUSIC,
    name: 'Music',
    nameFr: 'Musique',
    defaultImage: '/images/categories/music.jpg',
    description: 'Concerts, festivals, spectacles musicaux',
  },
  [EventCategory.SPORTS]: {
    id: EventCategory.SPORTS,
    name: 'Sports',
    nameFr: 'Sport',
    defaultImage: '/images/categories/sports.jpg',
    description: 'Événements sportifs, compétitions',
  },
  [EventCategory.ARTS]: {
    id: EventCategory.ARTS,
    name: 'Arts',
    nameFr: 'Arts',
    defaultImage: '/images/categories/arts.jpg',
    description: 'Expositions, théâtre, danse',
  },
  [EventCategory.FOOD]: {
    id: EventCategory.FOOD,
    name: 'Food',
    nameFr: 'Gastronomie',
    defaultImage: '/images/categories/food.jpg',
    description: 'Événements culinaires, dégustations',
  },
  [EventCategory.FAMILY]: {
    id: EventCategory.FAMILY,
    name: 'Family',
    nameFr: 'Famille',
    defaultImage: '/images/categories/family.jpg',
    description: 'Événements familiaux, activités enfants',
  },
  [EventCategory.OTHER]: {
    id: EventCategory.OTHER,
    name: 'Other',
    nameFr: 'Autre',
    defaultImage: '/images/categories/other.jpg',
    description: 'Autres types d\'événements',
  },
};

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const isValidCategory = (category: string): category is EventCategory => {
  return Object.values(EventCategory).includes(category as EventCategory);
};
