const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     JobRequest:
 *       type: object
 *       required:
 *         - employerId
 *         - developerId
 *         - jobTitle
 *         - salaryOffer
 *         - status
 *       properties:
 *         employerId:
 *           type: string
 *           format: ObjectId
 *           description: Reference to the employer
 *         developerId:
 *           type: string
 *           format: ObjectId
 *           description: Reference to the developer
 *         jobTitle:
 *           type: string
 *           description: Title of the job position
 *         jobDescription:
 *           type: string
 *           description: Detailed job description
 *         salaryOffer:
 *           type: number
 *           description: Salary offer amount
 *         salaryType:
 *           type: string
 *           enum: [hourly, monthly, yearly]
 *           default: yearly
 *           description: Type of salary (hourly, monthly, yearly)
 *         status:
 *           type: string
 *           enum: [pending, accepted, rejected, withdrawn]
 *           default: pending
 *           description: Current status of the job request
 *         interviewDate:
 *           type: string
 *           format: date-time
 *           description: Scheduled interview date and time
 *         interviewLocation:
 *           type: string
 *           description: Interview location or platform
 *         interviewNotes:
 *           type: string
 *           description: Additional notes for the interview
 *         employerNotes:
 *           type: string
 *           description: Notes from employer
 *         developerNotes:
 *           type: string
 *           description: Notes from developer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const jobRequestSchema = new mongoose.Schema(
    {
        employerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employer',
            required: [true, 'Employer ID is required'],
        },
        developerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Developer',
            required: [true, 'Developer ID is required'],
        },
        jobTitle: {
            type: String,
            required: [true, 'Job title is required'],
            trim: true,
            maxlength: [100, 'Job title cannot exceed 100 characters'],
        },
        jobDescription: {
            type: String,
            trim: true,
            maxlength: [2000, 'Job description cannot exceed 2000 characters'],
        },
        salaryOffer: {
            type: Number,
            required: [true, 'Salary offer is required'],
            min: [0, 'Salary offer cannot be negative'],
        },
        salaryType: {
            type: String,
            enum: ['hourly', 'monthly', 'yearly'],
            default: 'yearly',
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
            default: 'pending',
        },
        interviewDate: {
            type: Date,
        },
        interviewLocation: {
            type: String,
            trim: true,
        },
        interviewNotes: {
            type: String,
            trim: true,
            maxlength: [500, 'Interview notes cannot exceed 500 characters'],
        },
        employerNotes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Employer notes cannot exceed 1000 characters'],
        },
        developerNotes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Developer notes cannot exceed 1000 characters'],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Index for efficient querying
jobRequestSchema.index({ employerId: 1, status: 1 });
jobRequestSchema.index({ developerId: 1, status: 1 });
jobRequestSchema.index({ status: 1, createdAt: -1 });

// Virtual for formatted interview date
jobRequestSchema.virtual('formattedInterviewDate').get(function () {
    if (!this.interviewDate) return null;
    return this.interviewDate.toLocaleString();
});

// Virtual for salary display
jobRequestSchema.virtual('formattedSalary').get(function () {
    if (!this.salaryOffer) return null;
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
    });
    return formatter.format(this.salaryOffer);
});

// Method to check if interview is scheduled
jobRequestSchema.methods.hasInterviewScheduled = function () {
    return this.interviewDate && this.status === 'accepted';
};

// Method to get request summary
jobRequestSchema.methods.getSummary = function () {
    return {
        id: this._id,
        jobTitle: this.jobTitle,
        salaryOffer: this.formattedSalary,
        status: this.status,
        interviewDate: this.formattedInterviewDate,
        createdAt: this.createdAt,
    };
};

module.exports = mongoose.model('JobRequest', jobRequestSchema); 