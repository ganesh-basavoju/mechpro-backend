const express = require('express');
const router = express.Router();
const billController = require('../contollers/billController');
const  authmechanic  = require('../middleware/authmechanic');


router.use(authmechanic);
// Generate Bill
router.post('/generate-bill',  billController.generateBill);

// Get Bill by ID
router.get('/bill/:billId', billController.getBillById);

// Get Bill by Booking ID
router.get('/bill/booking/:bookingId',  billController.getBillByBookingId);

// Get All Bills for Mechanic
router.get('/bills',  billController.getAllBills);

// Generate PDF for Bill
router.get('/bill/:billId/pdf',  billController.generateBillPDF);

// Update Bill Status
router.put('/bill/:billId/status', billController.updateBillStatus);

module.exports = router;
