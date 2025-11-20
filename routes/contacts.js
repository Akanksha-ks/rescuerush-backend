const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get Emergency Contacts
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('emergencyContacts');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Sort contacts by priority
    const sortedContacts = user.emergencyContacts.sort((a, b) => a.priority - b.priority);
    
    res.json({ 
      success: true, 
      contacts: sortedContacts 
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load contacts' 
    });
  }
});

// Add Emergency Contact
router.post('/:userId', async (req, res) => {
  try {
    const { name, phone, email, relationship } = req.body;
    
    if (!name || !phone || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name, phone, and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if contact with same phone already exists
    const existingContactByPhone = user.emergencyContacts.find(
      contact => contact.phone === phone
    );

    if (existingContactByPhone) {
      return res.status(400).json({
        success: false,
        error: 'Contact with this phone number already exists'
      });
    }

    // Check if contact with same email already exists
    const existingContactByEmail = user.emergencyContacts.find(
      contact => contact.email === email
    );

    if (existingContactByEmail) {
      return res.status(400).json({
        success: false,
        error: 'Contact with this email address already exists'
      });
    }

    const newContact = {
      name,
      phone,
      email,
      relationship: relationship || 'Emergency Contact',
      priority: user.emergencyContacts.length + 1,
      addedAt: new Date()
    };

    user.emergencyContacts.push(newContact);
    await user.save();

    // Get the newly added contact with its _id
    const addedContact = user.emergencyContacts[user.emergencyContacts.length - 1];
    
    res.json({ 
      success: true, 
      contact: addedContact,
      message: 'Contact added successfully'
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add contact' 
    });
  }
});

// Remove Emergency Contact
router.delete('/:userId/:contactId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const contactIndex = user.emergencyContacts.findIndex(
      contact => contact._id.toString() === req.params.contactId
    );

    if (contactIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    user.emergencyContacts.splice(contactIndex, 1);
    
    // Recalculate priorities
    user.emergencyContacts.forEach((contact, index) => {
      contact.priority = index + 1;
    });

    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Contact removed successfully' 
    });
  } catch (error) {
    console.error('Remove contact error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove contact' 
    });
  }
});

// Update Emergency Contact
router.put('/:userId/:contactId', async (req, res) => {
  try {
    const { name, phone, email, relationship } = req.body;
    
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid email address'
        });
      }
    }

    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const contact = user.emergencyContacts.id(req.params.contactId);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    // Update contact fields
    if (name) contact.name = name;
    if (phone) contact.phone = phone;
    if (email) contact.email = email;
    if (relationship) contact.relationship = relationship;

    await user.save();
    
    res.json({ 
      success: true, 
      contact: contact,
      message: 'Contact updated successfully'
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update contact' 
    });
  }
});

module.exports = router;