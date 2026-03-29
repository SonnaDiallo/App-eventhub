/**
 * @file PaymentScreen — Écran de paiement natif via Stripe.
 *
 * Orchestre le flux complet de paiement : création d'un PaymentIntent côté
 * backend, saisie des informations de carte via le composant Stripe CardField,
 * puis confirmation du paiement côté Stripe et backend.
 * En cas de succès, redirige l'utilisateur vers la liste de ses billets.
 * Ce composant n'est utilisé que sur iOS/Android (la version web a un fallback).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CardField, useStripe, usePlatformPay, PlatformPayButton, PlatformPay } from '@stripe/stripe-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { createPaymentIntent, confirmPayment } from '../../services/paymentService';
import { scheduleEventReminder } from '../../services/notificationService';

type PaymentScreenRouteProp = RouteProp<
  {
    Payment: {
      eventId: string;
      eventTitle: string;
      amount: number;
      ticketId: string;
      eventDate?: string;
      eventTime?: string;
    };
  },
  'Payment'
>;

export const PaymentScreen = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<PaymentScreenRouteProp>();
  
  const { eventId, eventTitle, amount, ticketId, eventDate, eventTime } = route.params;
  
  const { confirmPayment: stripeConfirmPayment } = useStripe();
  const { isPlatformPaySupported, confirmPlatformPayPayment } = usePlatformPay();

  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [platformPayReady, setPlatformPayReady] = useState(false);

  useEffect(() => {
    initializePayment();
  }, []);

  useEffect(() => {
    (async () => {
      const supported = await isPlatformPaySupported(
        Platform.OS === 'android' ? { googlePay: { testEnv: true } } : undefined
      );
      setPlatformPayReady(supported);
    })();
  }, []);

  const initializePayment = async () => {
    try {
      setLoading(true);
      const response = await createPaymentIntent(eventId, amount);
      setPaymentIntentId(response.paymentIntentId);
      setClientSecret(response.clientSecret);
    } catch (error: any) {
      console.error('Error initializing payment:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'initialiser le paiement. Veuillez réessayer.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  };

  const onPaymentSuccess = async (piId: string) => {
    await confirmPayment(piId, ticketId);

    if (Platform.OS !== 'web' && eventDate) {
      try {
        const eventDateObj = new Date(eventDate);
        if (!isNaN(eventDateObj.getTime())) {
          if (eventTime) {
            const tm = eventTime.match(/(\d{2}):(\d{2})/);
            if (tm) eventDateObj.setHours(parseInt(tm[1] ?? '0'), parseInt(tm[2] ?? '0'), 0);
          }
          await scheduleEventReminder(eventId, eventTitle, eventDateObj, 1440);
        }
      } catch (_) {}
    }

    Alert.alert(
      'Paiement réussi ! 🎉',
      'Votre billet a été confirmé. Vous pouvez le retrouver dans "Mes billets".',
      [{ text: 'Voir mes billets', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'MyTickets' }] }) }]
    );
  };

  const handlePlatformPay = async () => {
    if (!clientSecret || !paymentIntentId) return;
    setLoading(true);
    try {
      const params = Platform.OS === 'ios'
        ? {
            applePay: {
              cartItems: [{ label: 'EventHub', amount: amount.toFixed(2), paymentType: PlatformPay.PaymentType.Immediate }],
              merchantCountryCode: 'FR',
              currencyCode: 'EUR',
            },
          }
        : {
            googlePay: {
              testEnv: true,
              merchantName: 'EventHub',
              merchantCountryCode: 'FR',
              currencyCode: 'EUR',
            },
          };

      const { error } = await confirmPlatformPayPayment(clientSecret, params as any);
      if (error) {
        if (error.code !== 'Canceled') Alert.alert('Paiement échoué', error.message || '');
        return;
      }
      await onPaymentSuccess(paymentIntentId);
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Erreur de paiement');
    } finally {
      setLoading(false);
    }
  };


  /**
   * Confirme le paiement auprès de Stripe puis notifie le backend
   * pour associer le paiement au billet.
   */
  const handlePayment = async () => {
    if (!clientSecret || !stripeConfirmPayment || !cardComplete) {
      Alert.alert('Erreur', 'Veuillez remplir toutes les informations de carte.');
      return;
    }

    try {
      setLoading(true);

      // Confirmer le paiement avec Stripe
      const { error, paymentIntent } = await stripeConfirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('Payment error:', error);
        Alert.alert('Paiement échoué', error.message || 'Une erreur est survenue.');
        return;
      }

      if (paymentIntent?.status === 'Succeeded') {
        await onPaymentSuccess(paymentIntent.id);
      } else {
        Alert.alert('Erreur', 'Le paiement n\'a pas pu être confirmé.');
      }
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Une erreur est survenue lors du paiement.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Résumé de la commande */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé de la commande</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Événement</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {eventTitle}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>Total</Text>
            <Text style={styles.summaryValueBold}>{amount.toFixed(2)} €</Text>
          </View>
        </View>

        {/* Apple Pay / Google Pay */}
        {platformPayReady && clientSecret && (
          <>
            <PlatformPayButton
              onPress={handlePlatformPay}
              type={PlatformPay.ButtonType.Pay}
              appearance={PlatformPay.ButtonStyle.Black}
              borderRadius={12}
              style={{ width: '100%', height: 50, marginBottom: 12 }}
            />
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou payez par carte</Text>
              <View style={styles.separatorLine} />
            </View>
          </>
        )}

        {/* Informations de paiement */}
        <View style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Informations de paiement</Text>
          <Text style={styles.sectionSubtitle}>
            Paiement sécurisé par Stripe
          </Text>

          {loading && !clientSecret ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.loadingText}>Initialisation du paiement...</Text>
            </View>
          ) : (
            <View style={styles.cardFieldContainer}>
              <CardField
                postalCodeEnabled={false}
                placeholders={{
                  number: '4242 4242 4242 4242',
                }}
                cardStyle={{
                  backgroundColor: theme.card,
                  textColor: theme.text,
                  placeholderColor: theme.textSecondary,
                }}
                style={styles.cardField}
                onCardChange={(cardDetails) => {
                  setCardComplete(cardDetails.complete);
                }}
              />
            </View>
          )}

          {/* Icônes de cartes acceptées */}
          <View style={styles.cardIconsContainer}>
            <Text style={styles.acceptedCardsText}>Cartes acceptées :</Text>
            <View style={styles.cardIcons}>
              <Ionicons name="card" size={24} color={theme.textSecondary} />
              <Text style={styles.cardIconText}>Visa, Mastercard, Amex</Text>
            </View>
          </View>
        </View>

        {/* Informations de sécurité */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
          <Text style={styles.securityText}>
            Vos informations de paiement sont sécurisées et cryptées
          </Text>
        </View>
      </ScrollView>

      {/* Bouton de paiement */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            (!cardComplete || loading) && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={!cardComplete || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
              <Text style={styles.payButtonText}>
                Payer {amount.toFixed(2)} €
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 50,
      paddingBottom: 16,
      backgroundColor: theme.header,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    summaryCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      flex: 1,
    },
    summaryValue: {
      fontSize: 14,
      color: theme.text,
      flex: 1,
      textAlign: 'right',
    },
    summaryLabelBold: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    summaryValueBold: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.primary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 8,
    },
    paymentCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 16,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.textSecondary,
    },
    cardFieldContainer: {
      marginBottom: 16,
    },
    cardField: {
      width: '100%',
      height: 50,
      marginVertical: 8,
    },
    cardIconsContainer: {
      marginTop: 12,
    },
    acceptedCardsText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    cardIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardIconText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    securityInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 8,
      padding: 12,
      gap: 8,
    },
    securityText: {
      flex: 1,
      fontSize: 12,
      color: theme.textSecondary,
    },
    footer: {
      padding: 16,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    payButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    payButtonDisabled: {
      backgroundColor: theme.textSecondary,
      opacity: 0.5,
    },
    payButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    expressButton: {
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    expressButtonText: {
      fontSize: 16,
      fontWeight: '700',
    },
    separator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 8,
      marginBottom: 16,
    },
    separatorLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    separatorText: {
      marginHorizontal: 12,
      fontSize: 13,
      color: theme.textSecondary,
    },
  });
