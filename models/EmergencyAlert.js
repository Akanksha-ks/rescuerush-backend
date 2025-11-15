const mongoose = require('mongoose');

const emergencyAlertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  triggerType: { 
    type: String, 
    enum: ['sos', 'shake', 'voice', 'manual', 'auto'],
    required: true 
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number
  },
  // ✅ ADDED: Safety assessment data from threat analyzer
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
  audioEvidence: String,
  photoEvidence: String,
  videoEvidence: String,
  batteryLevel: Number,
  networkInfo: String,
  threatLevel: { type: Number, min: 1, max: 10 },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'resolved', 'cancelled'], default: 'active' },
  responders: [{
    contactId: String,
    notifiedAt: Date,
    responded: { type: Boolean, default: false },
    responseTime: Number
  }],
  policeNotified: { type: Boolean, default: false },
  evidence: [{
    type: String,
    filename: String,
    size: Number,
    mimetype: String,
    uploadedAt: Date
  }],
  immediate: { type: Boolean, default: false }
});

// Add index for faster queries
emergencyAlertSchema.index({ userId: 1, timestamp: -1 });
emergencyAlertSchema.index({ status: 1 });
emergencyAlertSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema);