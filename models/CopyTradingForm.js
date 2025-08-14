// models/CopyTradingForm.js
const mongoose = require('mongoose');

const copyTradingApplicationSchema = new mongoose.Schema({
  // Personal Details
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
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function(value) {
        const age = Math.floor((Date.now() - value.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 18 && age <= 100;
      },
      message: 'Age must be between 18 and 100 years'
    }
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    minlength: [10, 'Address must be at least 10 characters'],
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    minlength: [2, 'City must be at least 2 characters'],
    maxlength: [50, 'City cannot exceed 50 characters']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    minlength: [2, 'State must be at least 2 characters'],
    maxlength: [50, 'State cannot exceed 50 characters']
  },
  pincode: {
    type: String,
    required: [true, 'PIN code is required'],
    match: [/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit PIN code']
  },
  
  // Investment Details
  investmentAmount: {
    type: Number,
    required: [true, 'Investment amount is required'],
    min: [10000, 'Minimum investment amount is ₹10,000'],
    max: [10000000, 'Maximum investment amount is ₹1,00,00,000']
  },
  investmentGoals: {
    type: String,
    required: [true, 'Investment goals are required'],
    trim: true,
    minlength: [20, 'Investment goals must be at least 20 characters'],
    maxlength: [500, 'Investment goals cannot exceed 500 characters']
  },
  
  // Document Details
  aadharNumber: {
    type: String,
    required: [true, 'Aadhar number is required'],
    unique: true,
    match: [/^[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}$/, 'Please enter a valid 12-digit Aadhar number']
  },
  
  // File Information
  aadharFile: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  },
  signatureFile: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  },
  
  // Application Status
  status: {
    type: String,
    enum: ['pending_review', 'under_review', 'approved', 'rejected', 'documents_required'],
    default: 'pending_review'
  },
  
  // Agreement Flags
   termsAccepted: {
    type: Boolean,
    required: [true, 'Terms and conditions must be accepted'],
    validate: {
      validator: function(value) {
        return value === true;
      },
      message: 'Terms and conditions must be accepted'
    }
  },
  
  // Admin Notes
  adminNotes: {
    type: String,
    maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewedAt: Date,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
copyTradingApplicationSchema.index({ email: 1 });
copyTradingApplicationSchema.index({ aadharNumber: 1 });
copyTradingApplicationSchema.index({ status: 1 });
copyTradingApplicationSchema.index({ createdAt: -1 });

// Virtual for full name
copyTradingApplicationSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
copyTradingApplicationSchema.virtual('age').get(function() {
  if (this.dateOfBirth) {
    return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }
  return null;
});

module.exports = mongoose.model('CopyTradingApplication', copyTradingApplicationSchema);