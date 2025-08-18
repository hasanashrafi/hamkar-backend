const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * @swagger
 * components:
 *   schemas:
 *     Employer:
 *       type: object
 *       required:
 *         - companyName
 *         - email
 *         - password
 *         - phone
 *         - city
 *       properties:
 *         companyName:
 *           type: string
 *           description: Company name
 *         email:
 *           type: string
 *           format: email
 *           description: Company email address
 *         password:
 *           type: string
 *           description: Hashed password
 *         phone:
 *           type: string
 *           description: Company phone number
 *         city:
 *           type: string
 *           description: Company city
 *         description:
 *           type: string
 *           description: Company description
 *         website:
 *           type: string
 *           format: uri
 *           description: Company website URL
 *         linkedin:
 *           type: string
 *           format: uri
 *           description: Company LinkedIn URL
 *         companyLogo:
 *           type: string
 *           description: Company logo file path
 *         industry:
 *           type: string
 *           description: Company industry
 *         companySize:
 *           type: string
 *           enum: [1-10, 11-50, 51-200, 201-500, 500+]
 *           description: Company size range
 *         role:
 *           type: string
 *           default: Employer
 *           enum: [Employer, Admin]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const employerSchema = new mongoose.Schema(
    {
        companyName: {
            type: String,
            required: [true, 'Company name is required'],
            trim: true,
            maxlength: [100, 'Company name cannot exceed 100 characters'],
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
            required: [true, 'Phone number is required'],
            trim: true,
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        website: {
            type: String,
            trim: true,
            match: [/^https?:\/\//, 'Please enter a valid URL'],
        },
        linkedin: {
            type: String,
            trim: true,
            match: [/^https?:\/\//, 'Please enter a valid URL'],
        },
        companyLogo: {
            type: String,
            trim: true,
        },
        industry: {
            type: String,
            trim: true,
        },
        companySize: {
            type: String,
            enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
        },
        role: {
            type: String,
            default: 'Employer',
            enum: ['Employer', 'Admin'],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Index for search functionality
employerSchema.index({ companyName: 1, city: 1, industry: 1 });

// Hash password before saving
employerSchema.pre('save', async function (next) {
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
employerSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
employerSchema.methods.getPublicProfile = function () {
    const employerObject = this.toObject();
    delete employerObject.password;
    delete employerObject.__v;
    return employerObject;
};

module.exports = mongoose.model('Employer', employerSchema); 