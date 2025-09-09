const express = require('express');
const Developer = require('../models/Developer');
const Employer = require('../models/Employer');
const Project = require('../models/Project');
const JobRequest = require('../models/JobRequest');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /api/dashboard/developer:
 *   get:
 *     summary: Get developer dashboard summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Developer dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProjects:
 *                       type: integer
 *                       description: Total number of projects
 *                     publicProjects:
 *                       type: integer
 *                       description: Number of public projects
 *                     totalJobRequests:
 *                       type: integer
 *                       description: Total job requests received
 *                     pendingRequests:
 *                       type: integer
 *                       description: Pending job requests
 *                     acceptedRequests:
 *                       type: integer
 *                       description: Accepted job requests
 *                     rejectedRequests:
 *                       type: integer
 *                       description: Rejected job requests
 *                     pendingInterviews:
 *                       type: integer
 *                       description: Pending interviews
 *                     profileCompletion:
 *                       type: number
 *                       description: Profile completion percentage
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           message:
 *                             type: string
 *                           date:
 *                             type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/developer', authenticateToken, authorizeRole('Developer'), asyncHandler(async (req, res) => {
    const developerId = req.user._id;

    // Get counts
    const [
        totalProjects,
        publicProjects,
        totalJobRequests,
        pendingRequests,
        acceptedRequests,
        rejectedRequests,
        pendingInterviews,
    ] = await Promise.all([
        Project.countDocuments({ developerId }),
        Project.countDocuments({ developerId, isPublic: true }),
        JobRequest.countDocuments({ developerId }),
        JobRequest.countDocuments({ developerId, status: 'pending' }),
        JobRequest.countDocuments({ developerId, status: 'accepted' }),
        JobRequest.countDocuments({ developerId, status: 'rejected' }),
        JobRequest.countDocuments({ developerId, status: 'accepted', interviewDate: { $exists: true } }),
    ]);

    // Get profile completion from the developer object
    const developer = await Developer.findById(developerId);
    const profileCompletion = developer ? developer.profileCompletion : 0;

    // Get recent activity
    const recentJobRequests = await JobRequest.find({ developerId })
        .populate('employerId', 'companyName')
        .sort({ createdAt: -1 })
        .limit(5);

    const recentProjects = await Project.find({ developerId })
        .sort({ updatedAt: -1 })
        .limit(5);

    const recentActivity = [];

    recentJobRequests.forEach(request => {
        recentActivity.push({
            type: 'job_request',
            message: `Job request from ${request.employerId.companyName} - ${request.jobTitle}`,
            date: request.createdAt,
            status: request.status,
        });
    });

    recentProjects.forEach(project => {
        recentActivity.push({
            type: 'project',
            message: `Project "${project.title}" updated`,
            date: project.updatedAt,
        });
    });

    // Sort by date
    recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
    recentActivity.splice(5); // Keep only 5 most recent

    res.json({
        success: true,
        data: {
            totalProjects,
            publicProjects,
            totalJobRequests,
            pendingRequests,
            acceptedRequests,
            rejectedRequests,
            pendingInterviews,
            profileCompletion,
            recentActivity,
        },
    });
}));

/**
 * @swagger
 * /api/dashboard/employer:
 *   get:
 *     summary: Get employer dashboard summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employer dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSentRequests:
 *                       type: integer
 *                       description: Total job requests sent
 *                     pendingRequests:
 *                       type: integer
 *                       description: Pending job requests
 *                     acceptedRequests:
 *                       type: integer
 *                       description: Accepted job requests
 *                     rejectedRequests:
 *                       type: integer
 *                       description: Rejected job requests
 *                     acceptedCandidates:
 *                       type: integer
 *                       description: Number of accepted candidates
 *                     pendingInterviews:
 *                       type: integer
 *                       description: Pending interviews
 *                     profileCompletion:
 *                       type: number
 *                       description: Profile completion percentage
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           message:
 *                             type: string
 *                           date:
 *                             type: string
 *                           format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/employer', authenticateToken, authorizeRole('Employer'), asyncHandler(async (req, res) => {
    const employerId = req.user._id;

    // Get counts
    const [
        totalSentRequests,
        pendingRequests,
        acceptedRequests,
        rejectedRequests,
        acceptedCandidates,
        pendingInterviews,
    ] = await Promise.all([
        JobRequest.countDocuments({ employerId }),
        JobRequest.countDocuments({ employerId, status: 'pending' }),
        JobRequest.countDocuments({ employerId, status: 'accepted' }),
        JobRequest.countDocuments({ employerId, status: 'rejected' }),
        JobRequest.countDocuments({ employerId, status: 'accepted' }),
        JobRequest.countDocuments({ employerId, status: 'accepted', interviewDate: { $exists: true } }),
    ]);

    // Calculate profile completion
    const profile = req.user;
    const requiredFields = ['companyName', 'email', 'phone', 'city'];
    const optionalFields = ['description', 'website', 'linkedin', 'companyLogo', 'industry', 'companySize'];

    let completedFields = 0;
    requiredFields.forEach(field => {
        if (profile[field]) {
            completedFields++;
        }
    });

    optionalFields.forEach(field => {
        if (profile[field]) {
            completedFields++;
        }
    });

    const totalFields = requiredFields.length + optionalFields.length;
    const profileCompletion = Math.round((completedFields / totalFields) * 100);

    // Get recent activity
    const recentJobRequests = await JobRequest.find({ employerId })
        .populate('developerId', 'firstName lastName city skills experienceYears')
        .sort({ createdAt: -1 })
        .limit(5);

    const recentActivity = recentJobRequests.map(request => ({
        type: 'job_request',
        message: `Job request to ${request.developerId.firstName} ${request.developerId.lastName} - ${request.jobTitle}`,
        date: request.createdAt,
        status: request.status,
        developer: {
            firstName: request.developerId.firstName,
            lastName: request.developerId.lastName,
            city: request.developerId.city,
            skills: request.developerId.skills,
            experienceYears: request.developerId.experienceYears,
        },
    }));

    res.json({
        success: true,
        data: {
            totalSentRequests,
            pendingRequests,
            acceptedRequests,
            rejectedRequests,
            acceptedCandidates,
            pendingInterviews,
            profileCompletion,
            recentActivity,
        },
    });
}));

/**
 * @swagger
 * /api/dashboard/admin:
 *   get:
 *     summary: Get admin dashboard summary
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard data retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/admin', authenticateToken, authorizeRole('Admin'), asyncHandler(async (req, res) => {
    // Get overall statistics
    const [
        totalDevelopers,
        totalEmployers,
        totalProjects,
        totalJobRequests,
        pendingJobRequests,
        acceptedJobRequests,
        recentDevelopers,
        recentEmployers,
        recentJobRequests,
    ] = await Promise.all([
        Developer.countDocuments(),
        Employer.countDocuments(),
        Project.countDocuments(),
        JobRequest.countDocuments(),
        JobRequest.countDocuments({ status: 'pending' }),
        JobRequest.countDocuments({ status: 'accepted' }),
        Developer.find().sort({ createdAt: -1 }).limit(5).select('name email city createdAt'),
        Employer.find().sort({ createdAt: -1 }).limit(5).select('companyName email city createdAt'),
        JobRequest.find().sort({ createdAt: -1 }).limit(5).populate('employerId', 'companyName').populate('developerId', 'name'),
    ]);

    // Get monthly statistics for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await JobRequest.aggregate([
        {
            $match: {
                createdAt: { $gte: sixMonthsAgo }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1 }
        }
    ]);

    res.json({
        success: true,
        data: {
            overview: {
                totalDevelopers,
                totalEmployers,
                totalProjects,
                totalJobRequests,
                pendingJobRequests,
                acceptedJobRequests,
            },
            recentActivity: {
                developers: recentDevelopers,
                employers: recentEmployers,
                jobRequests: recentJobRequests,
            },
            monthlyStats,
        },
    });
}));

/**
 * @swagger
 * /api/dashboard/analytics:
 *   get:
 *     summary: Get analytics data for charts
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year]
 *           default: month
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics', authenticateToken, asyncHandler(async (req, res) => {
    const { period = 'month' } = req.query;
    const userId = req.user._id;
    const userRole = req.userRole;

    let startDate;
    const now = new Date();

    switch (period) {
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let analytics = {};

    if (userRole === 'Developer') {
        // Developer analytics
        const [projectStats, jobRequestStats] = await Promise.all([
            Project.aggregate([
                {
                    $match: {
                        developerId: userId,
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            JobRequest.aggregate([
                {
                    $match: {
                        developerId: userId,
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        analytics = {
            projects: projectStats,
            jobRequests: jobRequestStats,
        };
    } else if (userRole === 'Employer') {
        // Employer analytics
        const jobRequestStats = await JobRequest.aggregate([
            {
                $match: {
                    employerId: userId,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        analytics = {
            jobRequests: jobRequestStats,
        };
    }

    res.json({
        success: true,
        data: {
            period,
            startDate,
            endDate: now,
            analytics,
        },
    });
}));

module.exports = router; 