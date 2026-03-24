/**
 * @file PaymentScreen.web — Fallback web pour l'écran de paiement.
 *
 * Sur la plateforme web, le SDK Stripe React Native n'est pas disponible.
 * Cet écran affiche un message invitant l'utilisateur à effectuer le
 * paiement depuis l'application mobile native (iOS / Android).
 *
 * @requires ../../theme/ThemeContext - Thème clair / sombre
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

export const PaymentScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Paiement</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <Ionicons name="phone-portrait-outline" size={48} color={theme.textSecondary} />
        <Text style={[styles.title, { color: theme.text }]}>
          Paiement sur l'app mobile
        </Text>
        <Text style={[styles.message, { color: theme.textSecondary }]}>
          Le paiement par carte est disponible dans l'application EventHub sur iOS ou Android. Utilisez Expo Go ou une build native pour payer.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
});
