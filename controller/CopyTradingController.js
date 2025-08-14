// controllers/copyTradingController.js
const CopyTradingApplication = require('../models/CopyTradingForm');
const fs = require('fs').promises;
const path = require('path');

// Create new application - SIMPLIFIED (multer handled in routes)
exports.createApplication = async (req, res) => {
  try {
    console.log('📝 Received form data:', req.body);
    console.log('📁 Received files:', req.files);

    // Check if files exist (adjust field names to match your form)
    const hasFiles = req.files && (req.files.aadharFile || req.files.signatureFile || req.files.idProof || req.files.addressProof);
    
    if (!hasFiles) {
      console.log('⚠️ No files received, but continuing...');
    }

    // Prepare application data
    const applicationData = {
      ...req.body
    };

    // Handle file uploads - flexible field names
    if (req.files) {
      // Handle aadharFile or idProof
      if (req.files.aadharFile && req.files.aadharFile[0]) {
        applicationData.aadharFile = {
          filename: req.files.aadharFile[0].filename,
          originalName: req.files.aadharFile[0].originalname,
          path: req.files.aadharFile[0].path,
          size: req.files.aadharFile[0].size,
          mimetype: req.files.aadharFile[0].mimetype
        };
      } else if (req.files.idProof && req.files.idProof[0]) {
        applicationData.aadharFile = {
          filename: req.files.idProof[0].filename,
          originalName: req.files.idProof[0].originalname,
          path: req.files.idProof[0].path,
          size: req.files.idProof[0].size,
          mimetype: req.files.idProof[0].mimetype
        };
      }

      // Handle signatureFile or addressProof  
      if (req.files.signatureFile && req.files.signatureFile[0]) {
        applicationData.signatureFile = {
          filename: req.files.signatureFile[0].filename,
          originalName: req.files.signatureFile[0].originalname,
          path: req.files.signatureFile[0].path,
          size: req.files.signatureFile[0].size,
          mimetype: req.files.signatureFile[0].mimetype
        };
      } else if (req.files.addressProof && req.files.addressProof[0]) {
        applicationData.signatureFile = {
          filename: req.files.addressProof[0].filename,
          originalName: req.files.addressProof[0].originalname,
          path: req.files.addressProof[0].path,
          size: req.files.addressProof[0].size,
          mimetype: req.files.addressProof[0].mimetype
        };
      }
    }

    console.log('💾 Saving application data:', applicationData);

    // Create application
    const application = new CopyTradingApplication(applicationData);
    await application.save();

    console.log('✅ Application saved successfully with ID:', application._id);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application
    });

  } catch (error) {
    console.error('❌ Error in createApplication:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
        receivedData: req.body
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all applications (Admin)
exports.getAllApplications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const search = req.query.search;

    const query = {};
    
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const applications = await CopyTradingApplication.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('reviewedBy', 'name email');

    const total = await CopyTradingApplication.countDocuments(query);

    res.status(200).json({
      success: true,
      data: applications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    console.error('❌ Error in getAllApplications:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get single application
exports.getApplication = async (req, res) => {
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
    console.error('❌ Error in getApplication:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update application status (Admin)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const applicationId = req.params.id;

    const application = await CopyTradingApplication.findById(applicationId);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    application.status = status;
    if (adminNotes) {
      application.adminNotes = adminNotes;
    }
    application.reviewedBy = req.user ? req.user.id : null;
    application.reviewedAt = new Date();

    await application.save();

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: application
    });
  } catch (error) {
    console.error('❌ Error in updateApplicationStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete application
exports.deleteApplication = async (req, res) => {
  try {
    const application = await CopyTradingApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Delete associated files
    try {
      if (application.aadharFile && application.aadharFile.path) {
        await fs.unlink(application.aadharFile.path);
      }
      if (application.signatureFile && application.signatureFile.path) {
        await fs.unlink(application.signatureFile.path);
      }
    } catch (fileError) {
      console.error('Error deleting files:', fileError);
    }

    await CopyTradingApplication.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error in deleteApplication:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Download file
exports.downloadFile = async (req, res) => {
  try {
    const { id, fileType } = req.params;
    
    const application = await CopyTradingApplication.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    let fileInfo;
    if (fileType === 'aadhar' || fileType === 'idProof') {
      fileInfo = application.aadharFile;
    } else if (fileType === 'signature' || fileType === 'addressProof') {
      fileInfo = application.signatureFile;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Use: aadhar, signature, idProof, or addressProof'
      });
    }

    if (!fileInfo || !fileInfo.path) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(fileInfo.path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.download(fileInfo.path, fileInfo.originalName);
  } catch (error) {
    console.error('❌ Error in downloadFile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// View file (for preview)
exports.viewFile = async (req, res) => {
  try {
    const { id, fileType } = req.params;
    
    const application = await CopyTradingApplication.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    let fileInfo;
    if (fileType === 'aadhar' || fileType === 'idProof') {
      fileInfo = application.aadharFile;
    } else if (fileType === 'signature' || fileType === 'addressProof') {
      fileInfo = application.signatureFile;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Use: aadhar, signature, idProof, or addressProof'
      });
    }

    if (!fileInfo || !fileInfo.path) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(fileInfo.path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    res.sendFile(path.resolve(fileInfo.path));
  } catch (error) {
    console.error('❌ Error in viewFile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get application statistics (Admin Dashboard)
exports.getStatistics = async (req, res) => {
  try {
    const totalApplications = await CopyTradingApplication.countDocuments();
    const pendingApplications = await CopyTradingApplication.countDocuments({ status: 'pending_review' });
    const approvedApplications = await CopyTradingApplication.countDocuments({ status: 'approved' });
    const rejectedApplications = await CopyTradingApplication.countDocuments({ status: 'rejected' });

    const totalInvestment = await CopyTradingApplication.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$investmentAmount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalInvestment: totalInvestment[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('❌ Error in getStatistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};