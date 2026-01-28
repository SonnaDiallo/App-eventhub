// mobile/src/screens/Profile/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemeToggle } from '../../components/ThemeToggle';

type Language = 'fr' | 'en' | 'es';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { language, setLanguage: setLanguageContext, t } = useLanguage();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigation.goBack();
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        // Utiliser firstName/lastName si disponibles, sinon splitter displayName
        const firstName = data.firstName || (user.displayName?.split(' ')[0] || '');
        const lastName = data.lastName || (user.displayName?.split(' ').slice(1).join(' ') || '');
        setEditFirstName(firstName);
        setEditLastName(lastName);
        setEditEmail(data.email || user.email || '');
      } else {
        // Créer un document utilisateur par défaut
        const displayNameParts = (user.displayName || 'Utilisateur').split(' ');
        const defaultData = {
          firstName: displayNameParts[0] || '',
          lastName: displayNameParts.slice(1).join(' ') || '',
          email: user.email || '',
          role: 'participant',
        };
        setUserData(defaultData);
        setEditFirstName(defaultData.firstName);
        setEditLastName(defaultData.lastName);
        setEditEmail(defaultData.email || '');
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (lang: Language) => {
    try {
      await setLanguageContext(lang);
      // Recharger les données pour mettre à jour l'interface
      await loadUserData();
    } catch (error: any) {
      console.error('Error updating language:', error);
      Alert.alert(t('error'), 'Impossible de sauvegarder la langue');
    }
  };

  const handleSaveProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      setSaving(true);

      // Valider les données
      if (!editFirstName.trim()) {
        Alert.alert(t('error'), 'Le prénom est requis');
        setSaving(false);
        return;
      }

      if (!editLastName.trim()) {
        Alert.alert(t('error'), 'Le nom est requis');
        setSaving(false);
        return;
      }

      if (!editEmail.trim() || !editEmail.includes('@')) {
        Alert.alert(t('error'), 'Email invalide');
        setSaving(false);
        return;
      }

      const fullName = `${editFirstName.trim()} ${editLastName.trim()}`;

      // Mettre à jour Firebase Auth
      await updateProfile(user, {
        displayName: fullName,
      });

      // Mettre à jour Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        email: editEmail.trim().toLowerCase(),
        updatedAt: new Date(),
      });

      // Recharger les données
      await loadUserData();
      setIsEditing(false);

      Alert.alert(t('success'), 'Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert(t('error'), error?.message || 'Impossible de mettre à jour le profil');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await auth.signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' as never }],
              });
            } catch (error: any) {
              Alert.alert(t('error'), 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  };

  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'fr', name: 'Français', nativeName: 'Français' },
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Español', nativeName: 'Español' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Profil</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  const user = auth.currentUser;
  const firstName = userData?.firstName || (user?.displayName?.split(' ')[0] || '');
  const lastName = userData?.lastName || (user?.displayName?.split(' ').slice(1).join(' ') || '');
  const displayName = userData?.firstName && userData?.lastName 
    ? `${userData.firstName} ${userData.lastName}` 
    : user?.displayName || 'Utilisateur';
  const email = userData?.email || user?.email || '';
  const role = userData?.role || 'participant';
  const roleLabel = role === 'organizer' ? t('organizer') : t('participant');
  const isOrganizer = role === 'organizer';
  const canScanTickets = userData?.canScanTickets === true || isOrganizer;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profile')}</Text>
        {!isEditing ? (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="create-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setIsEditing(false);
              const displayNameParts = (userData?.firstName && userData?.lastName 
                ? `${userData.firstName} ${userData.lastName}` 
                : auth.currentUser?.displayName || 'Utilisateur').split(' ');
              setEditFirstName(userData?.firstName || displayNameParts[0] || '');
              setEditLastName(userData?.lastName || displayNameParts.slice(1).join(' ') || '');
              setEditEmail(userData?.email || auth.currentUser?.email || '');
            }}
          >
            <Text style={[styles.editButtonText, { color: theme.textMuted }]}>{t('cancel')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Section Profil */}
        <View style={[styles.profileSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {(isEditing ? editFirstName : firstName).charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          
          {isEditing ? (
            <>
              <View style={styles.editInputContainer}>
                <Text style={[styles.editLabel, { color: theme.textMuted }]}>Prénom</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                  value={editFirstName}
                  onChangeText={setEditFirstName}
                  placeholder="Ton prénom"
                  placeholderTextColor={theme.inputPlaceholder}
                />
              </View>
              
              <View style={styles.editInputContainer}>
                <Text style={[styles.editLabel, { color: theme.textMuted }]}>Nom</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder="Ton nom de famille"
                  placeholderTextColor={theme.inputPlaceholder}
                />
              </View>
              
              <View style={styles.editInputContainer}>
                <Text style={[styles.editLabel, { color: theme.textMuted }]}>{t('email')}</Text>
                <TextInput
                  style={[styles.editInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder={t('email')}
                  placeholderTextColor={theme.inputPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.buttonPrimaryText} />
                ) : (
                  <Text style={[styles.saveButtonText, { color: theme.buttonPrimaryText }]}>
                    {t('save')}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.userName, { color: theme.text }]}>{displayName}</Text>
              <Text style={[styles.userEmail, { color: theme.textMuted }]}>{email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: `${theme.primary}26` }]}>
                <Ionicons name={role === 'organizer' ? 'star' : 'person'} size={14} color={theme.primary} />
                <Text style={[styles.roleText, { color: theme.primary }]}>{roleLabel}</Text>
              </View>
            </>
          )}
        </View>

        {/* Section Mes billets */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('myEvents')}</Text>
          
          {isOrganizer && (
            <>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: theme.borderLight }]}
                onPress={() => navigation.navigate('OrganizerDashboard' as never)}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="stats-chart-outline" size={20} color={theme.primary} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Tableau de bord</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: theme.borderLight }]}
                onPress={() => navigation.navigate('CreateEvent' as never)}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Créer un événement</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: theme.borderLight }]}
                onPress={() => navigation.navigate('ManagePrivileges' as never)}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Gérer les privilèges</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </>
          )}

          {canScanTickets && (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: theme.borderLight }]}
              onPress={() => navigation.navigate('ScanTicket' as never)}
            >
              <View style={styles.menuItemContent}>
                <Ionicons name="scan-outline" size={20} color={theme.primary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Scanner un billet</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: (isOrganizer || canScanTickets) ? theme.borderLight : 'transparent' }]}
            onPress={() => navigation.navigate('MyTickets' as never)}
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="ticket-outline" size={20} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>{t('tickets')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('Favorites' as never)}
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="heart-outline" size={20} color={theme.error} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>{t('favorites')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section Préférences */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('preferences')}</Text>
          
          <View style={[styles.menuItem, { borderBottomColor: theme.borderLight }]}>
            <View style={styles.menuItemContent}>
              <Ionicons name="language-outline" size={20} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>{t('language')}</Text>
            </View>
            <View style={styles.languageSelector}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageButton,
                    {
                      backgroundColor: language === lang.code ? theme.primary : theme.inputBackground,
                      borderColor: language === lang.code ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text
                    style={[
                      styles.languageButtonText,
                      {
                        color: language === lang.code ? theme.buttonPrimaryText : theme.text,
                      },
                    ]}
                  >
                    {lang.nativeName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <ThemeToggle />
          </View>
        </View>

        {/* Section Compte */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('account')}</Text>
          
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={handleLogout}
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="log-out-outline" size={20} color={theme.error} />
              <Text style={[styles.menuItemText, { color: theme.error }]}>{t('logout')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Section À propos */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('about')}</Text>
          
          <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <Text style={[styles.menuItemText, { color: theme.text }]}>{t('version')}</Text>
            <Text style={[styles.menuItemValue, { color: theme.textMuted }]}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>
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
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  menuItemValue: {
    fontSize: 14,
  },
  languageSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  languageButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  editInputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  editInput: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
