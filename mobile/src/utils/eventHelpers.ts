import type { EventData } from '../navigation/AuthNavigator';

export const CATEGORY_PLACEHOLDER_IMAGES: Record<string, string[]> = {
  music: [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80',
  ],
  sports: [
    'https://images.unsplash.com/photo-1461896836934-affe60773b0f?w=800&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  ],
  arts: [
    'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800&q=80',
    'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&q=80',
    'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&q=80',
  ],
  food: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  ],
  technology: [
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fd59fec8?w=800&q=80',
  ],
  business: [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
  ],
  education: [
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80',
  ],
  health: [
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    'https://images.unsplash.com/photo-1506126613408-044406db7570?w=800&q=80',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
  ],
  family: [
    'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80',
    'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80',
    'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=800&q=80',
  ],
  other: [
    'https://images.unsplash.com/photo-1523580494863-6fe30389c534?w=800&q=80',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
  ],
};

const DEFAULT_PLACEHOLDER_IMAGES = CATEGORY_PLACEHOLDER_IMAGES.other;

export const simpleHash = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const getPlaceholderImageForEvent = (eventId: string, categoryId: string | null): string => {
  const id = (categoryId || '').toLowerCase();
  const key = id && CATEGORY_PLACEHOLDER_IMAGES[id] ? id : 'other';
  const urls = CATEGORY_PLACEHOLDER_IMAGES[key] ?? DEFAULT_PLACEHOLDER_IMAGES;
  const index = simpleHash(String(eventId)) % urls.length;
  return urls[index];
};

export const getUniquePlaceholderForEvent = (
  eventId: string,
  categoryId: string | null,
  seenNormalizedUrls: Set<string>
): string => {
  const norm = (u: string) => {
    const s = (u || '').trim().split('?')[0].toLowerCase().slice(0, 300);
    return s || '';
  };
  const id = (categoryId || '').toLowerCase();
  const key = id && CATEGORY_PLACEHOLDER_IMAGES[id] ? id : 'other';
  const urls = CATEGORY_PLACEHOLDER_IMAGES[key] ?? DEFAULT_PLACEHOLDER_IMAGES;
  const start = simpleHash(String(eventId)) % urls.length;
  for (let i = 0; i < urls.length; i++) {
    const candidate = urls[(start + i) % urls.length];
    const n = norm(candidate);
    if (n && !seenNormalizedUrls.has(n)) return candidate;
  }
  return `https://picsum.photos/seed/${encodeURIComponent(String(eventId))}/800/400`;
};

/**
 * Normalise une URL pour la déduplication : même image = même clé.
 * - Supprime protocole (http/https) et query string
 * - Réduit sous-domaines CDN (s1.ticketm.net → ticketm.net)
 * - Décode les % pour que des URLs équivalentes matchent
 */
export const normalizeImageUrlForDedup = (url: string): string => {
  let u = (url || '').trim().toLowerCase();
  if (!u) return '';
  try {
    u = u.split('?')[0];
    try {
      u = decodeURIComponent(u);
    } catch {
      // garder u si decode échoue
    }
    u = u.replace(/^https?:\/\//, '');
    u = u.replace(/^[a-z0-9-]+\.(ticketm\.net|ticketmaster\.com|tmstatic\.com)/i, '$1');
    u = u.replace(/^[a-z0-9-]+\.(images\.unsplash\.com)/i, '$1');
    return u.slice(0, 500);
  } catch {
    return (url || '').toLowerCase().slice(0, 500);
  }
};

/** Clé spéciale pour les événements sans image (évite la même image vide partout) */
const EMPTY_IMAGE_KEY = '__no_image__';

export function ensureUniqueImages<T extends EventData & { _startDate?: Date; source?: string }>(events: T[]): T[] {
  const seenImageUrls = new Set<string>();
  return events.map((e) => {
    const rawUrl = (e.coverImage || '').trim();
    const url = rawUrl ? normalizeImageUrlForDedup(rawUrl) : EMPTY_IMAGE_KEY;
    const id = (e.id ?? '').toString();
    const isDuplicate = url && seenImageUrls.has(url);
    const isEmpty = !rawUrl;
    if (isDuplicate || isEmpty) {
      const uniquePlaceholder = getUniquePlaceholderForEvent(id, e.category ?? null, seenImageUrls);
      const placeholderNorm = normalizeImageUrlForDedup(uniquePlaceholder);
      seenImageUrls.add(placeholderNorm);
      if (url && url !== EMPTY_IMAGE_KEY) seenImageUrls.add(url);
      return { ...e, coverImage: uniquePlaceholder };
    }
    if (url) seenImageUrls.add(url);
    return e;
  });
}

export const formatDate = (dt?: Date): string => {
  if (!dt) return '';
  return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};

export const formatTime = (start?: Date, end?: Date): string => {
  if (!start) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const startTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const endTime = end ? `${pad(end.getHours())}:${pad(end.getMinutes())}` : '';
  return endTime ? `${startTime} - ${endTime}` : startTime;
};

export const eventForNav = (e: EventData & { _startDate?: Date; source?: string }) => {
  const { _startDate, ...rest } = e;
  return { ...rest };
};
