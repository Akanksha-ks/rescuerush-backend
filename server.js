const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/location', require('./routes/location'));
// Add this to your existing server.js routes
app.use('/api/notifications', require('./routes/notifications'));

// Health check with DB status
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  
  res.json({ 
    status: 'OK', 
    message: 'WomenRescueRush Backend is running',
    database: dbStatus,
    database_type: 'MongoDB Local',
    timestamp: new Date().toISOString()
  });
});

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('location-update', (data) => {
    socket.broadcast.emit('location-broadcast', data);
  });
  
  socket.on('emergency-alert', (data) => {
    socket.broadcast.emit('new-emergency', data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

// 🔧 MongoDB Connection (remove deprecated options)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rescuerush';

// Connect to MongoDB first, then start server
mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB Connected Successfully');
  console.log('💾 Database: Local MongoDB');
  console.log(`📁 Database Name: rescuerush`);
  
  // Now start the server after DB is connected
  server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 WomenRescueRush Backend Server Started');
    console.log('═'.repeat(50));
    console.log(`📍 Local Access: http://localhost:${PORT}/health`);
    console.log(`📍 Network Access: http://172.26.44.248:${PORT}/health`);
    console.log('═'.repeat(50));
    console.log('🗄️  Database Status:');
    console.log(`   💾 Type: MongoDB Local`);
    console.log(`   🔗 Status: ✅ Connected`);
    console.log(`   📁 Database: rescuerush`);
    console.log('═'.repeat(50));
  });
})
.catch((error) => {
  console.error('❌ MongoDB Connection Error:', error);
  console.log('💡 Make sure MongoDB is running:');
  console.log('   Windows: net start MongoDB');
  console.log('   Mac: brew services start mongodb-community');
  console.log('   Or check MongoDB Compass connection');
  process.exit(1); // Exit if DB connection fails
});