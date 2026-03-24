/**
 * @file AddReviewScreen.tsx
 * @description Écran permettant à un participant de laisser un avis sur un événement.
 * L'utilisateur attribue une note de 1 à 5 étoiles et rédige un commentaire
 * (minimum 10 caractères). L'avis est ensuite publié via le service reviewService.
 * Accessible uniquement depuis l'écran de détails d'un événement pour lequel
 * l'utilisateur possède déjà un billet.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { createReview } from '../../services/reviewService';

type AddReviewRouteProp = RouteProp<{ AddReview: { eventId: string; eventTitle: string } }, 'AddReview'>;

export const AddReviewScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<AddReviewRouteProp>();
  const { eventId, eventTitle } = route.params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Valide les champs puis soumet l'avis au backend. Gère les erreurs réseau et affiche un message de succès. */
  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Note requise', 'Veuillez sélectionner une note entre 1 et 5 étoiles.');
      return;
    }

    if (comment.trim().length === 0) {
      Alert.alert('Commentaire requis', 'Veuillez ajouter un commentaire.');
      return;
    }

    if (comment.trim().length < 10) {
      Alert.alert('Commentaire trop court', 'Votre commentaire doit contenir au moins 10 caractères.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createReview(eventId, rating, comment.trim());
      Alert.alert('Merci !', 'Votre avis a été publié avec succès.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error creating review:', error);
      const message = error.response?.data?.message || 'Une erreur est survenue lors de la publication de votre avis.';
      Alert.alert('Erreur', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          style={styles.starButton}
          disabled={isSubmitting}
        >
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={40}
            color="#FFD700"
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            disabled={isSubmitting}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Donner votre avis</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.eventInfo, { backgroundColor: theme.card }]}>
          <Text style={[styles.eventTitle, { color: theme.text }]}>{eventTitle}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Note</Text>
          <View style={styles.starsContainer}>{renderStars()}</View>
          {rating > 0 && (
            <Text style={[styles.ratingText, { color: theme.textSecondary }]}>
              {rating === 1 && 'Très décevant'}
              {rating === 2 && 'Décevant'}
              {rating === 3 && 'Correct'}
              {rating === 4 && 'Bien'}
              {rating === 5 && 'Excellent'}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Commentaire</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Partagez votre expérience..."
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={6}
            maxLength={500}
            value={comment}
            onChangeText={setComment}
            editable={!isSubmitting}
          />
          <Text style={[styles.characterCount, { color: theme.textSecondary }]}>
            {comment.length}/500 caractères
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: theme.primary },
            (isSubmitting || rating === 0 || comment.trim().length < 10) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || rating === 0 || comment.trim().length < 10}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Publier l'avis</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  eventInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 12,
  },
  starButton: {
    padding: 8,
  },
  ratingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
