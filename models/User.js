const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  relationship: { 
    type: String, 
    default: 'Emergency Contact' 
  },
  priority: { 
    type: Number, 
    required: true 
  },
  addedAt: { 
    type: Date, 
    default: Date.now 
  }
});

const userSchema = new mongoose.Schema({
  phone: { 
    type: String, 
    required: true, 
    unique: true
  },
  name: { 
    type: String, 
    default: '' 
  },
  email: { 
    type: String, 
    default: '' 
  },
  otp: { 
    type: String 
  },
  password: {
    type: String,
    required: true
  },
  emergencyContacts: [emergencyContactSchema],
  locationHistory: [{
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  fcmToken: String,
  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Index for better query performance
userSchema.index({ phone: 1 });
userSchema.index({ 'emergencyContacts.addedAt': -1 });

module.exports = mongoose.model('User', userSchema);