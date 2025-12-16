const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Check if no token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

        // Get user from token
        const user = await User.findById(decoded._id).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'Token is not valid' });
        }

        req.user = {
            id: user._id,
            phone: user.phone
        };

        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};