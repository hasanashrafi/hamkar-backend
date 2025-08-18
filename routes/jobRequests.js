const express = require('express');
const JobRequest = require('../models/JobRequest');
const Developer = require('../models/Developer');
const Employer = require('../models/Employer');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validation');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /api/job-requests:
 *   get:
 *     summary: Get job requests (filtered by user role)
 *     tags: [Job Requests]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected, withdrawn]
 *         description: Filter by status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, salaryOffer, interviewDate]
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
 *         description: Job requests retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter based on user role
    let filter = {};
    if (req.userRole === 'Developer') {
        filter.developerId = req.user._id;
    } else if (req.userRole === 'Employer') {
        filter.employerId = req.user._id;
    }

    if (req.query.status) {
        filter.status = req.query.status;
    }

    // Build sort
    const sort = {};
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    sort[sortBy] = sortOrder;

    const [jobRequests, total] = await Promise.all([
        JobRequest.find(filter)
            .populate('employerId', 'companyName city industry')
            .populate('developerId', 'name city skills experienceYears')
            .sort(sort)
            .skip(skip)
            .limit(limit),
        JobRequest.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
        success: true,
        data: jobRequests,
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
 * /api/job-requests/{id}:
 *   get:
 *     summary: Get job request by ID
 *     tags: [Job Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job request ID
 *     responses:
 *       200:
 *         description: Job request retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Job request not found
 */
router.get('/:id', authenticateToken, asyncHandler(async (req, res) => {
    const jobRequest = await JobRequest.findById(req.params.id)
        .populate('employerId', 'companyName city industry')
        .populate('developerId', 'name city skills experienceYears');

    if (!jobRequest) {
        return res.status(404).json({
            success: false,
            message: 'Job request not found',
        });
    }

    // Check if user has access to this job request
    if (req.userRole === 'Developer' && jobRequest.developerId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }

    if (req.userRole === 'Employer' && jobRequest.employerId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }

    res.json({
        success: true,
        data: jobRequest,
    });
}));

/**
 * @swagger
 * /api/job-requests:
 *   post:
 *     summary: Create a new job request (Employer only)
 *     tags: [Job Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JobRequest'
 *     responses:
 *       201:
 *         description: Job request created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', authenticateToken, authorizeRole('Employer'), validate(schemas.jobRequestCreate), asyncHandler(async (req, res) => {
    // Check if developer exists
    const developer = await Developer.findById(req.body.developerId);
    if (!developer) {
        return res.status(404).json({
            success: false,
            message: 'Developer not found',
        });
    }

    // Check if developer is available
    if (!developer.isAvailable) {
        return res.status(400).json({
            success: false,
            message: 'Developer is not available for work',
        });
    }

    // Check if there's already a pending request from this employer to this developer
    const existingRequest = await JobRequest.findOne({
        employerId: req.user._id,
        developerId: req.body.developerId,
        status: 'pending',
    });

    if (existingRequest) {
        return res.status(400).json({
            success: false,
            message: 'You already have a pending request to this developer',
        });
    }

    // Add employer ID to job request
    const jobRequestData = {
        ...req.body,
        employerId: req.user._id,
    };

    const jobRequest = new JobRequest(jobRequestData);
    await jobRequest.save();

    // Populate related data
    await jobRequest.populate('employerId', 'companyName city industry');
    await jobRequest.populate('developerId', 'name city skills experienceYears');

    res.status(201).json({
        success: true,
        message: 'Job request sent successfully',
        data: jobRequest,
    });
}));

/**
 * @swagger
 * /api/job-requests/{id}:
 *   put:
 *     summary: Update job request by ID
 *     tags: [Job Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JobRequest'
 *     responses:
 *       200:
 *         description: Job request updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Job request not found
 */
router.put('/:id', authenticateToken, validate(schemas.jobRequestUpdate), asyncHandler(async (req, res) => {
    const jobRequest = await JobRequest.findById(req.params.id);

    if (!jobRequest) {
        return res.status(404).json({
            success: false,
            message: 'Job request not found',
        });
    }

    // Check if user has access to update this job request
    if (req.userRole === 'Developer' && jobRequest.developerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }

    if (req.userRole === 'Employer' && jobRequest.employerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }

    // Only allow certain fields to be updated based on user role
    const updateData = {};
    if (req.userRole === 'Employer') {
        if (req.body.interviewDate) updateData.interviewDate = req.body.interviewDate;
        if (req.body.interviewLocation) updateData.interviewLocation = req.body.interviewLocation;
        if (req.body.interviewNotes) updateData.interviewNotes = req.body.interviewNotes;
        if (req.body.employerNotes) updateData.employerNotes = req.body.employerNotes;
        if (req.body.status && ['withdrawn'].includes(req.body.status)) {
            updateData.status = req.body.status;
        }
    }

    if (req.userRole === 'Developer') {
        if (req.body.status && ['accepted', 'rejected'].includes(req.body.status)) {
            updateData.status = req.body.status;
        }
        if (req.body.developerNotes) updateData.developerNotes = req.body.developerNotes;
    }

    const updatedJobRequest = await JobRequest.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    ).populate('employerId', 'companyName city industry')
        .populate('developerId', 'name city skills experienceYears');

    res.json({
        success: true,
        message: 'Job request updated successfully',
        data: updatedJobRequest,
    });
}));

/**
 * @swagger
 * /api/job-requests/{id}/accept:
 *   patch:
 *     summary: Accept job request (Developer only)
 *     tags: [Job Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               developerNotes:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Job request accepted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Job request not found
 */
router.patch('/:id/accept', authenticateToken, authorizeRole('Developer'), asyncHandler(async (req, res) => {
    const { developerNotes } = req.body;

    const jobRequest = await JobRequest.findById(req.params.id);

    if (!jobRequest) {
        return res.status(404).json({
            success: false,
            message: 'Job request not found',
        });
    }

    // Check if developer owns this job request
    if (jobRequest.developerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }

    // Check if job request can be accepted
    if (jobRequest.status !== 'pending') {
        return res.status(400).json({
            success: false,
            message: 'Job request cannot be accepted in its current status',
        });
    }

    const updatedJobRequest = await JobRequest.findByIdAndUpdate(
        req.params.id,
        {
            status: 'accepted',
            developerNotes: developerNotes || jobRequest.developerNotes,
        },
        { new: true }
    ).populate('employerId', 'companyName city industry')
        .populate('developerId', 'name city skills experienceYears');

    res.json({
        success: true,
        message: 'Job request accepted successfully',
        data: updatedJobRequest,
    });
}));

/**
 * @swagger
 * /api/job-requests/{id}/reject:
 *   patch:
 *     summary: Reject job request (Developer only)
 *     tags: [Job Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               developerNotes:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Job request rejected successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Job request not found
 */
router.patch('/:id/reject', authenticateToken, authorizeRole('Developer'), asyncHandler(async (req, res) => {
    const { developerNotes } = req.body;

    const jobRequest = await JobRequest.findById(req.params.id);

    if (!jobRequest) {
        return res.status(404).json({
            success: false,
            message: 'Job request not found',
        });
    }

    // Check if developer owns this job request
    if (jobRequest.developerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: 'Access denied',
        });
    }

    // Check if job request can be rejected
    if (jobRequest.status !== 'pending') {
        return res.status(400).json({
            success: false,
            message: 'Job request cannot be rejected in its current status',
        });
    }

    const updatedJobRequest = await JobRequest.findByIdAndUpdate(
        req.params.id,
        {
            status: 'rejected',
            developerNotes: developerNotes || jobRequest.developerNotes,
        },
        { new: true }
    ).populate('employerId', 'companyName city industry')
        .populate('developerId', 'name city skills experienceYears');

    res.json({
        success: true,
        message: 'Job request rejected successfully',
        data: updatedJobRequest,
    });
}));

/**
 * @swagger
 * /api/job-requests/{id}:
 *   delete:
 *     summary: Delete job request (Admin only)
 *     tags: [Job Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job request ID
 *     responses:
 *       200:
 *         description: Job request deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Job request not found
 */
router.delete('/:id', authenticateToken, authorizeRole('Admin'), asyncHandler(async (req, res) => {
    const jobRequest = await JobRequest.findByIdAndDelete(req.params.id);

    if (!jobRequest) {
        return res.status(404).json({
            success: false,
            message: 'Job request not found',
        });
    }

    res.json({
        success: true,
        message: 'Job request deleted successfully',
    });
}));

module.exports = router; 