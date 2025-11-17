const express = require('express');
const router = express.Router();
const EmergencyAlert = require('../models/EmergencyAlert');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    // Check file types
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, audio, and video are allowed.'));
    }
  }
});

// Upload Evidence
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { emergencyId, type } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    if (!emergencyId) {
      return res.status(400).json({ success: false, error: 'Emergency ID required' });
    }

    const alert = await EmergencyAlert.findById(emergencyId);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Emergency not found' });
    }

    // ✅ UPDATED: Create evidence object with proper structure
    const evidence = {
      type: type || getFileType(file.mimetype),
      filename: file.originalname,
      // In production, you would upload to cloud storage (AWS S3, Google Cloud Storage, etc.)
      // For now, we'll store the file in memory (in production, use cloud storage)
      url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date(),
      description: getEvidenceDescription(type, file.mimetype)
    };

    // Add evidence to emergency alert
    alert.evidence.push(evidence);
    await alert.save();

    console.log(`✅ Evidence uploaded for emergency ${emergencyId}:`, {
      type: evidence.type,
      size: evidence.size,
      mimetype: evidence.mimetype
    });

    res.json({ 
      success: true, 
      message: 'Evidence uploaded successfully',
      evidence: evidence
    });
  } catch (error) {
    console.error('Evidence upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ UPDATED: Get evidence for an emergency
router.get('/:emergencyId', async (req, res) => {
  try {
    const alert = await EmergencyAlert.findById(req.params.emergencyId)
      .select('evidence userId triggerType timestamp location');
    
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Emergency not found' });
    }

    res.json({
      success: true,
      evidence: alert.evidence,
      emergencyInfo: {
        id: alert._id,
        userId: alert.userId,
        triggerType: alert.triggerType,
        timestamp: alert.timestamp,
        location: alert.location
      }
    });
  } catch (error) {
    console.error('Get evidence error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ UPDATED: Delete specific evidence
router.delete('/:emergencyId/:evidenceId', async (req, res) => {
  try {
    const { emergencyId, evidenceId } = req.params;

    const alert = await EmergencyAlert.findById(emergencyId);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Emergency not found' });
    }

    // Remove evidence from array
    alert.evidence = alert.evidence.filter(evidence => 
      evidence._id.toString() !== evidenceId
    );

    await alert.save();

    res.json({
      success: true,
      message: 'Evidence deleted successfully'
    });
  } catch (error) {
    console.error('Delete evidence error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper functions
function getFileType(mimetype) {
  if (mimetype.startsWith('image/')) return 'photo';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('video/')) return 'video';
  return 'file';
}

function getEvidenceDescription(type, mimetype) {
  const descriptions = {
    photo: 'Emergency photo evidence',
    audio: 'Emergency audio recording', 
    video: 'Emergency video recording',
    file: 'Emergency evidence file'
  };
  return descriptions[type] || 'Emergency evidence';
}

module.exports = router;