/**
 * @module WelcomeScreen
 * @description Écran d'accueil (splash) de l'application EventHub.
 *
 * Fonctionnalités :
 * - Affiche le logo de l'application avec un fond thématisé (mode clair/sombre).
 * - Contient un composant `MovingBlob` : forme SVG animée en boucle infinie
 *   (scale + translateY) pour donner un effet de « respiration » visuel.
 * - Au montage, vérifie si un utilisateur Firebase est déjà connecté avec un email vérifié.
 *   Si oui, redirige automatiquement vers l'écran approprié selon le rôle Firestore
 *   (admin → AdminHome, sinon → HomeParticipant), sans afficher l'écran d'accueil.
 * - Utilise un flag `cancelled` pour éviter les mises à jour de navigation
 *   après le démontage du composant (race condition).
 *
 * @requires react-native-svg - Rendu du blob animé avec dégradé linéaire
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Image } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useTheme } from '../../theme/ThemeContext';
import { auth } from '../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { saveToken } from '../../services/authStorage';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

// Wrapping SVG dans Animated pour pouvoir appliquer les transforms natifs (scale, translateY)
const AnimatedSvg = Animated.createAnimatedComponent(Svg);

/**
 * Composant décoratif affichant un blob SVG avec un dégradé coloré
 * et une animation de pulsation/flottement en boucle infinie.
 * Utilisé comme élément visuel d'arrière-plan sur l'écran d'accueil.
 */
const MovingBlob: React.FC = () => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.08,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -6,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [scale, translateY]);

  return (
    <AnimatedSvg
      width={220}
      height={220}
      viewBox="0 0 200 200"
      style={{
        transform: [{ scale }, { translateY }],
      }}
    >
      <Defs>
        <LinearGradient id="blobGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#7b5cff" />
          <Stop offset="50%" stopColor="#ff4fd8" />
          <Stop offset="100%" stopColor="#00e0ff" />
        </LinearGradient>
      </Defs>

      <Path
        d="M60,10 C80,5 120,5 140,10 C160,15 180,30 190,50 C195,65 195,85 190,100 C185,120 170,135 150,145 C130,155 110,160 90,155 C70,150 50,140 30,120 C15,105 5,80 10,60 C15,40 40,15 60,10 Z"
        fill="url(#blobGradient)"
      />
    </AnimatedSvg>
  );
};

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useTheme();

  // Auto-login silencieux : si une session Firebase valide existe,
  // on by-pass l'écran d'accueil. Le flag `cancelled` protège contre
  // les appels navigation après un éventuel démontage rapide du composant.
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        await saveToken(token);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const role = userDoc.exists() ? userDoc.data()?.role : undefined;
        if (cancelled) return;
        if (role === 'admin') {
          navigation.replace('AdminHome' as any);
        } else {
          navigation.replace('HomeParticipant' as any);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [navigation]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 40,
        justifyContent: 'space-evenly',
      }}
    >
      {/* Logo EventHub */}
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <View
          style={{
            width: 220,
            height: 220,
            borderRadius: 35,
            backgroundColor: theme.surface,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: theme.primary,
            shadowOpacity: 0.4,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 20,
          }}
        >
          <Image
            source={require('../../../assets/images/logo eventhub1 (1).png')}
            style={{
              width: 200,
              height: 200,
            }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Texte */}
      <View>
        <Text
          style={{
            color: theme.text,
            fontSize: 26,
            fontWeight: '700',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          Donnez vie à vos événements.
        </Text>
        <Text
          style={{
            color: theme.textMuted,
            fontSize: 14,
            textAlign: 'center',
          }}
        >
          La plateforme tout-en-un pour créer, gérer et réussir chaque
          événement.
        </Text>
      </View>

      {/* Boutons */}
      <View>
        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            paddingVertical: 14,
            borderRadius: 999,
            alignItems: 'center',
            marginBottom: 12,
          }}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={{ color: theme.buttonPrimaryText, fontWeight: '600', fontSize: 16 }}>
            Créer un compte
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            borderWidth: 1,
            borderColor: theme.primary,
            paddingVertical: 14,
            borderRadius: 999,
            alignItems: 'center',
          }}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={{ color: theme.text, fontWeight: '500', fontSize: 16 }}>
            J&apos;ai déjà un compte
          </Text>
        </TouchableOpacity>
      </View>
    </View>

  );
};

export default WelcomeScreen;