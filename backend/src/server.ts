import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { env } from './config/env';
import { connectDB, isUsingMemoryDb } from './config/db';
import { seedIfEmpty } from './utils/seed';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import policyRoutes from './routes/policyRoutes';
import claimRoutes from './routes/claimRoutes';
import adminRoutes from './routes/adminRoutes';
import notificationRoutes from './routes/notificationRoutes';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'claimwise-backend',
    database: isUsingMemoryDb() ? 'mongodb-memory-server' : 'mongodb',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

async function start() {
  await connectDB();
  await seedIfEmpty();
  app.listen(env.port, () => {
    console.log(`[ClaimWise API] Running on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error('[ClaimWise API] Failed to start:', err);
  process.exit(1);
});

