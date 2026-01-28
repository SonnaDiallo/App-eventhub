// mobile/src/screens/Admin/ManagePrivilegesScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

const ManagePrivilegesScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    // Vérifier que l'utilisateur est admin
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      if (!currentUser) {
        navigation.goBack();
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists() || userDoc.data().role !== 'organizer') {
        Alert.alert('Accès refusé', 'Seuls les organisateurs peuvent accéder à cette page');
        navigation.goBack();
        return;
      }

      // Charger tous les utilisateurs au démarrage
      loadAllUsers();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigation.goBack();
    }
  };

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const usersList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUsers(usersList);
    } catch (error: any) {
      console.error('Error loading users:', error);
      Alert.alert(t('error'), 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      loadAllUsers();
      return;
    }

    try {
      setSearching(true);
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('email', '>=', searchQuery.trim().toLowerCase()),
        where('email', '<=', searchQuery.trim().toLowerCase() + '\uf8ff')
      );

      const snapshot = await getDocs(q);
      const usersList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUsers(usersList);
    } catch (error: any) {
      console.error('Error searching users:', error);
      Alert.alert(t('error'), 'Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  const toggleTicketScanningPrivilege = async (userId: string, currentPrivilege: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        canScanTickets: !currentPrivilege,
        updatedAt: new Date(),
      });

      // Mettre à jour la liste locale
      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, canScanTickets: !currentPrivilege }
          : u
      ));

      Alert.alert(
        t('success'),
        currentPrivilege 
          ? 'Privilège de scan révoqué' 
          : 'Privilège de scan accordé. L\'utilisateur peut maintenant scanner et vérifier les billets.'
      );
    } catch (error: any) {
      console.error('Error updating privilege:', error);
      Alert.alert(t('error'), 'Impossible de modifier le privilège');
    }
  };

  const changeUserRole = async (userId: string, newRole: 'user' | 'organizer') => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date(),
      });

      // Mettre à jour la liste locale
      setUsers(users.map(u => 
        u.id === userId 
          ? { ...u, role: newRole }
          : u
      ));

      Alert.alert(
        t('success'),
        `Rôle modifié : ${newRole === 'organizer' ? 'Organisateur' : 'Participant'}`
      );
    } catch (error: any) {
      console.error('Error updating role:', error);
      Alert.alert(t('error'), 'Impossible de modifier le rôle');
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query)
    );
  });

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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Gérer les privilèges</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Gérer les privilèges</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Description */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.textMuted }]}>
            Accordez aux participants le droit de scanner et vérifier les billets lors des événements.
          </Text>
        </View>

        {/* Barre de recherche */}
        <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher par email, prénom ou nom..."
            placeholderTextColor={theme.inputPlaceholder}
            onSubmitEditing={searchUsers}
          />
          {searching && (
            <ActivityIndicator size="small" color={theme.primary} />
          )}
        </View>

        {/* Liste des utilisateurs */}
        <View style={styles.usersList}>
          {filteredUsers.map((user) => {
            const hasPrivilege = user.canScanTickets || false;
            const fullName = user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.name || 'Utilisateur';

            const currentRole = user.role || 'user';
            const isOrganizer = currentRole === 'organizer';

            return (
              <View
                key={user.id}
                style={[styles.userCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={styles.userInfo}>
                  <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                    <Text style={styles.avatarText}>
                      {fullName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={[styles.userName, { color: theme.text }]}>{fullName}</Text>
                    <Text style={[styles.userEmail, { color: theme.textMuted }]}>{user.email}</Text>
                    
                    {/* Sélecteur de rôle */}
                    <View style={styles.roleSelector}>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          {
                            backgroundColor: !isOrganizer ? theme.primary : theme.inputBackground,
                            borderColor: !isOrganizer ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => changeUserRole(user.id, 'user')}
                      >
                        <Text
                          style={[
                            styles.roleButtonText,
                            {
                              color: !isOrganizer ? theme.buttonPrimaryText : theme.text,
                            },
                          ]}
                        >
                          Participant
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          {
                            backgroundColor: isOrganizer ? theme.primary : theme.inputBackground,
                            borderColor: isOrganizer ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => changeUserRole(user.id, 'organizer')}
                      >
                        <Text
                          style={[
                            styles.roleButtonText,
                            {
                              color: isOrganizer ? theme.buttonPrimaryText : theme.text,
                            },
                          ]}
                        >
                          Organisateur
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.actionsColumn}>
                  <TouchableOpacity
                    style={[
                      styles.privilegeButton,
                      {
                        backgroundColor: hasPrivilege ? theme.error : theme.primary,
                        marginBottom: 8,
                      },
                    ]}
                    onPress={() => toggleTicketScanningPrivilege(user.id, hasPrivilege)}
                  >
                    <Ionicons
                      name={hasPrivilege ? 'close-circle' : 'scan'}
                      size={16}
                      color={theme.buttonPrimaryText}
                    />
                    <Text style={[styles.privilegeButtonText, { color: theme.buttonPrimaryText, fontSize: 12 }]}>
                      {hasPrivilege ? 'Révoquer' : 'Scanner'}
                    </Text>
                  </TouchableOpacity>
                  {hasPrivilege && (
                    <Text style={[styles.privilegeHint, { color: theme.textMuted }]}>
                      Peut scanner
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {filteredUsers.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                Aucun utilisateur trouvé
              </Text>
            </View>
          )}
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsColumn: {
    alignItems: 'flex-end',
  },
  privilegeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    minWidth: 90,
    justifyContent: 'center',
  },
  privilegeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  privilegeHint: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});

export default ManagePrivilegesScreen;
