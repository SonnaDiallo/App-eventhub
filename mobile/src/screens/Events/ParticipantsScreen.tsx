import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { getEventParticipants } from '../../services/eventsService';
import { useTheme } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Participants'>;

export interface Participant {
  id: string;
  participantName: string;
  participantEmail?: string;
  status: string;
}

const ParticipantsScreen: React.FC<Props> = ({ route }) => {
  const { eventId } = route.params;
  const { theme } = useTheme();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }
      // Événements externes (Ticketmaster) : pas d'appel API, message direct
      if (eventId.startsWith('external_')) {
        setParticipants([]);
        setErrorMessage('Cet événement n\'est pas enregistré dans la base. Les participants sont gérés pour les événements créés sur la plateforme.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await getEventParticipants(eventId);
        if (cancelled) return;
        const list: Participant[] = (res.participants || []).map((p) => {
          const user = p.user;
          const name = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Participant';
          return {
            id: p.id,
            participantName: name,
            participantEmail: user?.email,
            status: p.status,
          };
        });
        setParticipants(list);
      } catch (err: any) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 404) {
          setParticipants([]);
          setErrorMessage('Cet événement n\'est pas enregistré dans la base. Les participants sont gérés pour les événements créés sur la plateforme.');
        } else if (status === 500) {
          setParticipants([]);
          setErrorMessage('Erreur serveur lors du chargement des participants. Réessayez plus tard.');
        } else {
          console.error('Error fetching participants:', err);
          setParticipants([]);
          setErrorMessage('Impossible de charger les participants. Vérifiez que le backend est démarré.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [eventId]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return participants;
    const q = searchQuery.toLowerCase();
    return participants.filter(
      (p) =>
        p.participantName.toLowerCase().includes(q) ||
        (p.participantEmail && p.participantEmail.toLowerCase().includes(q))
    );
  }, [participants, searchQuery]);

  const renderParticipant = ({ item }: { item: Participant }) => (
    <View
      style={{
        backgroundColor: theme.surface || '#0b0620',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.border || 'rgba(123, 92, 255, 0.25)',
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: theme.primary ? `${theme.primary}26` : 'rgba(123, 92, 255, 0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ color: theme.primary || '#7B5CFF', fontSize: 18, fontWeight: '700' }}>
            {(item.participantName || 'P').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text || '#ffffff', fontSize: 16, fontWeight: '700' }}>
            {item.participantName}
          </Text>
          {item.participantEmail ? (
            <Text style={{ color: theme.textMuted || '#a0a0c0', fontSize: 13, marginTop: 2 }}>
              {item.participantEmail}
            </Text>
          ) : null}
          <View style={{ marginTop: 6 }}>
            <Text
              style={{
                color: item.status === 'confirmed' ? '#22c55e' : theme.textMuted || '#a0a0c0',
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {item.status === 'confirmed' ? '✓ Inscrit' : item.status === 'pending_payment' ? 'En attente de paiement' : item.status}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background || '#050016', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary || '#7B5CFF'} />
        <Text style={{ color: theme.textMuted || '#a0a0c0', marginTop: 12 }}>Chargement des participants...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background || '#050016', padding: 16 }}>
      <Text style={{ color: theme.text || '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 12 }}>
        Participants
      </Text>

      {errorMessage ? (
        <View style={{ backgroundColor: theme.surface || '#0F0F23', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.textMuted || '#a0a0c0', fontSize: 14 }}>{errorMessage}</Text>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.surface || 'rgba(255, 255, 255, 0.03)',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border || 'rgba(123, 92, 255, 0.25)',
          paddingHorizontal: 14,
          paddingVertical: 10,
          marginBottom: 16,
        }}
      >
        <Ionicons name="search-outline" size={20} color={theme.textMuted || 'rgba(255, 255, 255, 0.5)'} style={{ marginRight: 10 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Rechercher par nom ou email..."
          placeholderTextColor={theme.textMuted || 'rgba(255, 255, 255, 0.35)'}
          style={{ color: theme.text || '#ffffff', flex: 1 }}
        />
      </View>

      <Text style={{ color: theme.textMuted || '#a0a0c0', marginBottom: 12 }}>
        {filtered.length} participant{filtered.length !== 1 ? 's' : ''}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderParticipant}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="people-outline" size={64} color={theme.textMuted || '#a0a0c0'} />
            <Text style={{ color: theme.textMuted || '#a0a0c0', marginTop: 16, textAlign: 'center' }}>
              {participants.length === 0
                ? (errorMessage ? null : 'Aucun participant pour cet événement pour le moment.')
                : 'Aucun participant ne correspond à votre recherche.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default ParticipantsScreen;
