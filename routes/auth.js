const express = require('express');
const jwt = require('jsonwebtoken');
const Developer = require('../models/Developer');
const Employer = require('../models/Employer');
const { validate, schemas } = require('../middlewares/validation');
const { asyncHandler } = require('../middlewares/errorHandler');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * /api/auth/developer/signup:
 *   post:
 *     summary: Developer signup
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: Developer's first name
 *               lastName:
 *                 type: string
 *                 description: Developer's last name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Developer's email address
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Developer's password
 *     responses:
 *       201:
 *         description: Developer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Developer'
 *                 token:
 *                   type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/developer/signup', validate(schemas.developerSignup), asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Check if developer already exists
    const existingDeveloper = await Developer.findOne({ email });
    if (existingDeveloper) {
        return res.status(409).json({
            success: false,
            message: 'Developer with this email already exists',
        });
    }

    // Create new developer
    const developer = new Developer(req.body);
    await developer.save();

    // Generate JWT token
    const token = jwt.sign(
        { userId: developer._id, role: 'Developer' },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Set token in cookie
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    res.cookie('token', token, cookieOptions);

    res.status(201).json({
        success: true,
        message: 'Developer created successfully',
        data: developer.getPublicProfile(),
        token,
    });
}));

/**
 * @swagger
 * /api/auth/employer/signup:
 *   post:
 *     summary: Employer signup
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employer'
 *     responses:
 *       201:
 *         description: Employer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Employer'
 *                 token:
 *                   type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/employer/signup', validate(schemas.employerSignup), asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Check if employer already exists
    const existingEmployer = await Employer.findOne({ email });
    if (existingEmployer) {
        return res.status(409).json({
            success: false,
            message: 'Employer with this email already exists',
        });
    }

    // Create new employer
    const employer = new Employer(req.body);
    await employer.save();

    // Generate JWT token
    const token = jwt.sign(
        { userId: employer._id, role: 'Employer' },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Set token in cookie
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    res.cookie('token', token, cookieOptions);

    res.status(201).json({
        success: true,
        message: 'Employer created successfully',
        data: employer.getPublicProfile(),
        token,
    });
}));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - userType
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               userType:
 *                 type: string
 *                 enum: [Developer, Employer]
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/Developer'
 *                     - $ref: '#/components/schemas/Employer'
 *                 token:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(schemas.login), asyncHandler(async (req, res) => {
    const { email, password, userType } = req.body;

    let user;
    if (userType === 'Developer') {
        user = await Developer.findOne({ email }).select('+password');
    } else if (userType === 'Employer') {
        user = await Employer.findOne({ email }).select('+password');
    } else {
        return res.status(400).json({
            success: false,
            message: 'Invalid user type',
        });
    }

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials',
        });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials',
        });
    }

    // Generate JWT token
    const token = jwt.sign(
        { userId: user._id, role: userType },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Set token in cookie
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    res.cookie('token', token, cookieOptions);

    res.json({
        success: true,
        message: 'Login successful',
        data: user.getPublicProfile(),
        token,
    });
}));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/Developer'
 *                     - $ref: '#/components/schemas/Employer'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: req.user,
    });
}));

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error or current password is incorrect
 *       401:
 *         description: Unauthorized
 */
router.post('/change-password', authenticateToken, validate(schemas.changePassword), asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    let user;
    if (req.userRole === 'Developer') {
        user = await Developer.findById(req.user._id).select('+password');
    } else if (req.userRole === 'Employer') {
        user = await Employer.findById(req.user._id).select('+password');
    }

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
        return res.status(400).json({
            success: false,
            message: 'Current password is incorrect',
        });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
        success: true,
        message: 'Password changed successfully',
    });
}));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticateToken, (req, res) => {
    // Clear the token cookie
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    });

    res.json({
        success: true,
        message: 'Logout successful',
    });
});

module.exports = router; 