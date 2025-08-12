const UserForm = require('../models/UserForm');
const path = require('path');
const fs = require('fs');

// 🔥 FIXED SUBMIT FORM - Store file paths as STRINGS
// Enhanced submitForm function with detailed debugging
const submitForm = async (req, res) => {
  try {
    console.log('🔥 ========== NEW FORM SUBMISSION DEBUG ==========');
    
    // Log raw request data
    console.log('📥 Raw req.body keys:', Object.keys(req.body));
    console.log('📥 Raw req.body:', req.body);
    console.log('📁 Raw req.files:', req.files);
    console.log('📁 Files structure:', JSON.stringify(req.files, null, 2));

    let {
      firstName, lastName, email, phone,
      dateOfBirth, address, city, state,
      pincode, aadharNumber, agreeTerms, agreeMarketing, courseName
    } = req.body;

    console.log('📋 BEFORE SANITIZATION:');
    console.log('  firstName:', JSON.stringify(firstName));
    console.log('  lastName:', JSON.stringify(lastName));
    console.log('  email:', JSON.stringify(email));
    console.log('  phone:', JSON.stringify(phone));
    console.log('  courseName:', JSON.stringify(courseName), 'Type:', typeof courseName);
    console.log('  aadharNumber:', JSON.stringify(aadharNumber));
    console.log('  agreeTerms:', JSON.stringify(agreeTerms), 'Type:', typeof agreeTerms);
    console.log('  agreeMarketing:', JSON.stringify(agreeMarketing), 'Type:', typeof agreeMarketing);

    // Input sanitization and trimming
    firstName = firstName?.trim();
    lastName = lastName?.trim();
    email = email?.trim()?.toLowerCase();
    phone = phone?.trim();
    address = address?.trim();
    city = city?.trim();
    state = state?.trim();
    pincode = pincode?.trim();
    aadharNumber = aadharNumber?.trim();

    // Fix courseName if it's an array
    if (Array.isArray(courseName)) {
      const validCourseNames = courseName.filter(name => name && name.trim() !== '');
      courseName = validCourseNames.length > 0 ? validCourseNames[0].trim() : '';
      console.log('📚 courseName was an array, converted to:', courseName);
    } else if (courseName) {
      courseName = courseName.trim();
    }

    console.log('📋 AFTER SANITIZATION:');
    console.log('  firstName:', JSON.stringify(firstName));
    console.log('  lastName:', JSON.stringify(lastName));
    console.log('  email:', JSON.stringify(email));
    console.log('  phone:', JSON.stringify(phone));
    console.log('  courseName:', JSON.stringify(courseName));
    console.log('  aadharNumber:', JSON.stringify(aadharNumber));
    console.log('  agreeTerms:', JSON.stringify(agreeTerms));

    // 🔥 GET FILES FROM MULTER
    const aadharFile = req.files?.aadharFile?.[0] || req.files?.aadhar?.[0];
    const signatureFile = req.files?.signatureFile?.[0] || req.files?.signature?.[0];

    console.log('📄 Aadhar file found:', !!aadharFile, aadharFile?.filename || 'NO FILE');
    console.log('✍️  Signature file found:', !!signatureFile, signatureFile?.filename || 'NO FILE');

    // Enhanced validation with detailed logging
    const validationErrors = [];

    console.log('🔍 STARTING VALIDATION:');

    // Basic field validation
    if (!firstName) {
      console.log('❌ VALIDATION: firstName missing');
      validationErrors.push('First name is required');
    }
    if (!lastName) {
      console.log('❌ VALIDATION: lastName missing');
      validationErrors.push('Last name is required');
    }
    if (!email) {
      console.log('❌ VALIDATION: email missing');
      validationErrors.push('Email is required');
    }
    if (!phone) {
      console.log('❌ VALIDATION: phone missing');
      validationErrors.push('Phone number is required');
    }
    if (!courseName) {
      console.log('❌ VALIDATION: courseName missing or empty');
      validationErrors.push('Course name is required');
    }
    if (!aadharNumber) {
      console.log('❌ VALIDATION: aadharNumber missing');
      validationErrors.push('Aadhar number is required');
    }
    if (!agreeTerms || agreeTerms !== 'true') {
      console.log('❌ VALIDATION: agreeTerms not true. Value:', agreeTerms, 'Type:', typeof agreeTerms);
      validationErrors.push('You must agree to terms and conditions');
    }

    // File validation
    if (!aadharFile) {
      console.log('❌ VALIDATION: aadharFile missing');
      validationErrors.push('Aadhar document is required');
    }
    if (!signatureFile) {
      console.log('❌ VALIDATION: signatureFile missing');
      validationErrors.push('Signature is required');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      console.log('❌ VALIDATION: email format invalid:', email);
      validationErrors.push('Invalid email format');
    }

    // Phone number validation (Indian format)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (phone && !phoneRegex.test(phone)) {
      console.log('❌ VALIDATION: phone format invalid:', phone);
      validationErrors.push('Invalid phone number. Must be 10 digits starting with 6-9');
    }

    // Aadhar number validation (12 digits)
    const aadharRegex = /^\d{12}$/;
    if (aadharNumber && !aadharRegex.test(aadharNumber)) {
      console.log('❌ VALIDATION: aadhar format invalid:', aadharNumber);
      validationErrors.push('Invalid Aadhar number. Must be 12 digits');
    }

    // Date of birth validation
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      
      if (age < 16 || age > 100) {
        console.log('❌ VALIDATION: age invalid:', age);
        validationErrors.push('Age must be between 16 and 100 years');
      }
    }

    console.log('🔍 VALIDATION COMPLETE. Errors found:', validationErrors.length);
    if (validationErrors.length > 0) {
      console.log('❌ VALIDATION ERRORS:', validationErrors);
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        debug: {
          receivedData: {
            firstName: !!firstName,
            lastName: !!lastName,
            email: !!email,
            phone: !!phone,
            courseName: !!courseName,
            aadharNumber: !!aadharNumber,
            agreeTerms: agreeTerms,
            agreeTermsType: typeof agreeTerms,
            files: {
              aadhar: !!aadharFile,
              signature: !!signatureFile
            }
          }
        }
      });
    }

    console.log('✅ VALIDATION PASSED - Checking for existing users...');

    // Check for existing user
    const existingUser = await UserForm.findOne({
      $or: [
        { email: email },
        { phone: phone },
        { aadharNumber: aadharNumber }
      ]
    });

    if (existingUser) {
      let duplicateField = '';
      if (existingUser.email === email) duplicateField = 'Email';
      else if (existingUser.phone === phone) duplicateField = 'Phone number';
      else if (existingUser.aadharNumber === aadharNumber) duplicateField = 'Aadhar number';

      console.log('❌ DUPLICATE USER FOUND:', duplicateField);
      return res.status(409).json({
        success: false,
        message: `${duplicateField} already registered. Please use a different ${duplicateField.toLowerCase()}.`
      });
    }

    console.log('✅ NO DUPLICATE USER - Creating file paths...');

    // 🔥 FIXED: Store file paths as STRINGS (not objects)
    const aadharFilePath = `uploads/aadhar/${aadharFile.filename}`;
    const signatureFilePath = `uploads/signature/${signatureFile.filename}`;

    console.log('💾 Storing file paths:', { aadharFilePath, signatureFilePath });

    // Create new user with PROPER file path storage
    const newUser = new UserForm({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      address,
      city,
      state,
      pincode,
      aadharNumber,
      aadharFile: aadharFilePath,      // ✅ STRING path
      signatureFile: signatureFilePath, // ✅ STRING path
      agreeTerms: agreeTerms === 'true',
      agreeMarketing: agreeMarketing === 'true',
      courseName,
      status: 'pending',
      submittedAt: new Date()
    });

    console.log('💾 About to save user:', {
      firstName,
      lastName,
      email,
      courseName,
      agreeTerms: agreeTerms === 'true'
    });

    const savedUser = await newUser.save();

    console.log('✅ New registration saved successfully:', {
      id: savedUser._id,
      name: `${firstName} ${lastName}`,
      email: email,
      course: courseName,
      aadharFile: aadharFilePath,
      signatureFile: signatureFilePath
    });

    console.log('🔥 ========== FORM SUBMISSION SUCCESS ==========');

    res.status(201).json({
      success: true,
      message: 'Form submitted successfully! We will contact you soon.',
      data: {
        id: savedUser._id,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        fullName: savedUser.fullName,
        email: savedUser.email,
        courseName: savedUser.courseName,
        status: savedUser.status,
        submittedAt: savedUser.submittedAt,
        files: {
          aadharFile: {
            name: aadharFile.originalname,
            size: aadharFile.size,
            path: aadharFilePath
          },
          signatureFile: {
            name: signatureFile.originalname,
            size: signatureFile.size,
            path: signatureFilePath
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ ========== FORM SUBMISSION ERROR ==========');
    console.error('❌ Error details:', error);
    console.error('❌ Error stack:', error.stack);

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern)[0];
      const fieldNames = {
        aadharNumber: 'Aadhar number',
        email: 'Email',
        phone: 'Phone number'
      };

      return res.status(409).json({
        success: false,
        message: `${fieldNames[duplicateField] || duplicateField} already exists. Please check and try again.`
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error occurred. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add this new route in your backend (recommended approach):

const getAllRegistrations = async (req, res) => {
  try {
    const {
      status,
      courseName,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object (same as before)
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (courseName) {
      filter.courseName = { $regex: courseName, $options: 'i' };
    }
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const totalCount = await UserForm.countDocuments(filter);
    
    // 🔥 NO PAGINATION - Get all records
    const registrations = await UserForm.find(filter)
      .sort(sort)
      .lean()
      .select('-__v');

    // Same file processing as your existing function
    const processFileField = (fileField, registrationId, fieldType) => {
      if (!fileField) return null;
      
      try {
        if (typeof fileField === 'string') {
          const filename = path.basename(fileField);
          return {
            originalName: filename,
            filename: filename,
            path: fileField,
            downloadUrl: `/api/download/${registrationId}/${fieldType}`,
            viewUrl: `/api/view/${registrationId}/${fieldType}`
          };
        } else if (typeof fileField === 'object' && fileField !== null) {
          return {
            originalName: fileField.originalName || fileField.filename,
            filename: fileField.filename,
            path: fileField.path,
            size: fileField.size || 0,
            downloadUrl: `/api/download/${registrationId}/${fieldType}`,
            viewUrl: `/api/view/${registrationId}/${fieldType}`
          };
        }
        
        return null;
      } catch (error) {
        console.error(`Error processing ${fieldType} file field:`, error);
        return null;
      }
    };

    const enhancedRegistrations = registrations.map(registration => {
      return {
        ...registration,
        fullName: `${registration.firstName} ${registration.lastName}`,
        fileInfo: {
          aadharFile: processFileField(registration.aadharFile, registration._id, 'aadhar'),
          signatureFile: processFileField(registration.signatureFile, registration._id, 'signature')
        }
      };
    });

    res.status(200).json({
      success: true,
      message: 'All registrations fetched successfully',
      data: {
        registrations: enhancedRegistrations,
        totalCount,
        pagination: null // No pagination
      }
    });

  } catch (error) {
    console.error('❌ Error fetching all registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching all registrations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add this route:
// app.get('/api/registration/all-unlimited', getAllRegistrationsNoPagination);
// OR modify your existing route to accept a special parameter:
// app.get('/api/registration/all', getAllRegistrations); // existing route with pagination
// app.get('/api/registration/all-no-limit', getAllRegistrationsNoPagination); // new route

// 🔥 FIXED DOWNLOAD FILE FUNCTION
const downloadFile = async (req, res) => {
  try {
    console.log('=== DOWNLOAD REQUEST DEBUG ===');
    console.log('Params:', req.params);
    
    const { id, fileType } = req.params;
    
    if (!id || !fileType) {
      return res.status(400).json({ error: 'Missing id or fileType parameter' });
    }
    
    // Find registration
    const registration = await UserForm.findById(id).lean();
    
    if (!registration) {
      console.log('Registration not found in database');
      return res.status(404).json({ error: 'Registration not found' });
    }

    console.log('Registration found:', {
      id: registration._id,
      name: `${registration.firstName} ${registration.lastName}`
    });

    // Get file field based on file type
    let fileField;
    switch (fileType) {
      case 'aadhar':
        fileField = registration.aadharFile;
        break;
      case 'signature':
        fileField = registration.signatureFile;
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid file type. Supported types: aadhar, signature' 
        });
    }

    console.log('File field extracted:', fileField);
    console.log('File field type:', typeof fileField);

    if (!fileField) {
      return res.status(404).json({ 
        error: `${fileType} file not found for this registration` 
      });
    }

    // Build the actual file path
    let actualFilePath;
    let downloadFilename;

    if (typeof fileField === 'string' && fileField.trim() !== '') {
      // Handle string case (CORRECT format)
      if (fileField.startsWith('uploads/')) {
        // Relative path - join with server directory
        actualFilePath = path.join(__dirname, '..', fileField);
        downloadFilename = path.basename(fileField);
      } else {
        // Absolute path (legacy)
        actualFilePath = fileField;
        downloadFilename = path.basename(fileField);
      }
    } else if (typeof fileField === 'object' && fileField !== null) {
      // Handle object case (OLD format - for backward compatibility)
      downloadFilename = fileField.filename || fileField.originalName || fileField.name;
      
      if (fileField.path) {
        if (fileField.path.startsWith('uploads/')) {
          actualFilePath = path.join(__dirname, '..', fileField.path);
        } else {
          actualFilePath = fileField.path;
        }
      } else if (downloadFilename) {
        // Construct path based on file type and filename
        actualFilePath = path.join(__dirname, '..', 'uploads', fileType, downloadFilename);
      }
    }

    console.log('Constructed file path:', actualFilePath);
    console.log('Download filename:', downloadFilename);

    // Check if file exists at the constructed path
    if (!actualFilePath || !fs.existsSync(actualFilePath)) {
      console.log('🔍 File not found at primary location, searching...');
      
      // TARGETED SEARCH STRATEGY
      const baseUploadsPath = path.join(__dirname, '..', 'uploads');
      
      let foundPath = null;
      
      // Strategy 1: Look in the specific file type folder
      const typeFolder = path.join(baseUploadsPath, fileType);
      if (fs.existsSync(typeFolder)) {
        console.log(`Searching in ${fileType} folder:`, typeFolder);
        
        const files = fs.readdirSync(typeFolder);
        
        // Look for files that match this specific user and file type
        const firstName = registration.firstName.toLowerCase();
        const lastName = registration.lastName.toLowerCase();
        
        for (const file of files) {
          const filename_lower = file.toLowerCase();
          
          // Specific matching - user name AND file type
          const matchesUser = (
            filename_lower.includes(firstName) ||
            filename_lower.includes(lastName) ||
            filename_lower.includes(`${firstName}_${lastName}`) ||
            filename_lower.includes(id.toLowerCase())
          );
          
          const matchesType = filename_lower.includes(fileType.toLowerCase());
          
          if (matchesUser && (matchesType || downloadFilename === file)) {
            foundPath = path.join(typeFolder, file);
            console.log(`✅ Found specific match: ${file}`);
            downloadFilename = downloadFilename || file;
            break;
          }
        }
      }

      if (!foundPath) {
        return res.status(404).json({
          error: `${fileType} file not found for user`,
          debug: {
            registrationInfo: {
              id: registration._id,
              name: `${registration.firstName} ${registration.lastName}`,
              fileType: fileType
            },
            searchedPath: actualFilePath,
            storedFileField: fileField
          }
        });
      }

      actualFilePath = foundPath;
    }

    // Final verification
    if (!fs.existsSync(actualFilePath)) {
      return res.status(404).json({
        error: 'File path found but file is not accessible',
        filePath: actualFilePath
      });
    }

    const stats = fs.statSync(actualFilePath);
    if (!stats.isFile()) {
      return res.status(404).json({
        error: 'Path is not a file',
        filePath: actualFilePath
      });
    }

    console.log('✅ Final file verification passed:', {
      path: actualFilePath,
      size: stats.size,
      downloadFilename: downloadFilename
    });

    // Set appropriate content type
    const ext = path.extname(downloadFilename || actualFilePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf': contentType = 'application/pdf'; break;
      case '.jpg':
      case '.jpeg': contentType = 'image/jpeg'; break;
      case '.png': contentType = 'image/png'; break;
      case '.gif': contentType = 'image/gif'; break;
      case '.bmp': contentType = 'image/bmp'; break;
      case '.webp': contentType = 'image/webp'; break;
    }

    // Set headers
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);

    // Create and pipe file stream
    const fileStream = fs.createReadStream(actualFilePath);
    
    fileStream.on('error', (streamError) => {
      console.error('❌ File stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });
    
    fileStream.on('end', () => {
      console.log('✅ File download completed successfully');
    });
    
    // Send the file
    fileStream.pipe(res);

  } catch (error) {
    console.error('❌ Download error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        error: 'Invalid registration ID format',
        details: error.message
      });
    }
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Server error during file download',
        details: error.message
      });
    }
  }
};

// Other functions remain the same...
const getRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const registration = await UserForm.findById(id).select('-__v');
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    const regObj = registration.toObject();
    const enhancedRegistration = {
      ...regObj,
      fullName: `${regObj.firstName} ${regObj.lastName}`,
      fileInfo: {
        aadharFile: regObj.aadharFile ? {
          path: regObj.aadharFile,
          downloadUrl: `/api/download/${regObj._id}/aadhar`,
          viewUrl: `/api/view/${regObj._id}/aadhar`
        } : null,
        signatureFile: regObj.signatureFile ? {
          path: regObj.signatureFile,
          downloadUrl: `/api/download/${regObj._id}/signature`,
          viewUrl: `/api/view/${regObj._id}/signature`
        } : null
      }
    };

    res.status(200).json({
      success: true,
      message: 'Registration fetched successfully',
      data: enhancedRegistration
    });

  } catch (error) {
    console.error('❌ Error fetching registration:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// VIEW FILE FUNCTION
const viewFile = async (req, res) => {
  try {
    const { id, fileType } = req.params;
    
    const registration = await UserForm.findById(id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    let fileField;
    if (fileType === 'aadhar') {
      fileField = registration.aadharFile;
    } else if (fileType === 'signature') {
      fileField = registration.signatureFile;
    } else {
      return res.status(404).json({
        success: false,
        message: `Invalid file type: ${fileType}`
      });
    }

    if (!fileField) {
      return res.status(404).json({
        success: false,
        message: `${fileType} file not found`
      });
    }

    let filePath;
    
    if (typeof fileField === 'string') {
      // New format - string path
      if (fileField.startsWith('uploads/')) {
        filePath = path.join(__dirname, '..', fileField);
      } else {
        filePath = fileField;
      }
    } else if (typeof fileField === 'object' && fileField.path) {
      // Old format - object with path
      if (fileField.path.startsWith('uploads/')) {
        filePath = path.join(__dirname, '..', fileField.path);
      } else {
        filePath = fileField.path;
      }
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server',
        debug: {
          searchedPath: filePath,
          fileField: fileField
        }
      });
    }

    const filename = path.basename(filePath);
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(path.resolve(filePath));
    
    console.log(`👀 File viewed: ${filename} for ${registration.firstName} ${registration.lastName}`);

  } catch (error) {
    console.error('❌ View error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during view',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  submitForm,
  getAllRegistrations,
  getRegistrationById,
  downloadFile,
  viewFile
};