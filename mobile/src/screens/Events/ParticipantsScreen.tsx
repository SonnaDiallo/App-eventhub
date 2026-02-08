import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { getEventParticipants, getEventById } from '../../services/eventsService';
import { 
  getExternalEventParticipants,
  type ExternalParticipant 
} from '../../services/externalRegistrationService';
import { sendFriendRequest } from '../../services/friendsService';
import { useTheme } from '../../theme/ThemeContext';
import { auth } from '../../services/firebase';
import { api } from '../../services/api';

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
  const [sendingToId, setSendingToId] = useState<string | null>(null);
  const [requestSentIds, setRequestSentIds] = useState<Set<string>>(new Set());
  const [eventPassed, setEventPassed] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const handleAddFriend = useCallback(async (userId: string) => {
    if (sendingToId) return;
    setSendingToId(userId);
    try {
      await sendFriendRequest(userId);
      setRequestSentIds((prev) => new Set(prev).add(userId));
      Alert.alert('Demande envoyée', 'Ta demande d\'ami a été envoyée. Vous pourrez discuter une fois qu\'elle sera acceptée.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Impossible d\'envoyer la demande';
      Alert.alert('Erreur', msg);
    } finally {
      setSendingToId(null);
    }
  }, [sendingToId]);

  // Récupérer l'ID et l'email de l'utilisateur connecté
  useEffect(() => {
    const fetchUserInfo = async () => {
      const user = auth.currentUser;
      if (user) {
        setCurrentUserId(user.uid);
        setCurrentUserEmail(user.email || null);
      }
    };
    fetchUserInfo();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setErrorMessage(null);
      
      try {
        // Charger les détails de l'événement pour vérifier la date (uniquement pour les événements internes)
        if (!eventId.startsWith('external_')) {
          try {
            const eventRes = await getEventById(eventId);
            if (!cancelled && eventRes?.event) {
              setEventTitle(eventRes.event.title);
              
              // Vérifier si l'événement est passé
              if (eventRes.event.date) {
                // Parser la date formatée (ex: "Mardi 28 Octobre, 2024")
                const dateStr = eventRes.event.date;
                const now = new Date();
                
                // Essayer de parser la date
                try {
                  // Extraire l'année, mois et jour de la chaîne
                  const yearMatch = dateStr.match(/\b(20\d{2})\b/);
                  const monthMatch = dateStr.match(/\b(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/i);
                  const dayMatch = dateStr.match(/\b(\d{1,2})\b/);
                  
                  if (yearMatch && monthMatch && dayMatch) {
                    const year = parseInt(yearMatch[1]);
                    const monthMap: Record<string, number> = {
                      'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
                      'juillet': 6, 'août': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
                    };
                    const month = monthMap[monthMatch[1].toLowerCase()];
                    const day = parseInt(dayMatch[1]);
                    
                    const eventDate = new Date(year, month, day);
                    // Ajouter l'heure si disponible
                    if (eventRes.event.time) {
                      const timeMatch = eventRes.event.time.match(/(\d{1,2}):(\d{2})/);
                      if (timeMatch) {
                        eventDate.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]));
                      }
                    }
                    
                    setEventPassed(eventDate < now);
                  } else {
                    setEventPassed(false);
                  }
                } catch {
                  setEventPassed(false);
                }
              }
            }
          } catch (eventErr) {
            // Ignorer l'erreur si on ne peut pas charger les détails de l'événement
            console.warn('Could not load event details:', eventErr);
          }
        }
        
        // Charger les participants selon le type d'événement
        let list: Participant[] = [];
        
        if (eventId.startsWith('external_')) {
          // Événement externe (Ticketmaster)
          try {
            const res = await getExternalEventParticipants(eventId);
            if (!cancelled && res.participants) {
              list = res.participants.map((p: ExternalParticipant) => ({
                id: p.id,
                participantName: p.user.name || [p.user.firstName, p.user.lastName].filter(Boolean).join(' ').trim() || 'Participant',
                participantEmail: p.user.email,
                status: p.status,
              }));
              
              // Essayer de récupérer le titre depuis le premier participant (ils ont tous le même eventTitle)
              if (res.participants.length > 0 && res.participants[0].user) {
                // Pour les événements externes, on ne peut pas récupérer facilement le titre
                // On utilisera un titre générique
                setEventTitle('Événement Ticketmaster');
              }
            }
          } catch (externalErr) {
            if (!cancelled) {
              console.error('Error loading external participants:', externalErr);
              setErrorMessage('Aucun participant inscrit pour le moment. Sois le premier à t\'inscrire !');
            }
          }
        } else {
          // Événement interne (MongoDB)
          try {
            const res = await getEventParticipants(eventId);
            if (!cancelled && res.participants) {
              list = res.participants.map((p) => {
                const user = p.user;
                const name = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Participant';
                return {
                  id: p.id,
                  participantName: name,
                  participantEmail: user?.email,
                  status: p.status,
                };
              });
            }
          } catch (internalErr: any) {
            if (!cancelled) {
              const status = internalErr?.response?.status;
              if (status === 404) {
                setErrorMessage('Cet événement n\'est pas enregistré dans la base. Les participants sont gérés pour les événements créés sur la plateforme.');
              } else if (status === 500) {
                setErrorMessage('Erreur serveur lors du chargement des participants. Réessayez plus tard.');
              } else {
                console.error('Error fetching participants:', internalErr);
                setErrorMessage('Impossible de charger les participants. Vérifiez que le backend est démarré.');
              }
            }
          }
        }
        
        if (!cancelled) {
          setParticipants(list);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Unexpected error:', err);
          setErrorMessage('Une erreur inattendue est survenue.');
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

  const renderParticipant = ({ item }: { item: Participant }) => {
    const sent = requestSentIds.has(item.id);
    const sending = sendingToId === item.id;
    // Utiliser l'email pour identifier l'utilisateur courant (plus fiable)
    const isCurrentUser = currentUserEmail && item.participantEmail 
      ? currentUserEmail.toLowerCase() === item.participantEmail.toLowerCase()
      : currentUserId === item.id; // Fallback pour les événements sans email
    
    // Debug logs
    console.log('Debug IDs:', {
      eventId,
      isExternal: eventId.startsWith('external_'),
      itemUserId: item.id,
      currentUserId,
      currentUserEmail,
      itemUserEmail: item.participantEmail,
      isCurrentUser,
      participantName: item.participantName
    });
    
    return (
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
              {isCurrentUser && (
                <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600', marginLeft: 8 }}>
                  (Vous)
                </Text>
              )}
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
          {!isCurrentUser && (
            <TouchableOpacity
              onPress={() => handleAddFriend(item.id)}
              disabled={sending || sent}
              style={{
                backgroundColor: sent ? theme.borderLight : theme.primary,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
              }}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                  {sent ? 'Demande envoyée' : 'Ajouter en ami'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

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

      {eventPassed && (
        <View style={{
          backgroundColor: `${theme.primary}26`,
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: theme.primary,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="time-outline" size={20} color={theme.primary} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 14, marginBottom: 4 }}>
                🎉 Événement terminé
              </Text>
              <Text style={{ color: theme.text, fontSize: 13, lineHeight: 18 }}>
                {eventTitle ? `"${eventTitle}" est terminé.` : 'Cet événement est terminé.'} 
                {'\n'}C'est le moment idéal pour ajouter les autres participants en ami et discuter de vos expériences !
              </Text>
            </View>
          </View>
        </View>
      )}

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
