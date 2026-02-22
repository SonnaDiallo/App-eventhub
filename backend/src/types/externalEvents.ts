// Types pour les événements externes
import { EventCategory } from './categories';

export type UnifiedEvent = {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  venueName?: string;
  /** Nom du promoteur Ticketmaster (organisateur de l'événement) */
  promoterName?: string;
  coverImage?: string;
  isFree?: boolean;
  price?: number;
  source: 'ticketmaster' | 'eventbrite';
  category?: EventCategory;
  externalUrl?: string; // URL vers la page de l'événement externe
};
