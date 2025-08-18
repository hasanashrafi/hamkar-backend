const express = require('express');
const Employer = require('../models/Employer');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validation');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /api/employers:
 *   get:
 *     summary: Get all employers (public profiles)
 *     tags: [Employers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Filter by industry
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: companySize
 *         schema:
 *           type: string
 *           enum: [1-10, 11-50, 51-200, 201-500, 500+]
 *         description: Filter by company size
 *     responses:
 *       200:
 *         description: Employers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employer'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.industry) {
        filter.industry = { $regex: req.query.industry, $options: 'i' };
    }
    if (req.query.city) {
        filter.city = { $regex: req.query.city, $options: 'i' };
    }
    if (req.query.companySize) {
        filter.companySize = req.query.companySize;
    }

    const [employers, total] = await Promise.all([
        Employer.find(filter)
            .select('-password -__v')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Employer.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
        success: true,
        data: employers,
        pagination: {
            page,
            limit,
            total,
            pages,
        },
    });
}));

/**
 * @swagger
 * /api/employers/{id}:
 *   get:
 *     summary: Get employer by ID (public profile)
 *     tags: [Employers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employer ID
 *     responses:
 *       200:
 *         description: Employer retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Employer'
 *       404:
 *         description: Employer not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const employer = await Employer.findById(req.params.id)
        .select('-password -__v');

    if (!employer) {
        return res.status(404).json({
            success: false,
            message: 'Employer not found',
        });
    }

    res.json({
        success: true,
        data: employer,
    });
}));

/**
 * @swagger
 * /api/employers/profile:
 *   get:
 *     summary: Get current employer profile
 *     tags: [Employers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Employer'
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticateToken, authorizeRole('Employer'), asyncHandler(async (req, res) => {
    const employer = await Employer.findById(req.user._id)
        .select('-password -__v');

    res.json({
        success: true,
        data: employer,
    });
}));

/**
 * @swagger
 * /api/employers/profile:
 *   put:
 *     summary: Update current employer profile
 *     tags: [Employers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employer'
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', authenticateToken, authorizeRole('Employer'), validate(schemas.employerUpdate), asyncHandler(async (req, res) => {
    const employer = await Employer.findByIdAndUpdate(
        req.user._id,
        req.body,
        { new: true, runValidators: true }
    ).select('-password -__v');

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: employer,
    });
}));

/**
 * @swagger
 * /api/employers/{id}:
 *   put:
 *     summary: Update employer by ID (Admin only)
 *     tags: [Employers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Employer'
 *     responses:
 *       200:
 *         description: Employer updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Employer not found
 */
router.put('/:id', authenticateToken, authorizeRole('Admin'), validate(schemas.employerUpdate), asyncHandler(async (req, res) => {
    const employer = await Employer.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).select('-password -__v');

    if (!employer) {
        return res.status(404).json({
            success: false,
            message: 'Employer not found',
        });
    }

    res.json({
        success: true,
        message: 'Employer updated successfully',
        data: employer,
    });
}));

/**
 * @swagger
 * /api/employers/{id}:
 *   delete:
 *     summary: Delete employer by ID (Admin only)
 *     tags: [Employers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Employer ID
 *     responses:
 *       200:
 *         description: Employer deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Employer not found
 */
router.delete('/:id', authenticateToken, authorizeRole('Admin'), asyncHandler(async (req, res) => {
    const employer = await Employer.findByIdAndDelete(req.params.id);

    if (!employer) {
        return res.status(404).json({
            success: false,
            message: 'Employer not found',
        });
    }

    res.json({
        success: true,
        message: 'Employer deleted successfully',
    });
}));

module.exports = router; 