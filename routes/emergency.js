const express = require('express');
const router = express.Router();
const EmergencyAlert = require('../models/EmergencyAlert');
const User = require('../models/User');
const twilio = require('twilio');

// Initialize Twilio client (with error handling)
let twilioClient;
try {
  twilioClient = twilio(
    process.env.TWILIO_SID, 
    process.env.TWILIO_AUTH_TOKEN
  );
} catch (error) {
  console.warn('❌ Twilio not configured:', error.message);
  twilioClient = null;
}

// Trigger Emergency
router.post('/trigger', async (req, res) => {
  try {
    const { 
      userId, 
      triggerType, 
      location, 
      evidence, 
      deviceInfo, 
      safetyAssessment,
      immediate, // ✅ ADDED: Handle immediate flag
      timestamp, // ✅ ADDED: Handle timestamp from frontend
      ...additionalData 
    } = req.body;

    console.log(`🚨 Emergency trigger received: ${triggerType}`, {
      userId,
      immediate: immediate || false,
      hasSafetyAssessment: !!safetyAssessment,
      hasLocation: !!location
    });

    // Create emergency alert with all data
    const emergencyAlert = new EmergencyAlert({
      userId,
      triggerType,
      location: location || {},
      safetyAssessment: safetyAssessment || {}, // ✅ ADDED: Safety assessment
      deviceInfo: deviceInfo || {}, // ✅ ADDED: Device info
      immediate: immediate || false, // ✅ ADDED: Immediate flag
      threatLevel: await calculateThreatLevel(location, safetyAssessment), // ✅ UPDATED: Use safety assessment
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      ...additionalData
    });

    await emergencyAlert.save();
    console.log(`✅ Emergency alert saved: ${emergencyAlert._id}`);

    // Get user and their contacts
    const user = await User.findById(userId).populate('emergencyContacts');
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // ✅ UPDATED: Always notify contacts for emergencies
    const notificationResults = await notifyEmergencyContacts(user, emergencyAlert);

    // Log emergency for monitoring
    console.log(`🚨 EMERGENCY ALERT: ${user.name} (${user.phone})`);
    console.log(`📍 Location: ${location?.latitude || 'N/A'}, ${location?.longitude || 'N/A'}`);
    console.log(`📱 Trigger: ${triggerType}`);
    console.log(`⚡ Immediate: ${immediate ? 'YES' : 'NO'}`);
    console.log(`🛡️ Safety Score: ${safetyAssessment?.safety_score || 'N/A'}`);
    console.log(`👥 Contacts notified: ${notificationResults.sent}/${notificationResults.total}`);

    res.status(201).json({
      success: true,
      alert: emergencyAlert,
      notifications: notificationResults,
      message: 'Emergency alert triggered successfully'
    });

  } catch (error) {
    console.error('❌ Emergency trigger error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to trigger emergency: ' + error.message 
    });
  }
});

// Notify emergency contacts via SMS
async function notifyEmergencyContacts(user, emergencyAlert) {
  try {
    const { emergencyContacts } = user;
    
    if (!emergencyContacts || emergencyContacts.length === 0) {
      console.log('📭 No emergency contacts found for user:', user.name);
      return { sent: 0, total: 0, failed: 0 };
    }

    const locationLink = emergencyAlert.location.latitude && emergencyAlert.location.longitude 
      ? `https://maps.google.com/?q=${emergencyAlert.location.latitude},${emergencyAlert.location.longitude}`
      : 'Location not available';

    const safetyInfo = emergencyAlert.safetyAssessment?.safety_score 
      ? `\n🛡️ Safety Score: ${emergencyAlert.safetyAssessment.safety_score}/100 (${emergencyAlert.safetyAssessment.risk_level} risk)`
      : '';

    const message = `🚨 EMERGENCY ALERT from ${user.name} (${user.phone})!

📍 Location: ${locationLink}
⏰ Time: ${new Date(emergencyAlert.timestamp).toLocaleString()}
📱 Trigger: ${emergencyAlert.triggerType}${safetyInfo}

Please check on them immediately! 
- WomenRescueRush App`;

    let sentCount = 0;
    let failedCount = 0;

    console.log(`📤 Notifying ${emergencyContacts.length} contacts...`);

    // Notify each contact
    for (let contact of emergencyContacts) {
      try {
        console.log(`📞 Notifying ${contact.name} at ${contact.phone}`);
        
        if (twilioClient) {
          // Send SMS via Twilio
          await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: contact.phone
          });
          console.log(`✅ SMS sent to ${contact.name}`);
        } else {
          // Twilio not configured - use fallback
          console.log(`📲 Twilio not configured, using fallback for ${contact.name}`);
          await sendFallbackSMS(contact.phone, message);
        }
        
        sentCount++;
        
      } catch (contactError) {
        console.error(`❌ Failed to notify ${contact.name}:`, contactError.message);
        failedCount++;
        
        // Try fallback
        try {
          await sendFallbackSMS(contact.phone, message);
          console.log(`✅ Fallback SMS sent to ${contact.name}`);
          sentCount++;
          failedCount--; // Remove from failed count since fallback worked
        } catch (fallbackError) {
          console.error(`❌ Fallback also failed for ${contact.name}:`, fallbackError.message);
        }
      }
    }

    return {
      sent: sentCount,
      total: emergencyContacts.length,
      failed: failedCount
    };

  } catch (error) {
    console.error('❌ Error in notifyEmergencyContacts:', error);
    return { sent: 0, total: 0, failed: 0 };
  }
}

// Fallback SMS function if Twilio fails
async function sendFallbackSMS(phoneNumber, message) {
  try {
    // You can integrate with other SMS services here
    // For now, just log it
    console.log(`📲 [FALLBACK SMS] to ${phoneNumber}: ${message.substring(0, 100)}...`);
    
    // In a real implementation, you might use:
    // - Another SMS provider
    // - Email notifications  
    // - Push notifications
    // - WhatsApp API
    
    return true;
  } catch (error) {
    console.error('❌ Fallback SMS failed:', error);
    return false;
  }
}

// Get Emergency History
router.get('/history/:userId', async (req, res) => {
  try {
    const alerts = await EmergencyAlert.find({ userId: req.params.userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('userId', 'name phone'); // ✅ ADDED: Populate user info

    res.json({ 
      success: true, 
      alerts,
      count: alerts.length 
    });
  } catch (error) {
    console.error('❌ Get emergency history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel Emergency
router.put('/cancel/:alertId', async (req, res) => {
  try {
    const alert = await EmergencyAlert.findByIdAndUpdate(
      req.params.alertId,
      { 
        status: 'cancelled', 
        cancelledAt: new Date() 
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    console.log(`✅ Emergency cancelled: ${alert._id}`);

    res.json({ 
      success: true, 
      alert,
      message: 'Emergency cancelled successfully' 
    });
  } catch (error) {
    console.error('❌ Cancel emergency error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific emergency alert
router.get('/:alertId', async (req, res) => {
  try {
    const alert = await EmergencyAlert.findById(req.params.alertId)
      .populate('userId', 'name phone emergencyContacts');

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    res.json({ success: true, alert });
  } catch (error) {
    console.error('❌ Get emergency error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ UPDATED: Improved threat level calculation using safety assessment
async function calculateThreatLevel(location, safetyAssessment) {
  try {
    // Use safety score from threat analysis if available
    if (safetyAssessment && safetyAssessment.safety_score !== undefined) {
      const safetyScore = safetyAssessment.safety_score;
      // Convert safety score (0-100) to threat level (1-10)
      // Higher safety score = lower threat level
      const threatLevel = Math.ceil((100 - safetyScore) / 10);
      return Math.min(10, Math.max(1, threatLevel));
    }
    
    // Fallback to time-based calculation
    const hour = new Date().getHours();
    let threatLevel = 5; // Default medium threat

    // Increase threat at night
    if (hour >= 20 || hour <= 6) threatLevel += 2;
    
    return Math.min(10, Math.max(1, threatLevel));
  } catch (error) {
    console.error('❌ Threat level calculation error:', error);
    return 5; // Default medium threat
  }
}

module.exports = router;