/**
 * @fileoverview Routes de gestion des catégories d'événements.
 * @description Routes publiques (sans authentification) permettant de consulter
 * les catégories disponibles pour les événements.
 *
 * Endpoints enregistrés :
 * - GET /api/categories      → Récupérer toutes les catégories
 * - GET /api/categories/:id  → Récupérer une catégorie par son identifiant
 * @module routes/categoryRoutes
 */
import { Router } from 'express';
import { getCategories, getCategory } from '../controllers/categoryController';

const router = Router();

router.get('/', getCategories);
router.get('/:id', getCategory);

export default router;
