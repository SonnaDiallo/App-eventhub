import axios from 'axios';

/**
 * Récupère une image depuis Unsplash API basée sur une requête de recherche
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
 * Détermine la requête de recherche d'image basée sur le titre de l'événement
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
