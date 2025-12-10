const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');

async function adminAuthmiddleware(req, res, next) {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');


    // Check if no token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    console.log(token);
    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        const admin = await SuperAdmin.findById(decoded.id);

        if (!admin) {
            res.status(401).json({ message: 'Unauthorized' });
        }
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
module.exports ={ adminAuthmiddleware };