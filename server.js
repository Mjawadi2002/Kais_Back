const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { connectDB } = require('./config/db');

dotenv.config();
const app = express();
const userRouter = require('./routers/UserRouter');
const authRouter = require('./routers/AuthRouter');
const productRouter = require('./routers/ProductRouter');
const statsRouter = require('./routers/StatsRouter');
const adminSetupRouter = require('./routers/AdminSetupRouter');
const PORT = process.env.PORT || 5000;

// CORS configuration - support multiple environments
const FRONTEND_URL = process.env.FRONTEND_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🔧 CORS Configuration:', {
  NODE_ENV,
  FRONTEND_URL,
  PORT: process.env.PORT
});

// More permissive CORS configuration for production debugging
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://kaisfront-production.up.railway.app',
      'https://kais-front-production.up.railway.app',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      FRONTEND_URL
    ].filter(Boolean);

    console.log('🌐 CORS Check - Origin:', origin, 'Allowed:', allowedOrigins);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`, {
    origin: req.get('origin'),
    userAgent: req.get('user-agent'),
    headers: req.headers
  });
  next();
});

// Middleware to parse JSON request bodies
app.use(express.json());
app.use('/api/v1', userRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/stats', statsRouter);
app.use('/api/v1/setup', adminSetupRouter);

// simple health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    cors: 'enabled'
  });
});

// CORS test endpoint
app.get('/api/v1/test-cors', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.get('origin'),
    timestamp: new Date().toISOString()
  });
});


// Define the startServer function
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Database connected successfully');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
