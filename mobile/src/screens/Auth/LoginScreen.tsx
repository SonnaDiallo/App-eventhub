import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../../services/firebase';
import { saveToken } from '../../services/authStorage';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      style={{ flex: 1, backgroundColor: '#050016' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 32,
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: '#ffffff',
            fontSize: 28,
            fontWeight: '700',
            marginBottom: 6,
          }}
        >
          Connexion
        </Text>
        <Text style={{ color: '#c0b8ff', fontSize: 14, marginBottom: 20 }}>
          Connecte-toi pour retrouver tes événements.
        </Text>

        <View
          style={{
            backgroundColor: '#0b0620',
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: 'rgba(123, 92, 255, 0.25)',
            marginBottom: 16,
          }}
        >
          <Text style={{ color: '#c0b8ff', marginBottom: 8 }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ex: nom@email.com"
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
            style={{
              color: '#ffffff',
              borderWidth: 1,
              borderColor: 'rgba(123, 92, 255, 0.25)',
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 12,
              marginBottom: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
            }}
          />

          <Text style={{ color: '#c0b8ff', marginBottom: 8 }}>Mot de passe</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Ton mot de passe"
            placeholderTextColor="rgba(255, 255, 255, 0.35)"
            style={{
              color: '#ffffff',
              borderWidth: 1,
              borderColor: 'rgba(123, 92, 255, 0.25)',
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
            }}
          />
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: '#7b5cff',
            paddingVertical: 14,
            borderRadius: 999,
            alignItems: 'center',
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: '#7b5cff',
            paddingVertical: 14,
            borderRadius: 999,
            alignItems: 'center',
          }}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={{ color: '#ffffff', fontWeight: '500', fontSize: 16 }}>
            Créer un compte
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;