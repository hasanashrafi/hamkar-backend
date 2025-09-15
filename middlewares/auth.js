const jwt = require('jsonwebtoken');
const Developer = require('../models/Developer');
const Employer = require('../models/Employer');

/**
 * Middleware to verify JWT token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const headerToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        const cookieToken = req.cookies && (req.cookies.token || req.cookies.access_token);
        const token = headerToken || cookieToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

        // Find user based on role
        let user;
        if (decoded.role === 'Developer') {
            user = await Developer.findById(decoded.userId).select('-password');
        } else if (decoded.role === 'Employer') {
            user = await Employer.findById(decoded.userId).select('-password');
        } else {
            return res.status(401).json({
                success: false,
                message: 'Invalid user role',
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            });
        }

        req.user = user;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired',
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Token verification failed',
        });
    }
};

/**
 * Middleware to check if user has required role
 */
const authorizeRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        if (!roles.includes(req.userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.',
            });
        }

        next();
    };
};

/**
 * Middleware to check if user is accessing their own resource
 */
const authorizeOwnResource = (resourceIdField = 'id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        const resourceId = req.params[resourceIdField] || req.body[resourceIdField];

        if (req.user._id.toString() !== resourceId && req.userRole !== 'Admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only access your own resources.',
            });
        }

        next();
    };
};

/**
 * Middleware to check if user is Admin
 */
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
    }

    if (req.userRole !== 'Admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.',
        });
    }

    next();
};

module.exports = {
    authenticateToken,
    authorizeRole,
    authorizeOwnResource,
    isAdmin,
}; 