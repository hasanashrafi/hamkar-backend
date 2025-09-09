const express = require('express');
const Developer = require('../models/Developer');
const { authenticateToken, authorizeRole, authorizeOwnResource } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validation');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /api/developers:
 *   get:
 *     summary: Get all developers (public profiles)
 *     tags: [Developers]
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
 *         name: skills
 *         schema:
 *           type: string
 *         description: Filter by skills (comma-separated)
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Filter by availability
 *     responses:
 *       200:
 *         description: Developers retrieved successfully
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
 *                     $ref: '#/components/schemas/Developer'
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
    const filter = { isAvailable: true };
    if (req.query.skills) {
        const skills = req.query.skills.split(',').map(skill => skill.trim());
        filter.skills = { $in: skills };
    }
    if (req.query.city) {
        filter.city = { $regex: req.query.city, $options: 'i' };
    }
    if (req.query.isAvailable !== undefined) {
        filter.isAvailable = req.query.isAvailable === 'true';
    }

    const [developers, total] = await Promise.all([
        Developer.find(filter)
            .select('-password -__v')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Developer.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
        success: true,
        data: developers,
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
 * /api/developers/{id}:
 *   get:
 *     summary: Get developer by ID (public profile)
 *     tags: [Developers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Developer ID
 *     responses:
 *       200:
 *         description: Developer retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Developer'
 *       404:
 *         description: Developer not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const developer = await Developer.findById(req.params.id)
        .select('-password -__v')
        .populate('projects', 'title description techStack demoUrl imageUrl');

    if (!developer) {
        return res.status(404).json({
            success: false,
            message: 'Developer not found',
        });
    }

    res.json({
        success: true,
        data: developer,
    });
}));

/**
 * @swagger
 * /api/developers/profile:
 *   get:
 *     summary: Get current developer profile
 *     tags: [Developers]
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
 *                   $ref: '#/components/schemas/Developer'
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticateToken, authorizeRole('Developer'), asyncHandler(async (req, res) => {
    const developer = await Developer.findById(req.user._id)
        .select('-password -__v')
        .populate('projects', 'title description techStack demoUrl imageUrl createdAt');

    res.json({
        success: true,
        data: developer,
    });
}));

/**
 * @swagger
 * /api/developers/profile:
 *   put:
 *     summary: Update current developer profile
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Developer'
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
 *                   $ref: '#/components/schemas/Developer'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/profile', authenticateToken, authorizeRole('Developer'), validate(schemas.developerUpdate), asyncHandler(async (req, res) => {
    const developer = await Developer.findByIdAndUpdate(
        req.user._id,
        req.body,
        { new: true, runValidators: true }
    ).select('-password -__v');

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: developer,
    });
}));

/**
 * @swagger
 * /api/developers/{id}:
 *   put:
 *     summary: Update developer by ID (Admin only)
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Developer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Developer'
 *     responses:
 *       200:
 *         description: Developer updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Developer not found
 */
router.put('/:id', authenticateToken, authorizeRole('Admin'), validate(schemas.developerUpdate), asyncHandler(async (req, res) => {
    const developer = await Developer.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).select('-password -__v');

    if (!developer) {
        return res.status(404).json({
            success: false,
            message: 'Developer not found',
        });
    }

    res.json({
        success: true,
        message: 'Developer updated successfully',
        data: developer,
    });
}));

/**
 * @swagger
 * /api/developers/{id}:
 *   delete:
 *     summary: Delete developer by ID (Admin only)
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Developer ID
 *     responses:
 *       200:
 *         description: Developer deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Developer not found
 */
router.delete('/:id', authenticateToken, authorizeRole('Admin'), asyncHandler(async (req, res) => {
    const developer = await Developer.findByIdAndDelete(req.params.id);

    if (!developer) {
        return res.status(404).json({
            success: false,
            message: 'Developer not found',
        });
    }

    res.json({
        success: true,
        message: 'Developer deleted successfully',
    });
}));

/**
 * @swagger
 * /api/developers/profile/complete:
 *   post:
 *     summary: Complete developer profile (add additional info after signup)
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               city:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               experienceYears:
 *                 type: number
 *               githubUrl:
 *                 type: string
 *               portfolioUrl:
 *                 type: string
 *               salaryExpectation:
 *                 type: number
 *     responses:
 *       200:
 *         description: Profile completed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/profile/complete', authenticateToken, authorizeRole('Developer'), validate(schemas.developerProfileComplete), asyncHandler(async (req, res) => {
    const developer = await Developer.findByIdAndUpdate(
        req.user._id,
        req.body,
        { new: true, runValidators: true }
    ).select('-password -__v');

    res.json({
        success: true,
        message: 'Profile completed successfully',
        data: developer,
        profileCompletion: developer.profileCompletion,
        isProfileComplete: developer.isProfileComplete,
    });
}));

/**
 * @swagger
 * /api/developers/profile/availability:
 *   patch:
 *     summary: Toggle developer availability
 *     tags: [Developers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *       401:
 *         description: Unauthorized
 */
router.patch('/profile/availability', authenticateToken, authorizeRole('Developer'), asyncHandler(async (req, res) => {
    const { isAvailable } = req.body;

    const developer = await Developer.findByIdAndUpdate(
        req.user._id,
        { isAvailable },
        { new: true }
    ).select('-password -__v');

    res.json({
        success: true,
        message: `Availability updated to ${isAvailable ? 'available' : 'unavailable'}`,
        data: developer,
    });
}));

module.exports = router; 