const express = require('express');
const router = express.Router();
const userController = require('../contollers/userprofilecontrollers');
const auth = require('../middleware/authMiddleware');
const bookingprocessController = require('../contollers/bookingprocess');
const servicesController = require('../contollers/servicesController');

// User routes
router.get('/profile', auth, userController.getProfile);
router.put('/profile', auth, userController.updateProfile);

// Car book routes
router.get('/cars', auth, userController.getCars);
router.post('/cars', auth, userController.addCar);
router.put('/cars/:id', auth, userController.updateCar);
router.delete('/cars/:id', auth, userController.deleteCar);

// Bookings routes
router.get('/bookings', auth, userController.getBookings);
router.get('/bookings/:id', auth, userController.getBookingDetails);
router.post('/bookings/:id/cancel', auth, userController.cancelBooking);

// Booking routes
router.get('/mechanic/:mechanicId', auth, bookingprocessController.getMechanicServices);
router.post('/booking-create', auth, bookingprocessController.createBooking);
router.get('/user-bookings', auth, bookingprocessController.getUserBookings);
router.get('/get-services', auth, servicesController.getAllServices);

module.exports = router;
