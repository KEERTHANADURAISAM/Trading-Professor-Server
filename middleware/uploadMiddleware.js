// middleware/multerConfig.js (or uploadMiddleware.js)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Function to ensure directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Created directory: ${dirPath}`);
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'misc'; // default
    
    // Map fieldnames to folders
    if (file.fieldname === 'aadhar') folder = 'aadhar';
    else if (file.fieldname === 'signature') folder = 'signature';
    else if (file.fieldname === 'pan') folder = 'pan';
    else if (file.fieldname === 'photo') folder = 'photo';
    else if (file.fieldname === 'bank') folder = 'bank';
    // Add other file types as needed
    
    // 🔧 FIX: Go up one level from middleware to server, then to uploads
    const uploadPath = path.join(__dirname, '..', 'uploads', folder);
    
    console.log(`📁 Upload destination: ${uploadPath} for field: ${file.fieldname}`);
    
    // Ensure directory exists
    ensureDirectoryExists(uploadPath);
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    console.log(`📄 Generated filename: ${uniqueName} for field: ${file.fieldname}`);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log(`🔍 Filtering file: ${file.originalname} for field: ${file.fieldname}`);
    
    // Allow only images and PDFs
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      console.log(`✅ File accepted: ${file.originalname}`);
      return cb(null, true);
    } else {
      console.log(`❌ File rejected: ${file.originalname} - Invalid type`);
      cb(new Error(`Only .png, .jpg, .jpeg and .pdf files are allowed for ${file.fieldname}!`));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Initialize upload folders during server startup
const initializeUploadFolders = () => {
  // 🔧 FIX: Correct path to uploads directory
  const baseUploadPath = path.join(__dirname, '..', 'uploads');
  
  const folders = [
    baseUploadPath,
    path.join(baseUploadPath, 'aadhar'),
    path.join(baseUploadPath, 'signature'),
    path.join(baseUploadPath, 'pan'),
    path.join(baseUploadPath, 'photo'),
    path.join(baseUploadPath, 'bank'),
    path.join(baseUploadPath, 'misc')
  ];
  
  folders.forEach(folder => {
    ensureDirectoryExists(folder);
  });
  
  console.log('✅ Upload folders initialized');
};

// Call this when server starts
initializeUploadFolders();

// Export the upload middleware
module.exports = {
  upload,
  initializeUploadFolders,
  ensureDirectoryExists
};

console.log('✅ Multer config loaded and exported successfully');