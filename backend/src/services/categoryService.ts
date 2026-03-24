/**
 * @module categoryService
 * @description Service de gestion des catégories d'événements.
 *
 * Centralise toute la logique métier liée aux catégories afin que les contrôleurs
 * n'aient jamais à manipuler directement le dictionnaire `CATEGORIES`.
 * Le service fournit également une détection automatique de catégorie à partir
 * du titre d'un événement, ce qui est indispensable pour classer les événements
 * importés depuis des sources externes (Ticketmaster, etc.) qui n'utilisent pas
 * notre propre taxonomie.
 *
 * @datasource `../types/categories` — dictionnaire statique des catégories
 * @see imageService — utilisé en complément pour la recherche d'images par catégorie
 *
 * @exports getAllCategories        — liste complète des catégories
 * @exports getCategoryById         — recherche par identifiant
 * @exports isValidCategory         — validation d'existence
 * @exports getCategoryDefaultImage — résolution d'image par défaut avec fallback
 * @exports detectCategoryFromTitle — classification heuristique par mots-clés
 */
import { EventCategory, CATEGORIES, CategoryInfo } from '../types/categories';
import { getImageSearchQuery } from './imageService';

/**
 * Récupère toutes les catégories disponibles.
 * Retourne les valeurs du dictionnaire plutôt que les clés,
 * car le mobile a besoin des métadonnées complètes (label, icône, image par défaut).
 *
 * @returns {CategoryInfo[]} Tableau de toutes les catégories avec leurs métadonnées
 */
export function getAllCategories(): CategoryInfo[] {
  return Object.values(CATEGORIES);
}

/**
 * Récupère une catégorie par son identifiant.
 * Retourne `null` plutôt que de lever une erreur afin de laisser l'appelant
 * décider du comportement en cas de catégorie inconnue (fallback, rejet, etc.).
 *
 * @param {string} categoryId — identifiant de la catégorie (ex. "music", "sports")
 * @returns {CategoryInfo | null} La catégorie correspondante, ou `null` si inexistante
 */
export function getCategoryById(categoryId: string): CategoryInfo | null {
  const category = CATEGORIES[categoryId as EventCategory];
  return category || null;
}

/**
 * Vérifie si une catégorie existe dans notre taxonomie.
 * Utilisé principalement en validation d'entrée (routes de création/édition d'événements)
 * pour rejeter les catégories inconnues avant d'écrire en base.
 *
 * @param {string} categoryId — identifiant à vérifier
 * @returns {boolean} `true` si la catégorie est reconnue
 */
export function isValidCategory(categoryId: string): boolean {
  return categoryId in CATEGORIES;
}

/**
 * Résout l'image de couverture d'un événement avec une stratégie de fallback à 3 niveaux :
 * 1. Image fournie explicitement (ex. upload de l'organisateur)
 * 2. Image par défaut de la catégorie concernée
 * 3. Image générique "other" en dernier recours
 *
 * Cette approche garantit qu'un événement possède toujours une image affichable,
 * même si l'organisateur n'en a pas fourni et que la catégorie est absente.
 *
 * @param {string | undefined} categoryId — catégorie de l'événement (peut être absente)
 * @param {string | null}      providedImage — URL d'image fournie par l'organisateur
 * @returns {string} URL de l'image retenue
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
 * Détermine automatiquement la catégorie d'un événement à partir de son titre.
 *
 * Indispensable pour les événements importés depuis Ticketmaster ou d'autres sources
 * externes qui ne fournissent pas toujours une catégorie exploitable dans notre taxonomie.
 * L'algorithme repose sur une détection par mots-clés (FR + EN) classés du plus
 * spécifique au plus général. En l'absence de correspondance, retourne `OTHER`.
 *
 * @param {string} title — titre de l'événement (insensible à la casse)
 * @returns {EventCategory} La catégorie détectée, ou `OTHER` par défaut
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
