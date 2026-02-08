// mobile/src/screens/Profile/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ThemeToggle } from '../../components/ThemeToggle';
import { canCreateEvents } from '../../hooks/useUserRole';

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
        <SafeAreaView style={{ backgroundColor: theme.background }} />
        <StatusBar barStyle={theme.background === '#050016' ? 'light-content' : 'dark-content'} />
        <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profile')}</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>{t('loading') || 'Chargement...'}</Text>
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
  const roleLabel = role === 'organizer' ? t('organizer') : role === 'admin' ? 'Administrateur' : t('participant');
  const isOrganizer = role === 'organizer' || role === 'admin';
  const canScanTickets = userData?.canScanTickets === true || isOrganizer;
  const canCreate = canCreateEvents(role);

  const cancelEdit = () => {
    setIsEditing(false);
    const displayNameParts = (userData?.firstName && userData?.lastName
      ? `${userData.firstName} ${userData.lastName}`
      : auth.currentUser?.displayName || 'Utilisateur').split(' ');
    setEditFirstName(userData?.firstName || displayNameParts[0] || '');
    setEditLastName(userData?.lastName || displayNameParts.slice(1).join(' ') || '');
    setEditEmail(userData?.email || auth.currentUser?.email || '');
  };

  const initial = (isEditing ? editFirstName : firstName).charAt(0).toUpperCase()
    + (isEditing ? editLastName : lastName).charAt(0).toUpperCase() || '?';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{ backgroundColor: theme.header }} />
      <StatusBar barStyle={theme.background === '#050016' ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('profile')}</Text>
        {!isEditing ? (
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: `${theme.primary}18` }]}
            onPress={() => setIsEditing(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={cancelEdit} activeOpacity={0.7}>
            <Text style={[styles.editButtonText, { color: theme.textMuted }]}>{t('cancel')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Carte profil */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.avatarWrapper, { backgroundColor: `${theme.primary}20` }]}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText} numberOfLines={1}>{initial}</Text>
            </View>
          </View>

          {isEditing ? (
            <>
              <Text style={[styles.editSectionTitle, { color: theme.textMuted }]}>
                {t('editProfile') || 'Modifier le profil'}
              </Text>
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
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color={theme.buttonPrimaryText} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color={theme.buttonPrimaryText} />
                    <Text style={[styles.saveButtonText, { color: theme.buttonPrimaryText }]}>{t('save')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.userName, { color: theme.text }]} numberOfLines={2}>{displayName}</Text>
              <Text style={[styles.userEmail, { color: theme.textMuted }]} numberOfLines={1}>{email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: `${theme.primary}22`, borderColor: `${theme.primary}44` }]}>
                <Ionicons name={role === 'organizer' ? 'star' : role === 'admin' ? 'shield-checkmark' : 'person'} size={14} color={theme.primary} />
                <Text style={[styles.roleText, { color: theme.primary }]}>{roleLabel}</Text>
              </View>
            </>
          )}
        </View>

        {/* Section Mes événements / Billets */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('myEvents')}</Text>
          </View>

          {isOrganizer && (
            <>
              <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.borderLight }]} onPress={() => navigation.navigate('OrganizerDashboard' as never)} activeOpacity={0.7}>
                <View style={[styles.menuItemIcon, { backgroundColor: `${theme.primary}18` }]}>
                  <Ionicons name="stats-chart-outline" size={20} color={theme.primary} />
                </View>
                <Text style={[styles.menuItemText, { color: theme.text }]}>Tableau de bord</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
              </TouchableOpacity>
              {canCreate && (
                <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.borderLight }]} onPress={() => navigation.navigate('CreateEvent' as never)} activeOpacity={0.7}>
                  <View style={[styles.menuItemIcon, { backgroundColor: `${theme.primary}18` }]}>
                    <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                  </View>
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Créer un événement</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.borderLight }]} onPress={() => navigation.navigate('ManagePrivileges' as never)} activeOpacity={0.7}>
                <View style={[styles.menuItemIcon, { backgroundColor: `${theme.primary}18` }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
                </View>
                <Text style={[styles.menuItemText, { color: theme.text }]}>Gérer les privilèges</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </>
          )}

          {canScanTickets && (
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.borderLight }]} onPress={() => navigation.navigate('ScanTicket' as never)} activeOpacity={0.7}>
              <View style={[styles.menuItemIcon, { backgroundColor: `${theme.primary}18` }]}>
                <Ionicons name="scan-outline" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.menuItemText, { color: theme.text }]}>Scanner un billet</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.borderLight }]} onPress={() => navigation.navigate('MyTickets' as never)} activeOpacity={0.7}>
            <View style={[styles.menuItemIcon, { backgroundColor: `${theme.primary}18` }]}>
              <Ionicons name="ticket-outline" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.menuItemText, { color: theme.text }]}>{t('tickets')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.borderLight }]} onPress={() => navigation.navigate('Favorites' as never)} activeOpacity={0.7}>
            <View style={[styles.menuItemIcon, { backgroundColor: `${theme.error}18` }]}>
              <Ionicons name="heart-outline" size={20} color={theme.error} />
            </View>
            <Text style={[styles.menuItemText, { color: theme.text }]}>{t('favorites')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.borderLight }]} onPress={() => navigation.navigate('Friends' as never)} activeOpacity={0.7}>
            <View style={[styles.menuItemIcon, { backgroundColor: `${theme.primary}18` }]}>
              <Ionicons name="people-outline" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.menuItemText, { color: theme.text }]}>Mes amis</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('ChatList' as never)} activeOpacity={0.7}>
            <View style={[styles.menuItemIcon, { backgroundColor: `${theme.info}18` }]}>
              <Ionicons name="chatbubbles-outline" size={20} color={theme.info} />
            </View>
            <Text style={[styles.menuItemText, { color: theme.text }]}>Messages</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Préférences */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options-outline" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('preferences')}</Text>
          </View>

          <View style={[styles.menuItem, styles.menuItemColumn, { borderBottomColor: theme.borderLight }]}>
            <View style={styles.menuItemRow}>
              <View style={[styles.menuItemIcon, { backgroundColor: `${theme.primary}18` }]}>
                <Ionicons name="language-outline" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.menuItemText, { color: theme.text }]}>{t('language')}</Text>
            </View>
            <View style={styles.languageSelector}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageButton,
                    { backgroundColor: language === lang.code ? theme.primary : theme.inputBackground, borderColor: language === lang.code ? theme.primary : theme.border },
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.languageButtonText, { color: language === lang.code ? theme.buttonPrimaryText : theme.text }]}>
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

        {/* Compte */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('account')}</Text>
          </View>
          <TouchableOpacity style={[styles.menuItem, styles.logoutItem, { borderBottomWidth: 0 }]} onPress={handleLogout} activeOpacity={0.7}>
            <View style={[styles.menuItemIcon, { backgroundColor: `${theme.error}18` }]}>
              <Ionicons name="log-out-outline" size={20} color={theme.error} />
            </View>
            <Text style={[styles.menuItemText, { color: theme.error }]}>{t('logout')}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 12 : 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  editButton: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 14,
    textAlign: 'center',
    opacity: 0.85,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  editSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  editInputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '600',
  },
  editInput: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    fontSize: 16,
  },
  saveButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  menuItemColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  menuItemValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  languageSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  languageButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default ProfileScreen;
