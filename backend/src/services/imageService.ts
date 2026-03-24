/**
 * @module imageService
 * @description Service de recherche et résolution d'images pour les événements.
 *
 * Lorsqu'un événement est créé ou importé sans image de couverture, ce service
 * interroge l'API Unsplash pour trouver une photo libre de droits correspondant
 * au thème de l'événement. La recherche est guidée par `getImageSearchQuery` qui
 * traduit le titre de l'événement en termes de recherche anglais optimisés pour
 * Unsplash (meilleur rappel qu'avec des mots français).
 *
 * @datasource Unsplash API — nécessite `UNSPLASH_ACCESS_KEY` en env
 * @see categoryService — utilise `getImageSearchQuery` pour la détection de catégorie
 *
 * @exports getImageFromUnsplash  — récupère une photo Unsplash pour un terme donné
 * @exports getImageSearchQuery   — convertit un titre d'événement en termes de recherche
 */
import axios from 'axios';

/**
 * Interroge l'API Unsplash pour obtenir une image paysage correspondant à la requête.
 *
 * On ne demande qu'un seul résultat (`per_page=1`) en orientation paysage car les
 * cartes d'événements sur le mobile utilisent un ratio large. En cas d'échec réseau
 * ou de clé manquante, retourne `null` silencieusement pour ne pas bloquer le flux
 * de création d'événement.
 *
 * @param {string} query — termes de recherche (en anglais de préférence pour un meilleur rappel)
 * @returns {Promise<string | null>} URL de l'image au format `regular` (1080px), ou `null`
 */
export async function getImageFromUnsplash(query: string): Promise<string | null> {
  try {
    const unsplashApiKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!unsplashApiKey) {
      console.warn('UNSPLASH_ACCESS_KEY not set, skipping Unsplash image fetch');
      return null;
    }

    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
    const unsplashResponse = await axios.get(unsplashUrl, {
      headers: {
        'Authorization': `Client-ID ${unsplashApiKey}`,
      },
    });

    if (unsplashResponse.data?.results?.[0]?.urls?.regular) {
      return unsplashResponse.data.results[0].urls.regular;
    }
  } catch (error: any) {
    console.warn('Unsplash API error:', error?.message);
  }
  return null;
}

/**
 * Convertit le titre d'un événement en termes de recherche anglais pour Unsplash.
 *
 * L'algorithme détecte des mots-clés français et anglais dans le titre et retourne
 * une expression de recherche thématique en anglais. L'ordre des conditions va du
 * plus spécifique (yoga, théâtre) au plus général (tech, enfants) pour maximiser
 * la pertinence de la première correspondance. Si aucun mot-clé n'est reconnu,
 * le fallback "event gathering people" produit des résultats visuellement neutres.
 *
 * @param {string} title — titre de l'événement (insensible à la casse, FR ou EN)
 * @returns {string} Termes de recherche anglais optimisés pour Unsplash
 */
export function getImageSearchQuery(title: string): string {
  const titleLower = title.toLowerCase();
  
  // Catégories thématiques (du plus spécifique au plus général)
  if (titleLower.includes('yoga') || titleLower.includes('méditation') || titleLower.includes('meditation')) {
    return 'yoga meditation event';
  } else if (titleLower.includes('théâtre') || titleLower.includes('theatre') || titleLower.includes('spectacle')) {
    return 'theater performance event';
  } else if (titleLower.includes('concert') || titleLower.includes('musique') || titleLower.includes('music') || titleLower.includes('festival')) {
    return 'concert music festival';
  } else if (titleLower.includes('conférence') || titleLower.includes('conference') || titleLower.includes('talk')) {
    return 'conference business event';
  } else if (titleLower.includes('sport') || titleLower.includes('fitness') || titleLower.includes('marathon') || titleLower.includes('run')) {
    return 'sport fitness event';
  } else if (titleLower.includes('art') || titleLower.includes('exposition') || titleLower.includes('exhibition') || titleLower.includes('gallery')) {
    return 'art exhibition gallery';
  } else if (titleLower.includes('danse') || titleLower.includes('dance') || titleLower.includes('ballet')) {
    return 'dance performance event';
  } else if (titleLower.includes('atelier') || titleLower.includes('workshop') || titleLower.includes('formation')) {
    return 'workshop learning event';
  } else if (titleLower.includes('food') || titleLower.includes('cuisine') || titleLower.includes('restaurant') || titleLower.includes('gastronomie')) {
    return 'food culinary event';
  } else if (titleLower.includes('tech') || titleLower.includes('technologie') || titleLower.includes('startup') || titleLower.includes('innovation')) {
    return 'technology startup event';
  } else if (titleLower.includes('enfant') || titleLower.includes('kid') || titleLower.includes('children') || titleLower.includes('family')) {
    return 'family children event';
  } else {
    return 'event gathering people';
  }
}
