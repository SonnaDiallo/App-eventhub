/**
 * @file Utilitaires de validation d'email et de mot de passe.
 *
 * Fournit une validation syntaxique de l'adresse email (regex),
 * une vérification d'unicité dans Firestore (pour l'inscription),
 * et une validation de la longueur minimale du mot de passe.
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

/** Valide le format syntaxique d'une adresse email. */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Format d\'email invalide' };
  }
  
  return { isValid: true };
};

/** Vérifie dans Firestore si un compte existe déjà avec cette adresse email. */
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
};

/** Vérifie que le mot de passe respecte la longueur minimale requise (6 caractères). */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 6) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins 6 caractères' };
  }
  return { valid: true };
};
