// mobile/src/screens/Settings/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Image, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { auth } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getMe } from '../../services/api';
import { getApiBaseUrl } from '../../config/constants';
import { uploadProfileImageFromUri } from '../../services/storageService';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [userData, setUserData] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);
  const [apiTesting, setApiTesting] = useState(false);

  const handleTestApi = async () => {
    setApiTesting(true);
    try {
      // Test de connexion Firebase
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          Alert.alert('Connexion OK', 'Firebase fonctionne correctement.');
        } else {
          Alert.alert('Info', 'Connecté à Firebase mais profil non trouvé.');
        }
      } else {
        Alert.alert('Info', 'Non connecté à Firebase.');
      }
    } catch (error: any) {
      Alert.alert('Erreur', `Impossible de se connecter à Firebase: ${error.message}`);
    } finally {
      setApiTesting(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const firestoreData = userDoc.exists() ? userDoc.data() : {};
      const roleFromFirestore = firestoreData.role;
      setUserData({ ...firestoreData, role: roleFromFirestore || 'user' });
      const img = firestoreData.profileImage;
      setProfileImage(img && (img.startsWith('http://') || img.startsWith('https://')) ? img : null);

      const me = await getMe();
      if (me && typeof me.role === 'string') {
        setUserData((prev: any) => ({ ...(prev || {}), ...me, role: me.role }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à vos photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setProfileImage(imageUri);

      try {
        const user = auth.currentUser;
        if (!user) return;
        const downloadUrl = await uploadProfileImageFromUri(imageUri);
        await updateDoc(doc(db, 'users', user.uid), {
          profileImage: downloadUrl,
        });
        setProfileImage(downloadUrl);
        Alert.alert('Succès', 'Photo de profil mise à jour !');
      } catch (error: any) {
        console.error('Error updating profile image:', error);
        Alert.alert('Erreur', error?.message || 'Impossible de mettre à jour la photo de profil');
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth.signOut();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' as never }],
              });
            } catch (error: any) {
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          },
        },
      ]
    );
  };

  const renderProfileSection = () => (
    <TouchableOpacity 
      style={[styles.profileSection, { backgroundColor: theme.surface }]}
      onPress={handlePickImage}
    >
      <View style={styles.profileImageContainer}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profileImagePlaceholder, { backgroundColor: '#FFD4B8' }]}>
            <Text style={styles.profileImageText}>
              {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <View style={styles.editBadge}>
          <Ionicons name="camera" size={12} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.profileInfo}>
        <View style={styles.profileNameRow}>
          <Text style={[styles.profileName, { color: theme.text }]}>
            {(userData?.name || [userData?.firstName, userData?.lastName].filter(Boolean).join(' ')) || 'Utilisateur'}
          </Text>
          {userData?.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>
        <Text style={[styles.profileSubtitle, { color: theme.textSecondary }]}>
          {userData?.role === 'admin' ? 'Administrateur' : userData?.role === 'organizer' ? 'Organisateur' : 'Passionné d\'événements'} • {userData?.city || 'Paris'}
        </Text>
        {userData?.role && (
          <Text style={[styles.profileRole, { color: theme.textSecondary }]}>
            Rôle : {userData.role === 'admin' ? 'Admin' : userData.role === 'organizer' ? 'Organisateur' : 'Utilisateur'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSettingItem = (icon: string, iconColor: string, title: string, value?: string, onPress?: () => void, showChevron = true) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <Text style={[styles.settingItemText, { color: theme.text }]}>{title}</Text>
      </View>
      <View style={styles.settingItemRight}>
        {value && <Text style={[styles.settingItemValue, { color: theme.textSecondary }]}>{value}</Text>}
        {showChevron && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
      </View>
    </TouchableOpacity>
  );

  const renderToggleItem = (icon: string, iconColor: string, title: string, value: boolean, onToggle: (val: boolean) => void) => (
    <View style={styles.settingItem}>
      <View style={styles.settingItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <Text style={[styles.settingItemText, { color: theme.text }]}>{title}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#D1D5DB', true: '#7B5CFF' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#F3F4F6' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        {renderProfileSection()}

        {/* COMPTE Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>COMPTE</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderSettingItem('person', '#7B5CFF', 'Modifier le profil', '', () => navigation.navigate('EditProfile' as never))}
            {renderSettingItem('people', '#10B981', 'Amis et demandes', 'Voir mes amis, accepter des demandes', () => navigation.navigate('Friends' as never))}
            {renderSettingItem('mail', '#7B5CFF', 'Email', userData?.email || 'alex@example.com', () => Alert.alert('Email', 'Fonctionnalité à venir'))}
            {renderSettingItem('lock-closed', '#7B5CFF', 'Mot de passe', 'Modifier', () => navigation.navigate('ChangePassword' as never))}
            {renderSettingItem('shield-checkmark', '#7B5CFF', 'Sécurité', '', () => Alert.alert('Sécurité', 'Fonctionnalité à venir'))}
          </View>
        </View>

        {/* PRÉFÉRENCES Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>PRÉFÉRENCES</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderSettingItem('heart', '#7B5CFF', 'Centres d\'intérêt', 'Concerts, Tech, Art', () => Alert.alert('Centres d\'intérêt', 'Fonctionnalité à venir'))}
            {renderToggleItem('notifications', '#7B5CFF', 'Notifications Push', pushNotifications, setPushNotifications)}
            {renderToggleItem('moon', '#7B5CFF', 'Mode sombre', isDarkMode, toggleTheme)}
            {renderSettingItem('language', '#7B5CFF', 'Langue', 'Français', () => Alert.alert('Langue', 'Fonctionnalité à venir'))}
          </View>
        </View>

        {/* CONFIDENTIALITÉ Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>CONFIDENTIALITÉ</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderToggleItem('eye', '#7B5CFF', 'Profil public', publicProfile, setPublicProfile)}
            {renderSettingItem('ban', '#7B5CFF', 'Utilisateurs bloqués', '', () => Alert.alert('Utilisateurs bloqués', 'Fonctionnalité à venir'))}
          </View>
        </View>

        {/* Connexion API (dev) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>CONNEXION API</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="server" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingItemText, { color: theme.text }]}>URL backend</Text>
                  <Text style={[styles.settingItemValue, { color: theme.textSecondary, marginTop: 4, fontSize: 11 }]} numberOfLines={2}>
                    {getApiBaseUrl()}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.settingItem, { opacity: apiTesting ? 0.7 : 1 }]}
              onPress={handleTestApi}
              disabled={apiTesting}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#7B5CFF20' }]}>
                  <Ionicons name="wifi" size={20} color="#7B5CFF" />
                </View>
                <Text style={[styles.settingItemText, { color: theme.text }]}>
                  {apiTesting ? 'Test en cours...' : 'Tester la connexion'}
                </Text>
              </View>
              {!apiTesting && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* ADMIN Section (visible only for admin) */}
        {userData?.role === 'admin' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>ADMIN</Text>
            <View style={[styles.section, { backgroundColor: theme.surface }]}>
              {renderSettingItem('shield-checkmark', '#7B5CFF', 'Espace admin', 'Tableau de bord, utilisateurs, événements', () => navigation.navigate('AdminHome' as never))}
            </View>
          </View>
        )}

        {/* SUPPORT Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderSettingItem('help-circle', '#7B5CFF', 'Centre d\'aide', '', () => Alert.alert('Centre d\'aide', 'Fonctionnalité à venir'))}
            {renderSettingItem('information-circle', '#7B5CFF', 'À propos d\'EventHub', '', () => Alert.alert('À propos', 'EventHub Version 2.4.0'))}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>EventHub Version 2.4.0 (Build 1524)</Text>

        <View style={{ height: 40 }} />
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7B5CFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#7B5CFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  adminBadge: {
    backgroundColor: '#7B5CFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  profileSubtitle: {
    fontSize: 14,
  },
  profileRole: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingItemText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingItemValue: {
    fontSize: 14,
    marginRight: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default SettingsScreen;
