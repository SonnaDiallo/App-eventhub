import { Request, Response } from 'express';
import { firebaseDb } from '../config/firebaseAdmin';

// Lister tous les utilisateurs (admin seulement)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const usersSnap = await firebaseDb.collection('users').get();
    const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ users });
  } catch (error: any) {
    return res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs', error: error.message });
  }
};

// Modifier le rôle d'un utilisateur (admin seulement)
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

// Supprimer un utilisateur (admin seulement)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await firebaseDb.collection('users').doc(id).delete();
    return res.status(200).json({ message: 'Utilisateur supprimé' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Erreur lors de la suppression', error: error.message });
  }
};
