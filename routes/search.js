const express = require('express');
const Developer = require('../models/Developer');
const { validate, schemas } = require('../middlewares/validation');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /api/search/developers:
 *   post:
 *     summary: Search developers with advanced filters
 *     tags: [Search]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of required skills
 *               city:
 *                 type: string
 *                 description: City filter
 *               experienceYears:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 0
 *                   max:
 *                     type: number
 *                     minimum: 0
 *                 description: Experience range filter
 *               salaryExpectation:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 0
 *                   max:
 *                     type: number
 *                     minimum: 0
 *                 description: Salary expectation range filter
 *               isAvailable:
 *                 type: boolean
 *                 description: Filter by availability
 *               page:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *                 description: Page number
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 10
 *                 description: Number of items per page
 *               sortBy:
 *                 type: string
 *                 enum: [name, experienceYears, createdAt, salaryExpectation]
 *                 default: createdAt
 *                 description: Sort field
 *               sortOrder:
 *                 type: string
 *                 enum: [asc, desc]
 *                 default: desc
 *                 description: Sort order
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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
 *                 filters:
 *                   type: object
 *                   description: Applied filters
 *       400:
 *         description: Validation error
 */
router.post('/developers', validate(schemas.developerSearch), asyncHandler(async (req, res) => {
    const {
        skills,
        city,
        experienceYears,
        salaryExpectation,
        isAvailable = true,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    } = req.body;

    const skip = (page - 1) * limit;

    // Build filter
    const filter = { isAvailable };

    if (skills && skills.length > 0) {
        filter.skills = { $in: skills };
    }

    if (city) {
        filter.city = { $regex: city, $options: 'i' };
    }

    if (experienceYears) {
        if (experienceYears.min !== undefined || experienceYears.max !== undefined) {
            filter.experienceYears = {};
            if (experienceYears.min !== undefined) {
                filter.experienceYears.$gte = experienceYears.min;
            }
            if (experienceYears.max !== undefined) {
                filter.experienceYears.$lte = experienceYears.max;
            }
        }
    }

    if (salaryExpectation) {
        if (salaryExpectation.min !== undefined || salaryExpectation.max !== undefined) {
            filter.salaryExpectation = {};
            if (salaryExpectation.min !== undefined) {
                filter.salaryExpectation.$gte = salaryExpectation.min;
            }
            if (salaryExpectation.max !== undefined) {
                filter.salaryExpectation.$lte = salaryExpectation.max;
            }
        }
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute search with aggregation for better performance
    const pipeline = [
        { $match: filter },
        {
            $addFields: {
                skillMatchCount: {
                    $size: {
                        $setIntersection: ['$skills', skills || []]
                    }
                }
            }
        },
        { $sort: { skillMatchCount: -1, [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: 'projects',
                localField: '_id',
                foreignField: 'developerId',
                as: 'projects'
            }
        },
        {
            $addFields: {
                totalProjects: { $size: '$projects' },
                publicProjects: {
                    $size: {
                        $filter: {
                            input: '$projects',
                            cond: { $eq: ['$$this.isPublic', true] }
                        }
                    }
                }
            }
        },
        {
            $project: {
                password: 0,
                __v: 0,
                projects: 0
            }
        }
    ];

    const [developers, total] = await Promise.all([
        Developer.aggregate(pipeline),
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
        filters: {
            skills,
            city,
            experienceYears,
            salaryExpectation,
            isAvailable,
        },
    });
}));

/**
 * @swagger
 * /api/search/developers/quick:
 *   get:
 *     summary: Quick search developers with query string
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (name, skills, or city)
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
 *         description: Quick search results retrieved successfully
 */
router.get('/developers/quick', asyncHandler(async (req, res) => {
    const { q, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = { isAvailable: true };

    if (q) {
        const searchRegex = { $regex: q, $options: 'i' };
        filter = {
            $and: [
                { isAvailable: true },
                {
                    $or: [
                        { name: searchRegex },
                        { skills: { $in: [new RegExp(q, 'i')] } },
                        { city: searchRegex },
                    ],
                },
            ],
        };
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
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages,
        },
        query: q,
    });
}));

/**
 * @swagger
 * /api/search/skills:
 *   get:
 *     summary: Get all available skills
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Skills retrieved successfully
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
 *                     type: string
 */
router.get('/skills', asyncHandler(async (req, res) => {
    const skills = await Developer.distinct('skills');

    // Sort skills alphabetically
    const sortedSkills = skills.sort();

    res.json({
        success: true,
        data: sortedSkills,
    });
}));

/**
 * @swagger
 * /api/search/cities:
 *   get:
 *     summary: Get all available cities
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Cities retrieved successfully
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
 *                     type: string
 */
router.get('/cities', asyncHandler(async (req, res) => {
    const cities = await Developer.distinct('city');

    // Sort cities alphabetically
    const sortedCities = cities.sort();

    res.json({
        success: true,
        data: sortedCities,
    });
}));

/**
 * @swagger
 * /api/search/statistics:
 *   get:
 *     summary: Get search statistics
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     totalDevelopers:
 *                       type: integer
 *                     availableDevelopers:
 *                       type: integer
 *                     totalSkills:
 *                       type: integer
 *                     totalCities:
 *                       type: integer
 *                     averageExperience:
 *                       type: number
 *                     experienceRange:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                         max:
 *                           type: number
 */
router.get('/statistics', asyncHandler(async (req, res) => {
    const [
        totalDevelopers,
        availableDevelopers,
        skills,
        cities,
        experienceStats,
    ] = await Promise.all([
        Developer.countDocuments(),
        Developer.countDocuments({ isAvailable: true }),
        Developer.distinct('skills'),
        Developer.distinct('city'),
        Developer.aggregate([
            {
                $group: {
                    _id: null,
                    avgExperience: { $avg: '$experienceYears' },
                    minExperience: { $min: '$experienceYears' },
                    maxExperience: { $max: '$experienceYears' },
                },
            },
        ]),
    ]);

    const stats = experienceStats[0] || {};

    res.json({
        success: true,
        data: {
            totalDevelopers,
            availableDevelopers,
            totalSkills: skills.length,
            totalCities: cities.length,
            averageExperience: Math.round(stats.avgExperience * 10) / 10,
            experienceRange: {
                min: stats.minExperience || 0,
                max: stats.maxExperience || 0,
            },
        },
    });
}));

module.exports = router; 