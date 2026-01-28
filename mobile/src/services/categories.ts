// mobile/src/services/categories.ts
import { api } from './api';

export interface Category {
  id: string;
  name: string;
  nameFr: string;
  defaultImage: string;
  description?: string;
}

export interface CategoriesResponse {
  categories: Category[];
  count: number;
}

/**
 * Récupère toutes les catégories disponibles depuis l'API backend
 */
export const getCategories = async (): Promise<Category[]> => {
  try {
    const response = await api.get<CategoriesResponse>('/categories');
    return response.data.categories;
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    // Retourner des catégories par défaut en cas d'erreur
    return getDefaultCategories();
  }
};

/**
 * Récupère une catégorie spécifique par son ID
 */
export const getCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const response = await api.get<{ category: Category }>(`/categories/${id}`);
    return response.data.category;
  } catch (error: any) {
    console.error('Error fetching category:', error);
    return null;
  }
};

/**
 * Catégories par défaut en cas d'erreur de connexion à l'API
 */
export const getDefaultCategories = (): Category[] => {
  return [
    {
      id: 'music',
      name: 'Music',
      nameFr: 'Musique',
      defaultImage: '/images/categories/music.jpg',
      description: 'Concerts, festivals, spectacles musicaux',
    },
    {
      id: 'sports',
      name: 'Sports',
      nameFr: 'Sport',
      defaultImage: '/images/categories/sports.jpg',
      description: 'Événements sportifs, compétitions, activités physiques',
    },
    {
      id: 'arts',
      name: 'Arts',
      nameFr: 'Arts',
      defaultImage: '/images/categories/arts.jpg',
      description: 'Expositions, spectacles, théâtre, danse',
    },
    {
      id: 'food',
      name: 'Food',
      nameFr: 'Gastronomie',
      defaultImage: '/images/categories/food.jpg',
      description: 'Événements culinaires, dégustations, festivals de cuisine',
    },
    {
      id: 'technology',
      name: 'Technology',
      nameFr: 'Technologie',
      defaultImage: '/images/categories/technology.jpg',
      description: 'Conférences tech, hackathons, meetups',
    },
    {
      id: 'business',
      name: 'Business',
      nameFr: 'Business',
      defaultImage: '/images/categories/business.jpg',
      description: 'Conférences, networking, séminaires',
    },
    {
      id: 'education',
      name: 'Education',
      nameFr: 'Éducation',
      defaultImage: '/images/categories/education.jpg',
      description: 'Ateliers, formations, conférences éducatives',
    },
    {
      id: 'health',
      name: 'Health',
      nameFr: 'Santé & Bien-être',
      defaultImage: '/images/categories/health.jpg',
      description: 'Yoga, méditation, bien-être, santé',
    },
    {
      id: 'family',
      name: 'Family',
      nameFr: 'Famille',
      defaultImage: '/images/categories/family.jpg',
      description: 'Événements familiaux, activités pour enfants',
    },
    {
      id: 'other',
      name: 'Other',
      nameFr: 'Autre',
      defaultImage: '/images/categories/other.jpg',
      description: 'Autres types d\'événements',
    },
  ];
};

/**
 * Taille maximale d'image autorisée (2 MB)
 */
export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * Formate la taille en MB pour l'affichage
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
