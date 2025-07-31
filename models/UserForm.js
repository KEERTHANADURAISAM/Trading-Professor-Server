const mongoose = require('mongoose');

const userFormSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters'],
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters'],
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    unique: true,
    match: [/.+@.+\..+/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Phone number must be 10 digits starting with 6-9']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function (value) {
        const today = new Date();
        const age = today.getFullYear() - value.getFullYear();
        return value < today && age >= 16 && age <= 100;
      },
      message: 'Age must be between 16 and 100 years'
    }
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    minlength: [5, 'Address must be at least 5 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required']
  },
  state: {
    type: String,
    required: [true, 'State is required']
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    match: [/^\d{6}$/, 'Pincode must be 6 digits']
  },
  aadharNumber: {
    type: String,
    required: [true, 'Aadhar number is required'],
    unique: true,
    validate: {
      validator: function (v) {
        return /^\d{12}$/.test(v.replace(/\D/g, ''));
      },
      message: 'Aadhar number must contain exactly 12 digits'
    },
    set: v => v.replace(/\D/g, '')
  },
  
  // 🔥 ENHANCED FILE STORAGE STRUCTURE
  aadharFile: {
    originalName: {
      type: String,
      required: [true, 'Aadhar file original name is required']
    },
    filename: {
      type: String,
      required: [true, 'Aadhar file name is required']
    },
    path: {
      type: String,
      required: [true, 'Aadhar file path is required']
    },
    size: {
      type: Number,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  
  signatureFile: {
    originalName: {
      type: String,
      required: [true, 'Signature file original name is required']
    },
    filename: {
      type: String,
      required: [true, 'Signature file name is required']
    },
    path: {
      type: String,
      required: [true, 'Signature file path is required']
    },
    size: {
      type: Number,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  },
  
  agreeTerms: {
    type: Boolean,
    required: [true, 'You must agree to the terms'],
    validate: {
      validator: function (v) {
        return v === true;
      },
      message: 'You must accept the terms and conditions'
    }
  },
  agreeMarketing: {
    type: Boolean,
    default: false
  },
  courseName: {
    type: String,
    required: [true, 'Course name is required']
  },
  
  // 🔥 ADDITIONAL FIELDS FOR ENHANCED FUNCTIONALITY
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under-review', 'contacted'],
    default: 'pending'
  },
  remarks: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 🔥 INDEXES FOR BETTER PERFORMANCE
userFormSchema.index({ email: 1 });
userFormSchema.index({ phone: 1 });
userFormSchema.index({ aadharNumber: 1 });
userFormSchema.index({ status: 1 });
userFormSchema.index({ courseName: 1 });
userFormSchema.index({ createdAt: -1 });

// 🔥 VIRTUAL FOR FULL NAME
userFormSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// 🔥 METHOD TO GET FILE URLS
userFormSchema.methods.getFileUrls = function() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return {
    aadharUrl: this.aadharFile ? `${baseUrl}/${this.aadharFile.path}` : null,
    signatureUrl: this.signatureFile ? `${baseUrl}/${this.signatureFile.path}` : null
  };
};

module.exports = mongoose.model('UserForm', userFormSchema);