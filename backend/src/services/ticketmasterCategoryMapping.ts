import { EventCategory } from '../types/categories';

/**
 * Mapping entre nos catégories et les segments Ticketmaster
 * Ticketmaster utilise des "segments" avec des IDs spécifiques
 * Documentation: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 * 
 * Segments Ticketmaster disponibles:
 * - Music: KZFzniwnSyZfZ7v7nJ
 * - Sports: KZFzniwnSyZfZ7v7nE
 * - Arts & Theatre: KZFzniwnSyZfZ7v7na
 * - Film: KZFzniwnSyZfZ7v7nJ (partagé avec Music)
 * - Miscellaneous: KZFzniwnSyZfZ7v7n1
 */
export const TICKETMASTER_CATEGORY_MAPPING: Record<EventCategory, {
  segmentId: string;
  segmentName: string;
  classificationNames?: string[];
  /** Mot-clé pour filtrer (obligatoire si keywordOnly) */
  keyword?: string;
  /** Si true, on n'envoie pas segmentId : recherche par keyword sur tous les segments (Miscellaneous renvoie peu d'événements à Paris) */
  keywordOnly?: boolean;
}> = {
  [EventCategory.MUSIC]: {
    segmentId: 'KZFzniwnSyZfZ7v7nJ',
    segmentName: 'Music',
    classificationNames: ['Music', 'Concert', 'Festival'],
  },
  [EventCategory.SPORTS]: {
    segmentId: 'KZFzniwnSyZfZ7v7nE',
    segmentName: 'Sports',
    classificationNames: ['Sports', 'Basketball', 'Football', 'Soccer', 'Baseball', 'Hockey'],
  },
  [EventCategory.ARTS]: {
    segmentId: 'KZFzniwnSyZfZ7v7na',
    segmentName: 'Arts & Theatre',
    classificationNames: ['Arts', 'Theatre', 'Comedy', 'Dance'],
  },
  [EventCategory.FOOD]: {
    segmentId: 'KZFzniwnSyZfZ7v7n1',
    segmentName: 'Miscellaneous',
    classificationNames: ['Food & Drink', 'Culinary'],
    keyword: 'food culinary gastronomy wine tasting chef dégustation cuisine',
    keywordOnly: true,
  },
  [EventCategory.FAMILY]: {
    segmentId: 'KZFzniwnSyZfZ7v7n1',
    segmentName: 'Miscellaneous',
    classificationNames: ['Family', 'Kids', 'Children'],
    keyword: 'family kids children famille',
    keywordOnly: true,
  },
  [EventCategory.OTHER]: {
    segmentId: 'KZFzniwnSyZfZ7v7n1',
    segmentName: 'Miscellaneous',
    classificationNames: ['Other', 'Miscellaneous'],
    keywordOnly: true,
    keyword: 'event',
  },
};

/**
 * IDs des segments Ticketmaster (pour référence)
 */
export const TICKETMASTER_SEGMENT_IDS: Record<string, string> = {
  Music: 'KZFzniwnSyZfZ7v7nJ',
  Sports: 'KZFzniwnSyZfZ7v7nE',
  Arts: 'KZFzniwnSyZfZ7v7na',
  Film: 'KZFzniwnSyZfZ7v7nJ',
  Miscellaneous: 'KZFzniwnSyZfZ7v7n1',
};

/**
 * Convertit notre catégorie en segment ID Ticketmaster
 * @param category Notre catégorie d'événement
 * @returns L'ID du segment Ticketmaster
 */
export function getTicketmasterSegmentId(category: EventCategory): string | undefined {
  return TICKETMASTER_CATEGORY_MAPPING[category]?.segmentId;
}

/**
 * Convertit notre catégorie en nom de segment Ticketmaster
 * @param category Notre catégorie d'événement
 * @returns Le nom du segment Ticketmaster
 */
export function getTicketmasterSegmentName(category: EventCategory): string | undefined {
  return TICKETMASTER_CATEGORY_MAPPING[category]?.segmentName;
}

/**
 * Convertit notre catégorie en classification Ticketmaster (pour classificationName)
 * @param category Notre catégorie d'événement
 * @returns La première classification name disponible
 */
export function getTicketmasterClassification(category: EventCategory): string | undefined {
  const mapping = TICKETMASTER_CATEGORY_MAPPING[category];
  return mapping?.classificationNames?.[0] || mapping?.segmentName;
}

/**
 * Récupère toutes les classifications possibles pour une catégorie
 */
export function getAllTicketmasterClassifications(category: EventCategory): string[] {
  const mapping = TICKETMASTER_CATEGORY_MAPPING[category];
  if (!mapping) return [];
  return [mapping.segmentName, ...(mapping.classificationNames || [])];
}

/**
 * Mot-clé de recherche Ticketmaster pour les catégories "Miscellaneous"
 * (gastronomie, tech, santé, etc.) afin d'avoir des résultats par thème.
 */
export function getTicketmasterKeyword(category: EventCategory): string | undefined {
  return TICKETMASTER_CATEGORY_MAPPING[category]?.keyword;
}

/**
 * Si true, on ne passe pas segmentId à l'API (recherche par keyword sur tous les segments).
 * Utilisé pour Food, Family, Other car le segment Miscellaneous renvoie peu d'événements à Paris.
 */
export function useKeywordOnly(category: EventCategory): boolean {
  return !!TICKETMASTER_CATEGORY_MAPPING[category]?.keywordOnly;
}
