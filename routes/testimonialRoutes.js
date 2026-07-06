const express = require('express');
const router = express.Router();
const testimonialController = require('../controllers/testimonialController');
const { adminAuthmiddleware } = require('../middleware/authadmin');

// Public Route
router.get('/public', testimonialController.getPublicTestimonials);

// Admin Routes (Protected)
router.post('/', adminAuthmiddleware, testimonialController.addTestimonial);
router.get('/all', adminAuthmiddleware, testimonialController.getAllTestimonials);
router.put('/:id', adminAuthmiddleware, testimonialController.updateTestimonial);
router.delete('/:id', adminAuthmiddleware, testimonialController.deleteTestimonial);

module.exports = router;
