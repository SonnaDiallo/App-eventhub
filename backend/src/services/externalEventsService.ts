import axios from 'axios';
import { UnifiedEvent } from '../types/externalEvents';
import { EventCategory } from '../types/categories';
import { getTicketmasterSegmentId } from './ticketmasterCategoryMapping';

/**
 * Récupère les événements depuis Ticketmaster API - VERSION CORRIGÉE
 */
export async function fetchTicketmasterEvents(
  location: string,
  category?: string | EventCategory
): Promise<UnifiedEvent[]> {
  const ticketmasterApiKey = process.env.TICKETMASTER_API_KEY;
  
  if (!ticketmasterApiKey) {
    console.error('TICKETMASTER_API_KEY manquante');
    return [];
  }

  try {
    // Parser la localisation
    const locationParts = location.split(',').map(p => p.trim());
    const city = locationParts[0];
    const country = locationParts[1]?.toUpperCase() || 'FR';
    const countryCode = country.length === 2 ? country : country.substring(0, 2);
    
    const ticketmasterUrl = 'https://app.ticketmaster.com/discovery/v2/events.json';
    
    // Paramètres de base
    const params: any = {
      apikey: ticketmasterApiKey,
      city: city,
      countryCode: countryCode,
      size: 50,
      sort: 'date,asc',
      locale: 'fr-fr',
      startDateTime: new Date().toISOString(), // Seulement les événements futurs
    };

    // Ajouter la catégorie si fournie
    if (category) {
      const ourCategory = Object.values(EventCategory).find(c => c === category);
      if (ourCategory) {
        const segmentId = getTicketmasterSegmentId(ourCategory);
        if (segmentId) {
          params.segmentId = segmentId;
          console.log('Recherche avec segmentId:', segmentId);
        }
      }
    }
    
    console.log('Requête Ticketmaster:', {
      url: ticketmasterUrl,
      city,
      countryCode,
      category: params.segmentId || params.classificationName || 'all'
    });
    
    // Faire la requête
    const response = await axios.get(ticketmasterUrl, { 
      params,
      timeout: 10000,
    });
    
    console.log('Réponse reçue:', {
      status: response.status,
      totalElements: response.data?.page?.totalElements,
      totalPages: response.data?.page?.totalPages,
      size: response.data?.page?.size,
    });
    
    // Vérifier les erreurs dans la réponse
    if (response.data?.errors) {
      console.error('Erreurs API Ticketmaster:', response.data.errors);
      return [];
    }
    
    // Extraire les événements
    const events = response.data?._embedded?.events || [];
    console.log(`${events.length} événements trouvés`);
    
    // Si aucun événement, afficher plus d'infos
    if (events.length === 0) {
      console.log('Aucun événement trouvé. Détails:', {
        totalElements: response.data?.page?.totalElements,
        requestParams: params,
      });
      return [];
    }
    
    // Mapper les événements au format unifié
    return events.map((event: any): UnifiedEvent => {
      // Construire la date de début
      let startDate = '';
      if (event.dates?.start?.dateTime) {
        startDate = event.dates.start.dateTime;
      } else if (event.dates?.start?.localDate) {
        const localTime = event.dates.start.localTime || '00:00:00';
        startDate = `${event.dates.start.localDate}T${localTime}`;
      }
      
      // Construire la date de fin
      let endDate: string | undefined;
      if (event.dates?.end?.dateTime) {
        endDate = event.dates.end.dateTime;
      } else if (event.dates?.end?.localDate) {
        const localTime = event.dates.end.localTime || '23:59:59';
        endDate = `${event.dates.end.localDate}T${localTime}`;
      }
      
      // Extraire la venue
      const venue = event._embedded?.venues?.[0];
      const venueAddress = venue?.address?.line1;
      const venueCity = venue?.city?.name;
      
      let location = city;
      if (venueAddress && venueCity) {
        location = `${venueAddress}, ${venueCity}`;
      } else if (venue?.name) {
        location = venue.name;
      }
      
      // Extraire la meilleure image
      let coverImage: string | undefined;
      if (event.images && event.images.length > 0) {
        const image16_9 = event.images.find((img: any) => 
          img.ratio === '16_9' && img.width >= 1000
        );
        coverImage = image16_9?.url || event.images[0]?.url;
      }
      
      return {
        id: event.id,
        title: event.name || 'Événement',
        description: event.info || event.description || event.pleaseNote || '',
        startDate,
        endDate,
        location,
        venueName: venue?.name,
        coverImage,
        isFree: event.priceRanges?.[0]?.min === 0 || false,
        price: event.priceRanges?.[0]?.min,
        source: 'ticketmaster',
        category: category as EventCategory | undefined,
      };
    });
    
  } catch (error: any) {
    console.error('Erreur Ticketmaster API:', {
      message: error?.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
    });
    
    if (error?.config) {
      console.error('Config de la requête:', {
        url: error.config.url,
        params: error.config.params,
      });
    }
    
    return [];
  }
}

/**
 * Fonction de test simple pour vérifier l'API
 */
export async function testTicketmasterAPI(): Promise<void> {
  console.log('Test de l\'API Ticketmaster...');
  
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    console.error('TICKETMASTER_API_KEY manquante');
    return;
  }
  
  try {
    const url = 'https://app.ticketmaster.com/discovery/v2/events.json';
    const params = {
      apikey: apiKey,
      city: 'Paris',
      countryCode: 'FR',
      size: 10,
    };
    
    console.log('Test requête:', { url, params: { ...params, apikey: '***' } });
    
    const response = await axios.get(url, { params, timeout: 10000 });
    
    console.log('Réponse reçue:', {
      status: response.status,
      totalElements: response.data?.page?.totalElements,
      eventsCount: response.data?._embedded?.events?.length || 0,
    });
    
    if (response.data?._embedded?.events?.[0]) {
      const firstEvent = response.data._embedded.events[0];
      console.log('Premier événement:', {
        id: firstEvent.id,
        name: firstEvent.name,
        date: firstEvent.dates?.start?.localDate,
      });
    }
    
  } catch (error: any) {
    console.error('Erreur lors du test:', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
  }
}