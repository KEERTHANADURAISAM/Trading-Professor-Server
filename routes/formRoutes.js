const express = require('express');
const router = express.Router();

// Import UserForm model (needed for debug and migration routes)
const UserForm = require('../models/UserForm'); // Adjust path if needed

// Import controllers - ONLY import what exists
const { 
  submitForm, 
  getAllRegistrations, 
  getRegistrationById,
  downloadFile,
  viewFile
} = require('../controller/formControllers');

// Import multer configuration
const { upload } = require('../middleware/uploadMiddleware');

// Add JSON parsing middleware
router.use(express.json());

// 🔥 FORM SUBMISSION WITH FILE UPLOAD
router.post('/submit', upload.fields([
  { name: 'aadharFile', maxCount: 1 },
  { name: 'signatureFile', maxCount: 1 }
]), submitForm);

// 🔥 GET ALL REGISTRATIONS
router.get('/all', getAllRegistrations);

// 🔥 GET STATISTICS - Create a simple placeholder function
router.get('/stats/overview', async (req, res) => {
  try {
    const totalRegistrations = await UserForm.countDocuments();
    const pendingRegistrations = await UserForm.countDocuments({ status: 'pending' });
    const approvedRegistrations = await UserForm.countDocuments({ status: 'approved' });
    
    res.json({
      success: true,
      data: {
        total: totalRegistrations,
        pending: pendingRegistrations,
        approved: approvedRegistrations
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message
    });
  }
});

// 🔥 DOWNLOAD FILES (Move BEFORE /:id route to avoid conflicts)
router.get('/download/:id/:fileType', (req, res, next) => {
  console.log('🎯 Download route hit with params:', req.params);
  next();
}, downloadFile);

// 🔥 VIEW FILES IN BROWSER (Move BEFORE /:id route)
router.get('/view/:id/:fileType', viewFile);

// 🔍 DEBUG ROUTES (Keep these for troubleshooting)

// 🔍 LIST ALL DEBUG ROUTES
router.get('/debug', (req, res) => {
  res.json({
    message: 'Available debug routes',
    routes: [
      'GET /api/registration/debug - This list',
      'GET /api/registration/debug/files - List all files',
      'GET /api/registration/debug/files/search/:pattern - Search for files by pattern',
      'GET /api/registration/debug/registration/:id - Check registration data',
      'GET /api/registration/debug/migration/dry-run - Preview migration',
      'POST /api/registration/debug/migration/execute - Execute migration',
      'POST /api/registration/debug/fix-registration/:id - Fix file mapping'
    ],
    examples: {
      searchFiles: '/api/registration/debug/files/search/muthuvel',
      checkRegistration: '/api/registration/debug/registration/688d97cb6f0dee325966699b',
      fixMapping: {
        url: '/api/registration/debug/fix-registration/688d97cb6f0dee325966699b',
        method: 'POST',
        body: {
          fileType: 'signatureFile',
          correctFileName: '1753927813807-MUTHUVEL MURUGAN_Signature.png'
        }
      }
    }
  });
});

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

// 🔍 SEARCH FILES BY PATTERN - NEW ROUTE
router.get('/debug/files/search/:pattern', (req, res) => {
  try {
    const { pattern } = req.params;
    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(__dirname, '../uploads');
    const results = [];
    
    // Function to search in directory recursively
    const searchInDir = (dir, subFolder = '') => {
      try {
        if (!fs.existsSync(dir)) return;
        
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            searchInDir(filePath, path.join(subFolder, file));
          } else {
            const fileName = file.toLowerCase();
            const searchPattern = pattern.toLowerCase();
            
            if (fileName.includes(searchPattern)) {
              results.push({
                fileName: file,
                subFolder: subFolder || 'root',
                fullPath: subFolder ? path.join(subFolder, file) : file,
                actualPath: filePath,
                size: stat.size,
                modified: stat.mtime
              });
            }
          }
        });
      } catch (error) {
        console.log(`Error reading directory ${dir}:`, error.message);
      }
    };
    
    searchInDir(uploadsDir);
    
    res.json({
      searchPattern: pattern,
      uploadsDir: uploadsDir,
      totalFound: results.length,
      files: results
    });
    
  } catch (error) {
    console.error('File search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔍 DEBUG: Check specific registration data
router.get('/debug/registration/:id', async (req, res) => {
  try {
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

// 🔧 FIX FILE MAPPING FOR SPECIFIC REGISTRATION - NEW ROUTE
router.post('/debug/fix-registration/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fileType, correctFileName } = req.body;
    
    if (!fileType || !correctFileName) {
      return res.status(400).json({ 
        error: 'Missing fileType or correctFileName in request body',
        example: {
          fileType: 'aadharFile', // or 'signatureFile'
          correctFileName: 'example-file.png'
        }
      });
    }
    
    const registration = await UserForm.findById(id);
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    const oldFileName = registration[fileType];
    
    // Update the file field
    const updateData = {};
    updateData[fileType] = correctFileName;
    
    await UserForm.findByIdAndUpdate(id, updateData);
    
    res.json({
      success: true,
      message: `Fixed ${fileType} file mapping`,
      registrationId: id,
      registrationName: `${registration.firstName} ${registration.lastName}`,
      oldFileName: oldFileName || 'Not set',
      newFileName: correctFileName
    });
    
  } catch (error) {
    console.error('Fix registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔧 MIGRATION ROUTES - Convert old object file data to string format

// 🔍 MIGRATION: Dry run - Preview what would be migrated
router.get('/debug/migration/dry-run', async (req, res) => {
  try {
    console.log('🔍 DRY RUN - Checking what would be migrated...');
    
    const registrations = await UserForm.find({
      $or: [
        { aadharFile: { $type: 'object', $ne: null } },
        { signatureFile: { $type: 'object', $ne: null } }
      ]
    });
    
    console.log(`📊 Found ${registrations.length} registrations with object-format file data`);
    
    const migrationPreview = [];
    
    for (const registration of registrations) {
      const previewData = {
        registrationId: registration._id,
        name: `${registration.firstName} ${registration.lastName}`,
        changes: {}
      };
      
      if (registration.aadharFile && typeof registration.aadharFile === 'object') {
        let proposedPath = null;
        if (registration.aadharFile.path) {
          proposedPath = registration.aadharFile.path;
        } else if (registration.aadharFile.filename) {
          proposedPath = `uploads/aadhar/${registration.aadharFile.filename}`;
        } else if (registration.aadharFile.originalname) {
          proposedPath = `uploads/aadhar/${registration.aadharFile.originalname}`;
        }
        
        previewData.changes.aadharFile = {
          current: registration.aadharFile,
          proposed: proposedPath || 'COULD NOT DETERMINE'
        };
      }
      
      if (registration.signatureFile && typeof registration.signatureFile === 'object') {
        let proposedPath = null;
        if (registration.signatureFile.path) {
          proposedPath = registration.signatureFile.path;
        } else if (registration.signatureFile.filename) {
          proposedPath = `uploads/signature/${registration.signatureFile.filename}`;
        } else if (registration.signatureFile.originalname) {
          proposedPath = `uploads/signature/${registration.signatureFile.originalname}`;
        }
        
        previewData.changes.signatureFile = {
          current: registration.signatureFile,
          proposed: proposedPath || 'COULD NOT DETERMINE'
        };
      }
      
      migrationPreview.push(previewData);
    }
    
    res.json({
      message: 'Migration dry run completed',
      totalFound: registrations.length,
      preview: migrationPreview
    });
    
  } catch (error) {
    console.error('❌ Dry run failed:', error);
    res.status(500).json({ 
      error: 'Dry run failed',
      details: error.message 
    });
  }
});

// 🔧 MIGRATION: Actually perform the migration
router.post('/debug/migration/execute', async (req, res) => {
  try {
    console.log('🔄 Starting file data migration...');
    
    const registrations = await UserForm.find({
      $or: [
        { aadharFile: { $type: 'object', $ne: null } },
        { signatureFile: { $type: 'object', $ne: null } }
      ]
    });
    
    console.log(`📊 Found ${registrations.length} registrations with object-format file data`);
    
    let migratedCount = 0;
    let errors = [];
    const migrationResults = [];
    
    for (const registration of registrations) {
      try {
        console.log(`\n🔄 Processing registration: ${registration._id}`);
        
        let updateData = {};
        let hasUpdates = false;
        const result = {
          registrationId: registration._id,
          name: `${registration.firstName} ${registration.lastName}`,
          changes: {},
          status: 'success'
        };
        
        // Handle aadharFile conversion
        if (registration.aadharFile && typeof registration.aadharFile === 'object') {
          let newAadharPath = null;
          
          if (registration.aadharFile.path) {
            newAadharPath = registration.aadharFile.path;
          } else if (registration.aadharFile.filename) {
            newAadharPath = `uploads/aadhar/${registration.aadharFile.filename}`;
          } else if (registration.aadharFile.originalname) {
            newAadharPath = `uploads/aadhar/${registration.aadharFile.originalname}`;
          }
          
          if (newAadharPath) {
            updateData.aadharFile = newAadharPath;
            hasUpdates = true;
            result.changes.aadharFile = {
              from: JSON.stringify(registration.aadharFile),
              to: newAadharPath
            };
          }
        }
        
        // Handle signatureFile conversion
        if (registration.signatureFile && typeof registration.signatureFile === 'object') {
          let newSignaturePath = null;
          
          if (registration.signatureFile.path) {
            newSignaturePath = registration.signatureFile.path;
          } else if (registration.signatureFile.filename) {
            newSignaturePath = `uploads/signature/${registration.signatureFile.filename}`;
          } else if (registration.signatureFile.originalname) {
            newSignaturePath = `uploads/signature/${registration.signatureFile.originalname}`;
          }
          
          if (newSignaturePath) {
            updateData.signatureFile = newSignaturePath;
            hasUpdates = true;
            result.changes.signatureFile = {
              from: JSON.stringify(registration.signatureFile),
              to: newSignaturePath
            };
          }
        }
        
        // Update the registration if we have changes
        if (hasUpdates) {
          await UserForm.findByIdAndUpdate(registration._id, updateData);
          migratedCount++;
          console.log('   ✅ Registration updated successfully');
        } else {
          result.status = 'no_changes_needed';
        }
        
        migrationResults.push(result);
        
      } catch (error) {
        console.error(`   ❌ Error processing registration ${registration._id}:`, error.message);
        errors.push({
          registrationId: registration._id,
          name: `${registration.firstName} ${registration.lastName}`,
          error: error.message
        });
        
        migrationResults.push({
          registrationId: registration._id,
          name: `${registration.firstName} ${registration.lastName}`,
          status: 'error',
          error: error.message
        });
      }
    }
    
    const summary = {
      totalProcessed: registrations.length,
      successfullyMigrated: migratedCount,
      errors: errors.length,
      errorDetails: errors,
      results: migrationResults
    };
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Total registrations processed: ${registrations.length}`);
    console.log(`   Successfully migrated: ${migratedCount}`);
    console.log(`   Errors: ${errors.length}`);
    
    res.json({
      message: 'Migration completed successfully!',
      summary: summary
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({ 
      error: 'Migration failed',
      details: error.message 
    });
  }
});

// 🔥 GET SINGLE REGISTRATION (Keep dynamic routes after specific ones)
router.get('/:id', getRegistrationById);

// 🔥 UPDATE REGISTRATION STATUS - Simple implementation
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }
    
    const registration = await UserForm.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      data: registration
    });
    
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating status',
      error: error.message
    });
  }
});

// 🔥 DELETE REGISTRATION - Simple implementation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const registration = await UserForm.findByIdAndDelete(id);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Registration deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting registration',
      error: error.message
    });
  }
});

console.log('✅ Form routes configured with enhanced download functionality and migration tools');

module.exports = router;