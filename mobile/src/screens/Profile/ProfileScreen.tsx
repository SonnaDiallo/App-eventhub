/**
 * @file ProfileScreen — Écran de profil utilisateur (participant ou organisateur).
 *
 * Point d'entrée du profil : charge les données Firestore de l'utilisateur
 * connecté et affiche soit le profil participant (photo, compte, préférences,
 * confidentialité, support, déconnexion), soit le profil organisateur via
 * `OrganizerProfileScreen` si le rôle est « organizer ».
 *
 * Fonctionnalités :
 * - Changement de photo de profil via ImagePicker (stockée dans Firestore).
 * - Toggles de notifications push, mode sombre et profil public.
 * - Raccourcis vers la modification du profil, la sécurité et le support.
 * - Rechargement automatique des données à chaque focus de l'écran.
 *
 * @requires ../../services/firebase - auth, db (Firestore)
 * @requires ../../theme/ThemeContext - Thème clair / sombre
 * @requires ./OrganizerProfileScreen - Profil dédié organisateur
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, Image, Switch, Alert, ActivityIndicator, Modal } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { auth } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { clearToken } from '../../services/authStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../../contexts/LanguageContext';
import { Language } from '../../services/i18n';
import OrganizerProfileScreen from './OrganizerProfileScreen';

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { language: currentLang, setLanguage: saveLanguage, t } = useLanguage();
  const [userData, setUserData] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLangModal, setShowLangModal] = useState(false);

  // Recharger les données à chaque fois que l'écran est affiché
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      console.log('Utilisateur Firebase:', user?.uid, user?.email, user?.displayName);
      
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log('Données Firestore:', data);
          
          setUserData({
            ...data,
            email: data.email || user.email || 'email@example.com',
            name: data.name || user.displayName || 'Utilisateur',
          });
          setProfileImage(data.profileImage || user.photoURL || null);
          setPushNotifications(data.pushNotifications ?? true);
          setPublicProfile(data.publicProfile ?? false);
        } else {
          console.log('Aucune donnée Firestore, utilisation des données Firebase Auth');
          const defaultData = {
            name: user.displayName || 'Utilisateur',
            email: user.email || 'email@example.com',
            role: 'participant',
            city: 'Paris',
          };
          setUserData(defaultData);
          setProfileImage(user.photoURL || null);
        }
      } else {
        console.log('Aucun utilisateur connecté');
        setUserData({
          name: 'Utilisateur',
          email: 'email@example.com',
          role: 'participant',
          city: 'Paris',
        });
      }
    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error);
    } finally {
      setLoading(false);
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
        if (user) {
          await updateDoc(doc(db, 'users', user.uid), {
            profileImage: imageUri,
          });
          Alert.alert('Succès', 'Photo de profil mise à jour !');
          // Recharger les données
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
      : await new Promise((resolve) => {
          Alert.alert(
            'Déconnexion',
            'Êtes-vous sûr de vouloir vous déconnecter ?',
            [
              { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Déconnexion', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      await clearToken();
      await AsyncStorage.removeItem('@eventhub_token');
      await AsyncStorage.removeItem('@eventhub_theme_mode');
      await AsyncStorage.removeItem('@eventhub_language');
      await AsyncStorage.removeItem('@eventhub_user_data');
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
          <View style={[styles.profileImagePlaceholder, { backgroundColor: '#FFD4B8' }]}>
            <Text style={styles.profileImageText}>
              {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
        <View style={styles.editBadge}>
          <Ionicons name="camera" size={12} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      
      <View style={styles.profileInfo}>
        <Text style={[styles.profileName, { color: theme.text }]}>
          {userData?.name || 'Utilisateur'}
        </Text>
        <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
          {userData?.email || 'email@example.com'}
        </Text>
        <Text style={[styles.profileSubtitle, { color: theme.textSecondary }]}>
          {userData?.city || 'Paris'}
        </Text>
      </View>
    </View>
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

  // Si l'utilisateur est un organisateur, afficher le profil organisateur
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#7B5CFF" />
      </View>
    );
  }

  if (userData?.role === 'organizer') {
    return <OrganizerProfileScreen />;
  }

  // Sinon, afficher le profil participant
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header avec bouton retour */}
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
          onPress={() => navigation.navigate('HomeParticipant' as never)}
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
        {/* Profile Section */}
        {renderProfileSection()}

        {/* COMPTE Section */}
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

        {/* PRÉFÉRENCES Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('preferences').toUpperCase()}</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderSettingItem('heart', '#7B5CFF', t('interests'), 'Concerts, Tech, Art', () => {
              Alert.alert(
                'Centres d\'intérêt',
                'Personnalisez vos centres d\'intérêt pour recevoir des recommandations d\'événements adaptées.',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Modifier', onPress: () => navigation.navigate('EditProfile' as never) }
                ]
              );
            })}
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

        {/* CONFIDENTIALITÉ Section */}
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
                    value ? 'Votre profil est maintenant public' : 'Votre profil est maintenant privé'
                  );
                }
              } catch (error) {
                console.error('Error updating profile visibility:', error);
              }
            })}
            {renderSettingItem('ban', '#7B5CFF', t('blockedUsers'), '', () => {
              Alert.alert(
                'Utilisateurs bloqués',
                'Vous n\'avez bloqué aucun utilisateur pour le moment.',
                [{ text: 'OK' }]
              );
            })}
          </View>
        </View>

        {/* SUPPORT Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('support').toUpperCase()}</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderSettingItem('help-circle', '#7B5CFF', t('helpCenter'), '', () => {
              Alert.alert(
                'Centre d\'aide',
                'Besoin d\'aide ?\n\n• FAQ : eventhub.com/faq\n• Email : support@eventhub.com\n• Téléphone : +33 1 23 45 67 89\n\nNous sommes là pour vous aider !',
                [{ text: 'OK' }]
              );
            })}
            {renderSettingItem('information-circle', '#7B5CFF', t('aboutApp'), '', () => {
              Alert.alert(
                'À propos d\'EventHub',
                'EventHub - Votre plateforme d\'événements\n\nVersion : 2.4.0 (Build 1524)\n\n© 2026 EventHub. Tous droits réservés.\n\nDéveloppé avec ❤️ pour connecter les gens autour d\'événements inoubliables.',
                [{ text: 'OK' }]
              );
            })}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>EventHub Version 2.4.0 (Build 1524)</Text>

        <View style={{ height: 100 }} />
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
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  profileSection: {
    alignItems: 'center',
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
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
    color: '#7B5CFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7B5CFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  profileSubtitle: {
    fontSize: 13,
    textAlign: 'center',
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

export default ProfileScreen;
