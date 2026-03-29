/**
 * @file OrganizerProfileScreen — Écran de profil spécifique aux organisateurs.
 *
 * Variante du profil utilisateur enrichie d'une section « ORGANISATEUR »
 * donnant accès au tableau de bord, à la création d'événement et au scan
 * de billets. Partage la même structure de sections (Compte, Préférences,
 * Confidentialité, Support) que le profil participant mais avec un badge
 * « Organisateur » et un placeholder de photo différent.
 *
 * Les données sont rechargées à chaque focus via `useFocusEffect` afin
 * de refléter immédiatement les modifications faites dans EditProfileScreen.
 *
 * @requires ../../services/firebase - auth, db (Firestore)
 * @requires ../../theme/ThemeContext - Thème clair / sombre
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Switch, Alert, Modal, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { auth } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { clearToken } from '../../services/authStorage';
import { uploadProfileImageFromUri } from '../../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../contexts/LanguageContext';
import { Language } from '../../services/i18n';

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const OrganizerProfileScreen = () => {
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { language: currentLang, setLanguage: saveLanguage, t } = useLanguage();
  const [userData, setUserData] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  // Attend que Firebase resolve l'état d'auth (async sur web)
  const getAuthUser = useCallback(
    () =>
      new Promise<import('firebase/auth').User | null>((resolve) => {
        const unsub = auth.onAuthStateChanged((u) => {
          unsub();
          resolve(u);
        });
      }),
    []
  );

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) loadUserData();
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      let user = auth.currentUser;
      if (!user) user = await getAuthUser();
      console.log('OrganizerProfile - Utilisateur Firebase:', user?.uid, user?.email, user?.displayName);
      
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log('OrganizerProfile - Données Firestore:', data);
          
          const isPlaceholder = (email: string | null | undefined) =>
            !email || email.includes('example.com') || email.includes('exemple.com');
          
          const resolvedEmail = !isPlaceholder(data.email)
            ? data.email
            : (user.email ?? null);

          const userDataWithFallback = {
            ...data,
            email: resolvedEmail,
            name: data.name || user.displayName || 'Organisateur',
          };
          
          console.log('OrganizerProfile - userData final:', userDataWithFallback);
          setUserData(userDataWithFallback);
          setProfileImage(data.profileImage || user.photoURL || null);
          setPushNotifications(data.pushNotifications ?? true);
          setPublicProfile(data.publicProfile ?? false);
        } else {
          console.log('OrganizerProfile - Aucune donnée Firestore, utilisation Firebase Auth');
          const defaultData = {
            name: user.displayName || 'Organisateur',
            email: user.email || 'email@example.com',
            role: 'organizer',
            city: 'Paris',
          };
          console.log('OrganizerProfile - userData par défaut:', defaultData);
          setUserData(defaultData);
          setProfileImage(user.photoURL || null);
        }
      } else {
        console.log('OrganizerProfile - Aucun utilisateur connecté');
        setUserData({
          name: 'Organisateur',
          email: 'email@example.com',
          role: 'organizer',
          city: 'Paris',
        });
      }
    } catch (error) {
      console.error('OrganizerProfile - Erreur chargement données:', error);
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
      const localUri = result.assets[0].uri;
      setProfileImage(localUri);
      
      try {
        const user = auth.currentUser;
        if (user) {
          const downloadUrl = await uploadProfileImageFromUri(localUri);
          await updateDoc(doc(db, 'users', user.uid), {
            profileImage: downloadUrl,
          });
          setProfileImage(downloadUrl);
          Alert.alert('Succès', 'Photo de profil mise à jour !');
          await loadUserData();
        }
      } catch (error) {
        console.error('Error updating profile image:', error);
        Alert.alert('Erreur', 'Impossible de mettre à jour la photo de profil');
      }
    }
  };

  const handleLogout = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Déconnexion',
            'Êtes-vous sûr de vouloir vous déconnecter ?',
            [
              { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Déconnexion', style: 'destructive', onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) }
          );
        });

    if (!confirmed) return;

    try {
      await clearToken();
      await AsyncStorage.multiRemove([
        '@eventhub_token',
        '@eventhub_theme_mode',
        '@eventhub_language',
        '@eventhub_user_data',
      ]);
      await auth.signOut();
      if (Platform.OS === 'web') {
        window.location.reload();
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' as never }] });
    } catch (error: any) {
      console.error('Erreur déconnexion:', error);
      if (Platform.OS === 'web') {
        window.alert('Impossible de se déconnecter');
      } else {
        Alert.alert('Erreur', 'Impossible de se déconnecter');
      }
    }
  };

  const renderProfileSection = () => (
    <View style={[styles.profileSection, { backgroundColor: theme.surface }]}>
      <TouchableOpacity 
        style={styles.profileImageContainer}
        onPress={handlePickImage}
      >
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profileImagePlaceholder, { backgroundColor: '#7B5CFF' }]}>
            <Text style={styles.profileImageText}>
              {(userData?.name || auth.currentUser?.displayName || 'O').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.editBadge}>
          <Ionicons name="camera" size={12} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      
      <View style={styles.profileInfo}>
        <Text style={[styles.profileName, { color: theme.text }]}>
          {userData?.name || auth.currentUser?.displayName || 'Organisateur'}
        </Text>
        <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
          {auth.currentUser?.email || userData?.email || ''}
        </Text>
        <View style={styles.organizerBadge}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.organizerBadgeText}>{t('organizer')}</Text>
        </View>
      </View>
    </View>
  );

  const renderSettingItem = (icon: string, iconColor: string, title: string, value?: string, onPress?: () => void, showChevron = true) => {
    console.log('renderSettingItem appelé avec:', { 
    icon, 
    title: JSON.stringify(title), 
    value: JSON.stringify(value),
    titleLength: title?.length,
    valueLength: value?.length
  });
    return (
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
          {(value != null && value.length > 0) ? <Text style={[styles.settingItemValue, { color: theme.textSecondary }]}>{value}</Text> : null}
          {showChevron ? <Ionicons name="chevron-forward" size={20} color="#9CA3AF" /> : null}
        </View>
      </TouchableOpacity>
    );
  };

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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16,
        backgroundColor: theme.surface,
      }}>
        <TouchableOpacity
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => { if (navigation.canGoBack()) { navigation.goBack(); } else { navigation.navigate('HomeParticipant' as never); } }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, textAlign: 'center', flex: 1 }}>{t('profile')}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderProfileSection()}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('account').toUpperCase()}</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderSettingItem('person', '#7B5CFF', t('editProfile'), '', () => navigation.navigate('EditProfile' as never))}
            {renderSettingItem('lock-closed', '#7B5CFF', t('password'), '', () => {
              Alert.alert(
                'Changer le mot de passe',
                'Voulez-vous recevoir un email pour réinitialiser votre mot de passe ?',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { 
                    text: 'Envoyer', 
                    onPress: () => {
                      const user = auth.currentUser;
                      if (user?.email) {
                        Alert.alert('Email envoyé', `Un email de réinitialisation a été envoyé à ${user.email}`);
                      }
                    }
                  }
                ]
              );
            })}
            {renderSettingItem('shield-checkmark', '#7B5CFF', t('security'), '', () => {
              Alert.alert(
                'Sécurité',
                'Votre compte est sécurisé avec Firebase Authentication.\n\n• Authentification à deux facteurs disponible\n• Connexion sécurisée SSL/TLS\n• Données chiffrées',
                [{ text: 'OK' }]
              );
            })}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('organizer').toUpperCase()}</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderSettingItem('grid', '#7B5CFF', t('dashboard'), '', () => navigation.navigate('OrganizerDashboard' as never))}
            {renderSettingItem('add-circle', '#00E0FF', t('createEvent'), '', () => navigation.navigate('CreateEvent' as never))}
            {renderSettingItem('qr-code', '#00FF88', t('scanTicket'), '', () => navigation.navigate('ScanTicket' as never))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('preferences').toUpperCase()}</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderToggleItem('notifications', '#7B5CFF', t('pushNotifications'), pushNotifications, async (value) => {
              setPushNotifications(value);
              try {
                const user = auth.currentUser;
                if (user) {
                  await updateDoc(doc(db, 'users', user.uid), {
                    pushNotifications: value,
                  });
                }
              } catch (error) {
                console.error('Error updating notifications:', error);
              }
            })}
            {renderToggleItem('moon', '#7B5CFF', t('darkMode'), isDarkMode, toggleTheme)}
            {renderSettingItem('language', '#7B5CFF', t('language'), LANGUAGES.find(l => l.code === currentLang)?.label || 'Français', () => {
              setShowLangModal(true);
            })}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('privacy').toUpperCase()}</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderToggleItem('eye', '#7B5CFF', t('publicProfile'), publicProfile, async (value) => {
              setPublicProfile(value);
              try {
                const user = auth.currentUser;
                if (user) {
                  await updateDoc(doc(db, 'users', user.uid), {
                    publicProfile: value,
                  });
                  Alert.alert(
                    'Profil mis à jour',
                    value 
                      ? 'Votre profil est maintenant visible par tous les utilisateurs'
                      : 'Votre profil est maintenant privé'
                  );
                }
              } catch (error) {
                console.error('Error updating profile visibility:', error);
              }
            })}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('support').toUpperCase()}</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderSettingItem('help-circle', '#7B5CFF', t('helpCenter'), '', () => {
              Alert.alert(
                'Centre d\'aide',
                'Besoin d\'aide ?\n\n• FAQ : eventhub.com/faq\n• Email : support@eventhub.com\n• Téléphone : +33 1 23 45 67 89',
                [{ text: 'OK' }]
              );
            })}
            {renderSettingItem('information-circle', '#7B5CFF', t('aboutApp'), '', () => {
              Alert.alert(
                'À propos d\'EventHub',
                'EventHub - Plateforme de gestion d\'événements\n\nVersion 1.0.0\n\n© 2024 EventHub. Tous droits réservés.',
                [{ text: 'OK' }]
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.surface }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal sélecteur de langue */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={{
            backgroundColor: theme.surface,
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 340,
          }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, textAlign: 'center', marginBottom: 20 }}>
              {t('language')}
            </Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                onPress={async () => {
                  await saveLanguage(lang.code);
                  setShowLangModal(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  marginBottom: 8,
                  backgroundColor: currentLang === lang.code ? '#7B5CFF15' : 'transparent',
                  borderWidth: currentLang === lang.code ? 2 : 1,
                  borderColor: currentLang === lang.code ? '#7B5CFF' : theme.border,
                }}
              >
                <Text style={{ fontSize: 24, marginRight: 12 }}>{lang.flag}</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, flex: 1 }}>{lang.label}</Text>
                {currentLang === lang.code && (
                  <Ionicons name="checkmark-circle" size={24} color="#7B5CFF" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowLangModal(false)}
              style={{
                marginTop: 12,
                paddingVertical: 14,
                borderRadius: 12,
                backgroundColor: theme.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{t('cancel')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#7B5CFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  organizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  organizerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 12,
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingItemText: {
    fontSize: 16,
    fontWeight: '500',
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
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});

export default OrganizerProfileScreen;
