const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow common document and image types
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// Multiple file upload middleware
const uploadFiles = upload.fields([
  { name: 'idProof', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 },
  { name: 'bankStatement', maxCount: 1 },
  { name: 'tradingExperience', maxCount: 1 }
]);

// Import controller (create this if it doesn't exist)
let copyTradingController;
try {
  copyTradingController = require('../controllers/copyTradingController');
} catch (error) {
  console.error('❌ copyTradingController not found, creating fallback handlers');
  
  // Fallback controller methods
  copyTradingController = {
    createApplication: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Controller not implemented yet',
        data: req.body,
        files: req.files
      });
    },
    
    getAllApplications: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Controller not implemented yet'
      });
    },
    
    getApplication: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Controller not implemented yet',
        requestedId: req.params.id
      });
    },
    
    updateApplicationStatus: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Controller not implemented yet',
        requestedId: req.params.id,
        newStatus: req.body.status
      });
    },
    
    deleteApplication: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Controller not implemented yet',
        requestedId: req.params.id
      });
    },
    
    downloadFile: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Controller not implemented yet',
        requestedId: req.params.id,
        fileType: req.params.fileType
      });
    },
    
    viewFile: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Controller not implemented yet',
        requestedId: req.params.id,
        fileType: req.params.fileType
      });
    },
    
    getStatistics: (req, res) => {
      res.status(501).json({
        success: false,
        message: 'Controller not implemented yet'
      });
    }
  };
}

// ✅ CORRECT ROUTES - These are properly formatted and will work:

// Create new application
router.post('/applications', uploadFiles, copyTradingController.createApplication);

// Get all applications
router.get('/applications', copyTradingController.getAllApplications);

// Get statistics
router.get('/applications/statistics', copyTradingController.getStatistics);

// Get specific application by ID
router.get('/applications/:id', copyTradingController.getApplication);

// Update application status
router.put('/applications/:id/status', copyTradingController.updateApplicationStatus);

// Delete application
router.delete('/applications/:id', copyTradingController.deleteApplication);

// Download file
router.get('/applications/:id/files/:fileType/download', copyTradingController.downloadFile);

// View file
router.get('/applications/:id/files/:fileType/view', copyTradingController.viewFile);

// Test route to verify the router is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Copy trading routes are working!',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'POST /api/trading-form/applications',
      'GET /api/trading-form/applications',
      'GET /api/trading-form/applications/statistics',
      'GET /api/trading-form/applications/:id',
      'PUT /api/trading-form/applications/:id/status',
      'DELETE /api/trading-form/applications/:id',
      'GET /api/trading-form/applications/:id/files/:fileType/download',
      'GET /api/trading-form/applications/:id/files/:fileType/view'
    ]
  });
});

module.exports = router;