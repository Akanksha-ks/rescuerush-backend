const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

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
app.use('/api/notifications', require('./routes/notifications'));

// Debug endpoint to see all environment variables
app.get('/debug', (req, res) => {
  res.json({
    MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    allEnvVars: process.env
  });
});

// Health check
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  const isAtlas = process.env.MONGODB_URI && process.env.MONGODB_URI.includes('mongodb+srv');
  
  res.json({ 
    status: 'OK', 
    database: dbStatus,
    database_type: isAtlas ? 'MongoDB Atlas' : 'Local MongoDB',
    mongodb_uri_set: !!process.env.MONGODB_URI,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Socket.io
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

// 🔧 DEBUG: Check what's happening
console.log('=== RAILWAY DEBUG INFORMATION ===');
console.log('Process environment keys:', Object.keys(process.env));
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Use Railway environment variable if set, otherwise exit
if (!process.env.MONGODB_URI) {
  console.error('❌ CRITICAL: MONGODB_URI is not set in Railway environment variables');
  console.error('💡 Go to Railway Dashboard → Variables → Add MONGODB_URI');
  console.error('💡 Value should be: mongodb+srv://ksakanksha022_db_user:akanksha123@cluster0.f0nrkos.mongodb.net/rescuerush?retryWrites=true&w=majority');
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;

console.log('✅ Using MONGODB_URI from Railway environment variables');
console.log('📡 Database Type: MongoDB Atlas');

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB Atlas Connected Successfully');
  console.log('💾 Database: MongoDB Atlas');
  console.log('🌐 Cluster: Cluster0');
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Server running on port', PORT);
    console.log('📍 Health check: /health');
    console.log('📍 Debug info: /debug');
  });
})
.catch((error) => {
  console.error('❌ MongoDB Connection Failed:');
  console.error('Error:', error.message);
  console.error('Code:', error.code);
  process.exit(1);
});