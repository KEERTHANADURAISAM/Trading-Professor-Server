const UserForm = require('../models/UserForm');
const path = require('path');
const fs = require('fs');

// 🔥 ENHANCED SUBMIT FORM WITH FILE HANDLING
const submitForm = async (req, res) => {
  try {
    let {
      firstName, lastName, email, phone,
      dateOfBirth, address, city, state,
      pincode, aadharNumber, agreeTerms, agreeMarketing, courseName
    } = req.body;

    console.log('📥 Form submission received:', { firstName, lastName, email, courseName });
    console.log('📁 Files received:', req.files);

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

    // 🔥 ENHANCED FILE VALIDATION
    const aadharFile = req.files?.aadharFile?.[0];
    const signatureFile = req.files?.signatureFile?.[0];

    console.log('📄 Aadhar file:', aadharFile?.filename);
    console.log('✍️  Signature file:', signatureFile?.filename);

    // Enhanced validation
    const validationErrors = [];

    // Basic field validation
    if (!firstName) validationErrors.push('First name is required');
    if (!lastName) validationErrors.push('Last name is required');
    if (!email) validationErrors.push('Email is required');
    if (!phone) validationErrors.push('Phone number is required');
    if (!courseName) validationErrors.push('Course name is required');
    if (!aadharNumber) validationErrors.push('Aadhar number is required');
    if (!agreeTerms || agreeTerms !== 'true') {
      validationErrors.push('You must agree to terms and conditions');
    }

    // File validation
    if (!aadharFile) validationErrors.push('Aadhar document is required');
    if (!signatureFile) validationErrors.push('Signature is required');

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      validationErrors.push('Invalid email format');
    }

    // Phone number validation (Indian format)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (phone && !phoneRegex.test(phone)) {
      validationErrors.push('Invalid phone number. Must be 10 digits starting with 6-9');
    }

    // Aadhar number validation (12 digits)
    const aadharRegex = /^\d{12}$/;
    if (aadharNumber && !aadharRegex.test(aadharNumber)) {
      validationErrors.push('Invalid Aadhar number. Must be 12 digits');
    }

    // Date of birth validation
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      
      if (age < 16 || age > 100) {
        validationErrors.push('Age must be between 16 and 100 years');
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

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

      return res.status(409).json({
        success: false,
        message: `${duplicateField} already registered. Please use a different ${duplicateField.toLowerCase()}.`
      });
    }

    // 🔥 PREPARE FILE DATA FOR DATABASE
    const aadharFileData = {
      originalName: aadharFile.originalname,
      filename: aadharFile.filename,
      path: aadharFile.path.replace(/\\/g, '/'),
      size: aadharFile.size,
      mimetype: aadharFile.mimetype,
      uploadDate: new Date()
    };

    const signatureFileData = {
      originalName: signatureFile.originalname,
      filename: signatureFile.filename,
      path: signatureFile.path.replace(/\\/g, '/'),
      size: signatureFile.size,
      mimetype: signatureFile.mimetype,
      uploadDate: new Date()
    };

    // Create new user with enhanced file structure
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
      aadharFile: aadharFileData,
      signatureFile: signatureFileData,
      agreeTerms: agreeTerms === 'true',
      agreeMarketing: agreeMarketing === 'true',
      courseName,
      status: 'pending',
      submittedAt: new Date()
    });

    const savedUser = await newUser.save();

    console.log('✅ New registration saved:', {
      id: savedUser._id,
      name: `${firstName} ${lastName}`,
      email: email,
      course: courseName,
      aadharFile: aadharFileData.filename,
      signatureFile: signatureFileData.filename
    });

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
            name: aadharFileData.originalName,
            size: aadharFileData.size,
            uploadDate: aadharFileData.uploadDate
          },
          signatureFile: {
            name: signatureFileData.originalName,
            size: signatureFileData.size,
            uploadDate: signatureFileData.uploadDate
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Form submission error:', error);

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

// 🔥 ENHANCED GET ALL REGISTRATIONS WITH FILE INFO
// 🔥 FIXED getAllRegistrations function - Replace your existing one

const getAllRegistrations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      courseName,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await UserForm.countDocuments(filter);
    
    const registrations = await UserForm.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean()
      .select('-__v');

    // 🔥 FIXED PROCESS FILE FIELD FUNCTION
    const processFileField = (fileField, registrationId, fieldType) => {
      if (!fileField) return null;
      
      try {
        // If it's already an object with the correct structure
        if (typeof fileField === 'object' && fileField !== null && fileField.filename) {
          return {
            originalName: fileField.originalName || fileField.filename,
            filename: fileField.filename,
            size: fileField.size || 0,
            uploadDate: fileField.uploadDate || new Date(),
            downloadUrl: `/api/registration/download/${registrationId}/${fieldType}`,
            viewUrl: `/api/registration/view/${registrationId}/${fieldType}`
          };
        }
        
        // If it's a string (old format), convert it safely
        if (typeof fileField === 'string') {
          const filename = fileField.split('/').pop(); // Get filename from path
          return {
            originalName: filename,
            filename: filename,
            size: 0,
            uploadDate: new Date(),
            downloadUrl: `/api/registration/download/${registrationId}/${fieldType}`,
            viewUrl: `/api/registration/view/${registrationId}/${fieldType}`
          };
        }
        
        return null;
      } catch (error) {
        console.error(`Error processing ${fieldType} file field:`, error);
        return null;
      }
    };

    // Enhanced registrations with file information
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

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Registrations fetched successfully',
      data: {
        registrations: enhancedRegistrations,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add these functions to your formControllers.js file

// 🔥 GET SINGLE REGISTRATION BY ID
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

    // Enhanced response with file information
    const regObj = registration.toObject();
    const enhancedRegistration = {
      ...regObj,
      fullName: `${regObj.firstName} ${regObj.lastName}`,
      fileInfo: {
        aadharFile: regObj.aadharFile ? {
          originalName: regObj.aadharFile.originalName,
          filename: regObj.aadharFile.filename,
          size: regObj.aadharFile.size,
          uploadDate: regObj.aadharFile.uploadDate,
          downloadUrl: `/api/download/${regObj._id}/aadhar`,
          viewUrl: `/api/view/${regObj._id}/aadhar`
        } : null,
        signatureFile: regObj.signatureFile ? {
          originalName: regObj.signatureFile.originalName,
          filename: regObj.signatureFile.filename,
          size: regObj.signatureFile.size,
          uploadDate: regObj.signatureFile.uploadDate,
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

    console.log(`✅ Registration fetched: ${registration.fullName} (${id})`);

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

// 🔥 UPDATE REGISTRATION STATUS
const updateRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'under-review'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const registration = await UserForm.findById(id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Update status and add notes if provided
    const updateData = {
      status,
      statusUpdatedAt: new Date()
    };

    if (notes) {
      updateData.adminNotes = notes;
    }

    const updatedRegistration = await UserForm.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    res.status(200).json({
      success: true,
      message: `Registration status updated to ${status}`,
      data: {
        id: updatedRegistration._id,
        fullName: updatedRegistration.fullName,
        email: updatedRegistration.email,
        courseName: updatedRegistration.courseName,
        status: updatedRegistration.status,
        statusUpdatedAt: updatedRegistration.statusUpdatedAt,
        adminNotes: updatedRegistration.adminNotes
      }
    });

    console.log(`✅ Status updated: ${registration.fullName} -> ${status}`);

  } catch (error) {
    console.error('❌ Error updating status:', error);
    
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

// 🔥 GET REGISTRATION STATISTICS
const getRegistrationStats = async (req, res) => {
  try {
    // Get overall statistics
    const totalRegistrations = await UserForm.countDocuments();
    const pendingApprovals = await UserForm.countDocuments({ status: 'pending' });
    const approvedRegistrations = await UserForm.countDocuments({ status: 'approved' });
    const rejectedRegistrations = await UserForm.countDocuments({ status: 'rejected' });
    const underReviewRegistrations = await UserForm.countDocuments({ status: 'under-review' });

    // Get course-wise statistics
    const courseStats = await UserForm.aggregate([
      {
        $group: {
          _id: '$courseName',
          count: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRegistrations = await UserForm.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get monthly statistics (current month)
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    const monthlyRegistrations = await UserForm.countDocuments({
      createdAt: { $gte: currentMonth }
    });

    // Calculate conversion rate (approved / total)
    const conversionRate = totalRegistrations > 0 
      ? ((approvedRegistrations / totalRegistrations) * 100).toFixed(2)
      : 0;

    const stats = {
      overview: {
        totalRegistrations,
        pendingApprovals,
        approvedRegistrations,
        rejectedRegistrations,
        underReviewRegistrations,
        conversionRate: parseFloat(conversionRate)
      },
      timeBasedStats: {
        recentRegistrations, // Last 7 days
        monthlyRegistrations, // Current month
      },
      courseWiseStats: courseStats.map(course => ({
        courseName: course._id,
        totalCount: course.count,
        pending: course.pending,
        approved: course.approved,
        rejected: course.rejected,
        approvalRate: course.count > 0 ? 
          ((course.approved / course.count) * 100).toFixed(2) : 0
      })),
      statusDistribution: {
        pending: pendingApprovals,
        approved: approvedRegistrations,
        rejected: rejectedRegistrations,
        underReview: underReviewRegistrations
      }
    };

    res.status(200).json({
      success: true,
      message: 'Statistics fetched successfully',
      data: stats,
      generatedAt: new Date()
    });

    console.log(`📊 Statistics generated: ${totalRegistrations} total registrations`);

  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while fetching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔥 DELETE REGISTRATION
const deleteRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    
    const registration = await UserForm.findById(id);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Store file paths for cleanup
    const filesToDelete = [];
    if (registration.aadharFile && registration.aadharFile.path) {
      filesToDelete.push(path.join(__dirname, '..', registration.aadharFile.path));
    }
    if (registration.signatureFile && registration.signatureFile.path) {
      filesToDelete.push(path.join(__dirname, '..', registration.signatureFile.path));
    }

    // Delete the registration from database
    await UserForm.findByIdAndDelete(id);

    // Clean up uploaded files
    filesToDelete.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ File deleted: ${filePath}`);
        } catch (fileError) {
          console.error(`❌ Error deleting file: ${filePath}`, fileError);
        }
      }
    });

    res.status(200).json({
      success: true,
      message: `Registration for ${registration.fullName} deleted successfully`,
      data: {
        deletedId: id,
        deletedName: registration.fullName,
        deletedEmail: registration.email,
        filesDeleted: filesToDelete.length
      }
    });

    console.log(`🗑️ Registration deleted: ${registration.fullName} (${id})`);

  } catch (error) {
    console.error('❌ Error deleting registration:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid registration ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error occurred while deleting registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Download file with comprehensive path searching and error handling
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const downloadFile = async (req, res) => {
  try {
    console.log('=== DOWNLOAD REQUEST DEBUG ===');
    console.log('Params:', req.params);
    console.log('__dirname:', __dirname);
    
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

    // Get file field
    let fileField;
    if (fileType === 'aadhar') {
      fileField = registration.aadharFile;
    } else if (fileType === 'signature') {
      fileField = registration.signatureFile;
    } else {
      return res.status(400).json({ error: 'Invalid file type. Use "aadhar" or "signature"' });
    }

    if (!fileField) {
      return res.status(404).json({ 
        error: `${fileType} file not found for this registration` 
      });
    }

    // Extract filename
    let storedFileName;
    if (typeof fileField === 'object' && fileField !== null && fileField.path) {
      storedFileName = path.basename(fileField.path);
    } else if (typeof fileField === 'string' && fileField.trim() !== '') {
      storedFileName = path.basename(fileField);
    } else {
      return res.status(404).json({ 
        error: `Invalid file data structure for ${fileType}`,
        fileField: fileField,
        fileFieldType: typeof fileField
      });
    }

    console.log('Extracted filename:', storedFileName);

    // 🔍 DETAILED PATH DEBUGGING
    const baseUploadsPath = path.join(__dirname, '..', 'uploads');
    console.log('Base uploads path:', baseUploadsPath);
    console.log('Base uploads exists:', fs.existsSync(baseUploadsPath));

    // List all available files in uploads directory
    const getAllFiles = (dirPath, filesList = []) => {
      try {
        if (!fs.existsSync(dirPath)) return filesList;
        
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            // Recursively get files from subdirectories
            getAllFiles(filePath, filesList);
          } else {
            filesList.push({
              fullPath: filePath,
              relativePath: path.relative(baseUploadsPath, filePath),
              filename: file,
              size: stat.size
            });
          }
        });
      } catch (err) {
        console.error('Error reading directory:', dirPath, err);
      }
      return filesList;
    };

    const allFiles = getAllFiles(baseUploadsPath);
    console.log('All files in uploads directory:', allFiles);

    // Find files with matching filename
    const matchingFiles = allFiles.filter(file => file.filename === storedFileName);
    console.log('Files matching stored filename:', matchingFiles);

    if (matchingFiles.length === 0) {
      return res.status(404).json({
        error: 'File not found anywhere in uploads directory',
        storedFileName: storedFileName,
        fileField: fileField,
        allAvailableFiles: allFiles.map(f => ({ filename: f.filename, path: f.relativePath }))
      });
    }

    // If we found matching files, use the first one (or prioritize by folder)
    let selectedFile = matchingFiles[0];

    // Prioritize files in the correct folder
    const preferredFile = matchingFiles.find(file => 
      file.relativePath.includes(`${fileType}/`) || 
      file.relativePath.startsWith(`${fileType}/`)
    );
    
    if (preferredFile) {
      selectedFile = preferredFile;
      console.log('Using preferred file from correct folder:', selectedFile);
    } else {
      console.log('Using first matching file:', selectedFile);
    }

    const filePath = selectedFile.fullPath;
    console.log('Final selected file path:', filePath);

    // Verify file exists and is readable
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'Selected file path does not exist',
        selectedPath: filePath,
        matchingFiles: matchingFiles
      });
    }

    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({
        error: 'Selected path is not a file',
        selectedPath: filePath
      });
    }

    console.log('✅ File found and verified:', {
      path: filePath,
      size: stats.size,
      isFile: stats.isFile()
    });

    // Determine appropriate filename for download
    const downloadFilename = storedFileName;

    // Set appropriate content type
    const ext = path.extname(downloadFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf': contentType = 'application/pdf'; break;
      case '.jpg':
      case '.jpeg': contentType = 'image/jpeg'; break;
      case '.png': contentType = 'image/png'; break;
    }

    // Set headers and send file
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);

    // Create file stream with error handling
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (streamError) => {
      console.error('❌ File stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });
    
    fileStream.on('end', () => {
      console.log('✅ File download completed successfully');
    });
    
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

/**
 * Get file information without downloading
 * @param {Object} req - Express request object  
 * @param {Object} res - Express response object
 */
const getFileInfo = async (req, res) => {
  try {
    const { id, fileType } = req.params;
    
    if (!id || !fileType) {
      return res.status(400).json({ error: 'Missing id or fileType parameter' });
    }
    
    const registration = await UserForm.findById(id).lean();
    
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    let fileField;
    if (fileType === 'aadhar') {
      fileField = registration.aadharFile;
    } else if (fileType === 'signature') {
      fileField = registration.signatureFile;
    } else {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    if (!fileField) {
      return res.status(404).json({ error: `${fileType} file not found` });
    }

    // Return file information
    const fileInfo = {
      exists: false,
      fileName: null,
      fileSize: null,
      filePath: null,
      fileType: typeof fileField,
      fileData: fileField
    };

    // Check if file exists and get info
    let filePath;
    if (typeof fileField === 'object' && fileField.path) {
      filePath = path.join(__dirname, '..', fileField.path);
      fileInfo.fileName = fileField.originalName || fileField.filename || path.basename(fileField.path);
    } else if (typeof fileField === 'string') {
      filePath = fileField.startsWith('uploads/') 
        ? path.join(__dirname, '..', fileField)
        : path.join(__dirname, '..', 'uploads', fileField);
      fileInfo.fileName = path.basename(fileField);
    }

    if (filePath && fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      fileInfo.exists = true;
      fileInfo.fileSize = stats.size;
      fileInfo.filePath = filePath;
    }

    res.json(fileInfo);

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message
    });
  }
};

// Export the function (add to your existing exports)
module.exports = {
  // ... your existing exports
  downloadFile,
  getFileInfo
};

// 🔥 NEW VIEW FILE FUNCTION
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

    let fileData;
    if (fileType === 'aadhar' && registration.aadharFile) {
      fileData = registration.aadharFile;
    } else if (fileType === 'signature' && registration.signatureFile) {
      fileData = registration.signatureFile;
    } else {
      return res.status(404).json({
        success: false,
        message: `${fileType} file not found`
      });
    }

    // Debug logging
    console.log('🔍 File data:', fileData);
    
    // Try different path constructions
    let filePath;
    
    // Option 1: If path is relative to project root
    filePath = path.join(process.cwd(), fileData.path);
    
    // Option 2: If path is relative to current directory
    // filePath = path.join(__dirname, '..', fileData.path);
    
    // Option 3: If files are in uploads folder
    // filePath = path.join(__dirname, '..', 'uploads', fileData.filename);
    
    console.log('🔍 Constructed file path:', filePath);
    console.log('🔍 File exists:', fs.existsSync(filePath));
    
    if (!fs.existsSync(filePath)) {
      // Try alternative paths
      const alternativePaths = [
        path.join(__dirname, '..', 'uploads', fileData.filename),
        path.join(process.cwd(), 'uploads', fileData.filename),
        path.join(__dirname, '..', fileData.filename),
        fileData.path // If it's already absolute
      ];
      
      let foundPath = null;
      for (const altPath of alternativePaths) {
        console.log('🔍 Trying path:', altPath);
        if (fs.existsSync(altPath)) {
          foundPath = altPath;
          break;
        }
      }
      
      if (!foundPath) {
        return res.status(404).json({
          success: false,
          message: 'File not found on server',
          debug: {
            searchedPath: filePath,
            fileData: fileData
          }
        });
      }
      
      filePath = foundPath;
    }

    const ext = path.extname(fileData.filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(path.resolve(filePath)); // Use absolute path
    
    console.log(`👀 File viewed: ${fileData.originalName} for ${registration.fullName}`);

  } catch (error) {
    console.error('❌ View error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during view',
      error: error.message
    });
  }
};
// Updated module.exports at the end of your formControllers.js file
module.exports = {
  submitForm,
  getAllRegistrations,
  getRegistrationById,
  updateRegistrationStatus,
  getRegistrationStats,
  downloadFile,
  viewFile,
  deleteRegistration  // Added delete function
};
