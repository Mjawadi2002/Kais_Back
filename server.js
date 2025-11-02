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
const PORT = process.env.PORT || 5000;

// CORS configuration - support multiple environments
const FRONTEND_URL = process.env.FRONTEND_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

let corsOptions;
if (NODE_ENV === 'production') {
  // Production: specific origins
  corsOptions = {
    origin: [
      'https://kaisfront-production.up.railway.app',
      'https://kais-front-production.up.railway.app',
      FRONTEND_URL
    ].filter(Boolean), // Remove any undefined values
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
  };
} else {
  // Development: allow localhost origins
  corsOptions = {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      FRONTEND_URL
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  };
}

app.use(cors(corsOptions));
// CORS middleware above already handles preflight requests

// Middleware to parse JSON request bodies
app.use(express.json());
app.use('/api/v1', userRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/stats', statsRouter);

// simple health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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
