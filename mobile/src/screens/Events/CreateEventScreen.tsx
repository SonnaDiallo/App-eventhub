// mobile/src/screens/Events/CreateEventScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/theme';

// Helper pour obtenir l'URL de base du backend (sans /api)
const getBackendBaseURL = () => {
  const baseURL = api.defaults.baseURL || '';
  return baseURL.replace('/api', '');
};

const CreateEventScreen = () => {
  const { theme, themeMode } = useTheme();
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
  const [coverImageBase64, setCoverImageBase64] = useState<string | null>(null);
  const [coverImageMimeType, setCoverImageMimeType] = useState<string | null>(null);
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
      base64: true,
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
      setCoverImageBase64(asset.base64 || null);
      const uri = asset.uri || '';
      const ext = uri.split('.').pop()?.toLowerCase();
      const mimeFromExt =
        ext === 'png'
          ? 'image/png'
          : ext === 'webp'
            ? 'image/webp'
            : ext === 'jpg' || ext === 'jpeg'
              ? 'image/jpeg'
              : null;
      setCoverImageMimeType((asset as any).mimeType || mimeFromExt);
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
    const now = Date.now();
    // Empêcher la création d'un événement déjà passé / déjà commencé.
    // Petite tolérance pour éviter les faux négatifs liés aux secondes.
    const graceMs = 60 * 1000;
    if (eventData.startDate.getTime() < now - graceMs) {
      Alert.alert('Erreur', "La date de début doit être dans le futur.");
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

      let finalCoverImage: string | null = null;
      if (coverImageBase64) {
        if (!coverImageMimeType) {
          Alert.alert('Erreur', "Impossible de déterminer le format de l'image.");
          return;
        }
        const uploadRes = await api.post(
          '/uploads/event-image',
          {
            base64: coverImageBase64,
            mimeType: coverImageMimeType,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        finalCoverImage = uploadRes.data?.url || null;
      }

      // Préparer les données pour l'API backend
      const payload = {
        title: eventData.title,
        coverImage: finalCoverImage,
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
      
      let errorMessage = error?.response?.data?.message || error?.message || "Une erreur est survenue lors de la création de l'événement";
      
      // Message plus explicite pour les erreurs de permissions
      if (error?.response?.status === 403) {
        const hint = error?.response?.data?.hint;
        errorMessage = hint || 'Vous n\'avez pas les permissions nécessaires pour créer un événement. Vous devez être organisateur ou administrateur.';
      }
      
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

  const styles = useMemo(() => getStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
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
            placeholderTextColor={theme.inputPlaceholder}
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
              themeVariant={themeMode}
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
              themeVariant={themeMode}
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
            <Ionicons name="location-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, {paddingLeft: 35}]}
              placeholder="Rechercher une adresse"
              placeholderTextColor={theme.inputPlaceholder}
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
            placeholderTextColor={theme.inputPlaceholder}
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
            <ActivityIndicator color={theme.text} />
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
                      <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
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

const getStyles = (t: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, paddingTop: Platform.OS === 'ios' ? 50 : 16,
      backgroundColor: t.header, borderBottomWidth: 1, borderBottomColor: t.border,
    },
    headerTitle: { fontSize: 18, fontWeight: '600' as const, color: t.text, textAlign: 'center' as const, flex: 1 },
    backButton: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: t.inputBackground,
      alignItems: 'center', justifyContent: 'center',
    },
    content: { flex: 1, padding: 16 },
    sectionTitle: { fontSize: 17, fontWeight: '600' as const, color: t.textSecondary, marginTop: 24, marginBottom: 16, letterSpacing: 0.2 },
    row: { flexDirection: 'row' as const },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, color: t.textMuted, marginBottom: 10, fontWeight: '500' as const },
    locationInput: { position: 'relative' as const },
    inputIcon: { position: 'absolute' as const, left: 12, top: 16, zIndex: 1 },
    input: {
      backgroundColor: t.inputBackground, borderRadius: 12, padding: 16, fontSize: 16,
      color: t.text, borderWidth: 1, borderColor: t.border,
    },
    dateInput: {
      flexDirection: 'row' as const, alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: t.inputBackground, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: t.border,
    },
    dateText: { color: t.textMuted, fontSize: 16 },
    textArea: { height: 140, textAlignVertical: 'top' as const, paddingTop: 12, lineHeight: 22 },
    imageUpload: {
      backgroundColor: t.inputBackground, borderRadius: 12, borderWidth: 1.5, borderColor: t.border,
      borderStyle: 'dashed' as const, padding: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    },
    uploadText: { color: t.primary, fontSize: 15, fontWeight: '500' as const, marginTop: 14, marginBottom: 6 },
    uploadSubtext: { color: t.textMuted, fontSize: 12 },
    categorySelector: {
      flexDirection: 'row' as const, alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: t.inputBackground, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: t.border,
    },
    categorySelectorContent: { flex: 1 },
    categorySelectorText: { color: t.text, fontSize: 16, fontWeight: '500' as const },
    categorySelectorSubtext: { color: t.textMuted, fontSize: 12, marginTop: 4 },
    categorySelectorPlaceholder: { color: t.textMuted, fontSize: 16 },
    defaultImageContainer: { position: 'relative' as const, width: '100%' },
    defaultImageOverlay: {
      position: 'absolute' as const, bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', padding: 8,
      flexDirection: 'row' as const, alignItems: 'center', justifyContent: 'center',
      borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    },
    defaultImageText: { color: t.text, fontSize: 12, marginLeft: 6 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' as const },
    modalContent: {
      backgroundColor: t.header, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%',
      paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
      flexDirection: 'row' as const, justifyContent: 'space-between', alignItems: 'center',
      padding: 20, borderBottomWidth: 1, borderBottomColor: t.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '600' as const, color: t.text },
    modalLoader: { padding: 40 },
    categoryItem: {
      flexDirection: 'row' as const, alignItems: 'center', justifyContent: 'space-between',
      padding: 16, borderBottomWidth: 1, borderBottomColor: t.border,
    },
    categoryItemSelected: { backgroundColor: t.inputBackground },
    categoryItemContent: { flex: 1 },
    categoryItemName: { color: t.textMuted, fontSize: 16, fontWeight: '500' as const },
    categoryItemNameSelected: { color: t.primary, fontWeight: '600' as const },
    categoryItemDescription: { color: t.textMuted, fontSize: 12, marginTop: 4 },
    toggleContainer: {
      flexDirection: 'row' as const, backgroundColor: t.inputBackground, borderRadius: 12,
      padding: 5, marginBottom: 20, borderWidth: 1, borderColor: t.border,
    },
    toggleButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', backgroundColor: 'transparent' },
    toggleButtonActive: { backgroundColor: t.border },
    toggleText: { color: t.textMuted, fontWeight: '500' as const, fontSize: 15 },
    toggleTextActive: { color: t.text, fontWeight: '600' as const },
    priceInput: { flexDirection: 'row' as const, alignItems: 'center' },
    publishButton: {
      backgroundColor: t.primary, borderRadius: 12, padding: 18, alignItems: 'center',
      marginTop: 24, marginBottom: 12,
      shadowColor: t.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    },
    publishButtonDisabled: { opacity: 0.7 },
    publishButtonText: { color: t.buttonPrimaryText, fontSize: 16, fontWeight: '600' as const },
    draftButton: { padding: 12, alignItems: 'center', marginBottom: 40 },
    draftButtonText: { color: t.primary, fontSize: 15, fontWeight: '500' as const },
    coverImagePreview: { width: '100%', height: 180, borderRadius: 12 },
    removeImageButton: {
      flexDirection: 'row' as const, alignItems: 'center', justifyContent: 'center',
      paddingVertical: 10, marginTop: -16, marginBottom: 16,
    },
    removeImageText: { color: t.error, fontSize: 14, fontWeight: '500' as const, marginLeft: 6 },
    pickerContainer: {
      backgroundColor: t.inputBackground, borderRadius: 12, marginBottom: 16, padding: 10,
      borderWidth: 1, borderColor: t.border,
    },
    pickerButton: { backgroundColor: t.primary, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 10 },
    pickerButtonText: { color: t.buttonPrimaryText, fontSize: 16, fontWeight: '600' as const },
  });

export default CreateEventScreen;