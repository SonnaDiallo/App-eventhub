import { EventCategory, CATEGORIES, CategoryInfo } from '../types/categories';
import { getImageSearchQuery } from './imageService';

/**
 * Récupère toutes les catégories disponibles
 */
export function getAllCategories(): CategoryInfo[] {
  return Object.values(CATEGORIES);
}

/**
 * Récupère une catégorie par son ID
 */
export function getCategoryById(categoryId: string): CategoryInfo | null {
  const category = CATEGORIES[categoryId as EventCategory];
  return category || null;
}

/**
 * Vérifie si une catégorie existe
 */
export function isValidCategory(categoryId: string): boolean {
  return categoryId in CATEGORIES;
}

/**
 * Récupère l'image par défaut d'une catégorie
 * Si l'image fournie est valide, on l'utilise, sinon on retourne l'image par défaut de la catégorie
 */
export function getCategoryDefaultImage(
  categoryId: string | undefined,
  providedImage?: string | null
): string {
  // Si une image est fournie et valide, on l'utilise
  if (providedImage && typeof providedImage === 'string' && providedImage.trim()) {
    return providedImage;
  }

  // Sinon, on utilise l'image par défaut de la catégorie
  if (categoryId && isValidCategory(categoryId)) {
    const category = getCategoryById(categoryId);
    return category?.defaultImage || CATEGORIES[EventCategory.OTHER].defaultImage;
  }

  // Par défaut, on retourne l'image "other"
  return CATEGORIES[EventCategory.OTHER].defaultImage;
}

/**
 * Détermine la catégorie d'un événement basée sur son titre
 * Utilise la même logique que getImageSearchQuery mais retourne une catégorie
 */
export function detectCategoryFromTitle(title: string): EventCategory {
  const titleLower = title.toLowerCase();

  if (titleLower.includes('théâtre') || titleLower.includes('theatre') || titleLower.includes('spectacle') ||
      titleLower.includes('danse') || titleLower.includes('dance') || titleLower.includes('ballet') ||
      titleLower.includes('art') || titleLower.includes('exposition') || titleLower.includes('exhibition') ||
      titleLower.includes('gallery')) {
    return EventCategory.ARTS;
  }
  if (titleLower.includes('concert') || titleLower.includes('musique') || titleLower.includes('music') ||
      titleLower.includes('festival')) {
    return EventCategory.MUSIC;
  }
  if (titleLower.includes('sport') || titleLower.includes('fitness') || titleLower.includes('marathon') ||
      titleLower.includes('run') || titleLower.includes('football') || titleLower.includes('basketball') ||
      titleLower.includes('tennis')) {
    return EventCategory.SPORTS;
  }
  if (titleLower.includes('food') || titleLower.includes('cuisine') || titleLower.includes('restaurant') ||
      titleLower.includes('gastronomie') || titleLower.includes('dégustation') || titleLower.includes('degustation')) {
    return EventCategory.FOOD;
  }
  if (titleLower.includes('enfant') || titleLower.includes('kid') || titleLower.includes('children') ||
      titleLower.includes('family') || titleLower.includes('famille')) {
    return EventCategory.FAMILY;
  }

  return EventCategory.OTHER;
}
