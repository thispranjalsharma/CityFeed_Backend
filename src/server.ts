import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import App from './app';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import offerRoutes from './routes/offer.routes';
import dineInRoutes from './routes/dineIn.routes';
import paymentRoutes from './routes/payment.routes';
import { errorHandler } from './middleware/error.middleware';
import { config } from './config/config';
import { logger } from './utils/logger.util';

dotenv.config();

const app = new App();
const expressApp = app.getApp();

// Middleware
expressApp.use(cors({
  origin: config.baseUrl,
  credentials: true
}));

expressApp.use(express.json());

// Swagger documentation
expressApp.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
expressApp.use('/api/auth', authRoutes);
expressApp.use('/api/users', userRoutes);
expressApp.use('/api/offers', offerRoutes);
expressApp.use('/api/dine-in', dineInRoutes);
expressApp.use('/api/payments', paymentRoutes);

// Error handling
expressApp.use(errorHandler);

// Start server
const port = process.env.PORT || 3001;

app.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
