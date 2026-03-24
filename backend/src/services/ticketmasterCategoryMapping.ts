/**
 * @module ticketmasterCategoryMapping
 * @description Table de correspondance entre les catégories EventHub et la taxonomie Ticketmaster.
 *
 * Ticketmaster classe ses événements par « segments » (Music, Sports, Arts & Theatre,
 * Miscellaneous…) identifiés par des IDs opaques. Notre application utilise sa propre
 * taxonomie (`EventCategory`). Ce module fait le pont entre les deux systèmes.
 *
 * **Particularité importante** : les catégories Food, Family et Other n'ont pas
 * d'équivalent direct chez Ticketmaster (elles tombent dans "Miscellaneous" qui
 * renvoie très peu d'événements pour des villes françaises). Pour ces catégories,
 * on utilise uniquement une recherche par `keyword` sur tous les segments, ce qui
 * produit des résultats beaucoup plus pertinents.
 *
 * @datasource Documentation Ticketmaster Discovery API v2
 * @see externalEventsService — consomme ce mapping pour construire les requêtes API
 *
 * @exports TICKETMASTER_CATEGORY_MAPPING       — table de correspondance complète
 * @exports TICKETMASTER_SEGMENT_IDS            — référence rapide des IDs de segments
 * @exports getTicketmasterSegmentId            — résolution catégorie → segmentId
 * @exports getTicketmasterSegmentName          — résolution catégorie → nom de segment
 * @exports getTicketmasterClassification       — résolution catégorie → classificationName
 * @exports getAllTicketmasterClassifications    — toutes les classifications pour une catégorie
 * @exports getTicketmasterKeyword              — mot-clé de recherche pour les catégories "Misc"
 * @exports useKeywordOnly                      — indique si la recherche doit ignorer le segmentId
 */
import { EventCategory } from '../types/categories';

/**
 * Mapping entre nos catégories et les segments Ticketmaster.
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
 * Référence rapide des IDs de segments Ticketmaster.
 * Conservé ici pour faciliter le débogage et la documentation ;
 * ces IDs sont des chaînes opaques qui ne changent pas dans l'API Discovery v2.
 */
export const TICKETMASTER_SEGMENT_IDS: Record<string, string> = {
  Music: 'KZFzniwnSyZfZ7v7nJ',
  Sports: 'KZFzniwnSyZfZ7v7nE',
  Arts: 'KZFzniwnSyZfZ7v7na',
  Film: 'KZFzniwnSyZfZ7v7nJ',
  Miscellaneous: 'KZFzniwnSyZfZ7v7n1',
};

/**
 * Convertit une catégorie EventHub en identifiant de segment Ticketmaster.
 * Le segmentId est le filtre principal dans l'API Discovery ; il est cependant
 * ignoré pour les catégories `keywordOnly` (Food, Family, Other).
 *
 * @param {EventCategory} category — catégorie EventHub
 * @returns {string | undefined} ID du segment Ticketmaster, ou `undefined` si non mappé
 */
export function getTicketmasterSegmentId(category: EventCategory): string | undefined {
  return TICKETMASTER_CATEGORY_MAPPING[category]?.segmentId;
}

/**
 * Retourne le nom lisible du segment Ticketmaster correspondant.
 * Utile pour les logs et le débogage, mais pas utilisé directement dans les requêtes API.
 *
 * @param {EventCategory} category — catégorie EventHub
 * @returns {string | undefined} Nom du segment (ex. "Music", "Sports")
 */
export function getTicketmasterSegmentName(category: EventCategory): string | undefined {
  return TICKETMASTER_CATEGORY_MAPPING[category]?.segmentName;
}

/**
 * Retourne la classification Ticketmaster principale pour une catégorie.
 * Utilisé quand on veut filtrer par `classificationName` plutôt que par segment.
 * Prend la première valeur du tableau `classificationNames`, avec fallback sur le nom du segment.
 *
 * @param {EventCategory} category — catégorie EventHub
 * @returns {string | undefined} Nom de classification Ticketmaster (ex. "Music", "Football")
 */
export function getTicketmasterClassification(category: EventCategory): string | undefined {
  const mapping = TICKETMASTER_CATEGORY_MAPPING[category];
  return mapping?.classificationNames?.[0] || mapping?.segmentName;
}

/**
 * Retourne toutes les classifications Ticketmaster associées à une catégorie.
 * Inclut le nom du segment + les `classificationNames` spécifiques.
 * Utile si l'on souhaite effectuer une recherche multi-critères ou afficher
 * les sous-catégories Ticketmaster correspondantes dans une interface admin.
 *
 * @param {EventCategory} category — catégorie EventHub
 * @returns {string[]} Tableau de noms de classifications (peut être vide)
 */
export function getAllTicketmasterClassifications(category: EventCategory): string[] {
  const mapping = TICKETMASTER_CATEGORY_MAPPING[category];
  if (!mapping) return [];
  return [mapping.segmentName, ...(mapping.classificationNames || [])];
}

/**
 * Retourne le mot-clé de recherche Ticketmaster pour les catégories sans segment dédié.
 * Indispensable pour Food, Family et Other dont le segment "Miscellaneous" est
 * quasi vide sur le marché français ; la recherche par keyword sur tous les segments
 * produit des résultats bien plus pertinents.
 *
 * @param {EventCategory} category — catégorie EventHub
 * @returns {string | undefined} Mots-clés de recherche, ou `undefined` si non nécessaire
 */
export function getTicketmasterKeyword(category: EventCategory): string | undefined {
  return TICKETMASTER_CATEGORY_MAPPING[category]?.keyword;
}

/**
 * Indique si la catégorie doit être recherchée uniquement par keyword (sans segmentId).
 *
 * C'est le cas pour Food, Family et Other : le segment Miscellaneous de Ticketmaster
 * renvoie très peu de résultats en France. En supprimant le filtre segmentId, on
 * permet au keyword de chercher dans tous les segments, ce qui augmente fortement
 * le nombre de résultats pertinents.
 *
 * @param {EventCategory} category — catégorie EventHub
 * @returns {boolean} `true` si seul le keyword doit être utilisé dans la requête
 */
export function useKeywordOnly(category: EventCategory): boolean {
  return !!TICKETMASTER_CATEGORY_MAPPING[category]?.keywordOnly;
}
