const express = require('express');
const router = express.Router();

// Import controllers
const { 
  submitForm, 
  getAllRegistrations, 
  getRegistrationById,
  updateRegistrationStatus,
  getRegistrationStats,
  downloadFile,
  viewFile,
  deleteRegistration
} = require('../controller/formControllers');

// Import multer configuration
const { upload } = require('../middleware/uploadMiddleware');

// 🔥 FORM SUBMISSION WITH FILE UPLOAD
router.post('/submit', upload.fields([
  { name: 'aadharFile', maxCount: 1 },
  { name: 'signatureFile', maxCount: 1 }
]), submitForm);

// 🔥 GET ALL REGISTRATIONS
router.get('/all', getAllRegistrations);

// 🔥 GET STATISTICS (Specific routes first)
router.get('/stats/overview', getRegistrationStats);

// 🔥 DOWNLOAD FILES (Move BEFORE /:id route to avoid conflicts)
router.get('/download/:id/:fileType', (req, res, next) => {
  console.log('🎯 Download route hit with params:', req.params);
  next();
}, downloadFile);

// 🔥 VIEW FILES IN BROWSER (Move BEFORE /:id route)
router.get('/view/:id/:fileType', viewFile);

// 🔍 DEBUG ROUTES (Keep these for troubleshooting)
router.get('/debug/files', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  
  try {
    const uploadsPath = path.join(__dirname, '..', 'uploads');
    
    const getAllFiles = (dirPath, basePath = dirPath) => {
      let files = [];
      try {
        if (!fs.existsSync(dirPath)) return files;
        
        const items = fs.readdirSync(dirPath);
        items.forEach(item => {
          const fullPath = path.join(dirPath, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            files = files.concat(getAllFiles(fullPath, basePath));
          } else {
            files.push({
              filename: item,
              folder: path.dirname(path.relative(basePath, fullPath)) || 'root',
              relativePath: path.relative(basePath, fullPath),
              fullPath: fullPath,
              size: stat.size
            });
          }
        });
      } catch (err) {
        console.error('Error:', err);
      }
      return files;
    };
    
    const allFiles = getAllFiles(uploadsPath);
    
    res.json({
      uploadsPath: uploadsPath,
      uploadsExists: fs.existsSync(uploadsPath),
      totalFiles: allFiles.length,
      filesByFolder: allFiles.reduce((acc, file) => {
        if (!acc[file.folder]) acc[file.folder] = [];
        acc[file.folder].push({
          filename: file.filename,
          size: file.size
        });
        return acc;
      }, {}),
      allFiles: allFiles
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔍 DEBUG: Check specific registration data
router.get('/debug/registration/:id', async (req, res) => {
  try {
    const UserForm = require('../model/formModel'); // Adjust path if needed
    const registration = await UserForm.findById(req.params.id).lean();
    
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    res.json({
      registrationId: registration._id,
      name: `${registration.firstName} ${registration.lastName}`,
      aadharFile: registration.aadharFile,
      signatureFile: registration.signatureFile,
      aadharFileType: typeof registration.aadharFile,
      signatureFileType: typeof registration.signatureFile,
      aadharFileKeys: registration.aadharFile ? Object.keys(registration.aadharFile) : [],
      signatureFileKeys: registration.signatureFile ? Object.keys(registration.signatureFile) : []
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      registrationId: req.params.id
    });
  }
});

// 🔥 GET SINGLE REGISTRATION (Keep dynamic routes after specific ones)
router.get('/:id', getRegistrationById);

// 🔥 UPDATE REGISTRATION STATUS
router.patch('/:id/status', updateRegistrationStatus);

// 🔥 DELETE REGISTRATION
router.delete('/:id', deleteRegistration);

console.log('✅ Form routes configured with enhanced download functionality');

module.exports = router;