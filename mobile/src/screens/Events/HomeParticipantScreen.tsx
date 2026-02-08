import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View, Dimensions, Platform, Modal, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList, EventData } from '../../navigation/AuthNavigator';

import type { QueryDocumentSnapshot, QuerySnapshot } from 'firebase/firestore';
import { Timestamp, collection, onSnapshot, orderBy, query as fsQuery } from 'firebase/firestore';

import { db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';
import { getDefaultCategories, Category } from '../../services/categories';
import { getEvents } from '../../services/eventsService';
import { useUserRole, canCreateEvents } from '../../hooks/useUserRole';

const { width } = Dimensions.get('window');

// Helper pour obtenir l'icône de catégorie
const getCategoryIcon = (categoryId: string): string => {
  const iconMap: Record<string, string> = {
    music: 'musical-notes',
    sports: 'football',
    arts: 'color-palette',
    food: 'restaurant',
    technology: 'laptop',
    business: 'briefcase',
    education: 'school',
    health: 'fitness',
    family: 'people',
    other: 'ellipse',
  };
  return iconMap[categoryId] || 'ellipse';
};

// Helper pour obtenir le nom de catégorie depuis l'ID
const getCategoryName = (categoryId: string | null, categories: Category[]): string => {
  if (!categoryId) return '';
  const category = categories.find(c => c.id === categoryId);
  return category?.nameFr || '';
};

/** Images de remplacement par catégorie (Unsplash, libres d’usage) – thème logique selon le type d’événement */
const CATEGORY_PLACEHOLDER_IMAGES: Record<string, string[]> = {
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

/** Hash simple pour choisir une image de façon déterministe selon l’id */
const simpleHash = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/** Image de remplacement selon la catégorie (choix déterministe par eventId) */
const getPlaceholderImageForEvent = (eventId: string, categoryId: string | null): string => {
  const key = categoryId && CATEGORY_PLACEHOLDER_IMAGES[categoryId] ? categoryId : 'other';
  const urls = CATEGORY_PLACEHOLDER_IMAGES[key] ?? DEFAULT_PLACEHOLDER_IMAGES;
  const index = simpleHash(String(eventId)) % urls.length;
  return urls[index];
};

/** Placeholder garanti unique : choisit une URL pas encore utilisée, sinon Picsum par id */
const getUniquePlaceholderForEvent = (
  eventId: string,
  categoryId: string | null,
  seenNormalizedUrls: Set<string>
): string => {
  const norm = (u: string) => {
    const s = (u || '').trim().split('?')[0].toLowerCase().slice(0, 300);
    return s || '';
  };
  const key = categoryId && CATEGORY_PLACEHOLDER_IMAGES[categoryId] ? categoryId : 'other';
  const urls = CATEGORY_PLACEHOLDER_IMAGES[key] ?? DEFAULT_PLACEHOLDER_IMAGES;
  const start = simpleHash(String(eventId)) % urls.length;
  for (let i = 0; i < urls.length; i++) {
    const candidate = urls[(start + i) % urls.length];
    const n = norm(candidate);
    if (n && !seenNormalizedUrls.has(n)) return candidate;
  }
  return `https://picsum.photos/seed/${encodeURIComponent(String(eventId))}/800/400`;
};

/** Normalise une URL d'image pour détecter les doublons (sans query params) */
const normalizeImageUrlForDedup = (url: string): string => {
  const u = (url || '').trim();
  if (!u) return '';
  try {
    return u.split('?')[0].toLowerCase().slice(0, 300);
  } catch {
    return u.toLowerCase().slice(0, 300);
  }
};

/** Remplace les images en double par un placeholder différent pour chaque événement */
function ensureUniqueImages<T extends EventData & { _startDate?: Date; source?: string }>(events: T[]): T[] {
  const seenImageUrls = new Set<string>();
  return events.map((e) => {
    const rawUrl = e.coverImage || '';
    const url = normalizeImageUrlForDedup(rawUrl);
    const id = (e.id ?? '').toString();
    if (url && seenImageUrls.has(url)) {
      const uniquePlaceholder = getUniquePlaceholderForEvent(id, e.category ?? null, seenImageUrls);
      seenImageUrls.add(normalizeImageUrlForDedup(uniquePlaceholder));
      return { ...e, coverImage: uniquePlaceholder };
    }
    if (url) seenImageUrls.add(url);
    return e;
  });
}

type Props = NativeStackScreenProps<AuthStackParamList, 'HomeParticipant'>;

type SortOption = 'date' | 'price-asc' | 'price-desc' | 'title';

/** Copie sérialisable de l'événement pour la navigation (évite l'avertissement non-serializable) */
const eventForNav = (e: EventData & { _startDate?: Date; source?: string }) => {
  const { _startDate, ...rest } = e;
  return { ...rest };
};

const HomeParticipantScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const userRole = useUserRole();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);
  const categories = getDefaultCategories();

  // Fonction pour formater les dates
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatDate = (dt?: Date) => {
    if (!dt) return '';
    return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };
  const formatTime = (a?: Date, b?: Date) => {
    if (!a) return '';
    const aa = `${pad(a.getHours())}:${pad(a.getMinutes())}`;
    const bb = b ? `${pad(b.getHours())}:${pad(b.getMinutes())}` : '';
    return bb ? `${aa} - ${bb}` : aa;
  };

  // Charger les événements depuis l'API (MongoDB + Ticketmaster en un seul appel) et Firestore (locaux)
  useEffect(() => {
    let unsub: (() => void) | null = null;
    let isMounted = true;

    const loadAllEvents = async () => {
      setLoading(true);
      const allEvents: (EventData & { _startDate?: Date })[] = [];

      // 1. Un seul appel backend : MongoDB (créés sur la plateforme) + Ticketmaster (externe)
      try {
        const response = await getEvents({
          page: 1,
          limit: 50,
          category: selectedCategory || undefined,
          search: searchQuery || undefined,
          includeExternal: true,
          upcoming: true,
        });

        const apiEvents = (response.events || []).map((event: any) => {
          const startDate = event.startDate ? new Date(event.startDate) : undefined;
          const endDate = event.endDate ? new Date(event.endDate) : undefined;
          return {
            id: event.id,
            title: event.title || 'Sans titre',
            coverImage: event.coverImage || getPlaceholderImageForEvent(event.id, event.category ?? null),
            date: formatDate(startDate),
            time: formatTime(startDate, endDate),
            location: event.location || '',
            address: event.location || '',
            organizer: event.organizerName || 'Organisateur',
            description: event.description || '',
            price: event.price ?? 0,
            isFree: event.isFree ?? false,
            category: event.category || null,
            _startDate: startDate,
            source: event.source === 'ticketmaster' ? 'external' : 'local',
          } as EventData & { _startDate?: Date; source?: string };
        });

        const seenIds = new Set<string>();
        apiEvents.forEach((e: EventData & { _startDate?: Date }) => {
          if (!seenIds.has(e.id)) {
            seenIds.add(e.id);
            allEvents.push(e);
          }
        });
      } catch (error: any) {
        console.warn('Backend injoignable – affichage des événements Firestore uniquement.', error?.message);
        // Quand le backend est éteint, on affiche seulement Firestore (voir plus bas)
      }

      // 2. Charger les événements depuis Firestore (créés par les admins/organisateurs)
      const q = fsQuery(
        collection(db, 'events'), 
        orderBy('createdAt', 'desc')
      );
      
      unsub = onSnapshot(
        q,
        (snap: QuerySnapshot) => {
          if (!isMounted) return;

          const now = new Date();
          const localEvents = snap.docs
            .filter((d: QueryDocumentSnapshot) => {
              const data: any = d.data();
              // Filtrer les événements de Paris Open Data
              if (data.source === 'paris_opendata' || 
                  data.organizerName?.includes('Ville de Paris - Que faire à Paris')) {
                return false;
              }
              // Filtrer les événements passés
              if (data.startDate) {
                const startDate = data.startDate instanceof Timestamp 
                  ? data.startDate.toDate() 
                  : new Date(data.startDate);
                if (startDate < now) {
                  return false;
                }
              }
              return true;
            })
            .map((d: QueryDocumentSnapshot) => {
              const data: any = d.data();
              const start: Date | undefined = data.startDate instanceof Timestamp ? data.startDate.toDate() : undefined;
              const end: Date | undefined = data.endDate instanceof Timestamp ? data.endDate.toDate() : undefined;

              const isFree = !!data.isFree;
              const price = typeof data.price === 'number' ? data.price : 0;

              return {
                id: d.id,
                title: data.title || 'Sans titre',
                coverImage:
                  data.coverImage ||
                  getPlaceholderImageForEvent(d.id, data.category ?? null),
                date: formatDate(start),
                time: formatTime(start, end),
                location: data.location || '',
                address: data.location || '',
                organizer: data.organizerName || 'Organisateur',
                description: data.description || '',
                price,
                isFree,
                category: data.category || null,
                _startDate: start,
                source: 'local', // Marquer comme événement local
              } as EventData & { _startDate?: Date; source?: string };
            });

          // Combiner sans doublons : par id, par signature exacte, ET par "lieu + date + organisateur" (même événement, variantes de titre type PASS FAMILLE / BILLET DATE)
          const normalizeLocation = (loc: string) =>
            (loc || '').trim().toLowerCase().replace(/\s*,\s*/, ', ').slice(0, 80);
          const normalizeOrganizer = (o: string) =>
            (o || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 60);
          // Normaliser l'URL image (sans query params) pour que même image = même signature
          const normalizeImageUrl = (url: string) => {
            const u = (url || '').trim();
            if (!u) return '';
            try {
              const withoutQuery = u.split('?')[0];
              return withoutQuery.toLowerCase().slice(0, 200);
            } catch {
              return u.toLowerCase().slice(0, 200);
            }
          };
          const dateKey = (e: EventData & { _startDate?: Date }) =>
            e._startDate
              ? e._startDate.toISOString().slice(0, 16)
              : (e.date || '').trim().toLowerCase().slice(0, 30);
          const signature = (e: EventData & { _startDate?: Date }) => {
            const title = (e.title || '').trim().toLowerCase().slice(0, 120);
            const location = normalizeLocation(e.location || '');
            const image = normalizeImageUrl(e.coverImage || '');
            return `${title}|${dateKey(e)}|${location}|${image}`;
          };
          // Même lieu + même date + même organisateur = un seul événement (ex: GREVIN - PASS FAMILLE vs GREVIN - BILLET DATE)
          const venueSignature = (e: EventData & { _startDate?: Date }) => {
            const loc = normalizeLocation(e.location || '');
            const org = normalizeOrganizer(e.organizer || '');
            return `${loc}|${dateKey(e)}|${org}`;
          };
          const seenSignatures = new Set<string>();
          const seenVenueSignatures = new Set<string>();
          const seenIds = new Set<string>();
          const combinedEvents: (EventData & { _startDate?: Date; source?: string })[] = [];
          const isDuplicate = (e: EventData & { _startDate?: Date; source?: string }) => {
            const id = (e.id || '').toString();
            if (id && seenIds.has(id)) return true;
            if (seenSignatures.has(signature(e))) return true;
            if (seenVenueSignatures.has(venueSignature(e))) return true;
            return false;
          };
          const addEvent = (e: EventData & { _startDate?: Date; source?: string }) => {
            const id = (e.id || '').toString();
            if (id) seenIds.add(id);
            seenSignatures.add(signature(e));
            seenVenueSignatures.add(venueSignature(e));
            combinedEvents.push(e);
          };
          // D'abord les locaux (priorité)
          for (const e of localEvents) {
            if (isDuplicate(e)) continue;
            addEvent(e);
          }
          // Puis les externes (ignorer si déjà vu par id, signature ou lieu+date+organisateur)
          for (const e of allEvents) {
            if (isDuplicate(e)) continue;
            addEvent(e);
          }
          
          // Éviter qu'une même URL d'image soit affichée pour plusieurs événements
          setEvents(ensureUniqueImages(combinedEvents));
          setLoading(false);
        },
        (err: any) => {
          if (isMounted) {
            console.error('Firestore events error', err?.message);
            // Même en cas d'erreur Firestore, afficher les événements externes si disponibles
            setEvents(ensureUniqueImages(allEvents));
            setLoading(false);
          }
        }
      );
    };

    loadAllEvents();

    return () => {
      isMounted = false;
      if (unsub) {
        unsub();
      }
    };
  }, [selectedCategory, searchQuery]);

  const filtered = useMemo(() => {
    let result = events;
    
    // Filtrer par catégorie
    if (selectedCategory) {
      result = result.filter((e) => {
        return e.category === selectedCategory;
      });
    }
    
    // Filtrer par recherche textuelle
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((e) => {
        return (
          e.title.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.organizer.toLowerCase().includes(q)
        );
      });
    }
    
    // Trier les résultats
    const sorted = [...result];
    switch (sortBy) {
      case 'date':
        // Trier par date (les plus proches en premier)
        sorted.sort((a, b) => {
          const eventA = a as EventData & { _startDate?: Date };
          const eventB = b as EventData & { _startDate?: Date };
          // Utiliser la date originale si disponible, sinon parser la date formatée
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
  }, [events, searchQuery, selectedCategory, sortBy]);

  // Événement mis en avant (le premier de la liste)
  const featuredEvent = filtered.length > 0 ? filtered[0] : null;
  // Événements restants (sans le featured)
  const otherEvents = filtered.length > 1 ? filtered.slice(1) : [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 22 }}
      >
        {/* Header avec Logo EventHub */}
        <View
          style={{
            backgroundColor: theme.header,
            paddingTop: Platform.OS === 'ios' ? 54 : 20,
            paddingBottom: 16,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="flash" size={24} color={theme.primary} />
            <Text style={{ color: theme.text, fontWeight: '900', fontSize: 20 }}>EventHub</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Favorites' as never)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="heart-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('ChatList' as never)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chatbubble-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile' as never)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person-circle-outline" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Section */}
        <View
          style={{
            backgroundColor: theme.header,
            paddingTop: 24,
            paddingBottom: 32,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Gradient overlays */}
          <View
            style={{
              position: 'absolute',
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: theme.primary,
              opacity: 0.1,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: -100,
              left: -100,
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: theme.primary,
              opacity: 0.1,
            }}
          />

          <Text style={{ color: theme.text, fontWeight: '900', fontSize: 32, textAlign: 'center', marginTop: 8, marginBottom: 8 }}>
            Vivez les meilleurs
          </Text>
          <Text style={{ 
            color: theme.primary, 
            fontWeight: '900', 
            fontSize: 32,
            textAlign: 'center',
            marginBottom: 16,
          }}>
            événements
          </Text>

          <Text style={{ color: theme.textMuted, fontSize: 16, marginBottom: 24, lineHeight: 24, textAlign: 'center' }}>
            Concerts, festivals, conférences... Découvrez et réservez vos billets pour les événements les plus excitants du continent.
          </Text>

          {/* Search Bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.inputBackground,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 12,
              }}
            >
              <Ionicons name="search" size={20} color={theme.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher un événement, une ville..."
                placeholderTextColor={theme.inputPlaceholder}
                style={{ 
                  color: theme.text, 
                  flex: 1, 
                  fontSize: 15,
                }}
                onSubmitEditing={() => {
                  // La recherche se fait automatiquement via le filtre
                }}
              />
            </View>
            <TouchableOpacity
              onPress={() => setShowSortMenu(!showSortMenu)}
              style={{
                backgroundColor: theme.surface,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Ionicons name="options-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Menu de tri */}
          {showSortMenu && (
            <View
              style={{
                marginTop: 12,
                backgroundColor: theme.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                padding: 12,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14, marginBottom: 12 }}>
                Trier par
              </Text>
              <View style={{ gap: 8 }}>
                {[
                  { value: 'date' as SortOption, label: '📅 Date (plus proche)', icon: 'calendar-outline' },
                  { value: 'price-asc' as SortOption, label: '💰 Prix (croissant)', icon: 'arrow-up-outline' },
                  { value: 'price-desc' as SortOption, label: '💰 Prix (décroissant)', icon: 'arrow-down-outline' },
                  { value: 'title' as SortOption, label: '🔤 Titre (A-Z)', icon: 'text-outline' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setSortBy(option.value);
                      setShowSortMenu(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: sortBy === option.value ? theme.primary + '20' : 'transparent',
                    }}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={18} 
                      color={sortBy === option.value ? theme.primary : theme.textMuted} 
                    />
                    <Text
                      style={{
                        color: sortBy === option.value ? theme.primary : theme.text,
                        fontWeight: sortBy === option.value ? '700' : '500',
                        fontSize: 14,
                        marginLeft: 10,
                      }}
                    >
                      {option.label}
                    </Text>
                    {sortBy === option.value && (
                      <Ionicons name="checkmark" size={18} color={theme.primary} style={{ marginLeft: 'auto' }} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Featured Event */}
        {featuredEvent && (
          <View style={{ paddingHorizontal: 16, marginTop: 24, marginBottom: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  backgroundColor: theme.primary,
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="star" size={14} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  Événement à la une
                </Text>
              </View>
              {featuredEvent.category && (
                <View
                  style={{
                    backgroundColor: theme.surface,
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: '600', fontSize: 12 }}>
                    {getCategoryName(featuredEvent.category, categories)}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('EventDetails', { event: eventForNav(featuredEvent) })}
              style={{
                backgroundColor: theme.card,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: theme.border,
                overflow: 'hidden',
              }}
            >
              <View style={{ position: 'relative' }}>
                <Image 
                  source={{ uri: featuredEvent.coverImage }} 
                  style={{ width: '100%', height: 240 }} 
                  resizeMode="cover"
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: 20,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 24, marginBottom: 8 }}>
                    {featuredEvent.title}
                  </Text>
                  {featuredEvent.description && (
                    <Text 
                      style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14, marginBottom: 12, lineHeight: 20 }}
                      numberOfLines={2}
                    >
                      {featuredEvent.description}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{featuredEvent.date}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="location-outline" size={16} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 13 }}>{featuredEvent.location}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('EventDetails', { event: eventForNav(featuredEvent) })}
                      style={{
                        backgroundColor: theme.primary,
                        paddingVertical: 12,
                        paddingHorizontal: 24,
                        borderRadius: 999,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        flex: 1,
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                        Réserver maintenant
                      </Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 20 }}>
                        {featuredEvent.isFree ? 'Gratuit' : `${featuredEvent.price.toFixed(2)}`}
                      </Text>
                      {!featuredEvent.isFree && (
                        <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}>€</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Filtre par catégorie */}
        <View
          style={{
            backgroundColor: theme.header,
            paddingVertical: 16,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.border,
            marginTop: 24,
          }}
        >
          <View style={{ marginBottom: 12, paddingHorizontal: 16 }}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18, marginBottom: 4 }}>
              Événements à venir
            </Text>
            <Text style={{ color: theme.textMuted, fontSize: 14 }}>Découvrez ce qui vous attend</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 18,
                borderRadius: 20,
                backgroundColor: selectedCategory === null ? theme.primary : theme.surface,
                borderWidth: 1,
                borderColor: selectedCategory === null ? theme.primary : theme.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {selectedCategory === null && (
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              )}
              <Text
                style={{
                  color: selectedCategory === null ? '#FFFFFF' : theme.text,
                  fontWeight: '700',
                  fontSize: 14,
                }}
              >
                Tous
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 20,
                  backgroundColor: selectedCategory === category.id ? theme.primary : theme.surface,
                  borderWidth: 1,
                  borderColor: selectedCategory === category.id ? theme.primary : theme.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Ionicons 
                  name={getCategoryIcon(category.id) as any} 
                  size={14} 
                  color={selectedCategory === category.id ? '#FFFFFF' : theme.text} 
                />
                <Text
                  style={{
                    color: selectedCategory === category.id ? '#FFFFFF' : theme.text,
                    fontWeight: '700',
                    fontSize: 14,
                  }}
                >
                  {category.nameFr}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Events List */}
        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 50, paddingHorizontal: 16 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ color: theme.textMuted, marginTop: 16 }}>Chargement des événements...</Text>
          </View>
        ) : otherEvents.length === 0 && !featuredEvent ? (
          <View style={{ alignItems: 'center', marginTop: 50, paddingHorizontal: 32 }}>
            <Ionicons name="calendar-outline" size={64} color={theme.textMuted} style={{ opacity: 0.3 }} />
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 18, marginTop: 20, textAlign: 'center' }}>
              {searchQuery || selectedCategory ? 'Aucun événement trouvé' : 'Aucun événement disponible'}
            </Text>
            <Text style={{ color: theme.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
              {searchQuery || selectedCategory
                ? selectedCategory
                  ? `Aucun événement dans la catégorie "${categories.find(c => c.id === selectedCategory)?.nameFr || selectedCategory}". Essayez une autre catégorie.`
                  : 'Essayez avec d\'autres mots-clés ou réessayez plus tard.'
                : 'Les événements se chargent depuis le backend.\n\n• Démarre le backend : cd backend && npm run dev\n• Même WiFi et bonne IP dans api.ts\n• Pour Ticketmaster : TICKETMASTER_API_KEY dans backend/.env'}
            </Text>
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            {otherEvents.map((item) => {
          const priceLabel = item.isFree ? 'Gratuit' : `${item.price.toFixed(2)} €`;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => navigation.navigate('EventDetails', { event: eventForNav(item) })}
              style={{
                backgroundColor: theme.card,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 14,
                overflow: 'hidden',
              }}
            >
              <View style={{ position: 'relative' }}>
                <Image source={{ uri: item.coverImage }} style={{ width: '100%', height: 160 }} />
                {item.category && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      backgroundColor: theme.primary,
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 11 }}>
                      {getCategoryName(item.category, categories)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: theme.text, fontWeight: '900', fontSize: 16, flex: 1, paddingRight: 12 }}>
                    {item.title}
                  </Text>
                  <View
                    style={{
                      backgroundColor: `${theme.primary}26`,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: theme.border,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                    }}
                  >
                    <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 12 }}>{priceLabel}</Text>
                  </View>
                </View>

                <View style={{ height: 10 }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="calendar-outline" size={16} color={theme.primary} />
                  <Text style={{ color: theme.textSecondary }}>{item.date} · {item.time}</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <Ionicons name="location-outline" size={16} color={theme.primary} />
                  <Text style={{ color: theme.textSecondary }}>{item.location}</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <Ionicons name="person-outline" size={16} color={theme.primary} />
                  <Text style={{ color: theme.textMuted }}>Organisé par {item.organizer}</Text>
                </View>
              </View>
            </TouchableOpacity>
            );
            })}
          </View>
        )}

        {/* CTA Section - Créer un événement (visible uniquement pour organizer/admin) */}
        {!loading && canCreateEvents(userRole) && (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 32,
              marginBottom: 24,
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <View
              style={{
                backgroundColor: theme.primary,
                padding: 24,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 22, marginBottom: 8, textAlign: 'center' }}>
                Vous organisez un événement ?
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 15, marginBottom: 20, textAlign: 'center', lineHeight: 22 }}>
                Vendez vos billets sur notre plateforme et atteignez des milliers de personnes.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateEvent' as never)}
                style={{
                  backgroundColor: '#FFFFFF',
                  paddingVertical: 14,
                  paddingHorizontal: 28,
                  borderRadius: 999,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 16 }}>
                  Créer mon événement
                </Text>
                <Ionicons name="arrow-forward" size={18} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default HomeParticipantScreen;
