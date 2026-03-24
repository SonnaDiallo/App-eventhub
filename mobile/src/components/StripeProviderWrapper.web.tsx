/**
 * StripeProviderWrapper.web.tsx - Wrapper Stripe pour la plateforme web.
 * 
 * Sur web, le SDK @stripe/stripe-react-native n'est pas compatible.
 * Ce fichier sert de shim : il rend simplement les enfants sans wrapper Stripe.
 * Le paiement web utilise un flow séparé (PaymentScreen.web.tsx avec Stripe.js).
 */

import React from 'react';

type Props = {
  publishableKey: string;
  children: React.ReactNode;
};

export function StripeProviderWrapper({ children }: Props) {
  return <>{children}</>;
}
