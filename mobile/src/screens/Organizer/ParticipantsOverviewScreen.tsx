import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';

interface Participant {
  id: string;
  ticketId: string;
  ticketCode: string;
  participantName: string;
  participantEmail?: string;
  checkedIn: boolean;
  checkedInAt: Date | null;
  ticketType: string;
  createdAt: Date;
}

const ParticipantsOverviewScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const eventId = route.params?.eventId;
  const eventTitle = route.params?.eventTitle || 'Événement';

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked' | 'unchecked'>('all');

  useEffect(() => {
    if (!eventId) {
      Alert.alert('Erreur', 'Aucun événement sélectionné');
      navigation.goBack();
      return;
    }

    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('eventId', '==', eventId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const participantsList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ticketId: doc.id,
            ticketCode: data.code || '',
            participantName: data.participantName || 'Participant',
            participantEmail: data.participantEmail || data.email || '',
            checkedIn: data.checkedIn || false,
            checkedInAt: data.checkedInAt?.toDate() || null,
            ticketType: data.ticketType || 'Standard',
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Participant;
        });
        setParticipants(participantsList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching participants:', error);
        Alert.alert('Erreur', 'Impossible de charger les participants');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  useEffect(() => {
    let filtered = participants;

    // Filtrer par statut
    if (filterStatus === 'checked') {
      filtered = filtered.filter((p) => p.checkedIn);
    } else if (filterStatus === 'unchecked') {
      filtered = filtered.filter((p) => !p.checkedIn);
    }

    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.participantName.toLowerCase().includes(query) ||
          p.ticketCode.toLowerCase().includes(query) ||
          (p.participantEmail && p.participantEmail.toLowerCase().includes(query))
      );
    }

    setFilteredParticipants(filtered);
  }, [participants, searchQuery, filterStatus]);

  const stats = {
    total: participants.length,
    checkedIn: participants.filter((p) => p.checkedIn).length,
    notCheckedIn: participants.filter((p) => !p.checkedIn).length,
    checkInRate: participants.length > 0
      ? Math.round((participants.filter((p) => p.checkedIn).length / participants.length) * 100)
      : 0,
  };

  const renderParticipant = ({ item }: { item: Participant }) => {
    return (
      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: item.checkedIn ? theme.primary + '40' : theme.border,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>
                {item.participantName}
              </Text>
              {item.checkedIn && (
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: theme.primary + '20',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '600' }}>✓ Check-in</Text>
                </View>
              )}
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 2 }}>
              Code: {item.ticketCode}
            </Text>
            {item.participantEmail && (
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 2 }}>
                {item.participantEmail}
              </Text>
            )}
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
              Type: {item.ticketType}
            </Text>
            {item.checkedIn && item.checkedInAt && (
              <Text style={{ color: theme.primary, fontSize: 11, marginTop: 4 }}>
                Scanné le {item.checkedInAt.toLocaleDateString('fr-FR')} à{' '}
                {item.checkedInAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: item.checkedIn ? theme.primary + '20' : theme.inputBackground,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              name={item.checkedIn ? 'checkmark-circle' : 'time-outline'}
              size={24}
              color={item.checkedIn ? theme.primary : theme.textMuted}
            />
          </View>
        </View>
      </View>
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
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
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>Participants</Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={{ color: theme.textMuted, marginTop: 4, fontSize: 12 }}>{eventTitle}</Text>
      </View>

      {/* Stats */}
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border, marginRight: 12 }}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Total</Text>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 20 }}>{stats.total}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border, marginRight: 12 }}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Check-in</Text>
            <Text style={{ color: theme.primary, fontWeight: '800', fontSize: 20 }}>{stats.checkedIn}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Taux</Text>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 20 }}>{stats.checkInRate}%</Text>
          </View>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={{ padding: 16, paddingTop: 12 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.inputBackground,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
          }}
        >
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={{ flex: 1, color: theme.text, marginLeft: 8 }}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher par nom, code ou email..."
            placeholderTextColor={theme.inputPlaceholder}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter buttons */}
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            onPress={() => setFilterStatus('all')}
            style={{
              flex: 1,
              backgroundColor: filterStatus === 'all' ? theme.primary : theme.inputBackground,
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: filterStatus === 'all' ? theme.primary : theme.border,
              marginRight: 8,
            }}
          >
            <Text
              style={{
                color: filterStatus === 'all' ? theme.buttonPrimaryText : theme.text,
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              Tous ({stats.total})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterStatus('checked')}
            style={{
              flex: 1,
              backgroundColor: filterStatus === 'checked' ? theme.primary : theme.inputBackground,
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: filterStatus === 'checked' ? theme.primary : theme.border,
              marginRight: 8,
            }}
          >
            <Text
              style={{
                color: filterStatus === 'checked' ? theme.buttonPrimaryText : theme.text,
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              Check-in ({stats.checkedIn})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterStatus('unchecked')}
            style={{
              flex: 1,
              backgroundColor: filterStatus === 'unchecked' ? theme.primary : theme.inputBackground,
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: filterStatus === 'unchecked' ? theme.primary : theme.border,
            }}
          >
            <Text
              style={{
                color: filterStatus === 'unchecked' ? theme.buttonPrimaryText : theme.text,
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              En attente ({stats.notCheckedIn})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Participants List */}
      <FlatList
        data={filteredParticipants}
        keyExtractor={(item) => item.id}
        renderItem={renderParticipant}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Ionicons name="people-outline" size={48} color={theme.textMuted} />
            <Text style={{ color: theme.textMuted, marginTop: 16, textAlign: 'center' }}>
              {searchQuery
                ? 'Aucun participant ne correspond à votre recherche'
                : 'Aucun participant pour cet événement'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default ParticipantsOverviewScreen;
