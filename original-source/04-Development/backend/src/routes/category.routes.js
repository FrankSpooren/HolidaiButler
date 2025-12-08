/**
 * Category Routes
 * ===============
 * GET /categories, /categories/:id, /categories/:id/pois
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);
router.get('/:id/pois', categoryController.getPOIsInCategory);

module.exports = router;
