const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Update User Location
router.post('/update', async (req, res) => {
  try {
    const { userId, latitude, longitude, accuracy } = req.body;

    const user = await User.findById(userId);
    
    // Add to location history
    user.locationHistory.push({
      latitude,
      longitude,
      accuracy,
      timestamp: new Date()
    });

    if (user.locationHistory.length > 100) {
      user.locationHistory = user.locationHistory.slice(-100);
    }

    await user.save();

    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Safe Routes
router.post('/safe-routes', async (req, res) => {
  try {
    const { startLocation, endLocation, preferences } = req.body;

    // In production, integrate with Google Maps Directions API
    const safeRoutes = calculateSafeRoutes(startLocation, endLocation, preferences);

    res.json({ success: true, routes: safeRoutes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to calculate safe routes
function calculateSafeRoutes(start, end, preferences) {
  return [
    {
      id: '1',
      name: 'Safest Route',
      coordinates: [
        start,
        { latitude: (start.latitude + end.latitude) / 2, longitude: (start.longitude + end.longitude) / 2 },
        end
      ],
      duration: '15 min',
      distance: '2.3 km',
      safetyScore: 95,
      features: ['Well-lit', 'Populated areas', 'Security cameras']
    },
    {
      id: '2', 
      name: 'Fastest Route',
      coordinates: [start, end],
      duration: '12 min',
      distance: '2.1 km', 
      safetyScore: 80,
      features: ['Direct route', 'Mixed areas']
    }
  ];
}

module.exports = router;