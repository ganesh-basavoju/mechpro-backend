const express = require('express');
const router = express.Router();
const mechanicController = require('../contollers/MechanicControllers');
const inspectionController = require('../contollers/inspectionController');
const authmechanic = require('../middleware/authmechanic');

// Authentication routes
router.post('/register', mechanicController.register);
router.post('/login', mechanicController.login);

router.use(authmechanic);
router.get('/profile', mechanicController.getProfile);
router.put('/profile', mechanicController.updateProfile);

// Booking routes
router.get('/bookings', mechanicController.getBookings);
router.put('/bookings/:id/status', mechanicController.updateBookingStatus);
router.get('/bookings/:id', mechanicController.getBookingDetails);

// Spare parts routes
router.get('/spare-parts', mechanicController.getSpareParts);
router.post('/spare-parts', mechanicController.createSparePartRequest);
router.put('/spare-parts/:id/status', mechanicController.updateSparePartStatus);

// Dashboard stats
router.get('/dashboard-stats', mechanicController.getDashboardStats);

// Inspection Routes
router.post('/inspection', inspectionController.createReport);
router.get('/inspection/:bookingId', inspectionController.getReport);

// Shop status
router.put('/shop-status', mechanicController.updateShopStatus);

module.exports = router;