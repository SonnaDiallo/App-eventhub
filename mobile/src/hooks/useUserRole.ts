/**
 * useUserRole.ts - Hook pour récupérer le rôle de l'utilisateur en temps réel.
 * 
 * Écoute deux niveaux :
 * 1. onAuthStateChanged : détecte connexion/déconnexion Firebase Auth
 * 2. onSnapshot : écoute le document users/{uid} dans Firestore pour les changements de rôle
 * 
 * Rôles possibles : 'participant' (défaut), 'organizer', 'admin', null (déconnecté).
 * Le rôle 'user' hérité est automatiquement converti en 'participant'.
 * 
 * En cas d'erreur Firestore (permissions), fait un fallback vers getDoc() unique.
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export type UserRole = 'participant' | 'organizer' | 'admin' | null;

export const useUserRole = (): UserRole => {
  const [role, setRole] = useState<UserRole>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setRole(null);
        return;
      }

      // Écouter les changements du document utilisateur en temps réel
      const unsubscribeFirestore = onSnapshot(
        doc(db, 'users', user.uid),
        (userDoc) => {
          if (userDoc.exists()) {
            const userRole = userDoc.data()?.role;
            // Valider que le rôle est valide
            if (userRole === 'admin' || userRole === 'organizer') {
              setRole(userRole);
            } else if (userRole === 'participant' || userRole === 'user') {
              setRole(userRole === 'user' ? 'participant' : userRole);
            } else {
              setRole('participant'); // Par défaut
            }
          } else {
            setRole('participant'); // Par défaut si le document n'existe pas
          }
        },
        (error: any) => {
          // Ne pas afficher d'erreur pour permission-denied (document peut ne pas exister encore)
          if (error?.code !== 'permission-denied') {
            console.warn('Error loading user role:', error?.message || error);
          }
          // En cas d'erreur, essayer de charger une seule fois
          getDoc(doc(db, 'users', user.uid))
            .then((userDoc) => {
              if (userDoc.exists()) {
                const userRole = userDoc.data()?.role;
                if (userRole === 'admin' || userRole === 'organizer') {
                  setRole(userRole);
                } else if (userRole === 'participant' || userRole === 'user') {
                  setRole(userRole === 'user' ? 'participant' : userRole);
                } else {
                  setRole('participant');
                }
              } else {
                setRole('participant');
              }
            })
            .catch(() => setRole(null));
        }
      );

      return () => {
        unsubscribeFirestore();
      };
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  return role;
};

/**
 * Vérifie si l'utilisateur peut créer des événements (doit être organizer)
 * @param role Le rôle de l'utilisateur
 * @returns true si l'utilisateur peut créer des événements
 */
export const canCreateEvents = (role: UserRole): boolean => {
  return role === 'organizer';
};

/**
 * Vérifie si l'utilisateur a accès à l'espace admin
 */
export const isAdmin = (role: UserRole): boolean => {
  return role === 'admin';
};
