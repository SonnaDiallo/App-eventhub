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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [role, setRole] = useState<'user' | 'organizer'>('user');
  const [loading, setLoading] = useState(false);

  // Calculer la force du mot de passe
  const getPasswordStrength = () => {
    if (password.length === 0) return { label: '', color: '#DEE2E6', width: 0 };
    if (password.length < 6) return { label: 'Faible', color: '#FF6B6B', width: 33 };
    if (password.length < 10) return { label: 'Moyen', color: '#FFD93D', width: 66 };
    return { label: 'Fort', color: '#51CF66', width: 100 };
  };

  const passwordStrength = getPasswordStrength();

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Erreur', 'Tous les champs sont requis');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (!acceptTerms) {
      Alert.alert('Erreur', 'Vous devez accepter les CGU');
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
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
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
            backgroundColor: '#F8F9FA',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
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
          Créer un compte
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: '#6C757D',
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Rejoignez la communauté EventHub
        </Text>

        {/* Champ Prénom */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F8F9FA',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#DEE2E6',
          }}
        >
          <Ionicons name="person-outline" size={20} color="#6C757D" style={{ marginRight: 12 }} />
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Prénom"
            placeholderTextColor="#ADB5BD"
            style={{
              flex: 1,
              fontSize: 16,
              color: '#000',
            }}
          />
        </View>

        {/* Champ Nom */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F8F9FA',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#DEE2E6',
          }}
        >
          <Ionicons name="person-outline" size={20} color="#6C757D" style={{ marginRight: 12 }} />
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Nom"
            placeholderTextColor="#ADB5BD"
            style={{
              flex: 1,
              fontSize: 16,
              color: '#000',
            }}
          />
        </View>

        {/* Champ Email */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F8F9FA',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#DEE2E6',
          }}
        >
          <Ionicons name="mail-outline" size={20} color="#6C757D" style={{ marginRight: 12 }} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#ADB5BD"
            style={{
              flex: 1,
              fontSize: 16,
              color: '#000',
            }}
          />
        </View>

        {/* Champ Téléphone */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F8F9FA',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#DEE2E6',
          }}
        >
          <Ionicons name="call-outline" size={20} color="#6C757D" style={{ marginRight: 12 }} />
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholder="+33 6 12 34 56 78"
            placeholderTextColor="#ADB5BD"
            style={{
              flex: 1,
              fontSize: 16,
              color: '#000',
            }}
          />
        </View>

        {/* Champ Mot de passe */}
        <View style={{ marginBottom: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F8F9FA',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: '#DEE2E6',
            }}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#6C757D" style={{ marginRight: 12 }} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mot de passe"
              placeholderTextColor="#ADB5BD"
              style={{
                flex: 1,
                fontSize: 16,
                color: '#000',
              }}
            />
          </View>
          
          {/* Barre de force du mot de passe */}
          {password.length > 0 && (
            <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
              <View
                style={{
                  height: 4,
                  backgroundColor: '#DEE2E6',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${passwordStrength.width}%`,
                    backgroundColor: passwordStrength.color,
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: passwordStrength.color, fontWeight: '500' }}>
                  Force : {passwordStrength.label}
                </Text>
                <Text style={{ fontSize: 12, color: '#6C757D' }}>
                  {password.length >= 8 ? '8-12 caractères' : `${password.length}/8 min`}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Champ Confirmation mot de passe */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F8F9FA',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#DEE2E6',
          }}
        >
          <Ionicons name="lock-closed-outline" size={20} color="#6C757D" style={{ marginRight: 12 }} />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Confirmation mot de passe"
            placeholderTextColor="#ADB5BD"
            style={{
              flex: 1,
              fontSize: 16,
              color: '#000',
            }}
          />
        </View>

        {/* Checkbox CGU */}
        <TouchableOpacity
          onPress={() => setAcceptTerms(!acceptTerms)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: acceptTerms ? '#7B5CFF' : '#DEE2E6',
              backgroundColor: acceptTerms ? '#7B5CFF' : '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            {acceptTerms && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>
          <Text style={{ fontSize: 14, color: '#6C757D' }}>
            J'accepte les{' '}
            <Text
              style={{ color: '#7B5CFF', fontWeight: '600' }}
              onPress={() => Alert.alert('CGU', 'Conditions Générales d\'Utilisation à venir')}
            >
              CGU
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Bouton S'inscrire */}
        <TouchableOpacity
          style={{
            backgroundColor: '#7B5CFF',
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 24,
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
            {loading ? 'Création...' : 'S\'inscrire'}
          </Text>
        </TouchableOpacity>

        {/* Indicateur de page */}
        <View
          style={{
            height: 4,
            width: 134,
            backgroundColor: '#DEE2E6',
            borderRadius: 2,
            alignSelf: 'center',
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;