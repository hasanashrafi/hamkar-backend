const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Developer = require('../models/Developer');
const Employer = require('../models/Employer');
const { authenticateToken, authorizeRole } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = uploadsDir;

        // Create subdirectories based on file type
        if (file.fieldname === 'resume') {
            uploadPath = path.join(uploadsDir, 'resumes');
        } else if (file.fieldname === 'profilePicture') {
            uploadPath = path.join(uploadsDir, 'profile-pictures');
        } else if (file.fieldname === 'companyLogo') {
            uploadPath = path.join(uploadsDir, 'company-logos');
        } else if (file.fieldname === 'projectImage') {
            uploadPath = path.join(uploadsDir, 'project-images');
        }

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    const allowedMimes = {
        'resume': ['application/pdf'],
        'profilePicture': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        'companyLogo': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        'projectImage': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    };

    const allowedTypes = allowedMimes[file.fieldname] || [];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
};

// Configure multer
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    }
});

/**
 * @swagger
 * /api/upload/resume:
 *   post:
 *     summary: Upload developer resume (PDF)
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - resume
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: PDF resume file (max 5MB)
 *     responses:
 *       200:
 *         description: Resume uploaded successfully
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
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                     filepath:
 *                       type: string
 *                     size:
 *                       type: number
 *                     mimetype:
 *                       type: string
 *       400:
 *         description: Validation error or invalid file
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 */
router.post('/resume', authenticateToken, authorizeRole('Developer'), upload.single('resume'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded',
        });
    }

    // Update developer's resume URL
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    await Developer.findByIdAndUpdate(req.user._id, { resumeUrl });

    res.json({
        success: true,
        message: 'Resume uploaded successfully',
        data: {
            filename: req.file.filename,
            filepath: resumeUrl,
            size: req.file.size,
            mimetype: req.file.mimetype,
            originalName: req.file.originalname,
        },
    });
}));

/**
 * @swagger
 * /api/upload/profile-picture:
 *   post:
 *     summary: Upload developer profile picture
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - profilePicture
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture (JPEG, PNG, WebP - max 5MB)
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *       400:
 *         description: Validation error or invalid file
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 */
router.post('/profile-picture', authenticateToken, authorizeRole('Developer'), upload.single('profilePicture'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded',
        });
    }

    // Update developer's profile picture URL
    const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
    await Developer.findByIdAndUpdate(req.user._id, { profilePicture: profilePictureUrl });

    res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
            filename: req.file.filename,
            filepath: profilePictureUrl,
            size: req.file.size,
            mimetype: req.file.mimetype,
            originalName: req.file.originalname,
        },
    });
}));

/**
 * @swagger
 * /api/upload/company-logo:
 *   post:
 *     summary: Upload company logo
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - companyLogo
 *             properties:
 *               companyLogo:
 *                 type: string
 *                 format: binary
 *                 description: Company logo (JPEG, PNG, WebP - max 5MB)
 *     responses:
 *       200:
 *         description: Company logo uploaded successfully
 *       400:
 *         description: Validation error or invalid file
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 */
router.post('/company-logo', authenticateToken, authorizeRole('Employer'), upload.single('companyLogo'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded',
        });
    }

    // Update employer's company logo URL
    const companyLogoUrl = `/uploads/company-logos/${req.file.filename}`;
    await Employer.findByIdAndUpdate(req.user._id, { companyLogo: companyLogoUrl });

    res.json({
        success: true,
        message: 'Company logo uploaded successfully',
        data: {
            filename: req.file.filename,
            filepath: companyLogoUrl,
            size: req.file.size,
            mimetype: req.file.mimetype,
            originalName: req.file.originalname,
        },
    });
}));

/**
 * @swagger
 * /api/upload/project-image:
 *   post:
 *     summary: Upload project image
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - projectImage
 *             properties:
 *               projectImage:
 *                 type: string
 *                 format: binary
 *                 description: Project image (JPEG, PNG, WebP - max 5MB)
 *     responses:
 *       200:
 *         description: Project image uploaded successfully
 *       400:
 *         description: Validation error or invalid file
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 */
router.post('/project-image', authenticateToken, authorizeRole('Developer'), upload.single('projectImage'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded',
        });
    }

    res.json({
        success: true,
        message: 'Project image uploaded successfully',
        data: {
            filename: req.file.filename,
            filepath: `/uploads/project-images/${req.file.filename}`,
            size: req.file.size,
            mimetype: req.file.mimetype,
            originalName: req.file.originalname,
        },
    });
}));

/**
 * @swagger
 * /api/upload/multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Multiple files to upload
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *       400:
 *         description: Validation error or invalid files
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: Files too large
 */
router.post('/multiple', authenticateToken, upload.array('files', 5), asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No files uploaded',
        });
    }

    const uploadedFiles = req.files.map(file => ({
        filename: file.filename,
        filepath: file.path.replace(uploadsDir, '/uploads'),
        size: file.size,
        mimetype: file.mimetype,
        originalName: file.originalname,
    }));

    res.json({
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        data: uploadedFiles,
    });
}));

/**
 * @swagger
 * /api/upload/files/{filename}:
 *   delete:
 *     summary: Delete uploaded file
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Filename to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
router.delete('/files/:filename', authenticateToken, asyncHandler(async (req, res) => {
    const { filename } = req.params;

    // Find file in uploads directory
    let filePath = null;
    const subdirs = ['resumes', 'profile-pictures', 'company-logos', 'project-images'];

    for (const subdir of subdirs) {
        const testPath = path.join(uploadsDir, subdir, filename);
        if (fs.existsSync(testPath)) {
            filePath = testPath;
            break;
        }
    }

    if (!filePath) {
        return res.status(404).json({
            success: false,
            message: 'File not found',
        });
    }

    // Check if user has permission to delete this file
    // This is a basic check - you might want to implement more sophisticated permission checking
    if (req.userRole === 'Admin') {
        // Admin can delete any file
    } else {
        // Regular users can only delete their own files
        // You might want to store file ownership in a separate collection
        const fileUrl = filePath.replace(uploadsDir, '/uploads');

        if (req.userRole === 'Developer') {
            const developer = await Developer.findById(req.user._id);
            if (developer.resumeUrl !== fileUrl && developer.profilePicture !== fileUrl) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only delete your own files.',
                });
            }
        } else if (req.userRole === 'Employer') {
            const employer = await Employer.findById(req.user._id);
            if (employer.companyLogo !== fileUrl) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only delete your own files.',
                });
            }
        }
    }

    // Delete file
    fs.unlinkSync(filePath);

    res.json({
        success: true,
        message: 'File deleted successfully',
    });
}));

/**
 * @swagger
 * /api/upload/files:
 *   get:
 *     summary: Get list of uploaded files for current user
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Files list retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/files', authenticateToken, asyncHandler(async (req, res) => {
    let userFiles = [];

    if (req.userRole === 'Developer') {
        const developer = await Developer.findById(req.user._id);
        if (developer.resumeUrl) {
            userFiles.push({
                type: 'resume',
                filename: developer.resumeUrl.split('/').pop(),
                filepath: developer.resumeUrl,
                uploadDate: developer.updatedAt,
            });
        }
        if (developer.profilePicture) {
            userFiles.push({
                type: 'profilePicture',
                filename: developer.profilePicture.split('/').pop(),
                filepath: developer.profilePicture,
                uploadDate: developer.updatedAt,
            });
        }
    } else if (req.userRole === 'Employer') {
        const employer = await Employer.findById(req.user._id);
        if (employer.companyLogo) {
            userFiles.push({
                type: 'companyLogo',
                filename: employer.companyLogo.split('/').pop(),
                filepath: employer.companyLogo,
                uploadDate: employer.updatedAt,
            });
        }
    }

    res.json({
        success: true,
        data: userFiles,
    });
}));

module.exports = router; 