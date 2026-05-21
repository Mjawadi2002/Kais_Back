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
const deliveryRouter = require('./routers/DeliveryRouter');
const PORT = process.env.PORT || 5000;

const FRONTEND_URL = process.env.FRONTEND_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      ...(FRONTEND_URL ? [FRONTEND_URL] : [])
    ].filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      if (NODE_ENV === 'development') {
        console.warn('CORS blocked origin:', origin);
      }
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

if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

app.use(express.json());
app.use('/api/v1', userRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/stats', statsRouter);
app.use('/api/v1/deliveries', deliveryRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    cors: 'enabled'
  });
});

app.get('/api/v1/test-cors', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.get('origin'),
    timestamp: new Date().toISOString()
  });
});

const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');
    app.listen(PORT, () => {
      console.log(`🚀 RouteFlow server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
