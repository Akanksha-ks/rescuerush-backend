require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Enhanced CORS for production
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/emergency', require('./routes/emergency'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/location', require('./routes/location'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/', (req, res) => {
  res.json({
    message: '🚀 WomenRescueRush Backend API is Running!',
    version: '1.0.0',
    status: 'Active',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      emergency: '/api/emergency',
      contacts: '/api/contacts'
    },
    documentation: 'Check /health for database status'
  });
});

// Health check - simplified for production
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  
  res.json({ 
    status: 'OK', 
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'WomenRescueRush Backend API',
    version: '1.0.0',
    status: 'Running'
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

// MongoDB connection - simplified for production
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set');
  process.exit(1);
}

console.log('🚀 Starting WomenRescueRush Backend...');
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// Connect to MongoDB with better error handling
mongoose.connect(MONGODB_URI, {
  // Remove deprecated options
})
.then(() => {
  console.log('✅ MongoDB Atlas Connected Successfully');
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎉 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    
    // Log Render-specific info
    if (process.env.NODE_ENV === 'production') {
      console.log('🚀 Running in PRODUCTION mode');
      console.log('☁️  Deployed on Render.com');
    }
  });
})
.catch((error) => {
  console.error('❌ MongoDB Connection Failed:');
  console.error('Error:', error.message);
  
  if (error.code === 8000) {
    console.log('🔑 Authentication issue - check MongoDB Atlas credentials');
  }
  
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});