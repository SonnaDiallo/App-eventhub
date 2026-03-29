/**
 * @file MyTicketsScreen.tsx
 * @description Écran « Mes Billets » affichant tous les billets de l'utilisateur
 * connecté. Les billets sont synchronisés en temps réel via un listener Firestore
 * `onSnapshot` et triés par date de création (plus récent en premier).
 *
 * Fonctionnalités :
 * - Onglets « À venir » / « Passés » avec séparation automatique par date
 * - Affichage de chaque billet avec QR code, code alphanumérique et statut (valide/utilisé)
 * - Modale de détail avec QR code agrandi et option de téléchargement
 * - Annulation de réservation (suppression du ticket Firestore + appel API leaveEvent)
 */

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
  Animated,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { auth, db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
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
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const user = auth.currentUser;

  /** Télécharge le billet : sur le web, génère une page HTML imprimable avec QR code ; sur mobile, propose une capture d'écran. */
  const handleDownloadPDF = async (ticket: Ticket) => {
    if (Platform.OS === 'web') {
      setDownloadingPdf(true);
      try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(ticket.code)}`;
        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Billet - ${ticket.eventTitle}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#f5f3ff;display:flex;justify-content:center;padding:40px}
  .ticket{background:#fff;border-radius:24px;width:420px;overflow:hidden;box-shadow:0 8px 30px rgba(123,92,255,.15);border:1px solid #e5e7eb}
  .header{background:#7B5CFF;background:linear-gradient(135deg,#7B5CFF,#9B7FFF);padding:32px 24px;text-align:center;color:#fff}
  .header h2{font-size:13px;letter-spacing:3px;opacity:.85;margin-bottom:6px;font-weight:600}
  .header h1{font-size:22px;font-weight:800;line-height:1.3}
  .qr-section{text-align:center;padding:32px 24px 20px;background:#fff}
  .qr-box{display:inline-block;padding:16px;background:#f8f9fa;border-radius:16px;border:1px solid #e5e7eb}
  .qr-box img{display:block;border-radius:4px}
  .code{text-align:center;font-size:26px;font-weight:900;letter-spacing:5px;color:#7B5CFF;font-family:'Courier New',monospace;margin:20px 0 6px}
  .code-hint{text-align:center;font-size:12px;color:#9ca3af;margin-bottom:20px}
  .dashed{border-top:2px dashed #d1d5db;margin:0 24px}
  .info{padding:20px 24px 28px}
  .info-row{display:flex;align-items:center;gap:10px;margin-bottom:14px;font-size:14px;color:#4b5563}
  .info-row .icon{width:32px;height:32px;border-radius:16px;background:#f5f3ff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .info-row svg{flex-shrink:0}
  .badge{display:inline-block;padding:8px 20px;border-radius:12px;font-size:12px;font-weight:700;color:#fff;background:${ticket.checkedIn ? '#EF4444' : '#10B981'}}
  .footer{text-align:center;padding:16px 24px 24px;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6}
  @media print{body{background:#fff;padding:20px}.ticket{box-shadow:none;width:100%;max-width:420px;margin:auto}}
</style>
</head>
<body>
<div class="ticket">
  <div class="header">
    <h2>EVENTHUB</h2>
    <h1>${ticket.eventTitle}</h1>
  </div>
  <div class="qr-section">
    <div class="qr-box"><img src="${qrUrl}" width="200" height="200" alt="QR Code"/></div>
  </div>
  <div class="code">${ticket.code}</div>
  <div class="code-hint">Pr\u00e9sente ce code ou le QR \u00e0 l'entr\u00e9e</div>
  <div class="dashed"></div>
  <div class="info">
    <div class="info-row"><div class="icon"><svg width="16" height="16" fill="#7B5CFF" viewBox="0 0 512 512"><path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0 256 256 0 1 1-512 0zm232-136v136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/></svg></div>${ticket.eventDate} &middot; ${ticket.eventTime}</div>
    <div class="info-row"><div class="icon"><svg width="16" height="16" fill="#7B5CFF" viewBox="0 0 384 512"><path d="M215.7 499.2C267 435 384 279.4 384 192 384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2 12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg></div>${ticket.eventLocation}</div>
    <div style="margin-top:8px"><span class="badge">${ticket.checkedIn ? '\u2713 UTILIS\u00c9' : '\u2713 VALIDE'}</span></div>
  </div>
  <div class="footer">Billet g\u00e9n\u00e9r\u00e9 par EventHub &mdash; Conservez ce document</div>
</div>
<script>window.onload=function(){window.print()}<\/script>
</body>
</html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank');
        if (!w) {
          // Fallback : télécharger le fichier HTML
          const a = document.createElement('a');
          a.href = url;
          a.download = `billet-${ticket.code}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (error) {
        console.error('Download ticket error:', error);
        window.alert('Impossible de télécharger le billet. Réessaie.');
      } finally {
        setDownloadingPdf(false);
      }
    } else {
      Alert.alert(
        'Billet numérique',
        'Votre billet avec QR code est disponible directement dans l\'application. Vous pouvez faire une capture d\'écran pour le sauvegarder.',
        [{ text: 'OK' }]
      );
    }
  };

  /** Annule une réservation : supprime le ticket Firestore et appelle l'API backend pour les événements internes. */
  const handleCancelReservation = async (ticket: Ticket) => {
    const doCancel = async () => {
      setCancelling(true);
      try {
        await deleteDoc(doc(db, 'tickets', ticket.id));
        const isBackendEvent = !ticket.eventId.startsWith('external_');
        if (isBackendEvent) {
          try {
            await leaveEvent(ticket.eventId);
          } catch {
            // Ignorer si l'API refuse (ex. déjà annulé)
          }
        }
        setSelectedTicket(null);
        if (Platform.OS === 'web') {
          window.alert('Ton billet a été supprimé.');
        } else {
          Alert.alert('Réservation annulée', 'Ton billet a été supprimé.');
        }
      } catch (error: any) {
        console.error('Cancel ticket error:', error);
        if (Platform.OS === 'web') {
          window.alert('Impossible d\'annuler la réservation. Réessaie.');
        } else {
          Alert.alert('Erreur', 'Impossible d\'annuler la réservation. Réessaie.');
        }
      } finally {
        setCancelling(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Es-tu sûr de vouloir annuler ta réservation pour "${ticket.eventTitle}" ? Ton billet sera supprimé.`)) {
        await doCancel();
      }
    } else {
      Alert.alert(
        'Annuler la réservation',
        `Es-tu sûr de vouloir annuler ta réservation pour "${ticket.eventTitle}" ? Ton billet sera supprimé.`,
        [
          { text: 'Non', style: 'cancel' },
          { text: 'Oui, annuler', style: 'destructive', onPress: doCancel },
        ]
      );
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // orderBy retiré du query Firestore pour éviter la création d'un index composite.
    // Le tri par date de création est fait côté client après réception du snapshot.
    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('userId', '==', user.uid)
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

  /** Rendu d'un billet sous forme de carte verticale : header gradient, QR code, ligne pointillée de séparation et infos événement. */
  const renderTicket = ({ item }: { item: Ticket }) => {
    return (
      <TouchableOpacity
        onPress={() => setSelectedTicket(item)}
        activeOpacity={0.9}
        style={{
          backgroundColor: theme.card,
          borderRadius: 24,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: theme.borderLight,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        {/* Header du billet avec gradient */}
        <LinearGradient
          colors={['#7B5CFF', '#9B7FFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            alignItems: 'center',
            paddingTop: 24,
            paddingBottom: 16,
          }}
        >
          <View style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="ticket" size={28} color="#FFFFFF" />
          </View>
          <Text style={{
            fontSize: 16,
            fontWeight: '700',
            color: '#FFFFFF',
            marginTop: 8,
            letterSpacing: 1,
          }}>
            EVENTHUB
          </Text>
        </LinearGradient>

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
            color: theme.text,
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

          {/* Badge et code avec gradient */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <View
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                shadowColor: item.checkedIn ? '#EF4444' : '#10B981',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <LinearGradient
                colors={item.checkedIn ? ['#EF4444', '#DC2626'] : ['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  letterSpacing: 0.5,
                }}>
                  {item.checkedIn ? '✓ UTILISÉ' : '✓ VALIDE'}
                </Text>
              </LinearGradient>
            </View>
            <View style={{
              backgroundColor: `${theme.primary}10`,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}>
              <Text style={{
                fontSize: 13,
                fontWeight: '700',
                color: theme.primary,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              }}>
                #{item.code}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /** Sépare les billets en « à venir » et « passés » selon la date/heure de l'événement (format DD/MM/YYYY supporté). */
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
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={[theme.primary, `${theme.primary}DD`, theme.background]}
        locations={[0, 0.5, 1]}
        style={{
          paddingTop: Platform.OS === 'ios' ? 60 : 20,
          paddingBottom: 20,
          paddingHorizontal: 20,
        }}
      >
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 24 }}>{t('myTickets')}</Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 13, marginTop: 4 }}>
              {tickets.length} billet{tickets.length > 1 ? 's' : ''}
            </Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      {/* Onglets avec design moderne */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 20,
        gap: 12,
      }}>
        <TouchableOpacity
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.8}
          style={{
            flex: 1,
            paddingVertical: 14,
            alignItems: 'center',
            borderRadius: 16,
            backgroundColor: activeTab === 'upcoming' ? `${theme.primary}15` : theme.card,
            borderWidth: 2,
            borderColor: activeTab === 'upcoming' ? theme.primary : theme.border,
          }}
        >
          <Text style={{
            fontSize: 15,
            fontWeight: '700',
            color: activeTab === 'upcoming' ? theme.primary : theme.textMuted,
          }}>
            {t('upcomingTickets')} ({upcomingTickets.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('past')}
          activeOpacity={0.8}
          style={{
            flex: 1,
            paddingVertical: 14,
            alignItems: 'center',
            borderRadius: 16,
            backgroundColor: activeTab === 'past' ? `${theme.primary}15` : theme.card,
            borderWidth: 2,
            borderColor: activeTab === 'past' ? theme.primary : theme.border,
          }}
        >
          <Text style={{
            fontSize: 15,
            fontWeight: '700',
            color: activeTab === 'past' ? theme.primary : theme.textMuted,
          }}>
            {t('pastTickets')} ({pastTickets.length})
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
            {activeTab === 'upcoming' ? t('noUpcomingTickets') : t('noPastTickets')}
          </Text>
          <Text style={{ color: '#6C757D', textAlign: 'center', marginTop: 8 }}>
            {activeTab === 'upcoming' 
              ? t('noUpcomingTicketsDesc')
              : t('noPastTicketsDesc')}
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

            {/* Bouton Télécharger PDF */}
            <TouchableOpacity
              onPress={() => selectedTicket && handleDownloadPDF(selectedTicket)}
              disabled={downloadingPdf}
              style={{
                marginTop: 16,
                backgroundColor: '#10B981',
                paddingVertical: 14,
                borderRadius: 999,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              {downloadingPdf ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{t('downloadTicket')}</Text>
                </>
              )}
            </TouchableOpacity>

            {!selectedTicket?.checkedIn && (
              <TouchableOpacity
                onPress={() => selectedTicket && handleCancelReservation(selectedTicket)}
                disabled={cancelling}
                style={{
                  marginTop: 12,
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
                  <Text style={{ color: '#EF4444', fontWeight: '700' }}>{t('cancelReservation')}</Text>
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
