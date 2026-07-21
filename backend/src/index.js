import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRoutes);
import userRoutes from './routes/user.routes.js';
app.use('/api/v1/users', userRoutes);
import vendorRoutes from './routes/vendor.routes.js';
app.use('/api/v1/vendors', vendorRoutes);
import itemRoutes from './routes/item.routes.js';
app.use('/api/v1/items', itemRoutes);
import productionRoutes from './routes/production.routes.js';
app.use('/api/v1/production', productionRoutes);
import customerRoutes from './routes/customer.routes.js';
app.use('/api/v1/customers', customerRoutes);
import orderRoutes from './routes/order.routes.js';
app.use('/api/v1/orders', orderRoutes);
import expenseRoutes from './routes/expense.routes.js';
app.use('/api/v1/expenses', expenseRoutes);
import analyticsRoutes from './routes/analytics.routes.js';
app.use('/api/v1/analytics', analyticsRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
