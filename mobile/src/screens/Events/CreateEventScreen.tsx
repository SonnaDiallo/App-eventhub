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

  // Location autocomplete
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]); 
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const locationTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchLocation = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    try {
      setSearchingLocation(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=fr`,
        { headers: { 'User-Agent': 'EventHub-App/1.0' } }
      );
      const data = await response.json();
      setLocationSuggestions(data);
      setShowLocationSuggestions(data.length > 0);
    } catch (error) {
      console.error('Location search error:', error);
    } finally {
      setSearchingLocation(false);
    }
  };

  const onLocationTextChange = (text: string) => {
    setLocationQuery(text);
    setEventData({...eventData, location: text});
    if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
    locationTimeoutRef.current = setTimeout(() => searchLocation(text), 400);
  };

  const selectLocation = (item: { display_name: string; lat: string; lon: string }) => {
    setEventData({...eventData, location: item.display_name});
    setLocationQuery(item.display_name);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };

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

  // Dates temporaires pour la modale iOS
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date(Date.now() + 3600000));

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
      if (selectedDate) {
        if (pickerMode === 'date') {
          const newDate = new Date(eventData.startDate);
          newDate.setFullYear(selectedDate.getFullYear());
          newDate.setMonth(selectedDate.getMonth());
          newDate.setDate(selectedDate.getDate());
          setEventData({...eventData, startDate: newDate});
          setPickerMode('time');
          setTimeout(() => setShowStartPicker(true), 100);
        } else {
          const newDate = new Date(eventData.startDate);
          newDate.setHours(selectedDate.getHours());
          newDate.setMinutes(selectedDate.getMinutes());
          setEventData({...eventData, startDate: newDate});
          setPickerMode('date');
        }
      }
    } else if (selectedDate) {
      // iOS: mettre à jour la date temporaire
      setTempStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
      if (selectedDate) {
        if (pickerMode === 'date') {
          const newDate = new Date(eventData.endDate);
          newDate.setFullYear(selectedDate.getFullYear());
          newDate.setMonth(selectedDate.getMonth());
          newDate.setDate(selectedDate.getDate());
          setEventData({...eventData, endDate: newDate});
          setPickerMode('time');
          setTimeout(() => setShowEndPicker(true), 100);
        } else {
          const newDate = new Date(eventData.endDate);
          newDate.setHours(selectedDate.getHours());
          newDate.setMinutes(selectedDate.getMinutes());
          setEventData({...eventData, endDate: newDate});
          setPickerMode('date');
        }
      }
    } else if (selectedDate) {
      // iOS: mettre à jour la date temporaire
      setTempEndDate(selectedDate);
    }
  };

  const confirmStartDate = () => {
    setEventData({...eventData, startDate: tempStartDate});
    setShowStartPicker(false);
  };

  const confirmEndDate = () => {
    setEventData({...eventData, endDate: tempEndDate});
    setShowEndPicker(false);
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
                setTempStartDate(eventData.startDate);
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
                setTempEndDate(eventData.endDate);
                setShowEndPicker(true);
              }}
            >
              <Text style={[styles.dateText, { color: theme.textMuted }]}>{formatDate(eventData.endDate)}</Text>
              <Ionicons name="calendar-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Android: picker natif */}
        {Platform.OS === 'android' && showStartPicker && (
          <DateTimePicker
            value={eventData.startDate}
            mode={pickerMode}
            is24Hour={true}
            display="default"
            onChange={onStartDateChange}
            minimumDate={new Date()}
          />
        )}
        {Platform.OS === 'android' && showEndPicker && (
          <DateTimePicker
            value={eventData.endDate}
            mode={pickerMode}
            is24Hour={true}
            display="default"
            onChange={onEndDateChange}
            minimumDate={eventData.startDate}
          />
        )}

        {/* iOS: modale avec calendrier + heure séparés */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showStartPicker}
            transparent
            animationType="slide"
          >
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                    <Text style={{ color: theme.error, fontSize: 16, fontWeight: '600' }}>Annuler</Text>
                  </TouchableOpacity>
                  <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>Date de début</Text>
                  <TouchableOpacity onPress={confirmStartDate}>
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '700' }}>Valider</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempStartDate}
                  mode="date"
                  display="inline"
                  locale="fr"
                  onChange={(event: any, date?: Date) => {
                    if (date) {
                      const newDate = new Date(tempStartDate);
                      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      setTempStartDate(newDate);
                    }
                  }}
                  minimumDate={new Date()}
                  style={{ height: 340 }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 8 }}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Heure</Text>
                  <DateTimePicker
                    value={tempStartDate}
                    mode="time"
                    is24Hour={true}
                    display="compact"
                    locale="fr"
                    onChange={(event: any, date?: Date) => {
                      if (date) {
                        const newDate = new Date(tempStartDate);
                        newDate.setHours(date.getHours(), date.getMinutes());
                        setTempStartDate(newDate);
                      }
                    }}
                    style={{ minWidth: 80 }}
                  />
                </View>
              </View>
            </View>
          </Modal>
        )}

        {Platform.OS === 'ios' && (
          <Modal
            visible={showEndPicker}
            transparent
            animationType="slide"
          >
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                    <Text style={{ color: theme.error, fontSize: 16, fontWeight: '600' }}>Annuler</Text>
                  </TouchableOpacity>
                  <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>Date de fin</Text>
                  <TouchableOpacity onPress={confirmEndDate}>
                    <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '700' }}>Valider</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempEndDate}
                  mode="date"
                  display="inline"
                  locale="fr"
                  onChange={(event: any, date?: Date) => {
                    if (date) {
                      const newDate = new Date(tempEndDate);
                      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      setTempEndDate(newDate);
                    }
                  }}
                  minimumDate={eventData.startDate}
                  style={{ height: 340 }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 8 }}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Heure</Text>
                  <DateTimePicker
                    value={tempEndDate}
                    mode="time"
                    is24Hour={true}
                    display="compact"
                    locale="fr"
                    onChange={(event: any, date?: Date) => {
                      if (date) {
                        const newDate = new Date(tempEndDate);
                        newDate.setHours(date.getHours(), date.getMinutes());
                        setTempEndDate(newDate);
                      }
                    }}
                    style={{ minWidth: 80 }}
                  />
                </View>
              </View>
            </View>
          </Modal>
        )}

        <View style={[styles.inputGroup, { zIndex: 10 }]}>
          <Text style={styles.label}>Lieu</Text>
          <View style={styles.locationInput}>
            <Ionicons name="location-outline" size={20} color={theme.primary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { paddingLeft: 40, paddingRight: 40 }]}
              placeholder="Rechercher une adresse..."
              placeholderTextColor={theme.inputPlaceholder}
              value={eventData.location}
              onChangeText={onLocationTextChange}
              onFocus={() => { if (locationSuggestions.length > 0) setShowLocationSuggestions(true); }}
            />
            {searchingLocation && (
              <ActivityIndicator size="small" color={theme.primary} style={{ position: 'absolute', right: 12, top: 14 }} />
            )}
          </View>
          {showLocationSuggestions && (
            <View style={{
              backgroundColor: theme.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border || 'rgba(255,255,255,0.1)',
              marginTop: 4,
              maxHeight: 200,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}>
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                {locationSuggestions.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.lat}-${item.lon}-${index}`}
                    onPress={() => selectLocation(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderBottomWidth: index < locationSuggestions.length - 1 ? 1 : 0,
                      borderBottomColor: theme.border || 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <Ionicons name="location" size={18} color={theme.primary} style={{ marginRight: 10 }} />
                    <Text style={{ color: theme.text, fontSize: 14, flex: 1 }} numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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
