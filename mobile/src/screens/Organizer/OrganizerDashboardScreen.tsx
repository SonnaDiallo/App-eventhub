import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';

interface Event {
  id: string;
  title: string;
  capacity: number;
  price: number;
  isFree: boolean;
  organizerId?: string;
  isOwnEvent?: boolean;
}

interface Ticket {
  id: string;
  eventId: string;
  checkedIn: boolean;
  price: number;
  createdAt: Date;
}

const OrganizerDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;

  // Charger tous les événements (admin voit tout)
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const eventsRef = collection(db, 'events');
    // Charger tous les événements, pas seulement ceux de l'organisateur
    const q = query(eventsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eventsList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Sans titre',
            capacity: data.capacity || 100,
            price: data.price || 0,
            isFree: data.isFree || false,
            organizerId: data.organizerId || '',
            isOwnEvent: data.organizerId === user.uid, // Indicateur pour les événements créés par l'admin
          } as Event & { organizerId: string; isOwnEvent: boolean };
        });
        setEvents(eventsList);
        // Préférer sélectionner un événement créé par l'admin s'il y en a
        const ownEvent = eventsList.find(e => e.isOwnEvent);
        if (ownEvent && !selectedEventId) {
          setSelectedEventId(ownEvent.id);
        } else if (eventsList.length > 0 && !selectedEventId) {
          setSelectedEventId(eventsList[0].id);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching events:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Charger les billets pour l'événement sélectionné
  useEffect(() => {
    if (!selectedEventId) {
      setTickets([]);
      return;
    }

    const ticketsRef = collection(db, 'tickets');
    const q = query(ticketsRef, where('eventId', '==', selectedEventId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ticketsList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            eventId: data.eventId,
            checkedIn: data.checkedIn || false,
            price: data.price || 0,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          } as Ticket;
        });
        setTickets(ticketsList);
      },
      (error) => {
        console.error('Error fetching tickets:', error);
      }
    );

    return () => unsubscribe();
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  // Calculer les stats à partir des vraies données
  const stats = useMemo(() => {
    const ticketsSold = tickets.length;
    const capacity = selectedEvent?.capacity || 100;
    const checkedInCount = tickets.filter((t) => t.checkedIn).length;
    const checkInRate = ticketsSold > 0 ? Math.round((checkedInCount / ticketsSold) * 100) : 0;
    const revenue = tickets.reduce((sum, t) => sum + (t.price || 0), 0);

    // Billets des 7 derniers jours
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyTickets = tickets.filter((t) => t.createdAt >= oneWeekAgo).length;

    return {
      revenue,
      ticketsSold,
      capacity,
      participants: ticketsSold,
      checkedInCount,
      checkInRate,
      weeklyTickets,
    };
  }, [tickets, selectedEvent]);

  const Chart = () => {
    // Mini “sparkline” en pur View (pas de lib) — couleur accent (pas de vert)
    const bars = [18, 10, 16, 9, 20, 8, 17];
    const max = Math.max(...bars);

    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 14 }}>
        {bars.map((v, idx) => {
          const h = Math.max(12, Math.round((v / max) * 80));
          return (
            <View key={idx} style={{ alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: '100%',
                  height: h,
                  borderRadius: 999,
                  backgroundColor: `${theme.primary}2E`,
                  borderWidth: 1,
                  borderColor: `${theme.primary}47`,
                }}
              />
            </View>
          );
        })}
      </View>
    );
  };

  const StatCard = ({
    icon,
    label,
    value,
    sub,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    value: string;
    sub?: string;
  }) => {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.card,
          borderRadius: 18,
          padding: 14,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              backgroundColor: `${theme.primary}26`,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Ionicons name={icon} size={18} color={theme.primary} />
          </View>
          <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 12 }}>{label}</Text>
        </View>
        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 20 }}>{value}</Text>
        {!!sub && <Text style={{ color: theme.textMuted, marginTop: 4, fontSize: 12 }}>{sub}</Text>}
      </View>
    );
  };

  const QuickAction = ({
    icon,
    label,
    onPress,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
    onPress?: () => void;
  }) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          flex: 1,
          backgroundColor: theme.card,
          borderRadius: 18,
          paddingVertical: 16,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: theme.border,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 88,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: `${theme.primary}26`,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 10,
          }}
        >
          <Ionicons name={icon} size={20} color={theme.primary} />
        </View>
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12, textAlign: 'center' }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textMuted, marginTop: 16 }}>Chargement...</Text>
      </View>
    );
  }

  if (events.length === 0) {
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>

            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Tableau de bord</Text>

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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Ionicons name="calendar-outline" size={64} color={theme.textMuted} />
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 18, marginTop: 16 }}>
            Aucun événement
          </Text>
          <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 8 }}>
            Crée ton premier événement pour voir les statistiques ici.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateEvent')}
            style={{
              marginTop: 20,
              backgroundColor: theme.primary,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: theme.buttonPrimaryText, fontWeight: '700' }}>Créer un événement</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Tableau de bord</Text>

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

        <View style={{ marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => {
              if (events.length === 0) return;
              const currentIdx = events.findIndex((e) => e.id === selectedEventId);
              const nextIdx = (currentIdx + 1) % events.length;
              setSelectedEventId(events[nextIdx].id);
            }}
            style={{
              backgroundColor: theme.inputBackground,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              paddingVertical: 12,
              paddingHorizontal: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700' }}>
                {selectedEvent?.title || 'Aucun événement'}
              </Text>
              {selectedEvent?.isOwnEvent && (
                <Text style={{ color: theme.primary, fontSize: 11, marginTop: 2 }}>
                  ✓ Créé par vous
                </Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
          {events.length > 1 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                Appuie pour changer d'événement
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                {events.filter(e => e.isOwnEvent).length} créé(s) par vous
              </Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <StatCard icon="cash-outline" label="Revenus" value={`€${stats.revenue.toLocaleString('fr-FR')}`} />
          <StatCard
            icon="ticket-outline"
            label="Billets vendus"
            value={`${stats.ticketsSold}/${stats.capacity}`}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <StatCard icon="people-outline" label="Participants" value={`${stats.participants}`} />
          <StatCard icon="checkmark-circle-outline" label="Check-in" value={`${stats.checkInRate}%`} />
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 22,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>
            Ventes des 7 derniers jours
          </Text>
          <Text style={{ color: theme.text, fontWeight: '900', fontSize: 26, marginTop: 8 }}>
            {stats.weeklyTickets} billets
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Cette semaine</Text>
          </View>

          <Chart />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
              <Text key={d} style={{ color: theme.textMuted, fontSize: 11 }}>
                {d}
              </Text>
            ))}
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.card,
            borderRadius: 22,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>Taux de Check-in</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Mis à jour à l'instant</Text>
          </View>

          <View
            style={{
              marginTop: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 170,
                height: 170,
                borderRadius: 85,
                borderWidth: 14,
                borderColor: `${theme.text}1A`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  width: 170,
                  height: 170,
                  borderRadius: 85,
                  borderWidth: 14,
                  borderColor: `${theme.primary}A6`,
                  transform: [{ rotateZ: '-90deg' }],
                  borderLeftColor: `${theme.primary}33`,
                  borderBottomColor: `${theme.primary}33`,
                }}
              />

              <Text style={{ color: theme.text, fontWeight: '900', fontSize: 28 }}>{stats.checkInRate}%</Text>
              <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 12 }}>
                {stats.checkedInCount}/{stats.participants} participants
              </Text>
            </View>
          </View>
        </View>

        <Text style={{ color: theme.text, fontWeight: '900', fontSize: 14, marginBottom: 12 }}>
          Actions Rapides
        </Text>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
          <QuickAction
            icon="scan-outline"
            label="Scanner un billet"
            onPress={() => navigation.navigate('ScanTicket')}
          />
          <QuickAction
            icon="people-outline"
            label="Participants"
            onPress={() => {
              if (selectedEventId && selectedEvent) {
                navigation.navigate('ParticipantsOverview' as never, {
                  eventId: selectedEventId,
                  eventTitle: selectedEvent.title,
                });
              } else {
                Alert.alert('Erreur', 'Veuillez sélectionner un événement');
              }
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <QuickAction icon="notifications-outline" label="Notifications" />
          <QuickAction icon="globe-outline" label="Page publique" />
        </View>
      </ScrollView>
    </View>
  );
};

export default OrganizerDashboardScreen;
