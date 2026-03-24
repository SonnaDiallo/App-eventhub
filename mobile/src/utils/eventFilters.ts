/**
 * @file Fonctions de filtrage et de tri des événements.
 *
 * Applique des filtres côté client (catégorie, recherche textuelle)
 * et propose plusieurs options de tri (date, prix, titre) sur la
 * liste d'événements déjà chargée en mémoire.
 */

import type { EventData } from '../navigation/AuthNavigator';

export type SortOption = 'date' | 'price-asc' | 'price-desc' | 'title';

/** Compare catégories de façon insensible à la casse (API peut renvoyer "Music" ou "music") */
function categoryMatches(eventCategory: string | undefined, selectedCategory: string): boolean {
  const a = (eventCategory || '').trim().toLowerCase();
  const b = selectedCategory.trim().toLowerCase();
  return a === b;
}

/** Filtre les événements par catégorie et/ou recherche textuelle (titre, lieu, organisateur). */
export const filterEvents = (
  events: EventData[],
  searchQuery: string,
  selectedCategory: string | null
): EventData[] => {
  let result = events;

  if (selectedCategory) {
    result = result.filter((e) => categoryMatches(e.category, selectedCategory));
  }

  const q = searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter((e) => {
      const title = (e.title || '').toLowerCase();
      const location = (e.location || '').toLowerCase();
      const organizer = (e.organizer ?? (e as any).organizerName ?? '').toString().toLowerCase();
      return title.includes(q) || location.includes(q) || organizer.includes(q);
    });
  }

  return result;
};

/** Trie les événements selon le critère choisi (date, prix croissant/décroissant, titre). */
export const sortEvents = (events: EventData[], sortBy: SortOption): EventData[] => {
  const sorted = [...events];
  
  switch (sortBy) {
    case 'date':
      sorted.sort((a, b) => {
        const eventA = a as EventData & { _startDate?: Date };
        const eventB = b as EventData & { _startDate?: Date };
        const dateA = eventA._startDate ? eventA._startDate.getTime() : (a.date ? new Date(a.date).getTime() : Infinity);
        const dateB = eventB._startDate ? eventB._startDate.getTime() : (b.date ? new Date(b.date).getTime() : Infinity);
        return dateA - dateB;
      });
      break;
    case 'price-asc':
      sorted.sort((a, b) => {
        const priceA = a.isFree ? 0 : a.price;
        const priceB = b.isFree ? 0 : b.price;
        return priceA - priceB;
      });
      break;
    case 'price-desc':
      sorted.sort((a, b) => {
        const priceA = a.isFree ? Infinity : a.price;
        const priceB = b.isFree ? Infinity : b.price;
        return priceB - priceA;
      });
      break;
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }
  
  return sorted;
};
