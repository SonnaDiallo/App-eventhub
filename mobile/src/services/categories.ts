// mobile/src/services/categories.ts
// 6 catégories max

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

const CATEGORIES: Category[] = [
  {
    id: 'music',
    name: 'Music',
    nameFr: 'Musique',
    defaultImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    description: 'Concerts, festivals, spectacles musicaux',
  },
  {
    id: 'sports',
    name: 'Sports',
    nameFr: 'Sport',
    defaultImage: 'https://images.unsplash.com/photo-1461896836934-voices?w=800',
    description: 'Événements sportifs, compétitions',
  },
  {
    id: 'arts',
    name: 'Arts',
    nameFr: 'Arts',
    defaultImage: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800',
    description: 'Expositions, théâtre, danse',
  },
  {
    id: 'food',
    name: 'Food',
    nameFr: 'Gastronomie',
    defaultImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    description: 'Événements culinaires, dégustations',
  },
  {
    id: 'family',
    name: 'Family',
    nameFr: 'Famille',
    defaultImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
    description: 'Événements familiaux, activités enfants',
  },
  {
    id: 'other',
    name: 'Other',
    nameFr: 'Autre',
    defaultImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
    description: 'Autres types d\'événements',
  },
];

export const getCategories = async (): Promise<Category[]> => CATEGORIES;

export const getCategoryById = async (id: string): Promise<Category | null> =>
  CATEGORIES.find((c) => c.id === id) || null;

export const getDefaultCategories = (): Category[] => CATEGORIES;

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
