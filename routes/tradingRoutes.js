// routes/copyTradingRoutes.js
const express = require('express');
const {
  uploadFields,
  createApplication,
  getAllApplications,
  getApplicationById,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
  getApplicationStats
} = require('../controller/copyTradingController');

const router = express.Router();

// Temporary dummy middleware (replace with actual middleware later)
const dummyAuth = (req, res, next) => {
  // For now, simulate a logged-in admin user
  req.user = { 
    id: 'dummy-admin-id', 
    email: 'admin@example.com', 
    role: 'admin' 
  };
  next();
};

const dummyValidation = (req, res, next) => {
  // Skip validation for now
  next();
};

// Public routes
router.post('/', uploadFields, dummyValidation, createApplication);

// Protected routes (require authentication)
router.use(dummyAuth); // All routes after this middleware require authentication

// User can access their own application
router.get('/my-application', async (req, res) => {
  try {
    const CopyTradingApplication = require('../models/CopyTradingForm');
    const application = await CopyTradingApplication
      .findOne({ email: req.user.email })
      .populate('reviewedBy', 'name email');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No application found'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Admin routes (for now, no restriction - add restrictTo middleware later)
router.get('/stats', getApplicationStats);
router.get('/', getAllApplications);
router.get('/:id', getApplicationById);
router.put('/:id', uploadFields, dummyValidation, updateApplication);
router.patch('/:id/status', updateApplicationStatus);
router.delete('/:id', deleteApplication);

module.exports = router;