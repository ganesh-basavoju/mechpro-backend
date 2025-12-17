const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils');
const { sendOTPSMS } = require('../services/smsService');

const registerUser = async (req, res) => {
    console.log(req.body,"reg");
    try {
        const { fullname, phone, password } = req.body;

        // Check if user already exists
        const userExists = await User.findOne({ phone });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this phone number' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            fullname,
            phone,
            password: hashedPassword,
            carbook: [],
            bookings: []
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                fullname: user.fullname,
                phone: user.phone,
                token: generateToken("user", user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};


const loginUser = async (req, res) => {
    try {
        const { phone, password } = req.body;

        // Find user by phone
        const user = await User.findOne({ phone });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user._id,
                fullname: user.fullname,
                phone: user.phone,
                email: user.email,
                role: "User",
                token: generateToken("User", user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid phone or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// Request OTP for password reset
const requestPasswordReset = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        // Find user by phone
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: 'User not found with this phone number' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Set OTP expiry to 10 minutes
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        // Save OTP to user
        user.resetOTP = otp;
        user.resetOTPExpiry = otpExpiry;
        await user.save();

        // Send OTP via Twilio
        const smsResult = await sendOTPSMS(phone, otp);
        
        if (smsResult.success) {
            console.log(`✅ OTP sent successfully to ${phone} via SMS`);
            
            res.status(200).json({
                success: true,
                message: 'OTP sent successfully to your phone number'
            });
        } else {
            // SMS failed - do not expose OTP
            console.error(`❌ Failed to send SMS to ${phone}:`, smsResult.error);
            res.status(500).json({
                success: false,
                message: 'Failed to send OTP. Please check your phone number and try again.'
            });
        }

    } catch (error) {
        console.error('Request password reset error:', error);
        res.status(500).json({ message: 'Server error during password reset request' });
    }
};

// Verify OTP
const verifyOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ message: 'Phone number and OTP are required' });
        }

        // Find user by phone
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if OTP exists
        if (!user.resetOTP || !user.resetOTPExpiry) {
            return res.status(400).json({ message: 'No OTP request found. Please request a new OTP' });
        }

        // Check if OTP is expired
        if (new Date() > user.resetOTPExpiry) {
            user.resetOTP = null;
            user.resetOTPExpiry = null;
            await user.save();
            return res.status(400).json({ message: 'OTP has expired. Please request a new one' });
        }

        // Verify OTP
        if (user.resetOTP !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully'
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ message: 'Server error during OTP verification' });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { phone, otp, newPassword } = req.body;

        if (!phone || !otp || !newPassword) {
            return res.status(400).json({ message: 'Phone number, OTP, and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Find user by phone
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if OTP exists
        if (!user.resetOTP || !user.resetOTPExpiry) {
            return res.status(400).json({ message: 'No OTP request found. Please request a new OTP' });
        }

        // Check if OTP is expired
        if (new Date() > user.resetOTPExpiry) {
            user.resetOTP = null;
            user.resetOTPExpiry = null;
            await user.save();
            return res.status(400).json({ message: 'OTP has expired. Please request a new one' });
        }

        // Verify OTP
        if (user.resetOTP !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear OTP
        user.password = hashedPassword;
        user.resetOTP = null;
        user.resetOTPExpiry = null;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    requestPasswordReset,
    verifyOTP,
    resetPassword
}