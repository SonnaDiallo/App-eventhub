// mobile/src/screens/Organizer/EventPrivilegesScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  getDoc 
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

type EventPrivilegesRouteProp = RouteProp<{ params: { eventId: string } }, 'params'>;

interface Participant {
  id: string;
  userId: string;
  participantName: string;
  participantEmail: string;
}

interface EventPrivileges {
  canScanTickets: boolean;
  canManageParticipants: boolean;
  canSendAnnouncements: boolean;
}

const EventPrivilegesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<EventPrivilegesRouteProp>();
  const eventId = route.params?.eventId;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [privileges, setPrivileges] = useState<Record<string, EventPrivileges>>({});
  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState('');

  const currentUser = auth.currentUser;

  useEffect(() => {
    loadEventData();
    loadParticipants();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const ticketsRef = collection(db, 'tickets');
      const q = query(ticketsRef, where('eventId', '==', eventId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const firstTicket = snapshot.docs[0].data();
        setEventTitle(firstTicket.eventTitle || 'Événement');
      }
    } catch (error) {
      console.error('Error loading event data:', error);
    }
  };

  const loadParticipants = async () => {
    try {
      setLoading(true);
      
      const ticketsRef = collection(db, 'tickets');
      const q = query(ticketsRef, where('eventId', '==', eventId));
      const snapshot = await getDocs(q);

      const participantsList: Participant[] = [];
      const uniqueUserIds = new Set<string>();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userId && !uniqueUserIds.has(data.userId)) {
          uniqueUserIds.add(data.userId);
          participantsList.push({
            id: doc.id,
            userId: data.userId,
            participantName: data.participantName || 'Participant',
            participantEmail: data.participantEmail || '',
          });
        }
      });

      setParticipants(participantsList);

      const privilegesData: Record<string, EventPrivileges> = {};
      
      for (const participant of participantsList) {
        const privilegeDoc = await getDoc(
          doc(db, 'eventPrivileges', `${eventId}_${participant.userId}`)
        );
        
        if (privilegeDoc.exists()) {
          privilegesData[participant.userId] = privilegeDoc.data() as EventPrivileges;
        } else {
          privilegesData[participant.userId] = {
            canScanTickets: false,
            canManageParticipants: false,
            canSendAnnouncements: false,
          };
        }
      }

      setPrivileges(privilegesData);
    } catch (error) {
      console.error('Error loading participants:', error);
      Alert.alert('Erreur', 'Impossible de charger les participants');
    } finally {
      setLoading(false);
    }
  };

  const togglePrivilege = async (
    userId: string,
    privilegeType: keyof EventPrivileges
  ) => {
    try {
      const currentPrivileges = privileges[userId] || {
        canScanTickets: false,
        canManageParticipants: false,
        canSendAnnouncements: false,
      };

      const newPrivileges = {
        ...currentPrivileges,
        [privilegeType]: !currentPrivileges[privilegeType],
      };

      const hasAnyPrivilege = Object.values(newPrivileges).some(v => v === true);

      if (hasAnyPrivilege) {
        await setDoc(doc(db, 'eventPrivileges', `${eventId}_${userId}`), {
          eventId,
          userId,
          ...newPrivileges,
          updatedAt: new Date(),
          updatedBy: currentUser?.uid,
        });
      } else {
        await deleteDoc(doc(db, 'eventPrivileges', `${eventId}_${userId}`));
      }

      setPrivileges({
        ...privileges,
        [userId]: newPrivileges,
      });

      const privilegeLabels = {
        canScanTickets: 'Scanner les billets',
        canManageParticipants: 'Gérer les participants',
        canSendAnnouncements: 'Envoyer des annonces',
      };

      Alert.alert(
        'Succès',
        `Privilège "${privilegeLabels[privilegeType]}" ${
          newPrivileges[privilegeType] ? 'accordé' : 'révoqué'
        }`
      );
    } catch (error) {
      console.error('Error updating privilege:', error);
      Alert.alert('Erreur', 'Impossible de modifier le privilège');
    }
  };

  const hasAnyPrivilege = (userId: string) => {
    const userPrivileges = privileges[userId];
    if (!userPrivileges) return false;
    return Object.values(userPrivileges).some(v => v === true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gérer les co-organisateurs</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B5CFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Co-organisateurs</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#7B5CFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>{eventTitle}</Text>
            <Text style={styles.infoText}>
              Désignez des co-organisateurs et accordez-leur des privilèges spécifiques pour cet événement.
            </Text>
          </View>
        </View>

        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Privilèges disponibles :</Text>
          <View style={styles.legendItem}>
            <Ionicons name="scan" size={16} color="#7B5CFF" />
            <Text style={styles.legendText}>Scanner les billets - Contrôler les entrées</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="people" size={16} color="#7B5CFF" />
            <Text style={styles.legendText}>Gérer les participants - Modérer la liste</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="megaphone" size={16} color="#7B5CFF" />
            <Text style={styles.legendText}>Envoyer des annonces - Communiquer</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Participants inscrits ({participants.length})
        </Text>

        {participants.map((participant) => {
          const userPrivileges = privileges[participant.userId] || {
            canScanTickets: false,
            canManageParticipants: false,
            canSendAnnouncements: false,
          };

          const isCoOrganizer = hasAnyPrivilege(participant.userId);

          return (
            <View key={participant.id} style={styles.participantCard}>
              <View style={styles.participantHeader}>
                <View style={styles.participantInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {participant.participantName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.participantName}>
                      {participant.participantName}
                    </Text>
                    <Text style={styles.participantEmail}>
                      {participant.participantEmail}
                    </Text>
                    {isCoOrganizer && (
                      <View style={styles.coOrganizerBadge}>
                        <Ionicons name="star" size={12} color="#7B5CFF" />
                        <Text style={styles.coOrganizerText}>Co-organisateur</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.privilegesContainer}>
                <View style={styles.privilegeRow}>
                  <View style={styles.privilegeInfo}>
                    <Ionicons name="scan" size={18} color="#7B5CFF" />
                    <Text style={styles.privilegeLabel}>Scanner les billets</Text>
                  </View>
                  <Switch
                    value={userPrivileges.canScanTickets}
                    onValueChange={() =>
                      togglePrivilege(participant.userId, 'canScanTickets')
                    }
                    trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                    thumbColor={userPrivileges.canScanTickets ? '#7B5CFF' : '#9CA3AF'}
                  />
                </View>

                <View style={styles.privilegeRow}>
                  <View style={styles.privilegeInfo}>
                    <Ionicons name="people" size={18} color="#7B5CFF" />
                    <Text style={styles.privilegeLabel}>Gérer les participants</Text>
                  </View>
                  <Switch
                    value={userPrivileges.canManageParticipants}
                    onValueChange={() =>
                      togglePrivilege(participant.userId, 'canManageParticipants')
                    }
                    trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                    thumbColor={userPrivileges.canManageParticipants ? '#7B5CFF' : '#9CA3AF'}
                  />
                </View>

                <View style={styles.privilegeRow}>
                  <View style={styles.privilegeInfo}>
                    <Ionicons name="megaphone" size={18} color="#7B5CFF" />
                    <Text style={styles.privilegeLabel}>Envoyer des annonces</Text>
                  </View>
                  <Switch
                    value={userPrivileges.canSendAnnouncements}
                    onValueChange={() =>
                      togglePrivilege(participant.userId, 'canSendAnnouncements')
                    }
                    trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                    thumbColor={userPrivileges.canSendAnnouncements ? '#7B5CFF' : '#9CA3AF'}
                  />
                </View>
              </View>
            </View>
          );
        })}

        {participants.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              Aucun participant inscrit à cet événement
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    marginLeft: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#6C757D',
    lineHeight: 18,
    marginLeft: 12,
  },
  legendCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#6C757D',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },
  participantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
  },
  participantHeader: {
    marginBottom: 16,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7B5CFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  participantEmail: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 4,
  },
  coOrganizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  coOrganizerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7B5CFF',
    marginLeft: 4,
  },
  privilegesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  privilegeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  privilegeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privilegeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6C757D',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default EventPrivilegesScreen;
