// controllers/copyTradingController.js
const CopyTradingApplication = require('../models/CopyTradingForm');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/documents/';
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only specific file types
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and PDF files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware for file upload
const uploadFields = upload.fields([
  { name: 'aadharFile', maxCount: 1 },
  { name: 'signatureFile', maxCount: 1 }
]);

// Helper function to delete files
const deleteFile = async (filePath) => {
  try {
    if (filePath) {
      await fs.unlink(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// @desc    Create new copy trading application
// @route   POST /api/copy-trading/applications
// @access  Public
const createApplication = async (req, res) => {
  try {
    // Handle file uploads
    const applicationData = { ...req.body };

    if (req.files) {
      if (req.files.aadharFile) {
        applicationData.aadharFile = {
          filename: req.files.aadharFile[0].filename,
          originalName: req.files.aadharFile[0].originalname,
          path: req.files.aadharFile[0].path,
          size: req.files.aadharFile[0].size,
          mimetype: req.files.aadharFile[0].mimetype
        };
      }

      if (req.files.signatureFile) {
        applicationData.signatureFile = {
          filename: req.files.signatureFile[0].filename,
          originalName: req.files.signatureFile[0].originalname,
          path: req.files.signatureFile[0].path,
          size: req.files.signatureFile[0].size,
          mimetype: req.files.signatureFile[0].mimetype
        };
      }
    }

    const application = new CopyTradingApplication(applicationData);
    await application.save();

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });

  } catch (error) {
    // Clean up uploaded files if application creation fails
    if (req.files) {
      if (req.files.aadharFile) {
        await deleteFile(req.files.aadharFile[0].path);
      }
      if (req.files.signatureFile) {
        await deleteFile(req.files.signatureFile[0].path);
      }
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all applications with pagination and filtering
// @route   GET /api/copy-trading/applications
// @access  Admin
const getAllApplications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query object
    const query = {};
    
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    if (req.query.search) {
      query.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.fromDate || req.query.toDate) {
      query.createdAt = {};
      if (req.query.fromDate) {
        query.createdAt.$gte = new Date(req.query.fromDate);
      }
      if (req.query.toDate) {
        query.createdAt.$lte = new Date(req.query.toDate);
      }
    }

    // Sort options
    let sortBy = {};
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(':');
      sortBy[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    } else {
      sortBy = { createdAt: -1 };
    }

    const applications = await CopyTradingApplication.find(query)
      .sort(sortBy)
      .limit(limit)
      .skip(skip)
      .populate('reviewedBy', 'name email');

    const total = await CopyTradingApplication.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: applications,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single application by ID
// @route   GET /api/copy-trading/applications/:id
// @access  Admin/Owner
const getApplicationById = async (req, res) => {
  try {
    const application = await CopyTradingApplication.findById(req.params.id)
      .populate('reviewedBy', 'name email');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update application
// @route   PUT /api/copy-trading/applications/:id
// @access  Admin/Owner
const updateApplication = async (req, res) => {
  try {
    const application = await CopyTradingApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Store old file paths for cleanup
    const oldAadharFile = application.aadharFile;
    const oldSignatureFile = application.signatureFile;

    // Update application data
    const updateData = { ...req.body };

    // Handle new file uploads
    if (req.files) {
      if (req.files.aadharFile) {
        updateData.aadharFile = {
          filename: req.files.aadharFile[0].filename,
          originalName: req.files.aadharFile[0].originalname,
          path: req.files.aadharFile[0].path,
          size: req.files.aadharFile[0].size,
          mimetype: req.files.aadharFile[0].mimetype,
          uploadedAt: new Date()
        };
      }

      if (req.files.signatureFile) {
        updateData.signatureFile = {
          filename: req.files.signatureFile[0].filename,
          originalName: req.files.signatureFile[0].originalname,
          path: req.files.signatureFile[0].path,
          size: req.files.signatureFile[0].size,
          mimetype: req.files.signatureFile[0].mimetype,
          uploadedAt: new Date()
        };
      }
    }

    const updatedApplication = await CopyTradingApplication.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('reviewedBy', 'name email');

    // Clean up old files if new ones were uploaded
    if (req.files) {
      if (req.files.aadharFile && oldAadharFile?.path) {
        await deleteFile(oldAadharFile.path);
      }
      if (req.files.signatureFile && oldSignatureFile?.path) {
        await deleteFile(oldSignatureFile.path);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      data: updatedApplication
    });

  } catch (error) {
    // Clean up new uploaded files if update fails
    if (req.files) {
      if (req.files.aadharFile) {
        await deleteFile(req.files.aadharFile[0].path);
      }
      if (req.files.signatureFile) {
        await deleteFile(req.files.signatureFile[0].path);
      }
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update application status
// @route   PATCH /api/copy-trading/applications/:id/status
// @access  Admin
const updateApplicationStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    const validStatuses = ['pending_review', 'under_review', 'approved', 'rejected', 'documents_required'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const updateData = {
      status,
      reviewedBy: req.user.id, // Assuming user is attached to request by auth middleware
      reviewedAt: new Date()
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    const application = await CopyTradingApplication.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).populate('reviewedBy', 'name email');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: application
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete application
// @route   DELETE /api/copy-trading/applications/:id
// @access  Admin
const deleteApplication = async (req, res) => {
  try {
    const application = await CopyTradingApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Delete associated files
    if (application.aadharFile?.path) {
      await deleteFile(application.aadharFile.path);
    }
    if (application.signatureFile?.path) {
      await deleteFile(application.signatureFile.path);
    }

    await CopyTradingApplication.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully'
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get applications statistics
// @route   GET /api/copy-trading/applications/stats
// @access  Admin
const getApplicationStats = async (req, res) => {
  try {
    const stats = await CopyTradingApplication.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalInvestment: { $sum: '$investmentAmount' }
        }
      }
    ]);

    const totalApplications = await CopyTradingApplication.countDocuments();
    
    // Get monthly application trends for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await CopyTradingApplication.aggregate([
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
          count: { $sum: 1 },
          totalInvestment: { $sum: '$investmentAmount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusStats: stats,
        totalApplications,
        monthlyTrends
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  uploadFields,
  createApplication,
  getAllApplications,
  getApplicationById,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
  getApplicationStats
};