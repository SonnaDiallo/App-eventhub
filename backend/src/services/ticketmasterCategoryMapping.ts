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
    segmentId: 'KZFzniwnSyZfZ7v7n1', // Miscellaneous
    segmentName: 'Miscellaneous',
    classificationNames: ['Food & Drink', 'Culinary'],
  },
  [EventCategory.TECHNOLOGY]: {
    segmentId: 'KZFzniwnSyZfZ7v7n1', // Miscellaneous
    segmentName: 'Miscellaneous',
    classificationNames: ['Technology', 'Tech'],
  },
  [EventCategory.BUSINESS]: {
    segmentId: 'KZFzniwnSyZfZ7v7n1', // Miscellaneous
    segmentName: 'Miscellaneous',
    classificationNames: ['Business', 'Conference'],
  },
  [EventCategory.EDUCATION]: {
    segmentId: 'KZFzniwnSyZfZ7v7n1', // Miscellaneous
    segmentName: 'Miscellaneous',
    classificationNames: ['Education', 'Workshop', 'Seminar'],
  },
  [EventCategory.HEALTH]: {
    segmentId: 'KZFzniwnSyZfZ7v7n1', // Miscellaneous
    segmentName: 'Miscellaneous',
    classificationNames: ['Health', 'Wellness', 'Fitness'],
  },
  [EventCategory.FAMILY]: {
    segmentId: 'KZFzniwnSyZfZ7v7n1', // Miscellaneous
    segmentName: 'Miscellaneous',
    classificationNames: ['Family', 'Kids', 'Children'],
  },
  [EventCategory.OTHER]: {
    segmentId: 'KZFzniwnSyZfZ7v7n1',
    segmentName: 'Miscellaneous',
    classificationNames: ['Other', 'Miscellaneous'],
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
 * @param category Notre catégorie d'événement
 * @returns Liste des classifications Ticketmaster possibles
 */
export function getAllTicketmasterClassifications(category: EventCategory): string[] {
  const mapping = TICKETMASTER_CATEGORY_MAPPING[category];
  if (!mapping) return [];
  
  return [
    mapping.segmentName,
    ...(mapping.classificationNames || []),
  ];
}
