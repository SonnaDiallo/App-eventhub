/**
 * AnimatedFadeIn.tsx - Composant d'animation d'entrée réutilisable.
 * 
 * Enveloppe un élément enfant dans une animation fade-in avec un
 * effet optionnel de glissement vers le haut (slide-up).
 * Le paramètre `delay` permet de créer un effet stagger (décalage)
 * quand plusieurs éléments apparaissent en séquence (listes, grilles).
 */

import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface AnimatedFadeInProps {
  children: React.ReactNode;
  /** Délai avant le début de l'animation (ms), utile pour le stagger */
  delay?: number;
  /** Durée de l'animation en ms (défaut: 400) */
  duration?: number;
  style?: ViewStyle;
  /** Si true, ajoute un effet de glissement vers le haut (translateY: 20 → 0) */
  slideUp?: boolean;
}

export const AnimatedFadeIn: React.FC<AnimatedFadeInProps> = ({
  children,
  delay = 0,
  duration = 400,
  style,
  slideUp = true,
}) => {
  /** Valeur animée pour l'opacité : part de 0 (invisible) vers 1 */
  const opacity = useRef(new Animated.Value(0)).current;
  /** Valeur animée pour le décalage vertical : part de 20px vers 0 si slideUp */
  const translateY = useRef(new Animated.Value(slideUp ? 20 : 0)).current;

  useEffect(() => {
    // Lance l'animation après le délai spécifié (les deux animations tournent en parallèle)
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, duration, opacity, slideUp, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
