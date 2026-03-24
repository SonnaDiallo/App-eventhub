/**
 * @module categoryController
 * @description Contrôleur des catégories d'événements.
 *
 * Expose les catégories prédéfinies de la plateforme (musique, sport,
 * technologie, etc.) via une API en lecture seule. Les catégories sont
 * définies en dur dans le service et ne dépendent pas de Firestore,
 * ce qui garantit des temps de réponse constants.
 *
 * Routes gérées :
 * - GET /categories     → getCategories
 * - GET /categories/:id → getCategory
 */
import { Request, Response } from 'express';
import { getAllCategories, getCategoryById } from '../services/categoryService';
import { CategoryInfo } from '../types/categories';

/**
 * GET /categories
 * Retourne la liste complète des catégories avec leur métadonnées
 * (icône, image par défaut, label traduit). Utilisé par le mobile
 * pour afficher les filtres et par le formulaire de création
 * d'événement pour proposer un sélecteur de catégorie.
 */
export const getCategories = async (_req: Request, res: Response) => {
  try {
    const categories = getAllCategories();
    return res.status(200).json({
      categories,
      count: categories.length,
    });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération des catégories',
      error: error?.message || 'Unknown error',
    });
  }
};

/**
 * GET /categories/:id
 * Retourne une catégorie unique identifiée par son slug (ex: « music »).
 * Utile pour valider côté client qu'une catégorie existe toujours
 * ou pour récupérer ses métadonnées (image par défaut, label).
 *
 * @param {string} id - Slug de la catégorie (ex: music, sport, tech)
 */
export const getCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: 'ID de catégorie requis' });
    }

    const category = getCategoryById(id);
    
    if (!category) {
      return res.status(404).json({ 
        message: 'Catégorie non trouvée',
        error: 'Category not found',
      });
    }

    return res.status(200).json({ category });
  } catch (error: any) {
    console.error('Get category error:', error);
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération de la catégorie',
      error: error?.message || 'Unknown error',
    });
  }
};
