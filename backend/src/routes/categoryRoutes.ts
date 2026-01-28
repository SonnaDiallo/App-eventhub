import { Router } from 'express';
import { getCategories, getCategory } from '../controllers/categoryController';

const router = Router();

// Récupérer toutes les catégories
router.get('/', getCategories);

// Récupérer une catégorie spécifique
router.get('/:id', getCategory);

export default router;
