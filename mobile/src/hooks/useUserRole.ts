import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export type UserRole = 'participant' | 'organizer' | null;

/**
 * Hook pour récupérer le rôle de l'utilisateur actuel depuis Firestore
 * Écoute les changements d'authentification et de rôle en temps réel
 * @returns {UserRole} Le rôle de l'utilisateur ('participant', 'organizer') ou null si non connecté/non trouvé
 */
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
            if (userRole === 'participant' || userRole === 'organizer' || userRole === 'user') {
              // Normaliser 'user' en 'participant' pour compatibilité
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
                if (userRole === 'participant' || userRole === 'organizer' || userRole === 'user') {
                  // Normaliser 'user' en 'participant' pour compatibilité
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
