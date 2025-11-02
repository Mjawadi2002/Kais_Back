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

// CORS configuration - in development allow all origins if FRONTEND_URL isn't set
const FRONTEND_URL = process.env.FRONTEND_URL;
if (FRONTEND_URL) {
  app.use(cors({
    origin: FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
} else {
  // no FRONTEND_URL provided: allow all origins (useful for local development)
  app.use(cors());
}
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
