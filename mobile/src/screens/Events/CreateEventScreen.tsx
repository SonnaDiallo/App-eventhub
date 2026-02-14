// mobile/src/screens/Events/CreateEventScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
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
import { auth } from '../../services/firebase';
import { getCategories, Category, MAX_IMAGE_SIZE, formatFileSize } from '../../services/categories';
import { api } from '../../services/api';
import { getToken } from '../../services/authStorage';
import { useTheme } from '../../theme/ThemeContext';
import { createStyles } from './CreateEventScreen.styles';

const CreateEventScreen = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();
  
  const [eventData, setEventData] = useState({
    title: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 3600000),
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

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const cats = await getCategories();
      setCategories(cats);
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

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

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

  const pickImage = async () => {
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
      
      if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
        Alert.alert(
          'Image trop lourde',
          `L'image sélectionnée fait ${formatFileSize(asset.fileSize)}. La taille maximale autorisée est ${formatFileSize(MAX_IMAGE_SIZE)}. Veuillez choisir une image plus légère.`
        );
        return;
      }

      setCoverImage(asset.uri);
      setCoverImageBase64(asset.base64 || null);
      const uri = asset.uri || '';
      const ext = uri.split('.').pop()?.toLowerCase();
      const mimeFromExt =
        ext === 'png' ? 'image/png' :
        ext === 'webp' ? 'image/webp' :
        ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : null;
      setCoverImageMimeType((asset as any).mimeType || mimeFromExt);
    }
  };

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

      const response = await api.post('/events', payload);
      console.log('Create event success', response.data);

      Alert.alert('Succès ! 🎉', 'Votre événement a été créé avec succès.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Create event error', error?.response?.data || error?.message);
      
      let errorMessage = error?.response?.data?.message || error?.message || "Une erreur est survenue lors de la création de l'événement";
      
      if (error?.response?.status === 403) {
        const hint = error?.response?.data?.hint;
        errorMessage = hint || 'Vous n\'avez pas les permissions nécessaires pour créer un événement. Vous devez être organisateur.';
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
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
              <Text style={[styles.dateText, { color: theme.textMuted }]}>{formatDate(eventData.endDate)}</Text>
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {showStartPicker && (
          <DateTimePicker
            value={eventData.startDate}
            mode={pickerMode}
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onStartDateChange}
          />
        )}

        {showEndPicker && (
          <DateTimePicker
            value={eventData.endDate}
            mode={pickerMode}
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onEndDateChange}
          />
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lieu</Text>
          <View style={styles.locationInput}>
            <Ionicons name="location-outline" size={20} color={theme.primary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { paddingLeft: 40 }]}
              placeholder="Adresse de l'événement"
              placeholderTextColor={theme.inputPlaceholder}
              value={eventData.location}
              onChangeText={(text) => setEventData({...eventData, location: text})}
            />
          </View>
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
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décrivez votre événement..."
            placeholderTextColor={theme.inputPlaceholder}
            value={eventData.description}
            onChangeText={(text) => setEventData({...eventData, description: text})}
            multiline
          />
        </View>

        <Text style={styles.sectionTitle}>Image de couverture</Text>
        {coverImage ? (
          <View style={styles.defaultImageContainer}>
            <Image source={{ uri: coverImage }} style={styles.coverImagePreview} />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={() => setCoverImage(null)}
            >
              <Ionicons name="trash-outline" size={16} color={theme.error} />
              <Text style={styles.removeImageText}>Supprimer l'image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
            <Ionicons name="cloud-upload-outline" size={48} color={theme.primary} />
            <Text style={styles.uploadText}>Ajouter une image</Text>
            <Text style={styles.uploadSubtext}>PNG, JPG ou WEBP (max {formatFileSize(MAX_IMAGE_SIZE)})</Text>
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
                  style={[styles.input, { paddingLeft: 15 }]}
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
            <ActivityIndicator color={theme.buttonPrimaryText} />
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
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            {loadingCategories ? (
              <ActivityIndicator size="large" color={theme.primary} style={styles.modalLoader} />
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


export default CreateEventScreen;
