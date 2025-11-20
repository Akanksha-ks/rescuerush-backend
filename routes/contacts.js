// routes/contacts.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get Emergency Contacts
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    res.json({ success: true, contacts: user.emergencyContacts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add Emergency Contact
router.post('/:userId', async (req, res) => {
  try {
    const { name, phone, email, relationship } = req.body;
    
    const user = await User.findById(req.params.userId);
    
    user.emergencyContacts.push({
      name,
      phone,
      email: email || '', // Added email field
      relationship,
      priority: user.emergencyContacts.length + 1,
      addedAt: new Date()
    });

    await user.save();
    
    res.json({ 
      success: true, 
      contact: user.emergencyContacts[user.emergencyContacts.length - 1] 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove Emergency Contact
router.delete('/:userId/:contactId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    user.emergencyContacts = user.emergencyContacts.filter(
      contact => contact._id.toString() !== req.params.contactId
    );

    await user.save();
    
    res.json({ success: true, message: 'Contact removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;