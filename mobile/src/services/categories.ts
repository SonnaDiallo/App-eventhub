/**
 * @file Définition et accès aux catégories d'événements.
 *
 * Contient la liste statique des 6 catégories supportées (musique,
 * sport, arts, gastronomie, famille, autre) avec leurs traductions
 * et images par défaut. Utilisé pour le filtrage et l'affichage
 * des événements dans toute l'application.
 */

export interface Category {
  id: string;
  name: string;
  nameFr: string;
  nameEs: string;
  defaultImage: string;
  description?: string;
}

/** Retourne le nom localisé d'une catégorie selon la langue active. */
export const getCategoryName = (cat: Category, lang: string): string => {
  if (lang === 'fr') return cat.nameFr;
  if (lang === 'es') return cat.nameEs;
  return cat.name;
};

export interface CategoriesResponse {
  categories: Category[];
  count: number;
}

const CATEGORIES: Category[] = [
  {
    id: 'music',
    name: 'Music',
    nameFr: 'Musique',
    nameEs: 'Música',
    defaultImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    description: 'Concerts, festivals, spectacles musicaux',
  },
  {
    id: 'sports',
    name: 'Sports',
    nameFr: 'Sport',
    nameEs: 'Deportes',
    defaultImage: 'https://images.unsplash.com/photo-1461896836934-voices?w=800',
    description: 'Événements sportifs, compétitions',
  },
  {
    id: 'arts',
    name: 'Arts',
    nameFr: 'Arts',
    nameEs: 'Artes',
    defaultImage: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800',
    description: 'Expositions, théâtre, danse',
  },
  {
    id: 'food',
    name: 'Food',
    nameFr: 'Gastronomie',
    nameEs: 'Gastronomía',
    defaultImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    description: 'Événements culinaires, dégustations',
  },
  {
    id: 'family',
    name: 'Family',
    nameFr: 'Famille',
    nameEs: 'Familia',
    defaultImage: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800',
    description: 'Événements familiaux, activités enfants',
  },
  {
    id: 'other',
    name: 'Other',
    nameFr: 'Autre',
    nameEs: 'Otro',
    defaultImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
    description: 'Autres types d\'événements',
  },
];

/** Retourne l'ensemble des catégories disponibles. */
export const getCategories = async (): Promise<Category[]> => CATEGORIES;

/** Recherche une catégorie par son identifiant, ou `null` si introuvable. */
export const getCategoryById = async (id: string): Promise<Category | null> =>
  CATEGORIES.find((c) => c.id === id) || null;

/** Accès synchrone à la liste des catégories (pas de promesse). */
export const getDefaultCategories = (): Category[] => CATEGORIES;

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

/** Formate une taille en octets en chaîne lisible (B / KB / MB). */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
