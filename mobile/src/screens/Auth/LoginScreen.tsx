/**
 * @module LoginScreen
 * @description Écran de connexion de l'application EventHub.
 *
 * Permet à l'utilisateur de se connecter via :
 * - Email / mot de passe (Firebase Auth)
 * - Google Sign-In (OAuth via Expo AuthSession)
 * - Apple Sign-In (iOS uniquement)
 *
 * Comportements notables :
 * - Vérifie au montage si une session Firebase est déjà active (auto-login).
 * - Bloque la connexion tant que l'email n'est pas vérifié, avec option de renvoi.
 * - Redirige vers AdminHome ou HomeParticipant selon le rôle Firestore.
 * - `navigation.reset` est utilisé après connexion pour empêcher le retour arrière.
 *
 * @requires firebase/auth - signInWithEmailAndPassword, sendEmailVerification
 * @requires ../../services/socialAuth - Google & Apple OAuth helpers
 */
/**
 * @file LoginScreen.tsx
 * @description Écran de connexion principal de l'application EventHub.
 *
 * Permet à l'utilisateur de s'authentifier via email/mot de passe, Google ou Apple.
 * Gère la vérification de l'email, la redirection automatique si l'utilisateur
 * est déjà connecté, et l'aiguillage vers l'espace admin ou participant selon le rôle.
 */

import React, { useState, useEffect } from 'react';
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
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../../services/firebase';
import { saveToken } from '../../services/authStorage';
import { useTheme } from '../../theme/ThemeContext';
import { useGoogleAuth, signInWithGoogleToken, signInWithApple, signInWithGooglePopup } from '../../services/socialAuth';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const { request, response, promptAsync } = useGoogleAuth();

  // Auto-login : si l'utilisateur a déjà une session Firebase avec email vérifié,
  // on le redirige immédiatement (exécuté une seule fois grâce au guard hasCheckedAuth)
  useEffect(() => {
    if (hasCheckedAuth) return;
    
    const checkAuth = async () => {
      const user = auth.currentUser;
      if (user && user.emailVerified) {
        try {
          const token = await user.getIdToken();
          await saveToken(token);
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          const role = userDoc.exists() ? userDoc.data()?.role : undefined;
          if (role === 'admin') {
            navigation.replace('AdminHome' as any);
          } else {
            navigation.replace('HomeParticipant' as any);
          }
        } catch (error) {
          console.error('Auto-login error:', error);
        }
      }
      setHasCheckedAuth(true);
    };
    
    checkAuth();
  }, [hasCheckedAuth]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleSignInWithToken(id_token);
    }
  }, [response]);

  /**
   * Authentifie l'utilisateur par email/mot de passe via Firebase Auth.
   * Vérifie que l'email est confirmé avant d'autoriser l'accès, puis
   * redirige vers l'espace approprié (admin ou participant) selon le rôle Firestore.
   */
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Email et mot de passe requis');
      return;
    }

    try {
      setLoading(true);
      console.log('🔐 Tentative de connexion avec:', email.trim().toLowerCase());
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      // Sécurité : empêche la connexion si l'email n'a pas été confirmé.
      // Propose un renvoi du mail de vérification via import dynamique pour
      // éviter de charger sendEmailVerification au démarrage.
      if (!credential.user.emailVerified) {
        Alert.alert(
          'Email non vérifié',
          'Veuillez vérifier votre email avant de vous connecter. Un email de vérification vous a été envoyé lors de votre inscription.',
          [
            {
              text: 'Renvoyer l\'email',
              onPress: async () => {
                try {
                  const { sendEmailVerification } = await import('firebase/auth');
                  await sendEmailVerification(credential.user);
                  Alert.alert('Succès', 'Email de vérification renvoyé !');
                } catch (error) {
                  Alert.alert('Erreur', 'Impossible de renvoyer l\'email');
                }
              }
            },
            { text: 'OK' }
          ]
        );
        await auth.signOut();
        setLoading(false);
        return;
      }

      const idToken = await credential.user.getIdToken();
      await saveToken(idToken);

      const uid = credential.user.uid;
      const profileSnap = await getDoc(doc(db, 'users', uid));

      const role = profileSnap.exists() ? profileSnap.data()?.role : undefined;
      const firstName = profileSnap.exists() ? profileSnap.data()?.firstName : undefined;
      const lastName = profileSnap.exists() ? profileSnap.data()?.lastName : undefined;
      const name = firstName && lastName
        ? `${firstName} ${lastName}`
        : profileSnap.exists()
          ? profileSnap.data()?.name
          : credential.user.displayName;

      Alert.alert('Succès', `Bienvenue ${name || ''}`.trim());

      if (role === 'admin') {
        navigation.reset({ index: 0, routes: [{ name: 'AdminHome' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'HomeParticipant' }] });
      }
    } catch (error: any) {
      console.error('Login error Firebase:', error?.code, error?.message);

      let message = 'Impossible de se connecter. Vérifie ta connexion internet.';
      switch (error?.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          message = 'Email ou mot de passe incorrect. Si tu as réinitialisé ton mot de passe, vérifie que tu as bien cliqué sur le lien reçu par email (regarde aussi dans les spams).';
          break;
        case 'auth/invalid-email':
          message = 'Adresse email invalide.';
          break;
        case 'auth/user-disabled':
          message = 'Ce compte a été désactivé. Contacte le support.';
          break;
        case 'auth/too-many-requests':
          message = 'Trop de tentatives. Réessaie dans quelques minutes.';
          break;
        case 'auth/network-request-failed':
          message = 'Erreur réseau. Vérifie ta connexion internet.';
          break;
      }

      Alert.alert('Erreur de connexion', message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Lance le flux d'authentification Google via le prompt OAuth natif.
   * Le résultat est traité dans le useEffect qui écoute `response`.
   */
  const handleGoogleSignIn = async () => {
    try {
      setSocialLoading(true);
      
      // Utiliser Firebase popup pour le web, expo-auth-session pour mobile
      if (Platform.OS === 'web') {
        const result = await signInWithGooglePopup();
        
        if (!result.success) {
          Alert.alert('Erreur', result.error || 'Impossible de se connecter avec Google');
          setSocialLoading(false);
          return;
        }
        
        if (result.user) {
          const token = await result.user.user.getIdToken();
          await saveToken(token);
          
          const uid = result.user.user.uid;
          const profileSnap = await getDoc(doc(db, 'users', uid));
          const role = profileSnap.exists() ? profileSnap.data()?.role : undefined;
          const firstName = profileSnap.exists() ? profileSnap.data()?.firstName : undefined;
          const lastName = profileSnap.exists() ? profileSnap.data()?.lastName : undefined;
          const name = firstName && lastName ? `${firstName} ${lastName}` : result.user.user.displayName;
          
          Alert.alert('Succès', `Bienvenue ${name || ''}`.trim());
          
          if (role === 'admin') {
            navigation.reset({ index: 0, routes: [{ name: 'AdminHome' }] });
          } else {
            navigation.reset({ index: 0, routes: [{ name: 'HomeParticipant' }] });
          }
        }
      } else {
        await promptAsync();
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      Alert.alert('Erreur', 'Impossible de se connecter avec Google');
    } finally {
      setSocialLoading(false);
    }
  };

  /**
   * Finalise la connexion Google en échangeant le token OAuth contre
   * une session Firebase, puis redirige selon le rôle utilisateur.
   * @param idToken - Token d'identité Google reçu du flux OAuth
   */
  const handleGoogleSignInWithToken = async (idToken: string) => {
    try {
      const result = await signInWithGoogleToken(idToken);

      if (!result.success) {
        Alert.alert('Erreur', result.error || 'Impossible de se connecter avec Google');
        setSocialLoading(false);
        return;
      }

      if (result.user) {
        const token = await result.user.user.getIdToken();
        await saveToken(token);

        const uid = result.user.user.uid;
        const profileSnap = await getDoc(doc(db, 'users', uid));
        const role = profileSnap.exists() ? profileSnap.data()?.role : undefined;
        const firstName = profileSnap.exists() ? profileSnap.data()?.firstName : undefined;
        const lastName = profileSnap.exists() ? profileSnap.data()?.lastName : undefined;
        const name = firstName && lastName ? `${firstName} ${lastName}` : result.user.user.displayName;

        Alert.alert('Succès', `Bienvenue ${name || ''}`.trim());

        if (role === 'admin') {
          navigation.reset({ index: 0, routes: [{ name: 'AdminHome' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'HomeParticipant' }] });
        }
      }
    } catch (error: any) {
      console.error('Google Sign-In token error:', error);
      Alert.alert('Erreur', 'Impossible de se connecter avec Google');
    } finally {
      setSocialLoading(false);
    }
  };

  /**
   * Gère l'authentification via Apple Sign-In (iOS uniquement).
   * Récupère le profil Firestore pour déterminer le rôle et rediriger en conséquence.
   */
  const handleAppleSignIn = async () => {
    try {
      setSocialLoading(true);
      const result = await signInWithApple();

      if (!result.success) {
        Alert.alert('Erreur', result.error || 'Impossible de se connecter avec Apple');
        return;
      }

      if (result.user) {
        const idToken = await result.user.user.getIdToken();
        await saveToken(idToken);

        const uid = result.user.user.uid;
        const profileSnap = await getDoc(doc(db, 'users', uid));
        const role = profileSnap.exists() ? profileSnap.data()?.role : undefined;
        const firstName = profileSnap.exists() ? profileSnap.data()?.firstName : undefined;
        const lastName = profileSnap.exists() ? profileSnap.data()?.lastName : undefined;
        const name = firstName && lastName ? `${firstName} ${lastName}` : result.user.user.displayName;

        Alert.alert('Succès', `Bienvenue ${name || ''}`.trim());

        if (role === 'admin') {
          navigation.reset({ index: 0, routes: [{ name: 'AdminHome' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'HomeParticipant' }] });
        }
      }
    } catch (error: any) {
      console.error('Apple Sign-In error:', error);
      Alert.alert('Erreur', 'Impossible de se connecter avec Apple');
    } finally {
      setSocialLoading(false);
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
        {/* Header */}
        <Text
          style={{
            fontSize: 32,
            fontWeight: '700',
            color: theme.text,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Bon retour !
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.textMuted,
            textAlign: 'center',
            marginBottom: 40,
          }}
        >
          Connectez-vous pour continuer
        </Text>

        {/* Champ Email */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.inputBackground,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 16,
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
            autoComplete="off"
            style={{
              flex: 1,
              fontSize: 16,
              color: theme.text,
            }}
          />
        </View>

        {/* Champ Mot de passe */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.inputBackground,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons name="lock-closed" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Mot de passe"
            placeholderTextColor={theme.inputPlaceholder}
            autoComplete="off"
            style={{
              flex: 1,
              fontSize: 16,
              color: theme.text,
            }}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={theme.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Mot de passe oublié */}
        <TouchableOpacity
          style={{ alignSelf: 'flex-end', marginBottom: 24 }}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '500' }}>
            Mot de passe oublié ?
          </Text>
        </TouchableOpacity>

        {/* Bouton Se connecter */}
        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 24,
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={{ color: theme.buttonPrimaryText, fontWeight: '600', fontSize: 16 }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </Text>
        </TouchableOpacity>

        {/* Séparateur */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          <Text style={{ marginHorizontal: 16, color: theme.textMuted, fontSize: 14 }}>ou</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        </View>

        {/* Boutons de connexion sociale */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            marginBottom: 40,
          }}
        >
          <TouchableOpacity
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: theme.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.border,
              marginRight: 16,
              opacity: socialLoading ? 0.5 : 1,
            }}
            onPress={handleGoogleSignIn}
            disabled={socialLoading}
          >
            <Ionicons name="logo-google" size={24} color="#DB4437" />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: theme.surface,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.border,
              opacity: socialLoading ? 0.5 : 1,
            }}
            onPress={handleAppleSignIn}
            disabled={socialLoading}
          >
            <Ionicons name="logo-apple" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.textMuted, fontSize: 14 }}>Pas encore inscrit ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '600' }}>
              S'inscrire
            </Text>
          </TouchableOpacity>
        </View>

        {/* Indicateur de page */}
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

export default LoginScreen;