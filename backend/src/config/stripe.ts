/**
 * @module config/stripe
 * @description Configuration et instanciation du client Stripe pour le backend.
 *
 * Centralise la création de l'objet Stripe utilisé par les contrôleurs de paiement.
 * Le secret webhook est également exporté ici afin d'être partagé entre le
 * contrôleur de paiement et le middleware de vérification de signature.
 *
 * En l'absence de STRIPE_SECRET_KEY, un avertissement est émis mais le serveur
 * démarre quand même pour ne pas bloquer le développement des fonctionnalités
 * non liées au paiement.
 *
 * @requires stripe
 * @exports stripe - Instance configurée du client Stripe
 * @exports STRIPE_WEBHOOK_SECRET - Secret pour valider les webhooks entrants
 */
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY not found in environment variables. Payment features will not work.');
}

// L'apiVersion est fixée explicitement pour éviter les breaking changes
// lors de mises à jour de la librairie Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
