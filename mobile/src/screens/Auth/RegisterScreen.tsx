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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';
import { validateEmail, checkEmailExists } from '../../utils/emailValidator';

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
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  // Calculer la force du mot de passe (utilise le thème pour s'adapter au mode sombre)
  const getPasswordStrength = () => {
    if (password.length === 0) return { label: '', color: theme.border, width: 0 };
    if (password.length < 6) return { label: 'Faible', color: theme.error, width: 33 };
    if (password.length < 10) return { label: 'Moyen', color: theme.warning, width: 66 };
    return { label: 'Fort', color: theme.success, width: 100 };
  };

  const passwordStrength = getPasswordStrength();

  useEffect(() => {
    const checkEmail = async () => {
      if (!emailTouched || !email) {
        setEmailError(null);
        return;
      }

      const validation = validateEmail(email);
      if (!validation.isValid) {
        setEmailError(validation.error || 'Email invalide');
        return;
      }

      setIsCheckingEmail(true);
      const exists = await checkEmailExists(email);
      setIsCheckingEmail(false);

      if (exists) {
        setEmailError('Cet email est déjà utilisé');
      } else {
        setEmailError(null);
      }
    };

    const timer = setTimeout(checkEmail, 500);
    return () => clearTimeout(timer);
  }, [email, emailTouched]);

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Erreur', 'Tous les champs sont requis');
      return;
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      Alert.alert('Erreur', emailValidation.error || 'Email invalide');
      return;
    }

    if (emailError) {
      Alert.alert('Erreur', emailError);
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
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

      console.log('Sending email verification...');
      try {
        await sendEmailVerification(credential.user);
        Alert.alert(
          'Succès',
          'Compte créé ! Un email de vérification a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } catch (verificationError) {
        console.warn('Email verification failed:', verificationError);
        Alert.alert(
          'Succès',
          'Compte créé. Tu peux maintenant te connecter.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
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
          Créer un compte
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: theme.textMuted,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Rejoignez la communauté EventHub
        </Text>

        {/* Sélection du rôle */}
        <View style={{ flexDirection: 'row', marginBottom: 20, gap: 12 }}>
          <TouchableOpacity
            onPress={() => setRole('user')}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 25,
              alignItems: 'center',
              backgroundColor: role === 'user' ? theme.primary : 'transparent',
              borderWidth: 1,
              borderColor: role === 'user' ? theme.primary : theme.textMuted,
            }}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: role === 'user' ? theme.buttonPrimaryText : theme.textMuted,
            }}>
              Participant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setRole('organizer')}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 25,
              alignItems: 'center',
              backgroundColor: role === 'organizer' ? theme.primary : 'transparent',
              borderWidth: 1,
              borderColor: role === 'organizer' ? theme.primary : theme.textMuted,
            }}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: role === 'organizer' ? theme.buttonPrimaryText : theme.textMuted,
            }}>
              Organisateur
            </Text>
          </TouchableOpacity>
        </View>

        {/* Champ Prénom */}
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
          <Ionicons name="person-outline" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Prénom"
            placeholderTextColor={theme.inputPlaceholder}
            style={{
              flex: 1,
              fontSize: 16,
              color: theme.text,
            }}
          />
        </View>

        {/* Champ Nom */}
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
          <Ionicons name="person-outline" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Nom"
            placeholderTextColor={theme.inputPlaceholder}
            style={{
              flex: 1,
              fontSize: 16,
              color: theme.text,
            }}
          />
        </View>

        {/* Champ Email */}
        <View style={{ marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.inputBackground,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: emailError && emailTouched ? theme.error : emailTouched && !emailError && !isCheckingEmail ? theme.success : theme.border,
            }}
          >
            <Ionicons name="mail-outline" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              onBlur={() => setEmailTouched(true)}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor={theme.inputPlaceholder}
              style={{
                flex: 1,
                fontSize: 16,
                color: theme.text,
              }}
            />
            {isCheckingEmail && <ActivityIndicator size="small" color={theme.primary} />}
            {!isCheckingEmail && emailTouched && !emailError && email && (
              <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            )}
            {emailError && emailTouched && (
              <Ionicons name="close-circle" size={20} color={theme.error} />
            )}
          </View>
          {emailError && emailTouched && (
            <Text style={{ fontSize: 12, color: theme.error, marginTop: 4, marginLeft: 4 }}>
              {emailError}
            </Text>
          )}
        </View>

        {/* Champ Téléphone */}
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
          <Ionicons name="call-outline" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            placeholder="+33 6 12 34 56 78"
            placeholderTextColor={theme.inputPlaceholder}
            style={{
              flex: 1,
              fontSize: 16,
              color: theme.text,
            }}
          />
        </View>

        {/* Champ Mot de passe */}
        <View style={{ marginBottom: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.inputBackground,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Mot de passe"
              placeholderTextColor={theme.inputPlaceholder}
              style={{
                flex: 1,
                fontSize: 16,
                color: theme.text,
              }}
            />
          </View>
          
          {/* Barre de force du mot de passe */}
          {password.length > 0 && (
            <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
              <View
                style={{
                  height: 4,
                  backgroundColor: theme.border,
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
                <Text style={{ fontSize: 12, color: theme.textMuted }}>
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
            backgroundColor: theme.inputBackground,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Confirmation mot de passe"
            placeholderTextColor={theme.inputPlaceholder}
            style={{
              flex: 1,
              fontSize: 16,
              color: theme.text,
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
              borderColor: acceptTerms ? theme.primary : theme.border,
              backgroundColor: acceptTerms ? theme.primary : theme.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            {acceptTerms && <Ionicons name="checkmark" size={16} color={theme.buttonPrimaryText} />}
          </View>
          <Text style={{ fontSize: 14, color: theme.textMuted }}>
            J'accepte les{' '}
            <Text
              style={{ color: theme.primary, fontWeight: '600' }}
              onPress={() => Alert.alert('CGU', 'Conditions Générales d\'Utilisation à venir')}
            >
              CGU
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Bouton S'inscrire */}
        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 24,
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={{ color: theme.buttonPrimaryText, fontWeight: '600', fontSize: 16 }}>
            {loading ? 'Création...' : 'S\'inscrire'}
          </Text>
        </TouchableOpacity>

        {/* Indicateur de page */}
        <View
          style={{
            height: 4,
            width: 134,
            backgroundColor: theme.border,
            borderRadius: 2,
            alignSelf: 'center',
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;