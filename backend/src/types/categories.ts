/**
 * Catégories d'événements disponibles dans l'application
 */
export enum EventCategory {
  MUSIC = 'music',
  SPORTS = 'sports',
  ARTS = 'arts',
  FOOD = 'food',
  TECHNOLOGY = 'technology',
  BUSINESS = 'business',
  EDUCATION = 'education',
  HEALTH = 'health',
  FAMILY = 'family',
  OTHER = 'other',
}

/**
 * Informations sur une catégorie
 */
export interface CategoryInfo {
  id: EventCategory;
  name: string;
  nameFr: string;
  defaultImage: string;
  description?: string;
}

/**
 * Configuration des catégories avec leurs images par défaut
 */
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
    description: 'Événements sportifs, compétitions, activités physiques',
  },
  [EventCategory.ARTS]: {
    id: EventCategory.ARTS,
    name: 'Arts',
    nameFr: 'Arts',
    defaultImage: '/images/categories/arts.jpg',
    description: 'Expositions, spectacles, théâtre, danse',
  },
  [EventCategory.FOOD]: {
    id: EventCategory.FOOD,
    name: 'Food',
    nameFr: 'Gastronomie',
    defaultImage: '/images/categories/food.jpg',
    description: 'Événements culinaires, dégustations, festivals de cuisine',
  },
  [EventCategory.TECHNOLOGY]: {
    id: EventCategory.TECHNOLOGY,
    name: 'Technology',
    nameFr: 'Technologie',
    defaultImage: '/images/categories/technology.jpg',
    description: 'Conférences tech, hackathons, meetups',
  },
  [EventCategory.BUSINESS]: {
    id: EventCategory.BUSINESS,
    name: 'Business',
    nameFr: 'Business',
    defaultImage: '/images/categories/business.jpg',
    description: 'Conférences, networking, séminaires',
  },
  [EventCategory.EDUCATION]: {
    id: EventCategory.EDUCATION,
    name: 'Education',
    nameFr: 'Éducation',
    defaultImage: '/images/categories/education.jpg',
    description: 'Ateliers, formations, conférences éducatives',
  },
  [EventCategory.HEALTH]: {
    id: EventCategory.HEALTH,
    name: 'Health',
    nameFr: 'Santé & Bien-être',
    defaultImage: '/images/categories/health.jpg',
    description: 'Yoga, méditation, bien-être, santé',
  },
  [EventCategory.FAMILY]: {
    id: EventCategory.FAMILY,
    name: 'Family',
    nameFr: 'Famille',
    defaultImage: '/images/categories/family.jpg',
    description: 'Événements familiaux, activités pour enfants',
  },
  [EventCategory.OTHER]: {
    id: EventCategory.OTHER,
    name: 'Other',
    nameFr: 'Autre',
    defaultImage: '/images/categories/other.jpg',
    description: 'Autres types d\'événements',
  },
};

/**
 * Taille maximale d'image autorisée (en bytes)
 * 2 MB par défaut
 */
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * Formats d'image acceptés
 */
export const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
