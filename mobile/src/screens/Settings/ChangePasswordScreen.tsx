import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';

const ChangePasswordScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères';
    return null;
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Erreur', 'Veuillez entrer votre mot de passe actuel.');
      return;
    }
    const newErr = validatePassword(newPassword);
    if (newErr) {
      Alert.alert('Erreur', newErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit être différent de l\'actuel.');
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      Alert.alert('Erreur', 'Utilisateur non connecté.');
      return;
    }
    const hasPasswordProvider = user.providerData?.some((p) => p.providerId === 'password');
    if (!hasPasswordProvider) {
      Alert.alert(
        'Compte Google',
        'Votre compte utilise la connexion Google. Pour modifier votre mot de passe, utilisez les paramètres de votre compte Google.',
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert(
        'Succès',
        'Votre mot de passe a été modifié.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Change password error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert('Erreur', 'Mot de passe actuel incorrect.');
      } else if (error.code === 'auth/weak-password') {
        Alert.alert('Erreur', 'Le nouveau mot de passe est trop faible.');
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de modifier le mot de passe.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    flex: 1,
    fontSize: 16,
    color: theme.text,
    paddingVertical: 4,
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Modifier le mot de passe</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Mot de passe actuel"
              placeholderTextColor={theme.inputPlaceholder}
              secureTextEntry={!showCurrent}
              style={inputStyle}
            />
            <TouchableOpacity onPress={() => setShowCurrent((v) => !v)}>
              <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputRow, { marginTop: 16 }]}>
            <Ionicons name="key" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nouveau mot de passe (min. 6 caractères)"
              placeholderTextColor={theme.inputPlaceholder}
              secureTextEntry={!showNew}
              style={inputStyle}
            />
            <TouchableOpacity onPress={() => setShowNew((v) => !v)}>
              <Ionicons name={showNew ? 'eye-off' : 'eye'} size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputRow, { marginTop: 16 }]}>
            <Ionicons name="checkmark-circle" size={20} color={theme.textMuted} style={{ marginRight: 12 }} />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirmer le nouveau mot de passe"
              placeholderTextColor={theme.inputPlaceholder}
              secureTextEntry
              style={inputStyle}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Modification...' : 'Modifier le mot de passe'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Vous devez connaître votre mot de passe actuel pour le modifier. Si vous l'avez oublié, utilisez "Mot de passe oublié" sur l'écran de connexion.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});

export default ChangePasswordScreen;
