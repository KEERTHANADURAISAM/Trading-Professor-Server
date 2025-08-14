// controllers/copyTradingController.js
const CopyTradingApplication = require('../models/CopyTradingForm');
const fs = require('fs').promises;
const path = require('path');

// Helper function to map file fields from routes to model
const mapFileFields = (files) => {
  const mappedFiles = {};
  
  if (files) {
    // Map aadharFile or idProof -> aadharFile
    if (files.aadharFile && files.aadharFile[0]) {
      mappedFiles.aadharFile = {
        filename: files.aadharFile[0].filename,
        originalName: files.aadharFile[0].originalname,
        path: files.aadharFile[0].path,
        size: files.aadharFile[0].size,
        mimetype: files.aadharFile[0].mimetype,
        uploadedAt: new Date()
      };
    } else if (files.idProof && files.idProof[0]) {
      mappedFiles.aadharFile = {
        filename: files.idProof[0].filename,
        originalName: files.idProof[0].originalname,
        path: files.idProof[0].path,
        size: files.idProof[0].size,
        mimetype: files.idProof[0].mimetype,
        uploadedAt: new Date()
      };
    } else if (files.pan && files.pan[0]) {
      mappedFiles.aadharFile = {
        filename: files.pan[0].filename,
        originalName: files.pan[0].originalname,
        path: files.pan[0].path,
        size: files.pan[0].size,
        mimetype: files.pan[0].mimetype,
        uploadedAt: new Date()
      };
    }

    // Map signatureFile or addressProof -> signatureFile
    if (files.signatureFile && files.signatureFile[0]) {
      mappedFiles.signatureFile = {
        filename: files.signatureFile[0].filename,
        originalName: files.signatureFile[0].originalname,
        path: files.signatureFile[0].path,
        size: files.signatureFile[0].size,
        mimetype: files.signatureFile[0].mimetype,
        uploadedAt: new Date()
      };
    } else if (files.addressProof && files.addressProof[0]) {
      mappedFiles.signatureFile = {
        filename: files.addressProof[0].filename,
        originalName: files.addressProof[0].originalname,
        path: files.addressProof[0].path,
        size: files.addressProof[0].size,
        mimetype: files.addressProof[0].mimetype,
        uploadedAt: new Date()
      };
    } else if (files.photo && files.photo[0]) {
      mappedFiles.signatureFile = {
        filename: files.photo[0].filename,
        originalName: files.photo[0].originalname,
        path: files.photo[0].path,
        size: files.photo[0].size,
        mimetype: files.photo[0].mimetype,
        uploadedAt: new Date()
      };
    }

    // Handle additional file types
    if (files.bankStatement && files.bankStatement[0]) {
      mappedFiles.bankStatement = {
        filename: files.bankStatement[0].filename,
        originalName: files.bankStatement[0].originalname,
        path: files.bankStatement[0].path,
        size: files.bankStatement[0].size,
        mimetype: files.bankStatement[0].mimetype,
        uploadedAt: new Date()
      };
    } else if (files.bank && files.bank[0]) {
      mappedFiles.bankStatement = {
        filename: files.bank[0].filename,
        originalName: files.bank[0].originalname,
        path: files.bank[0].path,
        size: files.bank[0].size,
        mimetype: files.bank[0].mimetype,
        uploadedAt: new Date()
      };
    }

    if (files.tradingExperience && files.tradingExperience[0]) {
      mappedFiles.tradingExperience = {
        filename: files.tradingExperience[0].filename,
        originalName: files.tradingExperience[0].originalname,
        path: files.tradingExperience[0].path,
        size: files.tradingExperience[0].size,
        mimetype: files.tradingExperience[0].mimetype,
        uploadedAt: new Date()
      };
    }
  }
  
  return mappedFiles;
};

// Helper function to map form fields to model fields
const mapFormFields = (body) => {
  const mappedData = {};
  
  // Handle name fields - flexible mapping
  if (body.name) {
    const nameParts = body.name.trim().split(' ');
    mappedData.firstName = nameParts[0] || '';
    mappedData.lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
  } else {
    mappedData.firstName = body.firstName || body.first_name || '';
    mappedData.lastName = body.lastName || body.last_name || body.surname || '';
  }
  
  // Direct mappings
  mappedData.email = body.email;
  mappedData.phone = body.phone || body.mobile;
  mappedData.dateOfBirth = body.dateOfBirth || body.dob;
  mappedData.address = body.address;
  mappedData.city = body.city;
  mappedData.state = body.state;
  mappedData.pincode = body.pincode || body.pinCode || body.zip;
  
  // Investment fields
  mappedData.investmentAmount = parseFloat(body.investmentAmount || body.investment_amount || 0);
  mappedData.investmentGoals = body.investmentGoals || body.investment_goals || body.goals || 'General investment goals';
  
  // Document fields
  mappedData.aadharNumber = body.aadharNumber || body.aadhar_number || body.aadhaar || body.idNumber;
  
  // Agreement
  mappedData.termsAccepted = body.termsAccepted === 'true' || body.termsAccepted === true || body.terms === 'true';
  
  return mappedData;
};

// Create new application - Enhanced with better field mapping
exports.createApplication = async (req, res) => {
  try {
    console.log('📝 Received form data:', req.body);
    console.log('📁 Received files:', req.files ? Object.keys(req.files) : 'No files');

    // Map form fields to model fields
    const mappedFormData = mapFormFields(req.body);
    console.log('🔄 Mapped form data:', mappedFormData);

    // Map and process uploaded files
    const mappedFiles = mapFileFields(req.files);
    console.log('🔄 Mapped files:', Object.keys(mappedFiles));

    // Combine data
    const applicationData = {
      ...mappedFormData,
      ...mappedFiles
    };

    console.log('💾 Final application data:', {
      ...applicationData,
      aadharFile: applicationData.aadharFile ? 'File uploaded' : 'No file',
      signatureFile: applicationData.signatureFile ? 'File uploaded' : 'No file'
    });

    // Create and save application
    const application = new CopyTradingApplication(applicationData);
    await application.save();

    console.log('✅ Application saved successfully with ID:', application._id);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        id: application._id,
        fullName: application.fullName,
        email: application.email,
        status: application.status,
        submittedAt: application.createdAt,
        investmentAmount: application.investmentAmount,
        filesUploaded: Object.keys(mappedFiles)
      }
    });

  } catch (error) {
    console.error('❌ Error in createApplication:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
        receivedData: {
          formFields: Object.keys(req.body),
          files: req.files ? Object.keys(req.files) : [],
          mappedData: mapFormFields(req.body)
        }
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
        field: field,
        value: error.keyValue[field]
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

// Get all applications with enhanced filtering and search
exports.getAllApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
      minInvestment,
      maxInvestment
    } = req.query;

    // Build query object
    const query = {};
    
    // Status filter
    if (status) {
      query.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Investment range filter
    if (minInvestment || maxInvestment) {
      query.investmentAmount = {};
      if (minInvestment) query.investmentAmount.$gte = parseFloat(minInvestment);
      if (maxInvestment) query.investmentAmount.$lte = parseFloat(maxInvestment);
    }

    // Search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { city: searchRegex },
        { state: searchRegex }
      ];
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const applications = await CopyTradingApplication.find(query)
      .sort(sortConfig)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('reviewedBy', 'name email')
      .select('-__v'); // Exclude version field

    const total = await CopyTradingApplication.countDocuments(query);

    // Enhanced response data
    const enhancedApplications = applications.map(app => ({
      id: app._id,
      fullName: app.fullName,
      email: app.email,
      phone: app.phone,
      city: app.city,
      state: app.state,
      investmentAmount: app.investmentAmount,
      status: app.status,
      age: app.age,
      submittedAt: app.createdAt,
      updatedAt: app.updatedAt,
      hasFiles: !!(app.aadharFile || app.signatureFile),
      reviewedBy: app.reviewedBy,
      reviewedAt: app.reviewedAt
    }));

    res.status(200).json({
      success: true,
      message: `Retrieved ${applications.length} applications`,
      data: enhancedApplications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNext: (parseInt(page) * parseInt(limit)) < total,
        hasPrev: parseInt(page) > 1
      },
      filters: {
        status,
        search,
        sortBy,
        sortOrder,
        startDate,
        endDate,
        minInvestment,
        maxInvestment
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

// Get single application with enhanced details
exports.getApplication = async (req, res) => {
  try {
    const application = await CopyTradingApplication.findById(req.params.id)
      .populate('reviewedBy', 'name email')
      .select('-__v');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        requestedId: req.params.id
      });
    }

    // Enhanced response with additional computed fields
    const enhancedApplication = {
      ...application.toObject(),
      fullName: application.fullName,
      age: application.age,
      filesInfo: {
        aadharFile: application.aadharFile ? {
          uploaded: true,
          filename: application.aadharFile.filename,
          originalName: application.aadharFile.originalName,
          size: application.aadharFile.size,
          uploadedAt: application.aadharFile.uploadedAt
        } : { uploaded: false },
        signatureFile: application.signatureFile ? {
          uploaded: true,
          filename: application.signatureFile.filename,
          originalName: application.signatureFile.originalName,
          size: application.signatureFile.size,
          uploadedAt: application.signatureFile.uploadedAt
        } : { uploaded: false }
      }
    };

    res.status(200).json({
      success: true,
      message: 'Application retrieved successfully',
      data: enhancedApplication
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

// Update application status with validation
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const applicationId = req.params.id;

    // Validate status
    const validStatuses = ['pending_review', 'under_review', 'approved', 'rejected', 'documents_required'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        validStatuses: validStatuses,
        receivedStatus: status
      });
    }

    const application = await CopyTradingApplication.findById(applicationId);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        requestedId: applicationId
      });
    }

    // Update application
    const oldStatus = application.status;
    application.status = status;
    if (adminNotes) {
      application.adminNotes = adminNotes;
    }
    application.reviewedBy = req.user ? req.user.id : null;
    application.reviewedAt = new Date();

    await application.save();

    console.log(`✅ Application ${applicationId} status updated from ${oldStatus} to ${status}`);

    res.status(200).json({
      success: true,
      message: `Application status updated from ${oldStatus} to ${status}`,
      data: {
        id: application._id,
        fullName: application.fullName,
        email: application.email,
        oldStatus: oldStatus,
        newStatus: status,
        adminNotes: application.adminNotes,
        reviewedAt: application.reviewedAt,
        updatedAt: application.updatedAt
      }
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

// Delete application with file cleanup
exports.deleteApplication = async (req, res) => {
  try {
    const application = await CopyTradingApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        requestedId: req.params.id
      });
    }

    const deletedData = {
      id: application._id,
      fullName: application.fullName,
      email: application.email,
      status: application.status
    };

    // Delete associated files
    const filesToDelete = [];
    if (application.aadharFile && application.aadharFile.path) {
      filesToDelete.push(application.aadharFile.path);
    }
    if (application.signatureFile && application.signatureFile.path) {
      filesToDelete.push(application.signatureFile.path);
    }

    // Attempt to delete files (don't fail if files are missing)
    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ Deleted file: ${filePath}`);
      } catch (fileError) {
        console.warn(`⚠️ Could not delete file ${filePath}:`, fileError.message);
      }
    }

    // Delete the application
    await CopyTradingApplication.findByIdAndDelete(req.params.id);

    console.log(`🗑️ Application ${req.params.id} deleted successfully`);

    res.status(200).json({
      success: true,
      message: 'Application deleted successfully',
      deletedApplication: deletedData,
      filesDeleted: filesToDelete.length,
      deletedAt: new Date().toISOString()
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

// Enhanced file download with better error handling
exports.downloadFile = async (req, res) => {
  try {
    const { id, fileType } = req.params;
    
    const application = await CopyTradingApplication.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        requestedId: id
      });
    }

    let fileInfo;
    const validFileTypes = ['aadhar', 'signature', 'idProof', 'addressProof', 'pan', 'photo'];
    
    // Map file types to application fields
    if (fileType === 'aadhar' || fileType === 'idProof' || fileType === 'pan') {
      fileInfo = application.aadharFile;
    } else if (fileType === 'signature' || fileType === 'addressProof' || fileType === 'photo') {
      fileInfo = application.signatureFile;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type',
        validTypes: validFileTypes,
        requestedType: fileType
      });
    }

    if (!fileInfo || !fileInfo.path) {
      return res.status(404).json({
        success: false,
        message: `${fileType} file not found for this application`,
        availableFiles: {
          aadhar: !!application.aadharFile,
          signature: !!application.signatureFile
        }
      });
    }

    // Check if file exists on disk
    try {
      await fs.access(fileInfo.path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server',
        filename: fileInfo.filename
      });
    }

    console.log(`📥 Downloading file: ${fileInfo.originalName} for application ${id}`);
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

// Enhanced file view with better error handling
exports.viewFile = async (req, res) => {
  try {
    const { id, fileType } = req.params;
    
    const application = await CopyTradingApplication.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        requestedId: id
      });
    }

    let fileInfo;
    if (fileType === 'aadhar' || fileType === 'idProof' || fileType === 'pan') {
      fileInfo = application.aadharFile;
    } else if (fileType === 'signature' || fileType === 'addressProof' || fileType === 'photo') {
      fileInfo = application.signatureFile;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Use: aadhar, signature, idProof, addressProof, pan, or photo'
      });
    }

    if (!fileInfo || !fileInfo.path) {
      return res.status(404).json({
        success: false,
        message: `${fileType} file not found for this application`
      });
    }

    try {
      await fs.access(fileInfo.path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    console.log(`👁️ Viewing file: ${fileInfo.originalName} for application ${id}`);
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

// Enhanced statistics with more insights
exports.getStatistics = async (req, res) => {
  try {
    // Basic counts
    const totalApplications = await CopyTradingApplication.countDocuments();
    const pendingApplications = await CopyTradingApplication.countDocuments({ status: 'pending_review' });
    const underReviewApplications = await CopyTradingApplication.countDocuments({ status: 'under_review' });
    const approvedApplications = await CopyTradingApplication.countDocuments({ status: 'approved' });
    const rejectedApplications = await CopyTradingApplication.countDocuments({ status: 'rejected' });
    const documentsRequiredApplications = await CopyTradingApplication.countDocuments({ status: 'documents_required' });

    // Investment statistics
    const investmentStats = await CopyTradingApplication.aggregate([
      {
        $group: {
          _id: '$status',
          totalInvestment: { $sum: '$investmentAmount' },
          avgInvestment: { $avg: '$investmentAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent applications (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentApplications = await CopyTradingApplication.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Applications by state (top 10)
    const applicationsByState = await CopyTradingApplication.aggregate([
      {
        $group: {
          _id: '$state',
          count: { $sum: 1 },
          totalInvestment: { $sum: '$investmentAmount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Age distribution
    const today = new Date();
    const ageDistribution = await CopyTradingApplication.aggregate([
      {
        $addFields: {
          age: {
            $floor: {
              $divide: [
                { $subtract: [today, '$dateOfBirth'] },
                365.25 * 24 * 60 * 60 * 1000
              ]
            }
          }
        }
      },
      {
        $bucket: {
          groupBy: '$age',
          boundaries: [18, 25, 35, 45, 55, 65, 100],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            avgInvestment: { $avg: '$investmentAmount' }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: {
        overview: {
          totalApplications,
          pendingApplications,
          underReviewApplications,
          approvedApplications,
          rejectedApplications,
          documentsRequiredApplications,
          recentApplications
        },
        investmentStats: investmentStats.reduce((acc, stat) => {
          acc[stat._id] = {
            totalInvestment: stat.totalInvestment,
            averageInvestment: Math.round(stat.avgInvestment),
            count: stat.count
          };
          return acc;
        }, {}),
        geographics: {
          topStates: applicationsByState
        },
        demographics: {
          ageDistribution
        },
        lastUpdated: new Date().toISOString()
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