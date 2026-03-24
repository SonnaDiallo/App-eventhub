/**
 * @module ForgotPasswordScreen
 * @description Écran de réinitialisation du mot de passe.
 *
 * Permet à l'utilisateur d'entrer son adresse email pour recevoir un lien
 * de réinitialisation via Firebase Auth (`sendPasswordResetEmail`).
 *
 * Gestion des erreurs Firebase :
 * - `auth/user-not-found` → aucun compte associé
 * - `auth/invalid-email` → format invalide
 * - `auth/too-many-requests` → rate-limiting Firebase
 *
 * Après envoi réussi, l'utilisateur est automatiquement redirigé vers l'écran précédent.
 */
/**
 * @file ForgotPasswordScreen.tsx
 * @description Écran de réinitialisation du mot de passe.
 *
 * Permet à l'utilisateur d'entrer son adresse email pour recevoir un lien
 * de réinitialisation via Firebase Auth. Gère les cas d'erreur courants
 * (email introuvable, format invalide, trop de tentatives) avec des
 * messages explicites en français.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Envoie un email de réinitialisation de mot de passe via Firebase Auth.
   * En cas de succès, redirige l'utilisateur vers l'écran précédent (connexion).
   */
  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse email');
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      Alert.alert(
        'Email envoyé',
        'Un lien de réinitialisation a été envoyé à votre adresse email.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      let errorMessage = 'Impossible d\'envoyer l\'email de réinitialisation';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Aucun compte trouvé avec cette adresse email';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Adresse email invalide';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives. Réessayez plus tard.';
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: theme.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Ionicons name="lock-closed" size={40} color={theme.primary} />
          </View>

          <Text
            style={{
              fontSize: 28,
              fontWeight: '700',
              color: theme.text,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            Mot de passe oublié ?
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: theme.textMuted,
              textAlign: 'center',
              paddingHorizontal: 20,
            }}
          >
            Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.inputBackground,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons name="at" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="votre@email.com"
            placeholderTextColor={theme.inputPlaceholder}
            style={{
              flex: 1,
              fontSize: 16,
              color: theme.text,
            }}
          />
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 24,
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handleResetPassword}
          disabled={loading}
        >
          <Text style={{ color: theme.buttonPrimaryText, fontWeight: '600', fontSize: 16 }}>
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.textMuted, fontSize: 14 }}>Vous vous souvenez ? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '600' }}>
              Se connecter
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            height: 4,
            width: 134,
            backgroundColor: theme.border,
            borderRadius: 2,
            alignSelf: 'center',
            marginTop: 24,
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;
