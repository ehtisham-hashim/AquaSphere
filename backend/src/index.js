import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { devLogger, prodLogger } from './middlewares/logger.middleware.js';
import { closeDatabaseConnections } from './config/db.js';
import { errorHandler } from './middlewares/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import itemRoutes from './routes/item.routes.js';
import productionRoutes from './routes/production.routes.js';
import customerRoutes from './routes/customer.routes.js';
import orderRoutes from './routes/order.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import bottleRoutes from './routes/bottle.routes.js';
import spotSaleRoutes from './routes/spotSale.routes.js';
import dailyCloseRoutes from './routes/dailyClose.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import auditLogRoutes from './routes/auditLog.routes.js';
import adminDashboardRoutes from './routes/adminDashboard.routes.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy (Traefik on Dokploy / Render proxy)
app.set('trust proxy', 1);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});

// Logging middleware
if (process.env.NODE_ENV === 'production') {
  app.use(prodLogger);
} else {
  app.use(devLogger);
}

app.use(helmet({
  contentSecurityPolicy: false // Allow Swagger UI inline scripts/styles
}));
app.use(compression());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://aqua-sphere-testing.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger API Documentation Console
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'AquaSphere API Docs & Testing Console',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true
  }
}));

app.use('/api/', apiLimiter);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/production', productionRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/bottles', bottleRoutes);
app.use('/api/v1/spot-sales', spotSaleRoutes);
app.use('/api/v1/daily-close', dailyCloseRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/admin', adminDashboardRoutes);

// Health check endpoint
app.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'AquaSphere API is running', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await closeDatabaseConnections();
    console.log('HTTP server and Database connection pool closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
