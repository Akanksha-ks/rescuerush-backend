// backend/routes/emergency.js
const express = require('express');
const router = express.Router();
const EmergencyAlert = require('../models/EmergencyAlert');
const User = require('../models/User');
const { sendEmergencyEmail } = require('../services/emailService');

// Trigger Emergency - UPDATED WITH EMAIL
router.post('/trigger', async (req, res) => {
  try {
    const { 
      userId, 
      triggerType, 
      location, 
      evidence, 
      deviceInfo, 
      safetyAssessment,
      immediate,
      timestamp,
      ...additionalData 
    } = req.body;

    console.log(`🚨 Emergency trigger received: ${triggerType}`, {
      userId,
      immediate: immediate || false,
      hasSafetyAssessment: !!safetyAssessment,
      hasLocation: !!location
    });

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    // Create emergency alert with all data
    const emergencyAlert = new EmergencyAlert({
      userId,
      triggerType: triggerType || 'manual',
      location: location || {},
      safetyAssessment: safetyAssessment || {},
      deviceInfo: deviceInfo || {},
      immediate: immediate || false,
      threatLevel: await calculateThreatLevel(location, safetyAssessment),
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      ...additionalData
    });

    await emergencyAlert.save();
    console.log(`✅ Emergency alert saved: ${emergencyAlert._id}`);

    // Get user and their contacts
    const user = await User.findById(userId).populate('emergencyContacts');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // ✅ UPDATED: Notify contacts via EMAIL
    const notificationResults = await notifyEmergencyContacts(user, emergencyAlert, location);

    // Log emergency for monitoring
    console.log(`🚨 EMERGENCY ALERT: ${user.name} (${user.phone})`);
    console.log(`📍 Location: ${location?.latitude || 'N/A'}, ${location?.longitude || 'N/A'}`);
    console.log(`📱 Trigger: ${triggerType}`);
    console.log(`⚡ Immediate: ${immediate ? 'YES' : 'NO'}`);
    console.log(`🛡️ Safety Score: ${safetyAssessment?.safety_score || 'N/A'}`);
    console.log(`📧 Email notifications: ${notificationResults.emailSent}/${notificationResults.emailTotal}`);

    res.status(201).json({
      success: true,
      alert: {
        id: emergencyAlert._id,
        triggerType: emergencyAlert.triggerType,
        timestamp: emergencyAlert.timestamp,
        location: emergencyAlert.location,
        status: emergencyAlert.status
      },
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

// UPDATED: Notify emergency contacts via EMAIL
async function notifyEmergencyContacts(user, emergencyAlert, location = null) {
  try {
    const { emergencyContacts } = user;
    
    if (!emergencyContacts || emergencyContacts.length === 0) {
      console.log('📭 No emergency contacts found for user:', user.name);
      return { 
        emailSent: 0, 
        emailTotal: 0, 
        emailFailed: 0
      };
    }

    // ✅ SEND EMAIL NOTIFICATIONS
    const emailResults = await sendEmergencyEmail(user, emergencyAlert, location);

    return {
      emailSent: emailResults.sent,
      emailTotal: emailResults.total,
      emailFailed: emailResults.failed
    };

  } catch (error) {
    console.error('❌ Error in notifyEmergencyContacts:', error);
    return { 
      emailSent: 0, 
      emailTotal: 0, 
      emailFailed: 0
    };
  }
}

// Get Emergency History
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    const alerts = await EmergencyAlert.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('userId', 'name phone');

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
    const { alertId } = req.params;
    
    if (!alertId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Alert ID is required' 
      });
    }

    const alert = await EmergencyAlert.findByIdAndUpdate(
      alertId,
      { 
        status: 'cancelled', 
        cancelledAt: new Date() 
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ 
        success: false, 
        error: 'Alert not found' 
      });
    }

    console.log(`✅ Emergency cancelled: ${alert._id}`);

    res.json({ 
      success: true, 
      alert: {
        id: alert._id,
        status: alert.status,
        cancelledAt: alert.cancelledAt
      },
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
    const { alertId } = req.params;
    
    if (!alertId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Alert ID is required' 
      });
    }

    const alert = await EmergencyAlert.findById(alertId)
      .populate('userId', 'name phone emergencyContacts');

    if (!alert) {
      return res.status(404).json({ 
        success: false, 
        error: 'Alert not found' 
      });
    }

    res.json({ 
      success: true, 
      alert 
    });
  } catch (error) {
    console.error('❌ Get emergency error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Threat level calculation
async function calculateThreatLevel(location, safetyAssessment) {
  try {
    if (safetyAssessment && safetyAssessment.safety_score !== undefined) {
      const safetyScore = safetyAssessment.safety_score;
      const threatLevel = Math.ceil((100 - safetyScore) / 10);
      return Math.min(10, Math.max(1, threatLevel));
    }
    
    const hour = new Date().getHours();
    let threatLevel = 5;
    if (hour >= 20 || hour <= 6) threatLevel += 2;
    
    return Math.min(10, Math.max(1, threatLevel));
  } catch (error) {
    console.error('❌ Threat level calculation error:', error);
    return 5;
  }
}

module.exports = router;