// routes/copyTrading.js
const express = require('express');
const router = express.Router();
const copyTradingController = require('../controller/copyTradingController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads/documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  console.log(`🔍 Processing file: ${file.originalname} for field: ${file.fieldname}`);
  
  if (file.fieldname === 'aadharFile') {
    // Allow PDF, JPG, JPEG, PNG for Aadhar
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/jpg' || 
        file.mimetype === 'image/png') {
      console.log('✅ Aadhar file accepted');
      cb(null, true);
    } else {
      console.log('❌ Aadhar file rejected - invalid type');
      cb(new Error('Aadhar file must be PDF, JPG, JPEG, or PNG'), false);
    }
  } else if (file.fieldname === 'signatureFile') {
    // Allow only image files for signature
    if (file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/jpg' || 
        file.mimetype === 'image/png') {
      console.log('✅ Signature file accepted');
      cb(null, true);
    } else {
      console.log('❌ Signature file rejected - invalid type');
      cb(new Error('Signature file must be JPG, JPEG, or PNG'), false);
    }
  } else {
    console.log('❌ Unexpected file field:', file.fieldname);
    cb(new Error('Unexpected file field'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Middleware to handle file uploads
const uploadFiles = upload.fields([
  { name: 'aadharFile', maxCount: 1 },
  { name: 'signatureFile', maxCount: 1 }
]);

// Public routes - Apply multer middleware here
router.post('/applications', uploadFiles, copyTradingController.createApplication);

// Admin routes (add authentication middleware as needed)
router.get('/applications', copyTradingController.getAllApplications);
router.get('/applications/statistics', copyTradingController.getStatistics);
router.get('/applications/:id', copyTradingController.getApplication);
router.put('/applications/:id/status', copyTradingController.updateApplicationStatus);
router.delete('/applications/:id', copyTradingController.deleteApplication);

// File routes
router.get('/applications/:id/files/:fileType/download', copyTradingController.downloadFile);
router.get('/applications/:id/files/:fileType/view', copyTradingController.viewFile);

module.exports = router;