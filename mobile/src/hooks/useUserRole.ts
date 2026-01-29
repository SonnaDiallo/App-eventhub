import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export type UserRole = 'user' | 'organizer' | 'admin' | null;

/**
 * Hook pour récupérer le rôle de l'utilisateur actuel depuis Firestore
 * Écoute les changements d'authentification et de rôle en temps réel
 * @returns {UserRole} Le rôle de l'utilisateur ('user', 'organizer', 'admin') ou null si non connecté/non trouvé
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
            if (userRole === 'user' || userRole === 'organizer' || userRole === 'admin') {
              setRole(userRole);
            } else {
              setRole('user'); // Par défaut
            }
          } else {
            setRole('user'); // Par défaut si le document n'existe pas
          }
        },
        (error) => {
          console.error('Error loading user role:', error);
          // En cas d'erreur, essayer de charger une seule fois
          getDoc(doc(db, 'users', user.uid))
            .then((userDoc) => {
              if (userDoc.exists()) {
                const userRole = userDoc.data()?.role;
                if (userRole === 'user' || userRole === 'organizer' || userRole === 'admin') {
                  setRole(userRole);
                } else {
                  setRole('user');
                }
              } else {
                setRole('user');
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
 * Vérifie si l'utilisateur peut créer des événements (doit être organizer ou admin)
 * @param role Le rôle de l'utilisateur
 * @returns true si l'utilisateur peut créer des événements
 */
export const canCreateEvents = (role: UserRole): boolean => {
  return role === 'organizer' || role === 'admin';
};
