/**
 * @module userController
 * @description Contrôleur de gestion des utilisateurs (réservé aux administrateurs).
 *
 * Fournit les opérations CRUD sur les comptes utilisateurs depuis le
 * panneau d'administration : lister tous les utilisateurs, modifier
 * un rôle, ou supprimer un compte. Ces routes sont protégées par le
 * middleware d'authentification et le middleware de vérification admin.
 *
 * La suppression d'un utilisateur ici ne supprime que le document
 * Firestore ; le compte Firebase Auth reste actif (à nettoyer
 * séparément si nécessaire, ou via un Cloud Function).
 *
 * Routes gérées :
 * - GET    /users          → getAllUsers
 * - PATCH  /users/:id/role → updateUserRole
 * - DELETE /users/:id      → deleteUser
 */
import { Request, Response } from 'express';
import { firebaseDb } from '../config/firebaseAdmin';

/**
 * GET /users
 * Liste tous les utilisateurs de la plateforme. Retourne l'intégralité
 * des profils Firestore sans pagination (acceptable tant que la base
 * utilisateurs reste de taille modérée). Réservé aux administrateurs.
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const usersSnap = await firebaseDb.collection('users').get();
    const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ users });
  } catch (error: any) {
    return res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs', error: error.message });
  }
};

/**
 * PATCH /users/:id/role
 * Modifie le rôle d'un utilisateur. Les rôles autorisés sont
 * « user », « organizer » et « admin ». Permet de promouvoir un
 * utilisateur en organisateur ou de rétrograder un admin.
 *
 * @param {string} id   - Firebase UID de l'utilisateur
 * @body  {string} role - Nouveau rôle (user | organizer | admin)
 */
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['user', 'organizer', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }
    await firebaseDb.collection('users').doc(id).update({ role });
    return res.status(200).json({ message: 'Rôle mis à jour' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du rôle', error: error.message });
  }
};

/**
 * DELETE /users/:id
 * Supprime le document utilisateur de Firestore. Attention : ne supprime
 * pas le compte Firebase Auth associé, ni les données liées (billets,
 * avis, participations). Une purge complète nécessiterait un traitement
 * en cascade à implémenter côté Cloud Functions.
 *
 * @param {string} id - Firebase UID de l'utilisateur à supprimer
 */
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await firebaseDb.collection('users').doc(id).delete();
    return res.status(200).json({ message: 'Utilisateur supprimé' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Erreur lors de la suppression', error: error.message });
  }
};
