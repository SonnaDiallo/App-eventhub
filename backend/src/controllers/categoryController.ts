import { Request, Response } from 'express';
import { getAllCategories, getCategoryById } from '../services/categoryService';
import { CategoryInfo } from '../types/categories';

/**
 * Récupère toutes les catégories disponibles
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
 * Récupère une catégorie spécifique par son ID
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
