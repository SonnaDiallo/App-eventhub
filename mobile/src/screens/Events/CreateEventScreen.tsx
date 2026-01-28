// mobile/src/screens/Events/CreateEventScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

import { Timestamp, addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';

import { auth, db } from '../../services/firebase';
import { getCategories, Category, MAX_IMAGE_SIZE, formatFileSize } from '../../services/categories';
import { api } from '../../services/api';
import { getToken } from '../../services/authStorage';

// Helper pour obtenir l'URL de base du backend (sans /api)
const getBackendBaseURL = () => {
  const baseURL = api.defaults.baseURL || '';
  return baseURL.replace('/api', '');
};

const CreateEventScreen = () => {
  const [eventData, setEventData] = useState({
    title: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 3600000), // +1 heure par défaut
    location: '',
    description: '',
    isFree: true,
    price: '0',
    capacity: '100',
    category: '',
  });
  
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const navigation = useNavigation();

  // Charger les catégories au montage
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const cats = await getCategories();
      setCategories(cats);
      // Sélectionner "Autre" par défaut
      const defaultCat = cats.find(c => c.id === 'other') || cats[0];
      if (defaultCat) {
        setSelectedCategory(defaultCat);
        setEventData({...eventData, category: defaultCat.id});
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Formater la date pour l'affichage
  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

  // Gérer le changement de date de début
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      if (pickerMode === 'date') {
        const newDate = new Date(eventData.startDate);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setEventData({...eventData, startDate: newDate});
        if (Platform.OS === 'android') {
          setPickerMode('time');
          setTimeout(() => setShowStartPicker(true), 100);
        }
      } else {
        const newDate = new Date(eventData.startDate);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        setEventData({...eventData, startDate: newDate});
        setPickerMode('date');
        setShowStartPicker(false);
      }
    }
  };

  // Gérer le changement de date de fin
  const onEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      if (pickerMode === 'date') {
        const newDate = new Date(eventData.endDate);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setEventData({...eventData, endDate: newDate});
        if (Platform.OS === 'android') {
          setPickerMode('time');
          setTimeout(() => setShowEndPicker(true), 100);
        }
      } else {
        const newDate = new Date(eventData.endDate);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        setEventData({...eventData, endDate: newDate});
        setPickerMode('date');
        setShowEndPicker(false);
      }
    }
  };

  // Sélectionner une image avec validation de taille
  const pickImage = async () => {
    // Demander la permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de la permission pour accéder à vos photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      // Vérifier la taille du fichier
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
        Alert.alert(
          'Image trop lourde',
          `L'image sélectionnée fait ${formatFileSize(asset.fileSize)}. La taille maximale autorisée est ${formatFileSize(MAX_IMAGE_SIZE)}. Veuillez choisir une image plus légère.`
        );
        return;
      }

      // Note: Si fileSize n'est pas disponible, on fait confiance à l'utilisateur
      // Le backend validera aussi la taille lors de l'upload

      setCoverImage(asset.uri);
    }
  };

  // Valider le formulaire
  const validateForm = () => {
    if (!eventData.title.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour l\'événement');
      return false;
    }
    if (!eventData.location.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un lieu');
      return false;
    }
    if (eventData.endDate <= eventData.startDate) {
      Alert.alert('Erreur', 'La date de fin doit être après la date de début');
      return false;
    }
    if (!eventData.isFree && (!eventData.price || parseFloat(eventData.price) <= 0)) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
      return false;
    }
    return true;
  };

  // Soumettre le formulaire via l'API backend
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Erreur', 'Tu dois être connecté.');
        return;
      }

      const token = await getToken();
      if (!token) {
        Alert.alert('Erreur', 'Session expirée. Veuillez vous reconnecter.');
        return;
      }

      // Préparer les données pour l'API backend
      const payload = {
        title: eventData.title,
        coverImage: coverImage || null,
        startDate: eventData.startDate.toISOString(),
        endDate: eventData.endDate.toISOString(),
        location: eventData.location,
        description: eventData.description,
        isFree: eventData.isFree,
        price: eventData.isFree ? 0 : Number(eventData.price),
        capacity: Number(eventData.capacity),
        category: eventData.category || selectedCategory?.id || 'other',
      };

      // Appeler l'API backend pour créer l'événement
      const response = await api.post('/events', payload);
      console.log('Create event success', response.data);

      Alert.alert('Succès ! 🎉', 'Votre événement a été créé avec succès.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Create event error', error?.response?.data || error?.message);
      const errorMessage = error?.response?.data?.message || error?.message || "Une erreur est survenue lors de la création de l'événement";
      Alert.alert('Erreur', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enregistrer comme brouillon
  const handleSaveDraft = () => {
    console.log('Saving as draft:', eventData);
    Alert.alert('Brouillon', 'Votre événement a été enregistré comme brouillon.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer un événement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Informations générales</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom de l'événement</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Soirée Networking Tech"
            placeholderTextColor="#999"
            value={eventData.title}
            onChangeText={(text) => setEventData({...eventData, title: text})}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, {flex: 1, marginRight: 10}]}>
            <Text style={styles.label}>Date et heure de début</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => {
                setPickerMode('date');
                setShowStartPicker(true);
              }}
            >
              <Text style={styles.dateText}>{formatDate(eventData.startDate)}</Text>
              <Ionicons name="calendar-outline" size={20} color="#7B5CFF" />
            </TouchableOpacity>
          </View>
          <View style={[styles.inputGroup, {flex: 1}]}>
            <Text style={styles.label}>Date et heure de fin</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => {
                setPickerMode('date');
                setShowEndPicker(true);
              }}
            >
              <Text style={styles.dateText}>{formatDate(eventData.endDate)}</Text>
              <Ionicons name="calendar-outline" size={20} color="#7B5CFF" />
            </TouchableOpacity>
          </View>
        </View>

        {showStartPicker && (
          <View style={Platform.OS === 'ios' ? styles.pickerContainer : undefined}>
            <DateTimePicker
              value={eventData.startDate}
              mode={pickerMode}
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onStartDateChange}
              minimumDate={new Date()}
              themeVariant="dark"
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => {
                  setShowStartPicker(false);
                  setPickerMode('date');
                }}
              >
                <Text style={styles.pickerButtonText}>Confirmer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {showEndPicker && (
          <View style={Platform.OS === 'ios' ? styles.pickerContainer : undefined}>
            <DateTimePicker
              value={eventData.endDate}
              mode={pickerMode}
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onEndDateChange}
              minimumDate={eventData.startDate}
              themeVariant="dark"
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => {
                  setShowEndPicker(false);
                  setPickerMode('date');
                }}
              >
                <Text style={styles.pickerButtonText}>Confirmer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lieu</Text>
          <View style={styles.locationInput}>
            <Ionicons name="location-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, {paddingLeft: 35}]}
              placeholder="Rechercher une adresse"
              placeholderTextColor="#999"
              value={eventData.location}
              onChangeText={(text) => setEventData({...eventData, location: text})}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décrivez votre événement, le programme, les intervenants..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={eventData.description}
            onChangeText={(text) => setEventData({...eventData, description: text})}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Catégorie</Text>
          <TouchableOpacity 
            style={styles.categorySelector}
            onPress={() => setShowCategoryModal(true)}
          >
            <View style={styles.categorySelectorContent}>
              {selectedCategory ? (
                <>
                  <Text style={styles.categorySelectorText}>{selectedCategory.nameFr}</Text>
                  {selectedCategory.description && (
                    <Text style={styles.categorySelectorSubtext}>{selectedCategory.description}</Text>
                  )}
                </>
              ) : (
                <Text style={styles.categorySelectorPlaceholder}>Sélectionner une catégorie</Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={20} color="#7B5CFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Visuel</Text>
        <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImagePreview} />
          ) : selectedCategory ? (
            <View style={styles.defaultImageContainer}>
              <Image 
                source={{ 
                  uri: selectedCategory.defaultImage.startsWith('http') 
                    ? selectedCategory.defaultImage 
                    : `${getBackendBaseURL()}${selectedCategory.defaultImage}`
                }} 
                style={styles.coverImagePreview}
                defaultSource={require('../../../assets/icon.png')}
              />
              <View style={styles.defaultImageOverlay}>
                <Ionicons name="image-outline" size={24} color="#FFFFFF" />
                <Text style={styles.defaultImageText}>Image par défaut</Text>
              </View>
            </View>
          ) : (
            <>
              <Ionicons name="image-outline" size={32} color="#7B5CFF" />
              <Text style={styles.uploadText}>Ajouter une image de couverture</Text>
              <Text style={styles.uploadSubtext}>PNG, JPG, WebP jusqu'à 2MB</Text>
            </>
          )}
        </TouchableOpacity>
        {coverImage && (
          <TouchableOpacity 
            style={styles.removeImageButton}
            onPress={() => setCoverImage(null)}
          >
            <Ionicons name="trash-outline" size={16} color="#FF4F8B" />
            <Text style={styles.removeImageText}>Supprimer l'image</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Billetterie</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              eventData.isFree && styles.toggleButtonActive
            ]}
            onPress={() => setEventData({...eventData, isFree: true})}
          >
            <Text style={[
              styles.toggleText, 
              eventData.isFree && styles.toggleTextActive
            ]}>Gratuit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.toggleButton, 
              !eventData.isFree && styles.toggleButtonActive
            ]}
            onPress={() => setEventData({...eventData, isFree: false})}
          >
            <Text style={[
              styles.toggleText, 
              !eventData.isFree && styles.toggleTextActive
            ]}>Payant</Text>
          </TouchableOpacity>
        </View>

        {!eventData.isFree && (
          <View style={styles.row}>
            <View style={[styles.inputGroup, {flex: 1, marginRight: 10}]}>
              <Text style={styles.label}>Prix du billet (€)</Text>
              <View style={styles.priceInput}>
                <TextInput
                  style={[styles.input, {paddingLeft: 15}]}
                  keyboardType="numeric"
                  value={eventData.price}
                  onChangeText={(text) => setEventData({...eventData, price: text})}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, {flex: 1}]}>
              <Text style={styles.label}>Nombre de places</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={eventData.capacity}
                onChangeText={(text) => setEventData({...eventData, capacity: text})}
              />
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.publishButton, isSubmitting && styles.publishButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.publishButtonText}>Publier l'événement</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.draftButton} onPress={handleSaveDraft}>
          <Text style={styles.draftButtonText}>Enregistrer comme brouillon</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de sélection de catégorie */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une catégorie</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {loadingCategories ? (
              <ActivityIndicator size="large" color="#7B5CFF" style={styles.modalLoader} />
            ) : (
              <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      selectedCategory?.id === item.id && styles.categoryItemSelected
                    ]}
                    onPress={() => {
                      setSelectedCategory(item);
                      setEventData({...eventData, category: item.id});
                      setShowCategoryModal(false);
                    }}
                  >
                    <View style={styles.categoryItemContent}>
                      <Text style={[
                        styles.categoryItemName,
                        selectedCategory?.id === item.id && styles.categoryItemNameSelected
                      ]}>
                        {item.nameFr}
                      </Text>
                      {item.description && (
                        <Text style={styles.categoryItemDescription}>{item.description}</Text>
                      )}
                    </View>
                    {selectedCategory?.id === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#7B5CFF" />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050016',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: '#0A0A1E',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A3A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#E0E0FF',
    marginTop: 24,
    marginBottom: 16,
    fontFamily: 'System',
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#C0C0E0',
    marginBottom: 10,
    fontWeight: '500',
    fontFamily: 'System',
  },
  locationInput: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: 16,
    zIndex: 1,
  },
  input: {
    backgroundColor: '#0F0F23',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A2A4A',
    fontFamily: 'System',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F0F23',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  dateText: {
    color: '#A0A0C0',
    fontSize: 16,
    fontFamily: 'System',
  },
  textArea: {
    height: 140,
    textAlignVertical: 'top',
    paddingTop: 12,
    lineHeight: 22,
  },
  imageUpload: {
    backgroundColor: '#0F0F23',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#3A3A5A',
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  uploadText: {
    color: '#8B7BFF',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 14,
    marginBottom: 6,
    fontFamily: 'System',
  },
  uploadSubtext: {
    color: '#5A5A7A',
    fontSize: 12,
    fontFamily: 'System',
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F0F23',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  categorySelectorContent: {
    flex: 1,
  },
  categorySelectorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
  },
  categorySelectorSubtext: {
    color: '#5A5A7A',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'System',
  },
  categorySelectorPlaceholder: {
    color: '#5A5A7A',
    fontSize: 16,
    fontFamily: 'System',
  },
  defaultImageContainer: {
    position: 'relative',
    width: '100%',
  },
  defaultImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  defaultImageText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 6,
    fontFamily: 'System',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A0A1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A3A',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  modalLoader: {
    padding: 40,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A3A',
  },
  categoryItemSelected: {
    backgroundColor: '#1A1A3A',
  },
  categoryItemContent: {
    flex: 1,
  },
  categoryItemName: {
    color: '#C0C0E0',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'System',
  },
  categoryItemNameSelected: {
    color: '#7B5CFF',
    fontWeight: '600',
  },
  categoryItemDescription: {
    color: '#5A5A7A',
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'System',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F0F23',
    borderRadius: 12,
    padding: 5,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: '#2A2A4A',
  },
  toggleText: {
    color: '#4A4A6B',
    fontWeight: '500',
    fontSize: 15,
    fontFamily: 'System',
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publishButton: {
    backgroundColor: '#7B5CFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    shadowColor: '#7B5CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  publishButtonDisabled: {
    opacity: 0.7,
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  draftButton: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  draftButtonText: {
    color: '#7B5CFF',
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
  },
  coverImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: -16,
    marginBottom: 16,
  },
  removeImageText: {
    color: '#FF4F8B',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  pickerContainer: {
    backgroundColor: '#0F0F23',
    borderRadius: 12,
    marginBottom: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2A2A4A',
  },
  pickerButton: {
    backgroundColor: '#7B5CFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  pickerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateEventScreen;