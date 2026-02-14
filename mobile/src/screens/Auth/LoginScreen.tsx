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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../../services/firebase';
import { saveToken } from '../../services/authStorage';
import { api } from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Email et mot de passe requis');
      return;
    }

    try {
      setLoading(true);
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      const idToken = await credential.user.getIdToken();
      await saveToken(idToken);

      // Synchroniser l'utilisateur vers MongoDB (backend) pour événements / billets
      api.get('/auth/me').catch(() => {});

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

      // Tous les utilisateurs (participants et organisateurs) vont sur la page d'accueil
      // Les organisateurs peuvent accéder au tableau de bord depuis leur profil
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeParticipant' }],
      });
    } catch (error: any) {
      console.error('Login error', error?.message);
      Alert.alert(
        'Erreur',
        error?.message || 'Impossible de se connecter'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8F9FA' }}
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
        {/* Bouton retour */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        {/* Header */}
        <Text
          style={{
            fontSize: 32,
            fontWeight: '700',
            color: '#000',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Bon retour !
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: '#6C757D',
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
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#DEE2E6',
          }}
        >
          <Ionicons name="at" size={20} color="#6C757D" style={{ marginRight: 12 }} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="votre@email.com"
            placeholderTextColor="#ADB5BD"
            style={{
              flex: 1,
              fontSize: 16,
              color: '#000',
            }}
          />
        </View>

        {/* Champ Mot de passe */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: '#DEE2E6',
          }}
        >
          <Ionicons name="lock-closed" size={20} color="#6C757D" style={{ marginRight: 12 }} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            placeholderTextColor="#ADB5BD"
            style={{
              flex: 1,
              fontSize: 16,
              color: '#000',
            }}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#6C757D"
            />
          </TouchableOpacity>
        </View>

        {/* Mot de passe oublié */}
        <TouchableOpacity
          style={{ alignSelf: 'flex-end', marginBottom: 24 }}
          onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
        >
          <Text style={{ color: '#7B5CFF', fontSize: 14, fontWeight: '500' }}>
            Mot de passe oublié ?
          </Text>
        </TouchableOpacity>

        {/* Bouton Se connecter */}
        <TouchableOpacity
          style={{
            backgroundColor: '#7B5CFF',
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 24,
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
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
          <View style={{ flex: 1, height: 1, backgroundColor: '#DEE2E6' }} />
          <Text style={{ marginHorizontal: 16, color: '#6C757D', fontSize: 14 }}>ou</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#DEE2E6' }} />
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
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#DEE2E6',
            }}
            onPress={() => Alert.alert('Info', 'Connexion Google à venir')}
          >
            <Ionicons name="logo-google" size={24} color="#DB4437" />
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#DEE2E6',
            }}
            onPress={() => Alert.alert('Info', 'Connexion Apple à venir')}
          >
            <Ionicons name="logo-apple" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#6C757D', fontSize: 14 }}>Pas encore inscrit ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={{ color: '#7B5CFF', fontSize: 14, fontWeight: '600' }}>
              S'inscrire
            </Text>
          </TouchableOpacity>
        </View>

        {/* Indicateur de page */}
        <View
          style={{
            height: 4,
            width: 134,
            backgroundColor: '#DEE2E6',
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