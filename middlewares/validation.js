const Joi = require('joi');

/**
 * Generic validation middleware
 */
const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);

        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errorMessage,
            });
        }

        next();
    };
};

/**
 * Validation schemas
 */
const schemas = {
    // Developer validation schemas
    developerSignup: Joi.object({
        firstName: Joi.string().required().min(2).max(50).trim(),
        lastName: Joi.string().required().min(2).max(50).trim(),
        email: Joi.string().email().required().trim(),
        password: Joi.string().required().min(6).max(100),
    }),

    developerProfileComplete: Joi.object({
        phone: Joi.string().trim().optional(),
        city: Joi.string().trim().optional(),
        skills: Joi.array().items(Joi.string()).min(1).optional(),
        experienceYears: Joi.number().min(0).max(50).optional(),
        githubUrl: Joi.string().uri().optional(),
        portfolioUrl: Joi.string().uri().optional(),
        salaryExpectation: Joi.number().min(0).optional(),
    }),

    developerUpdate: Joi.object({
        firstName: Joi.string().min(2).max(50).trim().optional(),
        lastName: Joi.string().min(2).max(50).trim().optional(),
        phone: Joi.string().trim().optional(),
        city: Joi.string().trim().optional(),
        skills: Joi.array().items(Joi.string()).min(1).optional(),
        experienceYears: Joi.number().min(0).max(50).optional(),
        githubUrl: Joi.string().uri().optional(),
        portfolioUrl: Joi.string().uri().optional(),
        salaryExpectation: Joi.number().min(0).optional(),
        isAvailable: Joi.boolean().optional(),
    }),

    // Employer validation schemas
    employerSignup: Joi.object({
        companyName: Joi.string().required().min(2).max(100).trim(),
        email: Joi.string().email().required().trim(),
        password: Joi.string().required().min(6).max(100),
        phone: Joi.string().required().trim(),
        city: Joi.string().required().trim(),
        description: Joi.string().max(1000).trim().optional(),
        website: Joi.string().uri().optional(),
        linkedin: Joi.string().uri().optional(),
        industry: Joi.string().trim().optional(),
        companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '500+').optional(),
    }),

    employerUpdate: Joi.object({
        companyName: Joi.string().min(2).max(100).trim().optional(),
        phone: Joi.string().trim().optional(),
        city: Joi.string().trim().optional(),
        description: Joi.string().max(1000).trim().optional(),
        website: Joi.string().uri().optional(),
        linkedin: Joi.string().uri().optional(),
        industry: Joi.string().trim().optional(),
        companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '500+').optional(),
    }),

    // Project validation schemas
    projectCreate: Joi.object({
        title: Joi.string().required().min(2).max(100).trim(),
        description: Joi.string().required().min(10).max(2000).trim(),
        techStack: Joi.array().items(Joi.string()).min(1).required(),
        demoUrl: Joi.string().uri().optional(),
        imageUrl: Joi.string().optional(),
        githubUrl: Joi.string().uri().optional(),
        isPublic: Joi.boolean().default(true),
    }),

    projectUpdate: Joi.object({
        title: Joi.string().min(2).max(100).trim().optional(),
        description: Joi.string().min(10).max(2000).trim().optional(),
        techStack: Joi.array().items(Joi.string()).min(1).optional(),
        demoUrl: Joi.string().uri().optional(),
        imageUrl: Joi.string().optional(),
        githubUrl: Joi.string().uri().optional(),
        isPublic: Joi.boolean().optional(),
    }),

    // Job Request validation schemas
    jobRequestCreate: Joi.object({
        developerId: Joi.string().required(),
        jobTitle: Joi.string().required().min(2).max(100).trim(),
        jobDescription: Joi.string().max(2000).trim().optional(),
        salaryOffer: Joi.number().min(0).required(),
        salaryType: Joi.string().valid('hourly', 'monthly', 'yearly').default('yearly'),
        interviewDate: Joi.date().optional(),
        interviewLocation: Joi.string().trim().optional(),
        interviewNotes: Joi.string().max(500).trim().optional(),
    }),

    jobRequestUpdate: Joi.object({
        status: Joi.string().valid('pending', 'accepted', 'rejected', 'withdrawn').optional(),
        interviewDate: Joi.date().optional(),
        interviewLocation: Joi.string().trim().optional(),
        interviewNotes: Joi.string().max(500).trim().optional(),
        employerNotes: Joi.string().max(1000).trim().optional(),
        developerNotes: Joi.string().max(1000).trim().optional(),
    }),

    // Search validation schemas
    developerSearch: Joi.object({
        skills: Joi.array().items(Joi.string()).optional(),
        city: Joi.string().trim().optional(),
        experienceYears: Joi.object({
            min: Joi.number().min(0).optional(),
            max: Joi.number().min(0).optional(),
        }).optional(),
        salaryExpectation: Joi.object({
            min: Joi.number().min(0).optional(),
            max: Joi.number().min(0).optional(),
        }).optional(),
        isAvailable: Joi.boolean().optional(),
        page: Joi.number().min(1).default(1),
        limit: Joi.number().min(1).max(100).default(10),
        sortBy: Joi.string().valid('name', 'experienceYears', 'createdAt').default('createdAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    }),

    // Authentication validation schemas
    login: Joi.object({
        email: Joi.string().email().required().trim(),
        password: Joi.string().required(),
        userType: Joi.string().valid('Developer', 'Employer').required(),
    }),

    // Password change validation
    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().required().min(6).max(100),
    }),
};

module.exports = {
    validate,
    schemas,
}; 