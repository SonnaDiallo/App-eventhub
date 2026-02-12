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
  Image,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdEvents, setCreatedEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ created: 0, joined: 0, friends: 0 });

  useEffect(() => {
    loadUserData();
    loadCreatedEvents();
    loadStats();
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
        const firstName = data.firstName || (user.displayName?.split(' ')[0] || '');
        const lastName = data.lastName || (user.displayName?.split(' ').slice(1).join(' ') || '');
        setEditFirstName(firstName);
        setEditLastName(lastName);
        setEditEmail(data.email || user.email || '');
        setEditBio(data.bio || '');
      } else {
        const displayNameParts = (user.displayName || 'Utilisateur').split(' ');
        const defaultData = {
          firstName: displayNameParts[0] || '',
          lastName: displayNameParts.slice(1).join(' ') || '',
          email: user.email || '',
          role: 'participant',
          bio: '',
        };
        setUserData(defaultData);
        setEditFirstName(defaultData.firstName);
        setEditLastName(defaultData.lastName);
        setEditEmail(defaultData.email || '');
        setEditBio('');
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const loadCreatedEvents = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, where('organizerId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setCreatedEvents(events.slice(0, 4)); // Limiter à 4 événements pour l'affichage
    } catch (error) {
      console.error('Error loading created events:', error);
    }
  };

  const loadStats = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Compter les événements créés
      const eventsRef = collection(db, 'events');
      const eventsQuery = query(eventsRef, where('organizerId', '==', user.uid));
      const eventsSnapshot = await getDocs(eventsQuery);
      const createdCount = eventsSnapshot.size;

      // Compter les billets (événements rejoints)
      const ticketsRef = collection(db, 'tickets');
      const ticketsQuery = query(ticketsRef, where('userId', '==', user.uid));
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const joinedCount = ticketsSnapshot.size;

      // Compter les amis
      const friendsRef = collection(db, 'users', user.uid, 'friends');
      const friendsSnapshot = await getDocs(friendsRef);
      const friendsCount = friendsSnapshot.size;

      setStats({
        created: createdCount,
        joined: joinedCount,
        friends: friendsCount,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLanguageChange = async (lang: Language) => {
    try {
      await setLanguageContext(lang);
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

      await updateProfile(user, {
        displayName: fullName,
      });

      await updateDoc(doc(db, 'users', user.uid), {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        email: editEmail.trim().toLowerCase(),
        bio: editBio.trim(),
        updatedAt: new Date(),
      });

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
  
  const bio = userData?.bio || '';

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header avec icône paramètres */}
      <View style={{
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings' as never)}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="settings-outline" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Photo de profil avec bordure violette */}
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <View style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            borderWidth: 4,
            borderColor: '#7B5CFF',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#F5F3FF',
            marginBottom: 12,
          }}>
            <Text style={{
              fontSize: 40,
              fontWeight: '700',
              color: '#7B5CFF',
            }}>
              {initial}
            </Text>
          </View>

          {/* Bouton MODIFIER */}
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 6,
              backgroundColor: '#F5F3FF',
              borderRadius: 16,
            }}
          >
            <Ionicons name="camera" size={14} color="#7B5CFF" style={{ marginRight: 6 }} />
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#7B5CFF',
              textTransform: 'uppercase',
            }}>
              MODIFIER
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nom et Email */}
        <View style={{ alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            color: '#000000',
            marginBottom: 4,
          }}>
            {displayName}
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#6C757D',
            marginBottom: 12,
          }}>
            {email}
          </Text>

          {/* Badge Organisateur/Admin */}
          {isOrganizer && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#7B5CFF',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#FFFFFF',
              }}>
                {roleLabel} ✨
              </Text>
            </View>
          )}
        </View>

        {/* Bio */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20, alignItems: 'center' }}>
          <Text style={{
            fontSize: 14,
            color: '#6C757D',
            textAlign: 'center',
            lineHeight: 20,
          }}>
            {bio || 'Aucune bio pour le moment.'}
            {' '}
            <Text
              onPress={() => setIsEditing(true)}
              style={{
                color: '#7B5CFF',
                fontWeight: '600',
              }}
            >
              Modifier
            </Text>
          </Text>
        </View>

        {/* Statistiques */}
        <View style={{
          marginHorizontal: 20,
          marginBottom: 24,
          backgroundColor: '#F8F9FA',
          borderRadius: 16,
          padding: 20,
          flexDirection: 'row',
          justifyContent: 'space-around',
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#000000',
              marginBottom: 4,
            }}>
              {stats.created}
            </Text>
            <Text style={{
              fontSize: 12,
              color: '#6C757D',
            }}>
              Créés
            </Text>
          </View>

          <View style={{
            width: 1,
            backgroundColor: '#E5E7EB',
          }} />

          <View style={{ alignItems: 'center' }}>
            <Text style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#000000',
              marginBottom: 4,
            }}>
              {stats.joined}
            </Text>
            <Text style={{
              fontSize: 12,
              color: '#6C757D',
            }}>
              Rejoints
            </Text>
          </View>

          <View style={{
            width: 1,
            backgroundColor: '#E5E7EB',
          }} />

          <View style={{ alignItems: 'center' }}>
            <Text style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#000000',
              marginBottom: 4,
            }}>
              {stats.friends}
            </Text>
            <Text style={{
              fontSize: 12,
              color: '#6C757D',
            }}>
              Amis
            </Text>
          </View>
        </View>

        {/* Section MES ÉVÉNEMENTS CRÉÉS */}
        {isOrganizer && createdEvents.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#000000',
              }}>
                MES ÉVÉNEMENTS CRÉÉS
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('OrganizerDashboard' as never)}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#7B5CFF',
                }}>
                  Voir tout →
                </Text>
              </TouchableOpacity>
            </View>

            {/* Grille 2 colonnes */}
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}>
              {createdEvents.map((event, index) => (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => navigation.navigate('EventDetails', { event } as any)}
                  style={{
                    width: '48%',
                    marginBottom: 16,
                    borderRadius: 16,
                    overflow: 'hidden',
                    backgroundColor: '#F8F9FA',
                  }}
                >
                  {event.coverImage ? (
                    <Image
                      source={{ uri: event.coverImage }}
                      style={{ width: '100%', height: 120 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{
                      width: '100%',
                      height: 120,
                      backgroundColor: '#7B5CFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Ionicons name="calendar" size={40} color="#FFFFFF" />
                    </View>
                  )}
                  
                  {/* Badge date */}
                  <View style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#7B5CFF',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: '#FFFFFF',
                    }}>
                      {event.date || 'À venir'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Privilèges Admin - Accès rapide */}
        {isOrganizer && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#000000',
              marginBottom: 16,
            }}>
              ACCÈS RAPIDE
            </Text>
            
            <TouchableOpacity
              onPress={() => navigation.navigate('OrganizerDashboard' as never)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F8F9FA',
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
              }}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#7B5CFF',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#000000' }}>
                Tableau de bord
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {canCreate && (
              <TouchableOpacity
                onPress={() => navigation.navigate('CreateEvent' as never)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8F9FA',
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#10B981',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                </View>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#000000' }}>
                  Créer un événement
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => navigation.navigate('ManagePrivileges' as never)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F8F9FA',
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
              }}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#EF4444',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
                <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#000000' }}>
                Gérer les privilèges
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {canScanTickets && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ScanTicket' as never)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8F9FA',
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                }}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F59E0B',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}>
                  <Ionicons name="scan" size={20} color="#FFFFFF" />
                </View>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#000000' }}>
                  Scanner un billet
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Bouton Déconnexion */}
        <View style={{ paddingHorizontal: 20, marginBottom: 40 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FEE2E2',
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#EF4444',
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={{
              fontSize: 16,
              fontWeight: '700',
              color: '#EF4444',
            }}>
              Se déconnecter
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Modal d'édition */}
      {isEditing && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            padding: 24,
          }}>
            <TouchableOpacity
              onPress={() => setIsEditing(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                padding: 8,
                zIndex: 10,
              }}
            >
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>

            <Text style={{
              fontSize: 20,
              fontWeight: '700',
              color: '#000000',
              marginBottom: 20,
              textAlign: 'center',
            }}>
              Modifier le profil
            </Text>

            <TextInput
              style={{
                backgroundColor: '#F8F9FA',
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
              value={editFirstName}
              onChangeText={setEditFirstName}
              placeholder="Prénom"
            />

            <TextInput
              style={{
                backgroundColor: '#F8F9FA',
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
              value={editLastName}
              onChangeText={setEditLastName}
              placeholder="Nom"
            />

            <TextInput
              style={{
                backgroundColor: '#F8F9FA',
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={{
                backgroundColor: '#F8F9FA',
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                height: 100,
                textAlignVertical: 'top',
              }}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Bio"
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={saving}
              style={{
                backgroundColor: '#7B5CFF',
                paddingVertical: 14,
                borderRadius: 999,
                alignItems: 'center',
              }}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#FFFFFF',
                }}>
                  Enregistrer
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
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
