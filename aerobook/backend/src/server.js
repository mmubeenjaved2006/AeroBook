import 'dotenv/config';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import passport from './config/passport.js';

import authRoutes from './routes/auth.js';
import flightRoutes from './routes/flights.js';
import bookingRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';

/* ========================================
   Validate Environment Variables
======================================== */

for (const key of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    throw new Error(
      `Missing environment variable: ${key}`
    );
  }
}

/* ========================================
   Environment Configuration
======================================== */

const isProduction =
  process.env.NODE_ENV === 'production';

const isVercel =
  process.env.VERCEL === '1';

const PORT =
  process.env.PORT || 5000;

/* ========================================
   MongoDB Connection Cache
======================================== */

const cached =
  globalThis.aerobookMongoCache ||
  (globalThis.aerobookMongoCache = {
    connection: null,
    promise: null
  });

async function connectDB() {
  if (
    cached.connection &&
    mongoose.connection.readyState === 1
  ) {
    return cached.connection;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(
      process.env.MONGODB_URI,
      {
        maxPoolSize: 10,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 10000
      }
    );
  }

  try {
    cached.connection = await cached.promise;

    return cached.connection;

  } catch (error) {
    cached.promise = null;
    cached.connection = null;

    throw error;

  } finally {
    cached.promise = null;
  }
}

/* ========================================
   Initialize Express Application
======================================== */

const app = express();

app.set(
  'trust proxy',
  isVercel || isProduction ? 1 : false
);

app.disable('x-powered-by');

/* ========================================
   Security Middleware
======================================== */

app.use(helmet());

/* ========================================
   CORS Configuration
======================================== */

const frontendURL =
  process.env.FRONTEND_URL ||
  'http://localhost:5173';

const allowedOrigin = new URL(
  frontendURL
).origin;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === allowedOrigin) {
        return callback(null, true);
      }

      return callback(null, false);
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization'
    ]
  })
);

/* ========================================
   JSON Body Parser
======================================== */

app.use(
  express.json({
    limit: '32kb'
  })
);

/* ========================================
   Cookie Parser
======================================== */

app.use(cookieParser());

/* ========================================
   Passport Authentication
======================================== */

app.use(passport.initialize());

/* ========================================
   MongoDB Connection Middleware
======================================== */

app.use('/api', async (req, res, next) => {
  try {
    await connectDB();

    return next();

  } catch (error) {
    console.error(
      'Database connection failed:',
      error.name
    );

    return res.status(503).json({
      message:
        'Database temporarily unavailable. Please try again.'
    });
  }
});

/* ========================================
   MongoDB Rate Limit Store
======================================== */

class MongoRateLimitStore {
  constructor(prefix) {
    this.prefix = `aerobook:${prefix}:`;
    this.windowMs = 60000;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  get collection() {
    return mongoose.connection.db.collection(
      'api_rate_limits'
    );
  }

  async increment(key) {
    const now = new Date();

    const expiresAt = new Date(
      now.getTime() + this.windowMs
    );

    const id = this.prefix + key;

    const update = [
      {
        $set: {
          totalHits: {
            $cond: [
              {
                $lte: [
                  {
                    $ifNull: [
                      '$expiresAt',
                      new Date(0)
                    ]
                  },
                  now
                ]
              },

              1,

              {
                $add: [
                  {
                    $ifNull: [
                      '$totalHits',
                      0
                    ]
                  },
                  1
                ]
              }
            ]
          },

          expiresAt: {
            $cond: [
              {
                $lte: [
                  {
                    $ifNull: [
                      '$expiresAt',
                      new Date(0)
                    ]
                  },
                  now
                ]
              },

              expiresAt,

              '$expiresAt'
            ]
          }
        }
      }
    ];

    let result;

    try {
      result = await this.collection.findOneAndUpdate(
        {
          _id: id
        },

        update,

        {
          upsert: true,
          returnDocument: 'after',
          includeResultMetadata: false
        }
      );

    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      result = await this.collection.findOneAndUpdate(
        {
          _id: id
        },

        update,

        {
          returnDocument: 'after',
          includeResultMetadata: false
        }
      );
    }

    return {
      totalHits: result.totalHits,
      resetTime: result.expiresAt
    };
  }

  async decrement(key) {
    await this.collection.updateOne(
      {
        _id: this.prefix + key,

        totalHits: {
          $gt: 0
        },

        expiresAt: {
          $gt: new Date()
        }
      },

      {
        $inc: {
          totalHits: -1
        }
      }
    );
  }

  async resetKey(key) {
    await this.collection.deleteOne({
      _id: this.prefix + key
    });
  }
}

/* ========================================
   Rate Limit Collection TTL Index
======================================== */

let rateLimitIndexPromise = null;

async function initializeRateLimitIndex() {
  if (!rateLimitIndexPromise) {
    rateLimitIndexPromise =
      mongoose.connection.db
        .collection('api_rate_limits')
        .createIndex(
          {
            expiresAt: 1
          },

          {
            expireAfterSeconds: 0
          }
        )
        .catch((error) => {
          rateLimitIndexPromise = null;

          throw error;
        });
  }

  return rateLimitIndexPromise;
}

/* ========================================
   Rate Limit Database Initialization
======================================== */

app.use('/api', async (req, res, next) => {
  try {
    await initializeRateLimitIndex();

    return next();

  } catch (error) {
    return next(error);
  }
});

/* ========================================
   Rate Limiter Helper
======================================== */

function createLimiter({
  prefix,
  windowMs,
  limit,
  message,
  skipSuccessfulRequests = false
}) {
  return rateLimit({
    windowMs,

    limit,

    standardHeaders: 'draft-7',

    legacyHeaders: false,

    skipSuccessfulRequests,

    store: new MongoRateLimitStore(prefix),

    message: {
      message
    }
  });
}

/* ========================================
   General API Rate Limiter
======================================== */

const apiLimiter = createLimiter({
  prefix: 'general',

  windowMs: 15 * 60 * 1000,

  limit: 300,

  message:
    'Too many requests. Please try again later.'
});

/* ========================================
   Authentication Rate Limiter
======================================== */

const authLimiter = createLimiter({
  prefix: 'auth',

  windowMs: 15 * 60 * 1000,

  limit: 100,

  message:
    'Too many authentication requests. Please try again later.'
});

/* ========================================
   Login Brute Force Protection
======================================== */

const loginLimiter = createLimiter({
  prefix: 'login',

  windowMs: 15 * 60 * 1000,

  limit: 10,

  skipSuccessfulRequests: true,

  message:
    'Too many failed login attempts. Please try again in 15 minutes.'
});

/* ========================================
   Signup Rate Limiter
======================================== */

const signupLimiter = createLimiter({
  prefix: 'signup',

  windowMs: 60 * 60 * 1000,

  limit: 10,

  message:
    'Too many signup attempts. Please try again in one hour.'
});

/* ========================================
   Forgot Password Rate Limiter
======================================== */

const forgotPasswordLimiter = createLimiter({
  prefix: 'forgot-password',

  windowMs: 15 * 60 * 1000,

  limit: 5,

  message:
    'Too many password reset requests. Please try again in 15 minutes.'
});

/* ========================================
   Reset Password Rate Limiter
======================================== */

const resetPasswordLimiter = createLimiter({
  prefix: 'reset-password',

  windowMs: 15 * 60 * 1000,

  limit: 10,

  message:
    'Too many password reset attempts. Please try again later.'
});

/* ========================================
   Reset Token Verification Rate Limiter
======================================== */

const verifyTokenLimiter = createLimiter({
  prefix: 'verify-token',

  windowMs: 15 * 60 * 1000,

  limit: 30,

  message:
    'Too many token verification requests. Please try again later.'
});

/* ========================================
   Booking Rate Limiter
======================================== */

const bookingLimiter = createLimiter({
  prefix: 'booking',

  windowMs: 15 * 60 * 1000,

  limit: 20,

  message:
    'Too many booking attempts. Please try again later.'
});

/* ========================================
   Root Route
======================================== */

app.get('/', (_, res) => {
  res.json({
    name: 'AeroBook API',
    status: 'running',
    environment: isProduction
      ? 'production'
      : 'development'
  });
});

/* ========================================
   API Health Check
======================================== */

app.get('/api/health', (_, res) => {
  res.json({
    status: 'ok',

    database:
      mongoose.connection.readyState === 1
        ? 'connected'
        : 'disconnected'
  });
});

/* ========================================
   Apply Rate Limiters
======================================== */

app.use('/api', apiLimiter);

app.use('/api/auth', authLimiter);

app.post(
  '/api/auth/login',
  loginLimiter
);

app.post(
  '/api/auth/signup',
  signupLimiter
);

app.post(
  '/api/auth/register',
  signupLimiter
);

app.post(
  '/api/auth/forgot-password',
  forgotPasswordLimiter
);

app.post(
  '/api/auth/reset-password',
  resetPasswordLimiter
);

app.get(
  '/api/auth/verify-reset-token',
  verifyTokenLimiter
);

app.post(
  '/api/bookings',
  bookingLimiter
);

app.post(
  '/api/bookings/group',
  bookingLimiter
);

/* ========================================
   Origin Protection for Write Requests
======================================== */

app.use('/api', (req, res, next) => {
  const protectedMethods = [
    'POST',
    'PUT',
    'PATCH',
    'DELETE'
  ];

  if (!protectedMethods.includes(req.method)) {
    return next();
  }

  const origin = req.get('origin');

  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({
      message: 'Request origin is not allowed'
    });
  }

  if (
    !origin &&
    req.get('sec-fetch-site') === 'cross-site'
  ) {
    return res.status(403).json({
      message: 'Cross-site request blocked'
    });
  }

  return next();
});

/* ========================================
   Authentication Routes
======================================== */

app.use('/api/auth', authRoutes);

/* ========================================
   Flight Routes
======================================== */

app.use('/api/flights', flightRoutes);

/* ========================================
   Booking Routes
======================================== */

app.use('/api/bookings', bookingRoutes);

/* ========================================
   Admin Routes
======================================== */

app.use('/api/admin', adminRoutes);

/* ========================================
   API Not Found Handler
======================================== */

app.use('/api', (req, res) => {
  res.status(404).json({
    message: 'API endpoint not found'
  });
});

/* ========================================
   Global Error Handler
======================================== */

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(
    'API Error:',
    err.name || 'Error',
    err.code || ''
  );

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      message: 'Request body is too large'
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      message: 'Invalid JSON request'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid identifier'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Invalid request data'
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      message: 'Duplicate record detected'
    });
  }

  res.status(500).json({
    message: 'Server error'
  });
});

/* ========================================
   Local Development Server
======================================== */

if (!isVercel) {
  try {
    await connectDB();

    await initializeRateLimitIndex();

    console.log(
      'MongoDB connected successfully'
    );

    app.listen(PORT, () => {
      console.log(
        `AeroBook API on http://localhost:${PORT}`
      );

      console.log(
        'Security and MongoDB rate limiting enabled'
      );
    });

  } catch (error) {
    console.error(
      'Server startup failed:',
      error.name,
      error.message
    );

    process.exit(1);
  }
}

/* ========================================
   Export Application for Vercel
======================================== */

export default app;
