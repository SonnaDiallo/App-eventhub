/**
 * LocationPickerModal.tsx - Modal de sélection de ville.
 * 
 * Permet à l'utilisateur de :
 * - Utiliser sa position GPS actuelle (géocodage inverse via expo-location)
 * - Rechercher parmi une liste de villes françaises populaires
 * - Filtrer les villes en tapant dans la barre de recherche
 * 
 * S'affiche en bottom sheet animée avec fond semi-transparent.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface LocationPickerModalProps {
  visible: boolean;
  currentCity: string;
  onClose: () => void;
  onSelectCity: (city: string) => void;
  theme: any;
}

/** Liste des villes françaises populaires pré-remplies */
const POPULAR_CITIES = [
  { name: 'Paris, FR', country: 'France' },
  { name: 'Lyon, FR', country: 'France' },
  { name: 'Marseille, FR', country: 'France' },
  { name: 'Toulouse, FR', country: 'France' },
  { name: 'Nice, FR', country: 'France' },
  { name: 'Nantes, FR', country: 'France' },
  { name: 'Bordeaux, FR', country: 'France' },
  { name: 'Lille, FR', country: 'France' },
  { name: 'Strasbourg, FR', country: 'France' },
  { name: 'Montpellier, FR', country: 'France' },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  currentCity,
  onClose,
  onSelectCity,
  theme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);

  /** Filtre les villes selon la recherche de l'utilisateur (insensible à la casse) */
  const filteredCities = POPULAR_CITIES.filter((city) =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Détecte la ville actuelle via le GPS du téléphone.
   * Demande la permission de localisation, puis effectue un géocodage inverse
   * pour convertir les coordonnées en nom de ville.
   */
  const handleUseCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      // Demander la permission de localisation
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'Autorise l\'accès à ta localisation pour utiliser cette fonctionnalité.'
        );
        setLoadingLocation(false);
        return;
      }

      // Obtenir la position actuelle
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Géocodage inverse pour obtenir le nom de la ville
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address.city && address.country) {
        const cityName = `${address.city}, ${address.isoCountryCode || address.country}`;
        onSelectCity(cityName);
        onClose();
      } else {
        Alert.alert('Erreur', 'Impossible de déterminer ta ville actuelle.');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir ta position actuelle.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSelectCity = (cityName: string) => {
    onSelectCity(cityName);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <View
          style={{
            backgroundColor: theme.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '80%',
            paddingBottom: 40,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: theme.text,
              }}
            >
              Choisir une ville
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Position actuelle */}
          <TouchableOpacity
            onPress={handleUseCurrentLocation}
            disabled={loadingLocation}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              backgroundColor: `${theme.primary}10`,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              {loadingLocation ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="locate" size={20} color="#FFFFFF" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: theme.primary,
                }}
              >
                Utiliser ma position actuelle
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.textMuted,
                  marginTop: 2,
                }}
              >
                Détection automatique via GPS
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.primary} />
          </TouchableOpacity>

          {/* Barre de recherche */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 16,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.card,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Ionicons name="search" size={20} color={theme.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Rechercher une ville..."
                placeholderTextColor={theme.textMuted}
                style={{
                  flex: 1,
                  marginLeft: 12,
                  fontSize: 16,
                  color: theme.text,
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Liste des villes */}
          <ScrollView
            style={{
              maxHeight: 400,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ paddingHorizontal: 20 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: theme.textMuted,
                  marginBottom: 12,
                  textTransform: 'uppercase',
                }}
              >
                {searchQuery ? 'Résultats' : 'Villes populaires'}
              </Text>

              {filteredCities.length === 0 ? (
                <View
                  style={{
                    paddingVertical: 32,
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="location-outline" size={48} color={theme.textMuted} />
                  <Text
                    style={{
                      marginTop: 12,
                      fontSize: 14,
                      color: theme.textMuted,
                      textAlign: 'center',
                    }}
                  >
                    Aucune ville trouvée
                  </Text>
                </View>
              ) : (
                filteredCities.map((city, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSelectCity(city.name)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: index < filteredCities.length - 1 ? 1 : 0,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: `${theme.primary}15`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="location" size={20} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '500',
                          color: theme.text,
                        }}
                      >
                        {city.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: theme.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {city.country}
                      </Text>
                    </View>
                    {currentCity === city.name && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
