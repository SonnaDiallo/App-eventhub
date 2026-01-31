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
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'organizer'>('user');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Erreur', 'Prénom, nom, email et mot de passe requis');
      return;
    }

    const fullName = `${firstName} ${lastName}`;

    try {
      setLoading(true);
      console.log('Creating Firebase Auth user...');
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      console.log('User created:', credential.user.uid);

      console.log('Updating profile...');
      await updateProfile(credential.user, {
        displayName: fullName,
      });
      console.log('Profile updated');

      // Firestore write (non-blocking - don't let it block registration)
      console.log('Writing to Firestore...');
      setDoc(doc(db, 'users', credential.user.uid), {
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
        .then(() => console.log('Firestore write complete'))
        .catch((err) => console.warn('Firestore write failed:', err?.message));

      Alert.alert('Succès', 'Compte créé. Tu peux maintenant te connecter.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (error: any) {
      console.error('Register error:', error?.code, error?.message);
      Alert.alert(
        'Erreur',
        `Firebase: Error (${error?.code || 'unknown'}).`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
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
            color: theme.text,
            fontSize: 28,
            fontWeight: '700',
            marginBottom: 6,
          }}
        >
          Inscription
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 14, marginBottom: 20 }}>
          Crée ton compte pour commencer.
        </Text>

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.inputBackground,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 4,
            marginBottom: 14,
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 999,
              alignItems: 'center',
              backgroundColor: role === 'user' ? theme.primary : 'transparent',
            }}
            onPress={() => setRole('user')}
          >
            <Text
              style={{
                color: role === 'user' ? theme.buttonPrimaryText : theme.text,
                fontWeight: role === 'user' ? '600' : '500',
                fontSize: 13,
              }}
            >
              Participant
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 999,
              alignItems: 'center',
              backgroundColor: role === 'organizer' ? theme.primary : 'transparent',
            }}
            onPress={() => setRole('organizer')}
          >
            <Text
              style={{
                color: role === 'organizer' ? theme.buttonPrimaryText : theme.text,
                fontWeight: role === 'organizer' ? '600' : '500',
                fontSize: 13,
              }}
            >
              Organisateur
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: theme.textMuted, marginBottom: 8 }}>Prénom</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Ton prénom"
            placeholderTextColor={theme.inputPlaceholder}
            style={{
              color: theme.text,
              borderWidth: 1,
              borderColor: theme.border,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 12,
              marginBottom: 12,
              backgroundColor: theme.inputBackground,
            }}
          />

          <Text style={{ color: theme.textMuted, marginBottom: 8 }}>Nom</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Ton nom de famille"
            placeholderTextColor={theme.inputPlaceholder}
            style={{
              color: theme.text,
              borderWidth: 1,
              borderColor: theme.border,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 12,
              marginBottom: 12,
              backgroundColor: theme.inputBackground,
            }}
          />

          <Text style={{ color: theme.textMuted, marginBottom: 8 }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ex: nom@email.com"
            placeholderTextColor={theme.inputPlaceholder}
            style={{
              color: theme.text,
              borderWidth: 1,
              borderColor: theme.border,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 12,
              marginBottom: 12,
              backgroundColor: theme.inputBackground,
            }}
          />

          <Text style={{ color: theme.textMuted, marginBottom: 8 }}>Mot de passe</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Choisis un mot de passe"
            placeholderTextColor={theme.inputPlaceholder}
            style={{
              color: theme.text,
              borderWidth: 1,
              borderColor: theme.border,
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: theme.inputBackground,
            }}
          />
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            paddingVertical: 14,
            borderRadius: 999,
            alignItems: 'center',
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={{ color: theme.buttonPrimaryText, fontWeight: '600', fontSize: 16 }}>
            {loading ? 'Création...' : 'Créer un compte'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            marginTop: 12,
            borderWidth: 1,
            borderColor: theme.primary,
            paddingVertical: 14,
            borderRadius: 999,
            alignItems: 'center',
          }}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={{ color: theme.text, fontWeight: '500', fontSize: 16 }}>
            J'ai déjà un compte
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;