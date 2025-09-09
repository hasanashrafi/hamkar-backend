const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * components:
 *   schemas:
 *     Developer:
 *       type: object
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *       properties:
 *         firstName:
 *           type: string
 *           description: Developer's first name
 *         lastName:
 *           type: string
 *           description: Developer's last name
 *         fullName:
 *           type: string
 *           description: Developer's full name (computed)
 *         email:
 *           type: string
 *           format: email
 *           description: Developer's email address
 *         password:
 *           type: string
 *           description: Hashed password
 *         phone:
 *           type: string
 *           description: Developer's phone number
 *         city:
 *           type: string
 *           description: Developer's city
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of developer skills
 *         experienceYears:
 *           type: number
 *           minimum: 0
 *           description: Years of experience
 *         githubUrl:
 *           type: string
 *           format: uri
 *           description: GitHub profile URL
 *         portfolioUrl:
 *           type: string
 *           format: uri
 *           description: Portfolio website URL
 *         resumeUrl:
 *           type: string
 *           description: Resume file path
 *         projects:
 *           type: array
 *           items:
 *             type: string
 *             format: ObjectId
 *           description: Array of project references
 *         profilePicture:
 *           type: string
 *           description: Profile picture file path
 *         salaryExpectation:
 *           type: number
 *           description: Expected salary
 *         isAvailable:
 *           type: boolean
 *           default: true
 *           description: Whether developer is available for work
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const developerSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
            maxlength: [50, 'First name cannot exceed 50 characters'],
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
            maxlength: [50, 'Last name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,
        },
        phone: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
            trim: true,
        },
        skills: {
            type: [String],
            default: [],
        },
        experienceYears: {
            type: Number,
            min: [0, 'Experience years cannot be negative'],
            max: [50, 'Experience years cannot exceed 50'],
        },
        githubUrl: {
            type: String,
            trim: true,
            match: [/^https?:\/\//, 'Please enter a valid URL'],
        },
        portfolioUrl: {
            type: String,
            trim: true,
            match: [/^https?:\/\//, 'Please enter a valid URL'],
        },
        resumeUrl: {
            type: String,
            trim: true,
        },
        profilePicture: {
            type: String,
            trim: true,
        },
        projects: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
        }],
        salaryExpectation: {
            type: Number,
            min: [0, 'Salary expectation cannot be negative'],
        },
        isAvailable: {
            type: Boolean,
            default: true,
        },
        role: {
            type: String,
            default: 'Developer',
            enum: ['Developer', 'Admin'],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Index for search functionality
developerSchema.index({ skills: 1, city: 1, experienceYears: 1, isAvailable: 1 });

// Virtual for full name
developerSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Virtual for total projects count
developerSchema.virtual('totalProjects').get(function () {
    return this.projects ? this.projects.length : 0;
});

// Virtual for profile completion percentage
developerSchema.virtual('profileCompletion').get(function () {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'city', 'skills', 'experienceYears'];
    const optionalFields = ['githubUrl', 'portfolioUrl', 'resumeUrl', 'profilePicture'];

    let completedFields = 0;

    requiredFields.forEach(field => {
        if (this[field] && (Array.isArray(this[field]) ? this[field].length > 0 : true)) {
            completedFields++;
        }
    });

    optionalFields.forEach(field => {
        if (this[field]) {
            completedFields++;
        }
    });

    const totalFields = requiredFields.length + optionalFields.length;
    return Math.round((completedFields / totalFields) * 100);
});

// Virtual for profile completion status
developerSchema.virtual('isProfileComplete').get(function () {
    return this.profileCompletion >= 80; // 80% completion considered complete
});

// Hash password before saving
developerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
developerSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
developerSchema.methods.getPublicProfile = function () {
    const developerObject = this.toObject();
    delete developerObject.password;
    delete developerObject.__v;
    return developerObject;
};

// Method to get minimal profile for signup (only basic fields)
developerSchema.methods.getMinimalProfile = function () {
    return {
        _id: this._id,
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
        role: this.role,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

module.exports = mongoose.model('Developer', developerSchema); 