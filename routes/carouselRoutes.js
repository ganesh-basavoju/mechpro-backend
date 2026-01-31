const express = require('express');
const router = express.Router();
const carouselController = require('../controllers/carouselController');
const { adminAuthmiddleware } = require('../middleware/authadmin'); // Ensure path is correct

// Public Route
router.get('/public', carouselController.getPublicSlides);

// Admin Routes (Protected)
router.post('/', adminAuthmiddleware, carouselController.addSlide);
router.get('/all', adminAuthmiddleware, carouselController.getAllSlides);
router.put('/:id', adminAuthmiddleware, carouselController.updateSlide);
router.delete('/:id', adminAuthmiddleware, carouselController.deleteSlide);

module.exports = router;
