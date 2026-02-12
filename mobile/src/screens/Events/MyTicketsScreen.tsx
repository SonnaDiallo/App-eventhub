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
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

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

  const renderTicket = ({ item }: { item: Ticket }) => {
    return (
      <TouchableOpacity
        onPress={() => setSelectedTicket(item)}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
          overflow: 'hidden',
        }}
      >
        {/* Logo EventHub */}
        <View style={{
          alignItems: 'center',
          paddingTop: 24,
          paddingBottom: 16,
        }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#7B5CFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="calendar" size={24} color="#FFFFFF" />
          </View>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#000000',
            marginTop: 8,
          }}>
            EventHub
          </Text>
        </View>

        {/* QR Code */}
        <View style={{
          alignItems: 'center',
          paddingVertical: 20,
          backgroundColor: '#F8F9FA',
          marginHorizontal: 20,
          borderRadius: 16,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            padding: 16,
            borderRadius: 12,
          }}>
            <QRCode value={item.code} size={120} />
          </View>
        </View>

        {/* Ligne pointillée */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          marginVertical: 20,
        }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 4,
                height: 1,
                backgroundColor: '#D1D5DB',
                marginRight: 4,
              }}
            />
          ))}
        </View>

        {/* Infos événement */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '700',
            color: '#000000',
            marginBottom: 16,
          }}>
            {item.eventTitle}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#F5F3FF',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="calendar-outline" size={16} color="#7B5CFF" />
            </View>
            <Text style={{ fontSize: 14, color: '#6C757D' }}>
              {item.eventDate} · {item.eventTime}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#F5F3FF',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="location-outline" size={16} color="#7B5CFF" />
            </View>
            <Text style={{ fontSize: 14, color: '#6C757D', flex: 1 }}>
              {item.eventLocation}
            </Text>
          </View>

          {/* Badge et code */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: item.checkedIn ? '#EF4444' : '#10B981',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '700',
                color: '#FFFFFF',
                letterSpacing: 0.5,
              }}>
                {item.checkedIn ? '✓ UTILISÉ' : '✓ BILLET VALIDE'}
              </Text>
            </View>
            <Text style={{
              fontSize: 13,
              fontWeight: '600',
              color: '#9CA3AF',
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            }}>
              #{item.code}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const upcomingTickets = tickets.filter(ticket => {
    if (!ticket.eventDate) return true;
    try {
      const dateParts = ticket.eventDate.split('/');
      let eventDate: Date;
      if (dateParts.length === 3) {
        eventDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
      } else {
        eventDate = new Date(ticket.eventDate);
      }
      if (ticket.eventTime) {
        const [hours, minutes] = ticket.eventTime.split(':');
        eventDate.setHours(parseInt(hours), parseInt(minutes));
      }
      return eventDate >= new Date();
    } catch {
      return true;
    }
  });

  const pastTickets = tickets.filter(ticket => !upcomingTickets.includes(ticket));
  const displayedTickets = activeTab === 'upcoming' ? upcomingTickets : pastTickets;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          paddingTop: Platform.OS === 'ios' ? 60 : 20,
          paddingBottom: 16,
          paddingHorizontal: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={{ color: '#000000', fontWeight: '700', fontSize: 20, textAlign: 'center', flex: 1, marginRight: 40 }}>Mes Billets</Text>
      </View>

      {/* Onglets */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
      }}>
        <TouchableOpacity
          onPress={() => setActiveTab('upcoming')}
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            borderBottomWidth: 3,
            borderBottomColor: activeTab === 'upcoming' ? '#7B5CFF' : 'transparent',
            marginRight: 8,
          }}
        >
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: activeTab === 'upcoming' ? '#7B5CFF' : '#9CA3AF',
          }}>
            À venir
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('past')}
          style={{
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            borderBottomWidth: 3,
            borderBottomColor: activeTab === 'past' ? '#7B5CFF' : 'transparent',
            marginLeft: 8,
          }}
        >
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: activeTab === 'past' ? '#7B5CFF' : '#9CA3AF',
          }}>
            Passés
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7B5CFF" />
        </View>
      ) : displayedTickets.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Ionicons name="ticket-outline" size={64} color="#9CA3AF" />
          <Text style={{ color: '#000000', fontWeight: '700', fontSize: 18, marginTop: 16 }}>
            Aucun billet {activeTab === 'upcoming' ? 'à venir' : 'passé'}
          </Text>
          <Text style={{ color: '#6C757D', textAlign: 'center', marginTop: 8 }}>
            {activeTab === 'upcoming' 
              ? 'Inscris-toi à un événement pour obtenir ton premier billet !'
              : 'Tes billets passés apparaîtront ici.'}
          </Text>
          {activeTab === 'upcoming' && (
            <TouchableOpacity
              onPress={() => navigation.navigate('HomeParticipant')}
              style={{
                marginTop: 20,
                backgroundColor: '#7B5CFF',
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Voir les événements</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={displayedTickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        />
      )}

      {/* Modal détail du billet */}
      <Modal
        visible={!!selectedTicket}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTicket(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: 20 }}>
          {selectedTicket && (
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 26,
              padding: 24,
            }}
          >
            <TouchableOpacity
              onPress={() => setSelectedTicket(null)}
              style={{ position: 'absolute', top: 16, right: 16, padding: 8, zIndex: 10 }}
            >
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>

            <Text style={{ color: '#000000', fontWeight: '900', fontSize: 20, textAlign: 'center', marginBottom: 20 }}>
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
                  color: '#000000',
                  fontSize: 24,
                  fontWeight: '900',
                  marginTop: 16,
                  letterSpacing: 4,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                }}
              >
                {selectedTicket?.code}
              </Text>
              <Text style={{ color: '#6C757D', fontSize: 12, marginTop: 4 }}>
                Présente ce QR code à l'entrée
              </Text>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="calendar-outline" size={16} color="#7B5CFF" />
                <Text style={{ color: '#6C757D', marginLeft: 10 }}>{selectedTicket?.eventDate}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Ionicons name="time-outline" size={16} color="#7B5CFF" />
                <Text style={{ color: '#6C757D', marginLeft: 10 }}>{selectedTicket?.eventTime}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location-outline" size={16} color="#7B5CFF" />
                <Text style={{ color: '#6C757D', marginLeft: 10 }}>{selectedTicket?.eventLocation}</Text>
              </View>
            </View>

            {selectedTicket?.checkedIn && (
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: '#FEE2E2',
                  padding: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#EF4444', fontWeight: '700' }}>
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
                  backgroundColor: '#FEE2E2',
                  paddingVertical: 12,
                  borderRadius: 999,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#EF4444',
                }}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Text style={{ color: '#EF4444', fontWeight: '700' }}>Annuler la réservation</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setSelectedTicket(null)}
              style={{
                marginTop: 12,
                backgroundColor: '#7B5CFF',
                paddingVertical: 14,
                borderRadius: 999,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Fermer</Text>
            </TouchableOpacity>
          </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default MyTicketsScreen;
