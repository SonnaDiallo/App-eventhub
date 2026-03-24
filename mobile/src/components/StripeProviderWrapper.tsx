/**
 * StripeProviderWrapper.tsx - Wrapper Stripe pour les plateformes natives (iOS/Android).
 * 
 * Encapsule les enfants dans le StripeProvider natif qui initialise le SDK Stripe
 * avec la clé publique, l'identifiant marchand Apple Pay et le schéma d'URL
 * pour le retour après redirection 3D Secure.
 * 
 * Note : sur web, le fichier .web.tsx est utilisé à la place (sans SDK natif).
 */

import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';

type Props = {
  publishableKey: string;
  children: React.ReactNode;
};

export function StripeProviderWrapper({ publishableKey, children }: Props) {
  return (
    <StripeProvider
      publishableKey={publishableKey}
      merchantIdentifier="merchant.com.eventhub"
      urlScheme="eventhub"
    >
      {children}
    </StripeProvider>
  );
}
