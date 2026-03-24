/**
 * index.ts - Point d'entrée Expo.
 * 
 * Enregistre le composant racine App via registerRootComponent,
 * qui configure l'environnement pour Expo Go et les builds natifs.
 */

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
