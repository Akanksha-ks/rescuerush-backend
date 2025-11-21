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

    // Generate realistic safe routes with enhanced safe zones
    const safeRoutes = calculateSafeRoutes(startLocation, endLocation, preferences);

    res.json({ success: true, routes: safeRoutes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to calculate safe routes with enhanced safe zones
function calculateSafeRoutes(start, end, preferences) {
  // Generate intermediate points for more realistic routes
  const mid1 = {
    latitude: start.latitude + (end.latitude - start.latitude) * 0.3,
    longitude: start.longitude + (end.longitude - start.longitude) * 0.3
  };
  
  const mid2 = {
    latitude: start.latitude + (end.latitude - start.latitude) * 0.7,
    longitude: start.longitude + (end.longitude - start.longitude) * 0.7
  };

  // Generate safe zones along the routes
  const safeZonesRoute1 = generateSafeZonesForRoute([start, mid1, mid2, end], 'route1');
  const safeZonesRoute2 = generateSafeZonesForRoute([start, end], 'route2');

  // Generate crime hotspots
  const crimeHotspotsRoute1 = generateCrimeHotspots([start, mid1, mid2, end], 'route1');
  const crimeHotspotsRoute2 = generateCrimeHotspots([start, end], 'route2');

  return [
    {
      id: '1',
      name: 'Premium Safe Route',
      coordinates: [start, mid1, mid2, end],
      duration: '18 min',
      distance: '3.2 km',
      safetyScore: 92,
      features: ['Well-lit areas', 'Police patrols', 'Multiple safe zones', 'Commercial areas'],
      warnings: ['Moderate traffic during peak hours'],
      crimeHotspots: crimeHotspotsRoute1,
      safeZones: safeZonesRoute1
    },
    {
      id: '2', 
      name: 'Balanced Route',
      coordinates: [start, end],
      duration: '12 min',
      distance: '2.1 km', 
      safetyScore: 78,
      features: ['Mixed residential-commercial', 'Good lighting', 'Public transport access'],
      warnings: ['Few isolated areas after 10 PM'],
      crimeHotspots: crimeHotspotsRoute2,
      safeZones: safeZonesRoute2
    }
  ];
}

// Generate realistic safe zones along a route
function generateSafeZonesForRoute(coordinates, routeId) {
  const safeZones = [];
  const safeZoneTypes = [
    'police_station', 'hospital', 'fire_station', 'security_office', 
    'public_place', 'metro_station'
  ];
  
  const zoneNames = {
    police_station: [
      'Central Police Station', 'MG Road Police Outpost', 'Commercial Street Police Booth',
      'Traffic Police Station', 'Women Police Station', 'Cubbon Park Police Station',
      'Ashok Nagar Police Station', 'Koramangala Police Station', 'Indiranagar Police Station',
      'Jayanagar Police Station', 'Hebbal Police Station', 'HSR Layout Police Station',
      'Whitefield Police Station', 'HAL Police Station', 'Vijayanagar Police Station',
      'Majestic Police Station', 'Shivajinagar Police Station', 'KR Market Police Station',
      'Mico Layout Police Station', 'BTM Layout Police Station', 'Basavanagudi Police Station',
      'Banashankari Police Station', 'Rajajinagar Police Station', 'Yelahanka Police Station',
      'Kengeri Police Station', 'Malleshwaram Police Station', 'Subramanyanagar Police Station',
      'Basaveshwaranagar Police Station', 'Magadi Road Police Station', 'Peenya Police Station',
      'Ramanagara Police Station', 'Electronic City Police Station', 'Marathahalli Police Station',
      'KR Puram Police Station', 'KG Halli Police Station', 'RT Nagar Police Station',
      'Vijayanagar Police Station', 'Byappanahalli Police Station'
    ],
    hospital: [
      'Apollo Hospital', 'Manipal Hospital', 'Fortis Hospital', 'Narayana Health',
      'Emergency Medical Center', '24/7 Trauma Care', 'Columbia Asia Hospital',
      'Aster CMI Hospital', 'St. John\'s Medical College Hospital', 'Sakra World Hospital',
      'Cloudnine Hospital', 'BGS Global Hospital', 'Vydehi Hospital', 'Rainbow Children\'s Hospital',
      'Sparsh Hospital'
    ],
    fire_station: [
      'Central Fire Station', 'Emergency Fire Services', 'Fire & Rescue Station',
      'Mahadevapura Fire Station', 'Whitefield Fire Station', 'Jayanagar Fire Station',
      'Rajajinagar Fire Station', 'Yeshwanthpur Fire Station', 'Indiranagar Fire Station',
      'Koramangala Fire Station'
    ],
    security_office: [
      'Private Security Office', 'Mall Security', 'Corporate Security', 'Building Security',
      'IT Park Security Office', 'Tech Park Control Room', 'Campus Security Office',
      'Apartment Security Desk', 'Public Safety Office'
    ],
    public_place: [
      'Cubbon Park', 'MG Road Boulevard', 'Commercial Street', 'Brigade Road',
      'Shopping Complex', 'Public Garden', 'Lalbagh Botanical Garden', 'UB City',
      'Orion Mall', 'Forum Mall', 'Jayanagar Shopping Complex', 'Indiranagar 100 Feet Road',
      'Whitefield Park', 'JP Nagar Mini Forest'
    ],
    metro_station: [
      'MG Road Metro', 'Trinity Metro', 'Indiranagar Metro', 'Commercial Street Metro',
      'Majestic Metro Station', 'Cubbon Park Metro Station', 'Lalbagh Metro Station',
      'Jayanagar Metro Station', 'Yeshwanthpur Metro Station', 'Peenya Metro Station',
      'Banashankari Metro Station', 'Whitefield Metro Station', 'South End Circle Metro Station',
      'Rashtreeya Vidyalaya Road Metro Station', 'Yelachenahalli Metro Station',
      'Konanakunte Cross Metro Station', 'Nayandahalli Metro Station', 'Vijayanagar Metro Station',
      'Attiguppe Metro Station', 'Deepanjali Nagar Metro Station', 'Hosahalli Metro Station',
      'Magadi Road Metro Station', 'Kuvempu Road Metro Station', 'Rajajinagar Metro Station',
      'Mahalakshmi Metro Station', 'Sandal Soap Factory Metro Station', 'Goreguntepalya Metro Station',
      'Jalahalli Metro Station', 'Dasarahalli Metro Station', 'Hebbal Metro Station',
      'Sarjapur Metro Station', 'Silk Board Metro Station', 'Bommasandra Metro Station',
      'Hosur Road Metro Station', 'Electronic City Metro Station', 'Begur Metro Station',
      'Kadugodi Metro Station', 'Hopefarm Metro Station'
    ]
  };

  // Generate 8-12 safe zones per route for better coverage
  const zoneCount = 8 + Math.floor(Math.random() * 5);
  
  for (let i = 0; i < zoneCount; i++) {
    const zoneType = safeZoneTypes[Math.floor(Math.random() * safeZoneTypes.length)];
    const names = zoneNames[zoneType];
    const zoneName = names[Math.floor(Math.random() * names.length)];
    
    // Place safe zones near route coordinates
    const baseCoord = coordinates[Math.floor(Math.random() * coordinates.length)];
    
    safeZones.push({
      id: `${routeId}_safezone_${i}`,
      latitude: baseCoord.latitude + (Math.random() - 0.5) * 0.005,
      longitude: baseCoord.longitude + (Math.random() - 0.5) * 0.005,
      type: zoneType,
      name: zoneName,
      radius: 150 + Math.random() * 100,
      contact: generateContact(zoneType),
      area: getAreaName(baseCoord)
    });
  }

  return safeZones;
}

// Generate crime hotspots
function generateCrimeHotspots(coordinates, routeId) {
  const hotspots = [];
  const crimeTypes = ['Theft', 'Harassment', 'Robbery', 'Chain Snatching', 'Eve Teasing'];
  const riskLevels = ['low', 'medium', 'high'];
  
  // Generate 2-4 crime hotspots per route
  const hotspotCount = 2 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < hotspotCount; i++) {
    const baseCoord = coordinates[Math.floor(Math.random() * coordinates.length)];
    const crimeType = crimeTypes[Math.floor(Math.random() * crimeTypes.length)];
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    
    hotspots.push({
      id: `${routeId}_hotspot_${i}`,
      latitude: baseCoord.latitude + (Math.random() - 0.5) * 0.003,
      longitude: baseCoord.longitude + (Math.random() - 0.5) * 0.003,
      crimeType: crimeType,
      riskLevel: riskLevel,
      radius: 100 + Math.random() * 150,
      reportedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      description: `${crimeType} reported in this area`,
      frequency: Math.floor(Math.random() * 10) + 1,
      area: getAreaName(baseCoord)
    });
  }

  return hotspots;
}

// Helper function to generate contact information
function generateContact(zoneType) {
  const contacts = {
    police_station: '+91-80-2294-2233',
    hospital: '+91-80-2620-4040',
    fire_station: '101',
    security_office: '+91-80-4123-4567',
    public_place: 'N/A',
    metro_station: '+91-80-2296-3232'
  };
  return contacts[zoneType] || 'N/A';
}

// Helper function to get area name based on coordinates (mock implementation)
function getAreaName(coord) {
  const areas = [
    'MG Road', 'Commercial Street', 'Brigade Road', 'Indiranagar', 
    'Koramangala', 'Whitefield', 'Electronic City', 'Jayanagar',
    'Majestic', 'Shivajinagar', 'Basavanagudi', 'Banashankari',
    'Rajajinagar', 'Marathahalli', 'HSR Layout', 'BTM Layout'
  ];
  return areas[Math.floor(Math.random() * areas.length)];
}

module.exports = router;