/**
 * @module types/externalEvents
 * @description Types pour l'intégration d'événements provenant de sources externes.
 *
 * EventHub agrège des événements de différentes plateformes (Ticketmaster, Eventbrite)
 * en les normalisant dans un format unifié. Ce type UnifiedEvent sert de contrat
 * commun entre les adaptateurs d'API externes et le reste de l'application,
 * permettant d'afficher des événements externes aux côtés des événements natifs
 * sans que le frontend ait à connaître la source.
 *
 * @requires ./categories - Pour typer la catégorie avec l'enum partagé
 * @exports UnifiedEvent - Type normalisé pour tout événement externe
 */
import { EventCategory } from './categories';

/**
 * Représentation normalisée d'un événement provenant d'une API externe.
 * Les champs optionnels reflètent le fait que toutes les sources ne fournissent
 * pas les mêmes informations (ex: Eventbrite n'a pas de promoterName).
 */
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
  /** Permet de tracer l'origine pour le suivi analytics et l'affichage de badges */
  source: 'ticketmaster' | 'eventbrite';
  category?: EventCategory;
  /** URL vers la page originale pour rediriger l'utilisateur vers l'achat de billets */
  externalUrl?: string;
};
