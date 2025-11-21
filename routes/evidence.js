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
    fileSize: 10 * 1024 * 1024, // 10MB limit for photos/audio
  },
  fileFilter: (req, file, cb) => {
    // Check file types - removed video
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and audio are allowed.'));
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

    // Create evidence object with proper structure
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

// Get evidence for an emergency
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

// Delete specific evidence
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
  return 'file';
}

function getEvidenceDescription(type, mimetype) {
  const descriptions = {
    photo: 'Emergency photo evidence',
    audio: 'Emergency audio recording', 
    file: 'Emergency evidence file'
  };
  return descriptions[type] || 'Emergency evidence';
}

module.exports = router;