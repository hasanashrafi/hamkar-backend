const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - techStack
 *         - developerId
 *       properties:
 *         title:
 *           type: string
 *           description: Project title
 *         description:
 *           type: string
 *           description: Project description
 *         techStack:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of technologies used
 *         demoUrl:
 *           type: string
 *           format: uri
 *           description: Live demo URL
 *         imageUrl:
 *           type: string
 *           description: Project image URL
 *         githubUrl:
 *           type: string
 *           format: uri
 *           description: GitHub repository URL
 *         developerId:
 *           type: string
 *           format: ObjectId
 *           description: Reference to the developer who owns this project
 *         isPublic:
 *           type: boolean
 *           default: true
 *           description: Whether the project is publicly visible
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const projectSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Project title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        description: {
            type: String,
            required: [true, 'Project description is required'],
            trim: true,
            maxlength: [2000, 'Description cannot exceed 2000 characters'],
        },
        techStack: {
            type: [String],
            required: [true, 'Tech stack is required'],
            validate: {
                validator: function (v) {
                    return v.length > 0;
                },
                message: 'At least one technology is required',
            },
        },
        demoUrl: {
            type: String,
            trim: true,
            match: [/^https?:\/\//, 'Please enter a valid URL'],
        },
        imageUrl: {
            type: String,
            trim: true,
        },
        githubUrl: {
            type: String,
            trim: true,
            match: [/^https?:\/\//, 'Please enter a valid URL'],
        },
        developerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Developer',
            required: [true, 'Developer ID is required'],
        },
        isPublic: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Index for search functionality
projectSchema.index({ title: 1, techStack: 1, developerId: 1, isPublic: 1 });
projectSchema.index({ createdAt: -1 });

// Virtual for formatted creation date
projectSchema.virtual('formattedCreatedAt').get(function () {
    return this.createdAt.toLocaleDateString();
});

// Method to get public project data
projectSchema.methods.getPublicData = function () {
    const projectObject = this.toObject();
    delete projectObject.__v;
    return projectObject;
};

module.exports = mongoose.model('Project', projectSchema); 