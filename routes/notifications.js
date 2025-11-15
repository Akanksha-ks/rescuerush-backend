const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

// Send emergency push notifications to contacts
router.post('/emergency', async (req, res) => {
  try {
    const { contacts, title, message, data } = req.body;

    let notificationsSent = 0;
    const messages = [];

    // Create push messages for all contacts with push tokens
    for (const contact of contacts) {
      if (contact.pushToken && Expo.isExpoPushToken(contact.pushToken)) {
        messages.push({
          to: contact.pushToken,
          sound: 'default',
          title,
          body: message,
          data: data,
          priority: 'high'
        });
      }
    }

    // Send push notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        notificationsSent += chunk.length;
      } catch (error) {
        console.error('Error sending push chunk:', error);
      }
    }

    res.json({
      success: true,
      notificationsSent,
      totalContacts: contacts.length,
      tickets
    });

  } catch (error) {
    console.error('Emergency push notification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user's push token
router.post('/push-token', async (req, res) => {
  try {
    const { userId, pushToken } = req.body;

    await User.findByIdAndUpdate(userId, {
      fcmToken: pushToken,
      updatedAt: new Date()
    });

    res.json({ success: true, message: 'Push token updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;