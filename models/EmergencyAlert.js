const mongoose = require('mongoose');

// ✅ PROPER evidence schema definition
const evidenceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['photo', 'audio', 'video'],
    required: true
  },
  filename: String,
  url: String,
  thumbnailUrl: String,
  duration: Number,
  size: Number,
  mimetype: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  description: String
});

const emergencyAlertSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  triggerType: { 
    type: String, 
    enum: ['sos', 'shake', 'voice', 'manual', 'auto'],
    required: true 
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number,
    timestamp: Date
  },
  // ✅ UPDATED: Safety assessment data from threat analyzer
  safetyAssessment: {
    safety_score: Number,
    risk_level: String,
    recommendations: [String],
    factors: {
      timeOfDay: Number,
      dayOfWeek: Number,
      historicalRisk: Number
    }
  },
  deviceInfo: {
    batteryLevel: Number,
    networkType: String,
    isConnected: Boolean,
    isInternetReachable: Boolean
  },
  // ❌ REMOVED: Duplicate individual evidence fields
  // audioEvidence: String,  // REMOVE THIS
  // photoEvidence: String,  // REMOVE THIS  
  // videoEvidence: String,  // REMOVE THIS
  
  // ✅ KEEP: Unified evidence array with proper schema
  evidence: [evidenceSchema],
  
  threatLevel: { type: Number, min: 1, max: 10 },
  timestamp: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['active', 'resolved', 'cancelled'], 
    default: 'active' 
  },
  responders: [{
    contactId: String,
    notifiedAt: Date,
    responded: { type: Boolean, default: false },
    responseTime: Number
  }],
  policeNotified: { type: Boolean, default: false },
  immediate: { type: Boolean, default: false },
  
  // ❌ REMOVED: Duplicate evidence array (you had two!)
  // evidence: [{  // REMOVE THIS DUPLICATE
  //   type: String,
  //   filename: String,
  //   size: Number,
  //   mimetype: String,
  //   uploadedAt: Date
  // }],
}, {
  timestamps: true // ✅ Adds createdAt and updatedAt automatically
});

// Add index for faster queries
emergencyAlertSchema.index({ userId: 1, timestamp: -1 });
emergencyAlertSchema.index({ status: 1 });
emergencyAlertSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema);