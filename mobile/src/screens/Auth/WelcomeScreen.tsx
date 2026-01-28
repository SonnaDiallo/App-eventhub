// mobile/src/screens/Auth/WelcomeScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

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
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#050016',
        paddingHorizontal: 24,
        paddingTop: 40,        // moins de marge en haut
        paddingBottom: 40,
        justifyContent: 'space-evenly',
      }}
    >
      {/* Carte + blob */}
      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <View
          style={{
            width: 240,
            height: 240,
            borderRadius: 40,
            backgroundColor: '#0b0620',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#7b5cff',
            shadowOpacity: 0.4,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 20,
          }}
        >
          <MovingBlob />
        </View>
      </View>

      {/* Texte */}
      <View>
        <Text
          style={{
            color: '#ffffff',
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
            color: '#c0b8ff',
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
            backgroundColor: '#7b5cff',
            paddingVertical: 14,
            borderRadius: 999,
            alignItems: 'center',
            marginBottom: 12,
          }}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>
            Créer un compte
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            borderWidth: 1,
            borderColor: '#7b5cff',
            paddingVertical: 14,
            borderRadius: 999,
            alignItems: 'center',
          }}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={{ color: '#ffffff', fontWeight: '500', fontSize: 16 }}>
            J&apos;ai déjà un compte
          </Text>
        </TouchableOpacity>
      </View>
    </View>

  );
};

export default WelcomeScreen;