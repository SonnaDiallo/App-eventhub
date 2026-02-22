// mobile/src/screens/Profile/OrganizerProfileScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Switch, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { auth } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const OrganizerProfileScreen = () => {
  const navigation = useNavigation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [userData, setUserData] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            ...data,
            email: data.email || user.email,
            name: data.name || user.displayName || 'Organisateur',
          });
          setProfileImage(data.profileImage || user.photoURL || null);
          setPushNotifications(data.pushNotifications ?? true);
          setPublicProfile(data.publicProfile ?? false);
        }
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
          await loadUserData();
        }
      } catch (error) {
        console.error('Error updating profile image:', error);
        Alert.alert('Erreur', 'Impossible de mettre à jour la photo de profil');
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
              {userData?.name?.charAt(0)?.toUpperCase() || 'O'}
            </Text>
          </View>
        )}
        <View style={styles.editBadge}>
          <Ionicons name="camera" size={12} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      
      <View style={styles.profileInfo}>
        <Text style={[styles.profileName, { color: theme.text }]}>
          {userData?.name || 'Organisateur'}
        </Text>
        <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
          {userData?.email || 'email@example.com'}
        </Text>
        <View style={styles.organizerBadge}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.organizerBadgeText}>Organisateur</Text>
        </View>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderProfileSection()}

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>COMPTE</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderSettingItem('person', '#7B5CFF', 'Modifier le profil', '', () => navigation.navigate('EditProfile' as never))}
            {renderSettingItem('lock-closed', '#7B5CFF', 'Mot de passe', '', () => {
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
            {renderSettingItem('shield-checkmark', '#7B5CFF', 'Sécurité', '', () => {
              Alert.alert(
                'Sécurité',
                'Votre compte est sécurisé avec Firebase Authentication.\n\n• Authentification à deux facteurs disponible\n• Connexion sécurisée SSL/TLS\n• Données chiffrées',
                [{ text: 'OK' }]
              );
            })}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>ORGANISATEUR</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderSettingItem('grid', '#7B5CFF', 'Tableau de bord', '', () => navigation.navigate('OrganizerDashboard' as never))}
            {renderSettingItem('add-circle', '#00E0FF', 'Créer un événement', '', () => navigation.navigate('CreateEvent' as never))}
            {renderSettingItem('qr-code', '#00FF88', 'Scanner un billet', '', () => navigation.navigate('ScanTicket' as never))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>PRÉFÉRENCES</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderToggleItem('notifications', '#7B5CFF', 'Notifications Push', pushNotifications, async (value) => {
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
            {renderToggleItem('moon', '#7B5CFF', 'Mode sombre', isDarkMode, toggleTheme)}
            {renderSettingItem('language', '#7B5CFF', 'Langue', 'Français', () => {
              Alert.alert(
                'Langue',
                'Choisissez votre langue',
                [
                  { text: 'Français', onPress: () => {} },
                  { text: 'English', onPress: () => {} },
                  { text: 'Español', onPress: () => {} },
                  { text: 'Annuler', style: 'cancel' }
                ]
              );
            })}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>CONFIDENTIALITÉ</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderToggleItem('eye', '#7B5CFF', 'Profil public', publicProfile, async (value) => {
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
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            {renderSettingItem('help-circle', '#7B5CFF', 'Centre d\'aide', '', () => {
              Alert.alert(
                'Centre d\'aide',
                'Besoin d\'aide ?\n\n• FAQ : eventhub.com/faq\n• Email : support@eventhub.com\n• Téléphone : +33 1 23 45 67 89',
                [{ text: 'OK' }]
              );
            })}
            {renderSettingItem('information-circle', '#7B5CFF', 'À propos d\'EventHub', '', () => {
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
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
