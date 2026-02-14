import React, { useEffect, useState } from 'react';
import { Alert, Modal, Text, TextInput, TouchableOpacity, View, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { collection, doc, getDoc, getDocs, query, updateDoc, where, orderBy, onSnapshot, Timestamp, addDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';
import { createStyles } from './ScanTicketScreen.styles';

type ScanResult =
  | { type: 'success'; participant: string; ticketType: string; ticketId: string; eventId: string; eventTitle: string }
  | { type: 'error'; message: string };

interface Event {
  id: string;
  title: string;
}

interface ScanHistory {
  id: string;
  ticketId: string;
  ticketCode: string;
  participantName: string;
  eventTitle: string;
  scannedBy: string;
  scannedByName: string;
  scannedAt: Date;
  canUndo: boolean;
}

const ScanTicketScreen = () => {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanned, setScanned] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const eventName = 'Scanner un billet';

  // Vérifier les permissions d'accès
  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Accès refusé', 'Vous devez être connecté');
        navigation.goBack();
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // L'utilisateur peut scanner s'il est organisateur OU s'il a le privilège canScanTickets
        const canAccess = userData.role === 'organizer' || userData.canScanTickets === true;
        setHasAccess(canAccess);

        if (!canAccess) {
          Alert.alert(
            'Accès refusé',
            'Vous n\'avez pas les permissions nécessaires pour scanner les billets. Contactez un organisateur.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } else {
        setHasAccess(false);
        Alert.alert('Accès refusé', 'Profil utilisateur introuvable');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Error checking access:', error);
      Alert.alert('Erreur', 'Impossible de vérifier les permissions');
      navigation.goBack();
    } finally {
      setCheckingAccess(false);
    }
  };

  useEffect(() => {
    if (hasAccess && !permission?.granted) {
      requestPermission();
    }
  }, [hasAccess, permission]);

  // Charger les événements
  useEffect(() => {
    if (!hasAccess) return;
    
    setLoadingEvents(true);
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const eventsList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Sans titre',
          } as Event;
        });
        setEvents(eventsList);
        // Sélectionner le premier événement par défaut
        if (eventsList.length > 0 && !selectedEventId) {
          setSelectedEventId(eventsList[0].id);
        }
        setLoadingEvents(false);
      },
      (error) => {
        console.error('Error fetching events:', error);
        setLoadingEvents(false);
      }
    );

    return () => unsubscribe();
  }, [hasAccess]);

  // Charger l'historique des scans
  useEffect(() => {
    if (!hasAccess || !selectedEventId) return;

    const historyRef = collection(db, 'scanHistory');
    const q = query(
      historyRef,
      where('eventId', '==', selectedEventId),
      orderBy('scannedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const history = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ticketId: data.ticketId || '',
            ticketCode: data.ticketCode || '',
            participantName: data.participantName || 'Participant',
            eventTitle: data.eventTitle || '',
            scannedBy: data.scannedBy || '',
            scannedByName: data.scannedByName || 'Utilisateur',
            scannedAt: data.scannedAt?.toDate() || new Date(),
            canUndo: data.canUndo !== false, // Par défaut true si non défini
          } as ScanHistory;
        });
        setScanHistory(history);
      },
      (error) => {
        console.error('Error fetching scan history:', error);
      }
    );

    return () => unsubscribe();
  }, [hasAccess, selectedEventId]);

  const validateTicket = async (ticketCode: string): Promise<ScanResult> => {
    try {
      const user = auth.currentUser;
      if (!user) {
        return { type: 'error', message: 'Utilisateur non connecté' };
      }

      // Chercher le ticket par son code dans Firestore
      const ticketsRef = collection(db, 'tickets');
      const q = query(ticketsRef, where('code', '==', ticketCode.toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { type: 'error', message: 'Billet introuvable. Vérifiez le code.' };
      }

      const ticketDoc = snapshot.docs[0];
      const ticket = ticketDoc.data();
      const ticketEventId = ticket.eventId;

      // Vérifier si un événement est sélectionné et si le billet correspond
      if (selectedEventId && ticketEventId !== selectedEventId) {
        const eventDoc = await getDoc(doc(db, 'events', ticketEventId));
        const eventTitle = eventDoc.exists() ? eventDoc.data().title : 'Événement inconnu';
        return { 
          type: 'error', 
          message: `Ce billet appartient à l'événement "${eventTitle}". Veuillez sélectionner le bon événement.` 
        };
      }

      if (ticket.checkedIn) {
        const checkedInDate = ticket.checkedInAt?.toDate?.();
        const dateStr = checkedInDate 
          ? checkedInDate.toLocaleDateString('fr-FR') + ' à ' + checkedInDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : 'une date inconnue';
        return { type: 'error', message: `Ce billet a déjà été scanné le ${dateStr}.` };
      }

      // Récupérer les infos de l'utilisateur qui scanne
      const scannerDoc = await getDoc(doc(db, 'users', user.uid));
      const scannerData = scannerDoc.exists() ? scannerDoc.data() : null;
      const scannerName = scannerData?.firstName && scannerData?.lastName
        ? `${scannerData.firstName} ${scannerData.lastName}`
        : scannerData?.name || user.displayName || 'Utilisateur';

      // Récupérer le titre de l'événement
      const eventDoc = await getDoc(doc(db, 'events', ticketEventId));
      const eventTitle = eventDoc.exists() ? eventDoc.data().title : 'Événement inconnu';

      // Marquer comme checké
      await updateDoc(doc(db, 'tickets', ticketDoc.id), {
        checkedIn: true,
        checkedInAt: Timestamp.now(),
      });

      // Enregistrer dans l'historique
      await addDoc(collection(db, 'scanHistory'), {
        ticketId: ticketDoc.id,
        ticketCode: ticketCode.toUpperCase(),
        eventId: ticketEventId,
        eventTitle: eventTitle,
        participantName: ticket.participantName || 'Participant',
        participantId: ticket.userId || '',
        scannedBy: user.uid,
        scannedByName: scannerName,
        scannedAt: Timestamp.now(),
        canUndo: true,
      });

      return {
        type: 'success',
        participant: ticket.participantName || 'Participant',
        ticketType: ticket.ticketType || 'Standard',
        ticketId: ticketDoc.id,
        eventId: ticketEventId,
        eventTitle: eventTitle,
      };
    } catch (error: any) {
      console.error('Ticket validation error:', error);
      return { type: 'error', message: 'Erreur de validation. Réessayez.' };
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    const validationResult = await validateTicket(data);
    setResult(validationResult);
    setLoading(false);
  };

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un code');
      return;
    }

    setLoading(true);
    const validationResult = await validateTicket(manualCode.trim());
    setResult(validationResult);
    setShowManualInput(false);
    setManualCode('');
    setLoading(false);
  };

  const closeModal = () => {
    setResult(null);
    setScanned(false);
  };

  const scanNext = () => {
    setResult(null);
    setScanned(false);
  };

  const handleUndoScan = async (historyItem: ScanHistory) => {
    if (!historyItem.canUndo) {
      Alert.alert('Erreur', 'Ce scan ne peut pas être annulé.');
      return;
    }

    Alert.alert(
      'Annuler le scan',
      `Voulez-vous annuler le scan du billet de ${historyItem.participantName} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          onPress: async () => {
            try {
              // Réinitialiser le statut du billet
              await updateDoc(doc(db, 'tickets', historyItem.ticketId), {
                checkedIn: false,
                checkedInAt: null,
              });

              // Marquer l'entrée d'historique comme non annulable
              await updateDoc(doc(db, 'scanHistory', historyItem.id), {
                canUndo: false,
                undoneAt: Timestamp.now(),
                undoneBy: auth.currentUser?.uid,
              });

              Alert.alert('Succès', 'Le scan a été annulé.');
            } catch (error: any) {
              console.error('Error undoing scan:', error);
              Alert.alert('Erreur', 'Impossible d\'annuler le scan.');
            }
          },
        },
      ]
    );
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  if (checkingAccess) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textMuted, marginTop: 16 }}>Vérification des permissions...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    return null; // L'alerte a déjà été affichée et la navigation a été effectuée
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
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>

        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>{eventName}</Text>

        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            onPress={() => setShowHistory(!showHistory)}
            style={{ padding: 8, marginRight: 8 }}
          >
            <Ionicons name="time-outline" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowEventSelector(true)}
            style={{ padding: 8 }}
          >
            <Ionicons name="calendar-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, padding: 16 }}>
        {/* Sélecteur d'événement */}
        {selectedEvent && (
          <View style={{ 
            backgroundColor: theme.surface, 
            borderRadius: 12, 
            padding: 12, 
            marginBottom: 12,
            borderWidth: 1,
            borderColor: theme.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Événement sélectionné</Text>
              <Text style={{ color: theme.text, fontWeight: '600', fontSize: 14 }}>{selectedEvent.title}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowEventSelector(true)}
              style={{ padding: 8 }}
            >
              <Ionicons name="chevron-down" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
        )}

        {!permission?.granted ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="camera-outline" size={48} color={theme.textMuted} />
            <Text style={{ color: theme.text, fontWeight: '700', marginTop: 16, textAlign: 'center' }}>
              Autorisation caméra requise
            </Text>
            <Text style={{ color: theme.textMuted, marginTop: 8, textAlign: 'center' }}>
              Pour scanner les billets, autorisez l'accès à la caméra.
            </Text>
            <TouchableOpacity
              onPress={requestPermission}
              style={{
                marginTop: 20,
                backgroundColor: theme.primary,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: theme.buttonPrimaryText, fontWeight: '700' }}>Autoriser</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(123, 92, 255, 0.18)',
              position: 'relative',
            }}
          >
            <CameraView
              style={{ flex: 1 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.22)',
                pointerEvents: 'none',
              }}
            />

            <Text
              style={{
                position: 'absolute',
                top: 22,
                left: 18,
                color: theme.textSecondary,
                fontWeight: '600',
              }}
            >
              Placez le QR code dans le cadre
            </Text>

            {loading && (
              <View
                style={{
                  position: 'absolute',
                  top: '40%',
                  alignSelf: 'center',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  padding: 20,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: '700' }}>Validation...</Text>
              </View>
            )}

            <View
              style={{
                position: 'absolute',
                top: '25%',
                left: '10%',
                right: '10%',
                height: 220,
                borderRadius: 22,
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                pointerEvents: 'none',
              }}
            >
              <View style={{ position: 'absolute', top: -1, left: -1, width: 26, height: 26, borderTopWidth: 4, borderLeftWidth: 4, borderColor: 'rgba(255,255,255,0.85)', borderTopLeftRadius: 22 }} />
              <View style={{ position: 'absolute', top: -1, right: -1, width: 26, height: 26, borderTopWidth: 4, borderRightWidth: 4, borderColor: 'rgba(255,255,255,0.85)', borderTopRightRadius: 22 }} />
              <View style={{ position: 'absolute', bottom: -1, left: -1, width: 26, height: 26, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: 'rgba(255,255,255,0.85)', borderBottomLeftRadius: 22 }} />
              <View style={{ position: 'absolute', bottom: -1, right: -1, width: 26, height: 26, borderBottomWidth: 4, borderRightWidth: 4, borderColor: 'rgba(255,255,255,0.85)', borderBottomRightRadius: 22 }} />
              <View style={{ position: 'absolute', top: '50%', left: 18, right: 18, height: 2, backgroundColor: 'rgba(0, 224, 255, 0.5)' }} />
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={() => setShowManualInput(true)}
          style={{ alignSelf: 'center', marginTop: 14, padding: 10 }}
        >
          <Text style={{ color: theme.primary, fontWeight: '700' }}>Entrer un code manuellement</Text>
        </TouchableOpacity>
      </View>

      {/* Modal saisie manuelle */}
      <Modal visible={showManualInput} transparent animationType="fade" onRequestClose={() => setShowManualInput(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 20 }}>
          <View style={{ backgroundColor: theme.surface, borderRadius: 22, padding: 20, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18, marginBottom: 16, textAlign: 'center' }}>
              Entrer le code du billet
            </Text>
            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Ex: ABC123"
              placeholderTextColor={theme.inputPlaceholder}
              autoCapitalize="characters"
              style={{
                backgroundColor: theme.inputBackground,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 14,
                color: theme.text,
                fontSize: 18,
                textAlign: 'center',
                letterSpacing: 2,
              }}
            />
            <TouchableOpacity
              onPress={handleManualSubmit}
              disabled={loading}
              style={{
                backgroundColor: theme.primary,
                paddingVertical: 14,
                borderRadius: 999,
                alignItems: 'center',
                marginTop: 16,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: theme.buttonPrimaryText, fontWeight: '800' }}>
                {loading ? 'Validation...' : 'Valider'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowManualInput(false)} style={{ alignItems: 'center', padding: 14 }}>
              <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!result}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              padding: 18,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            {result?.type === 'success' ? (
              <>
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: 'rgba(0, 224, 255, 0.14)',
                      borderWidth: 1,
                      borderColor: 'rgba(0, 224, 255, 0.30)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <Ionicons name="checkmark" size={28} color={theme.primary} />
                  </View>
                  <Text style={{ color: theme.text, fontWeight: '900', fontSize: 18 }}>
                    Check-in Réussi
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: theme.inputBackground,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: theme.border,
                    padding: 14,
                    marginBottom: 14,
                  }}
                >
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>Participant</Text>
                  <Text style={{ color: theme.text, fontWeight: '800', marginTop: 4 }}>
                    {result.participant}
                  </Text>

                  <View style={{ height: 10 }} />

                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>Type de billet</Text>
                  <Text style={{ color: theme.text, fontWeight: '800', marginTop: 4 }}>
                    {result.ticketType}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={scanNext}
                  style={{
                    backgroundColor: theme.primary,
                    paddingVertical: 14,
                    borderRadius: 999,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.buttonPrimaryText, fontWeight: '900' }}>Scanner le suivant</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={closeModal} style={{ alignItems: 'center', padding: 14 }}>
                  <Text style={{ color: theme.textMuted, fontWeight: '700' }}>Fermer</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: 'rgba(255, 79, 216, 0.12)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 79, 216, 0.22)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <Ionicons name="close" size={26} color={theme.error} />
                  </View>
                  <Text style={{ color: theme.text, fontWeight: '900', fontSize: 18 }}>
                    Billet invalide
                  </Text>
                </View>

                <Text style={{ color: theme.textMuted, textAlign: 'center', marginBottom: 14 }}>
                  {result?.type === 'error' ? result.message : ''}
                </Text>

                <TouchableOpacity
                  onPress={closeModal}
                  style={{
                    backgroundColor: theme.primary,
                    paddingVertical: 14,
                    borderRadius: 999,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.buttonPrimaryText, fontWeight: '900' }}>Réessayer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={scanNext}
                  style={{
                    marginTop: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    paddingVertical: 14,
                    borderRadius: 999,
                    alignItems: 'center',
                    backgroundColor: theme.inputBackground,
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: '800' }}>Scanner un autre</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal sélecteur d'événement */}
      <Modal visible={showEventSelector} transparent animationType="slide" onRequestClose={() => setShowEventSelector(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ 
            backgroundColor: theme.surface, 
            borderTopLeftRadius: 24, 
            borderTopRightRadius: 24, 
            padding: 20,
            maxHeight: '70%',
            borderWidth: 1,
            borderColor: theme.border,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18 }}>Sélectionner un événement</Text>
              <TouchableOpacity onPress={() => setShowEventSelector(false)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            
            {loadingEvents ? (
              <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedEventId(item.id);
                      setShowEventSelector(false);
                    }}
                    style={{
                      backgroundColor: selectedEventId === item.id ? theme.primary + '20' : theme.inputBackground,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: selectedEventId === item.id ? theme.primary : theme.border,
                    }}
                  >
                    <Text style={{ color: theme.text, fontWeight: selectedEventId === item.id ? '700' : '500' }}>
                      {item.title}
                    </Text>
                    {selectedEventId === item.id && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
                        <Text style={{ color: theme.primary, fontSize: 12, marginLeft: 4 }}>Sélectionné</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal historique des scans */}
      <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ 
            flex: 1,
            backgroundColor: theme.background,
            marginTop: 60,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18 }}>Historique des scans</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            
            {scanHistory.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                <Ionicons name="time-outline" size={48} color={theme.textMuted} />
                <Text style={{ color: theme.textMuted, marginTop: 16, textAlign: 'center' }}>
                  Aucun scan enregistré pour cet événement
                </Text>
              </View>
            ) : (
              <FlatList
                data={scanHistory}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <View style={{
                    backgroundColor: theme.surface,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>
                          {item.participantName}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 2 }}>
                          Code: {item.ticketCode}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 2 }}>
                          Scanné par: {item.scannedByName}
                        </Text>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                          {item.scannedAt.toLocaleDateString('fr-FR')} à {item.scannedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      {item.canUndo && (
                        <TouchableOpacity
                          onPress={() => handleUndoScan(item)}
                          style={{
                            backgroundColor: theme.error + '20',
                            borderRadius: 8,
                            padding: 8,
                          }}
                        >
                          <Ionicons name="arrow-undo" size={20} color={theme.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ScanTicketScreen;
