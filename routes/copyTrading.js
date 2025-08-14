const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory structure if it doesn't exist
const createUploadDirs = () => {
  const baseUploadsDir = path.join(__dirname, '../uploads');
  const subDirs = ['pan', 'photo', 'bank'];
  
  // Create main uploads directory
  if (!fs.existsSync(baseUploadsDir)) {
    fs.mkdirSync(baseUploadsDir, { recursive: true });
    console.log('📁 Created uploads directory:', baseUploadsDir);
  }
  
  // Create subdirectories
  subDirs.forEach(dir => {
    const fullPath = path.join(baseUploadsDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log('📁 Created subdirectory:', fullPath);
    }
  });
};

// Initialize upload directories
createUploadDirs();

// Enhanced Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Create subdirectory based on file type
    let subDir = '';
    if (file.fieldname === 'idProof' || file.fieldname === 'pan') {
      subDir = 'pan';
    } else if (file.fieldname === 'addressProof' || file.fieldname === 'photo') {
      subDir = 'photo';
    } else if (file.fieldname === 'bankStatement' || file.fieldname === 'bank') {
      subDir = 'bank';
    }
    
    const finalPath = subDir ? path.join(uploadsDir, subDir) : uploadsDir;
    
    // Ensure directory exists
    if (!fs.existsSync(finalPath)) {
      fs.mkdirSync(finalPath, { recursive: true });
    }
    
    cb(null, finalPath);
  },
  filename: function (req, file, cb) {
    // Create more descriptive filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + sanitizedOriginalName);
  }
});

// Enhanced file filter
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|txt)$/i;
  
  const extname = allowedExtensions.test(file.originalname);
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    const error = new Error(`Invalid file type for ${file.fieldname}. Allowed types: JPEG, PNG, GIF, PDF, DOC, DOCX, TXT`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Multer instance with enhanced configuration
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10 // Maximum 10 files total
  },
  fileFilter: fileFilter
});

// File upload middleware with better error handling
const uploadFiles = (req, res, next) => {
  const uploadHandler = upload.fields([
    { name: 'idProof', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 },
    { name: 'bankStatement', maxCount: 1 },
    { name: 'tradingExperience', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'bank', maxCount: 1 }
  ]);

  uploadHandler(req, res, (err) => {
    if (err) {
      console.error('❌ File upload error:', err.message);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 10MB per file.',
          code: 'FILE_TOO_LARGE'
        });
      }
      
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          error: err.message,
          code: 'INVALID_FILE_TYPE'
        });
      }
      
      return res.status(400).json({
        success: false,
        error: 'File upload failed: ' + err.message,
        code: 'UPLOAD_ERROR'
      });
    }
    next();
  });
};

// Import controller with better error handling
let copyTradingController;
try {
  copyTradingController = require('../controllers/copyTradingController');
  console.log('✅ copyTradingController loaded successfully');
} catch (error) {
  console.warn('⚠️ copyTradingController not found, using fallback handlers');
  
  // Enhanced fallback controller methods
  copyTradingController = {
    createApplication: async (req, res) => {
      try {
        const applicationData = {
          ...req.body,
          files: req.files || {},
          submittedAt: new Date().toISOString(),
          status: 'pending'
        };

        console.log('📝 New application received:', {
          body: req.body,
          files: Object.keys(req.files || {})
        });

        res.status(200).json({
          success: true,
          message: 'Application received successfully (using fallback handler)',
          data: applicationData,
          id: 'temp_' + Date.now()
        });
      } catch (error) {
        console.error('❌ Error in createApplication fallback:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: error.message
        });
      }
    },
    
    getAllApplications: async (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Using fallback handler - implement database integration',
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0
        }
      });
    },
    
    getApplication: async (req, res) => {
      const { id } = req.params;
      res.status(404).json({
        success: false,
        message: `Application with ID ${id} not found (using fallback handler)`,
        requestedId: id
      });
    },
    
    updateApplicationStatus: async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }

      res.status(200).json({
        success: true,
        message: `Application ${id} status updated to ${status} (using fallback handler)`,
        data: { id, status, updatedAt: new Date().toISOString() }
      });
    },
    
    deleteApplication: async (req, res) => {
      const { id } = req.params;
      res.status(200).json({
        success: true,
        message: `Application ${id} deleted (using fallback handler)`,
        deletedId: id,
        deletedAt: new Date().toISOString()
      });
    },
    
    downloadFile: async (req, res) => {
      const { id, fileType } = req.params;
      res.status(404).json({
        success: false,
        message: `File not found for application ${id}, type ${fileType} (using fallback handler)`
      });
    },
    
    viewFile: async (req, res) => {
      const { id, fileType } = req.params;
      res.status(404).json({
        success: false,
        message: `File not found for application ${id}, type ${fileType} (using fallback handler)`
      });
    },
    
    getStatistics: async (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Using fallback handler - implement database integration',
        data: {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          lastUpdated: new Date().toISOString()
        }
      });
    }
  };
}

// Input validation middleware
const validateApplicationData = (req, res, next) => {
  const requiredFields = ['name', 'email', 'phone'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      missingFields: missingFields
    });
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(req.body.email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }
  
  next();
};

// ========================
// ROUTE DEFINITIONS
// ========================

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Copy trading routes are healthy!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Create new application (with validation and file upload)
router.post('/applications', 
  uploadFiles, 
  validateApplicationData, 
  copyTradingController.createApplication
);

// Get all applications with pagination
router.get('/applications', copyTradingController.getAllApplications);

// Get statistics
router.get('/applications/statistics', copyTradingController.getStatistics);

// Get specific application by ID
router.get('/applications/:id', copyTradingController.getApplication);

// Update application status
router.put('/applications/:id/status', copyTradingController.updateApplicationStatus);

// Delete application
router.delete('/applications/:id', copyTradingController.deleteApplication);

// File operations
router.get('/applications/:id/files/:fileType/download', copyTradingController.downloadFile);
router.get('/applications/:id/files/:fileType/view', copyTradingController.viewFile);

// Test route with comprehensive information
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Copy trading routes are working perfectly!',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    availableEndpoints: {
      health: 'GET /health',
      applications: {
        create: 'POST /applications',
        getAll: 'GET /applications',
        getById: 'GET /applications/:id',
        updateStatus: 'PUT /applications/:id/status',
        delete: 'DELETE /applications/:id',
        statistics: 'GET /applications/statistics'
      },
      files: {
        download: 'GET /applications/:id/files/:fileType/download',
        view: 'GET /applications/:id/files/:fileType/view'
      }
    },
    fileUploadConfig: {
      maxFileSize: '10MB',
      allowedTypes: ['JPEG', 'PNG', 'GIF', 'PDF', 'DOC', 'DOCX', 'TXT'],
      uploadDirectories: ['pan', 'photo', 'bank']
    }
  });
});

// Global error handler for this router
router.use((error, req, res, next) => {
  console.error('❌ Copy trading route error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: 'Internal server error in copy trading routes',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;