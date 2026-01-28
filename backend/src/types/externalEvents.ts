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
  coverImage?: string;
  isFree?: boolean;
  price?: number;
  source: 'ticketmaster';
  category?: EventCategory; // Catégorie détectée depuis notre système
};
