const express = require('express');
const Project = require('../models/Project');
const Developer = require('../models/Developer');
const { authenticateToken, authorizeRole, authorizeOwnResource } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validation');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all public projects
 *     tags: [Projects]
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
 *         name: techStack
 *         schema:
 *           type: string
 *         description: Filter by tech stack (comma-separated)
 *       - in: query
 *         name: developerId
 *         schema:
 *           type: string
 *         description: Filter by developer ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, createdAt, techStack]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
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
 *                     $ref: '#/components/schemas/Project'
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
    const filter = { isPublic: true };
    if (req.query.techStack) {
        const techStack = req.query.techStack.split(',').map(tech => tech.trim());
        filter.techStack = { $in: techStack };
    }
    if (req.query.developerId) {
        filter.developerId = req.query.developerId;
    }

    // Build sort
    const sort = {};
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    sort[sortBy] = sortOrder;

    const [projects, total] = await Promise.all([
        Project.find(filter)
            .populate('developerId', 'name city skills experienceYears')
            .sort(sort)
            .skip(skip)
            .limit(limit),
        Project.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
        success: true,
        data: projects,
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
 * /api/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id)
        .populate('developerId', 'name city skills experienceYears');

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
        });
    }

    // Check if project is public or user owns it
    if (!project.isPublic && (!req.user || req.user._id.toString() !== project.developerId._id.toString())) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }

    res.json({
        success: true,
        data: project,
    });
}));

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       201:
 *         description: Project created successfully
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
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, authorizeRole('Developer'), validate(schemas.projectCreate), asyncHandler(async (req, res) => {
    // Add developer ID to project
    const projectData = {
        ...req.body,
        developerId: req.user._id,
    };

    const project = new Project(projectData);
    await project.save();

    // Add project to developer's projects array
    await Developer.findByIdAndUpdate(
        req.user._id,
        { $push: { projects: project._id } }
    );

    // Populate developer info
    await project.populate('developerId', 'name city skills experienceYears');

    res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project,
    });
}));

/**
 * @swagger
 * /api/projects/{id}:
 *   put:
 *     summary: Update project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Project not found
 */
router.put('/:id', authenticateToken, authorizeRole('Developer'), validate(schemas.projectUpdate), asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
        });
    }

    // Check if user owns the project
    if (project.developerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. You can only update your own projects.',
        });
    }

    const updatedProject = await Project.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
    ).populate('developerId', 'name city skills experienceYears');

    res.json({
        success: true,
        message: 'Project updated successfully',
        data: updatedProject,
    });
}));

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete project by ID
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Project not found
 */
router.delete('/:id', authenticateToken, authorizeRole('Developer'), asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);

    if (!project) {
        return res.status(404).json({
            success: false,
            message: 'Project not found',
        });
    }

    // Check if user owns the project
    if (project.developerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. You can only delete your own projects.',
        });
    }

    // Remove project from developer's projects array
    await Developer.findByIdAndUpdate(
        req.user._id,
        { $pull: { projects: project._id } }
    );

    await Project.findByIdAndDelete(req.params.id);

    res.json({
        success: true,
        message: 'Project deleted successfully',
    });
}));

/**
 * @swagger
 * /api/projects/developer/{developerId}:
 *   get:
 *     summary: Get projects by developer ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: developerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Developer ID
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
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 *       404:
 *         description: Developer not found
 */
router.get('/developer/:developerId', asyncHandler(async (req, res) => {
    const { developerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Check if developer exists
    const developer = await Developer.findById(developerId);
    if (!developer) {
        return res.status(404).json({
            success: false,
            message: 'Developer not found',
        });
    }

    const [projects, total] = await Promise.all([
        Project.find({ developerId, isPublic: true })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Project.countDocuments({ developerId, isPublic: true }),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
        success: true,
        data: projects,
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
 * /api/projects/profile/my-projects:
 *   get:
 *     summary: Get current developer's projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Projects retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile/my-projects', authenticateToken, authorizeRole('Developer'), asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
        Project.find({ developerId: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Project.countDocuments({ developerId: req.user._id }),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
        success: true,
        data: projects,
        pagination: {
            page,
            limit,
            total,
            pages,
        },
    });
}));

module.exports = router; 