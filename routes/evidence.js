const express = require('express');
const router = express.Router();
const EmergencyAlert = require('../models/EmergencyAlert');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload Evidence
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { emergencyId, type } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    const alert = await EmergencyAlert.findById(emergencyId);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Emergency not found' });
    }

    // In production, upload to cloud storage (AWS S3, etc.)
    // For demo, we'll just store file info
    alert.evidence.push({
      type,
      filename: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date()
    });

    await alert.save();

    res.json({ 
      success: true, 
      message: 'Evidence uploaded successfully',
      evidence: alert.evidence[alert.evidence.length - 1]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;