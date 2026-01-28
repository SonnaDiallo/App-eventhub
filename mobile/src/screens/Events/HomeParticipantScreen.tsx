import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AuthStackParamList, EventData } from '../../navigation/AuthNavigator';

import type { QueryDocumentSnapshot, QuerySnapshot } from 'firebase/firestore';
import { Timestamp, collection, onSnapshot, orderBy, query as fsQuery } from 'firebase/firestore';

import { db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';
import { getDefaultCategories } from '../../services/categories';

type Props = NativeStackScreenProps<AuthStackParamList, 'HomeParticipant'>;

const HomeParticipantScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);
  const categories = getDefaultCategories();

  useEffect(() => {
    setLoading(true);
    // Exclure les événements de Paris Open Data (source: 'paris_opendata')
    const q = fsQuery(
      collection(db, 'events'), 
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(
      q,
      (snap: QuerySnapshot) => {
        const now = new Date();
        const mapped = snap.docs
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

          const isFree = !!data.isFree;
          const price = typeof data.price === 'number' ? data.price : 0;

          return {
            id: d.id,
            title: data.title || 'Sans titre',
            coverImage:
              data.coverImage ||
              'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800',
            date: formatDate(start),
            time: formatTime(start, end),
            location: data.location || '',
            address: data.location || '',
            organizer: data.organizerName || 'Organisateur',
            description: data.description || '',
            price,
            isFree,
            category: data.category || null, // Ajouter la catégorie depuis Firestore
          } as EventData;
        });
        setEvents(mapped);
        setLoading(false);
      },
      (err: any) => {
        console.error('Firestore events error', err?.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

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
    
    return result;
  }, [events, searchQuery, selectedCategory]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View
        style={{
          backgroundColor: theme.header,
          paddingTop: 54,
          paddingBottom: 14,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: theme.text, fontWeight: '900', fontSize: 18 }}>Événements</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flex: 1, marginLeft: 12 }}>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.inputBackground,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 12,
                paddingVertical: 8,
                maxWidth: 200,
              }}
            >
              <Ionicons name="search" size={16} color={theme.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher..."
                placeholderTextColor={theme.inputPlaceholder}
                style={{ color: theme.text, flex: 1, marginLeft: 8, fontSize: 14 }}
              />
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile' as never)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
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
        <Text style={{ color: theme.textMuted, marginTop: 6 }}>Trouve et rejoins les meilleurs événements.</Text>
      </View>

      {/* Filtre par catégorie */}
      <View
        style={{
          backgroundColor: theme.header,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor: selectedCategory === null ? theme.primary : theme.surface,
              borderWidth: 1,
              borderColor: selectedCategory === null ? theme.primary : theme.border,
            }}
          >
            <Text
              style={{
                color: selectedCategory === null ? '#FFFFFF' : theme.text,
                fontWeight: '600',
                fontSize: 13,
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
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: selectedCategory === category.id ? theme.primary : theme.surface,
                borderWidth: 1,
                borderColor: selectedCategory === category.id ? theme.primary : theme.border,
              }}
            >
              <Text
                style={{
                  color: selectedCategory === category.id ? '#FFFFFF' : theme.text,
                  fontWeight: '600',
                  fontSize: 13,
                }}
              >
                {category.nameFr}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 22 }}
        renderItem={({ item }) => {
          const priceLabel = item.isFree ? 'Gratuit' : `${item.price.toFixed(2)} €`;
          return (
            <TouchableOpacity
              onPress={() => navigation.navigate('EventDetails', { event: item })}
              style={{
                backgroundColor: theme.card,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 14,
                overflow: 'hidden',
              }}
            >
              <Image source={{ uri: item.coverImage }} style={{ width: '100%', height: 160 }} />

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
        }}
        ListEmptyComponent={
          loading ? (
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={{ color: theme.textMuted, marginTop: 16 }}>Chargement des événements...</Text>
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 50, paddingHorizontal: 32 }}>
              <Ionicons name="calendar-outline" size={64} color={theme.textMuted} style={{ opacity: 0.3 }} />
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 18, marginTop: 20, textAlign: 'center' }}>
                {searchQuery || selectedCategory ? 'Aucun événement trouvé' : 'Aucun événement disponible'}
              </Text>
              <Text style={{ color: theme.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                {searchQuery || selectedCategory
                  ? selectedCategory
                    ? `Aucun événement dans la catégorie "${categories.find(c => c.id === selectedCategory)?.nameFr || selectedCategory}". Essayez une autre catégorie.`
                    : 'Essayez avec d\'autres mots-clés ou réessayez plus tard.'
                  : 'Pour synchroniser des événements depuis Ticketmaster :\n\n1. Configurez TICKETMASTER_API_KEY dans backend/.env\n2. Appelez POST /api/events/sync/external\n3. Les événements apparaîtront automatiquement ici'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

export default HomeParticipantScreen;
