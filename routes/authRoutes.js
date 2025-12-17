const express = require('express');
const router = express.Router();
const { registerUser, loginUser, requestPasswordReset, verifyOTP, resetPassword } = require('../contollers/AuthControllers');


router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', requestPasswordReset);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

module.exports = router;