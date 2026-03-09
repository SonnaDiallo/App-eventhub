import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface AnimatedFadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
  /** Décale légèrement vers le bas au départ pour un effet slide-up */
  slideUp?: boolean;
}

/**
 * Animation d'entrée : fade-in + optionnel slide-up.
 * Utilise delay pour effet stagger sur les listes.
 */
export const AnimatedFadeIn: React.FC<AnimatedFadeInProps> = ({
  children,
  delay = 0,
  duration = 400,
  style,
  slideUp = true,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(slideUp ? 20 : 0)).current;

  useEffect(() => {
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
