import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import QRCode from 'react-native-qrcode-svg';
import { auth, db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';
import { leaveEvent } from '../../services/eventsService';

interface Ticket {
  id: string;
  code: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  ticketType: string;
  checkedIn: boolean;
  checkedInAt: Date | null;
}

const MyTicketsScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const user = auth.currentUser;

  const handleCancelReservation = async (ticket: Ticket) => {
    Alert.alert(
      'Annuler la réservation',
      `Es-tu sûr de vouloir annuler ta réservation pour "${ticket.eventTitle}" ? Ton billet sera supprimé.`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await deleteDoc(doc(db, 'tickets', ticket.id));
              const isMongoId = /^[a-f0-9]{24}$/i.test(ticket.eventId);
              if (isMongoId) {
                try {
                  await leaveEvent(ticket.eventId);
                } catch {
                  // Ignorer si l'événement n'est pas dans MongoDB
                }
              }
              setSelectedTicket(null);
              Alert.alert('Réservation annulée', 'Ton billet a été supprimé.');
            } catch (error: any) {
              console.error('Cancel ticket error:', error);
              Alert.alert('Erreur', 'Impossible d\'annuler la réservation. Réessaie.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('userId', '==', user.uid)
      // On enlève orderBy pour éviter l'erreur d'index, on triera côté client
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ticketsList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            code: data.code,
            eventId: data.eventId,
            eventTitle: data.eventTitle,
            eventDate: data.eventDate,
            eventTime: data.eventTime,
            eventLocation: data.eventLocation,
            ticketType: data.ticketType,
            checkedIn: data.checkedIn || false,
            checkedInAt: data.checkedInAt?.toDate?.() || null,
            createdAt: data.createdAt?.toDate?.() || data.purchasedAt?.toDate?.() || new Date(0),
          } as Ticket & { createdAt: Date };
        });
        
        // Trier côté client par date de création (plus récent en premier)
        ticketsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setTickets(ticketsList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching tickets:', error);
        setLoading(false);
        // Afficher un message d'erreur plus user-friendly
        Alert.alert('Erreur', 'Impossible de charger les billets. Vérifiez votre connexion.');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const renderTicket = ({ item }: { item: Ticket }) => (
    <TouchableOpacity
      onPress={() => setSelectedTicket(item)}
      style={{
        backgroundColor: theme.card,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 14,
        overflow: 'hidden',
      }}
    >
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>
              {item.eventTitle}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="calendar-outline" size={14} color={theme.primary} />
              <Text style={{ color: theme.textSecondary, marginLeft: 8, fontSize: 13 }}>{item.eventDate}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="time-outline" size={14} color={theme.primary} />
              <Text style={{ color: theme.textSecondary, marginLeft: 8, fontSize: 13 }}>{item.eventTime}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location-outline" size={14} color={theme.primary} />
              <Text style={{ color: theme.textSecondary, marginLeft: 8, fontSize: 13 }}>{item.eventLocation}</Text>
            </View>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <View style={{ backgroundColor: '#ffffff', padding: 6, borderRadius: 8 }}>
              <QRCode value={item.code} size={50} />
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 6, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
              {item.code}
            </Text>
          </View>
        </View>

        <View
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                backgroundColor: item.checkedIn ? `${theme.accent}26` : `${theme.primary}26`,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: item.checkedIn ? theme.accent : theme.primary, fontSize: 11, fontWeight: '700' }}>
                {item.checkedIn ? 'Utilisé ✓' : item.ticketType}
              </Text>
            </View>
          </View>
          <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>Voir le billet →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18 }}>Mes billets</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : tickets.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Ionicons name="ticket-outline" size={64} color={theme.textMuted} />
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 18, marginTop: 16 }}>
            Aucun billet
          </Text>
          <Text style={{ color: theme.textMuted, textAlign: 'center', marginTop: 8 }}>
            Inscris-toi à un événement pour obtenir ton premier billet !
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('HomeParticipant')}
            style={{
              marginTop: 20,
              backgroundColor: theme.primary,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: theme.buttonPrimaryText, fontWeight: '700' }}>Voir les événements</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          contentContainerStyle={{ padding: 16 }}
        />
      )}

      {/* Modal détail du billet */}
      <Modal
        visible={!!selectedTicket}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTicket(null)}
      >
        <View style={{ flex: 1, backgroundColor: theme.overlay, justifyContent: 'center', padding: 20 }}>
          {selectedTicket && (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 26,
              padding: 24,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <TouchableOpacity
              onPress={() => setSelectedTicket(null)}
              style={{ position: 'absolute', top: 16, right: 16, padding: 8, zIndex: 10 }}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>

            <Text style={{ color: theme.text, fontWeight: '900', fontSize: 20, textAlign: 'center', marginBottom: 20 }}>
              {selectedTicket?.eventTitle}
            </Text>

            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ backgroundColor: '#ffffff', padding: 16, borderRadius: 16 }}>
                {selectedTicket?.code ? (
                  <QRCode value={selectedTicket.code} size={160} />
                ) : (
                  <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="ticket-outline" size={64} color={theme.textMuted} />
                  </View>
                )}
              </View>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 24,
                  fontWeight: '900',
                  marginTop: 16,
                  letterSpacing: 4,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                }}
              >
                {selectedTicket?.code}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                Présente ce QR code à l'entrée
              </Text>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="calendar-outline" size={16} color={theme.primary} />
                <Text style={{ color: theme.textSecondary, marginLeft: 10 }}>{selectedTicket?.eventDate}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="time-outline" size={16} color={theme.primary} />
                <Text style={{ color: theme.textSecondary, marginLeft: 10 }}>{selectedTicket?.eventTime}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location-outline" size={16} color={theme.primary} />
                <Text style={{ color: theme.textSecondary, marginLeft: 10 }}>{selectedTicket?.eventLocation}</Text>
              </View>
            </View>

            {selectedTicket?.checkedIn && (
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: `${theme.accent}26`,
                  padding: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: theme.accent, fontWeight: '700' }}>
                  ✓ Billet déjà utilisé
                </Text>
              </View>
            )}

            {!selectedTicket?.checkedIn && (
              <TouchableOpacity
                onPress={() => selectedTicket && handleCancelReservation(selectedTicket)}
                disabled={cancelling}
                style={{
                  marginTop: 16,
                  backgroundColor: `${theme.error}18`,
                  paddingVertical: 12,
                  borderRadius: 999,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: theme.error,
                }}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color={theme.error} />
                ) : (
                  <Text style={{ color: theme.error, fontWeight: '700' }}>Annuler la réservation</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setSelectedTicket(null)}
              style={{
                marginTop: 12,
                backgroundColor: theme.primary,
                paddingVertical: 14,
                borderRadius: 999,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.buttonPrimaryText, fontWeight: '700' }}>Fermer</Text>
            </TouchableOpacity>
          </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default MyTicketsScreen;
