import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import App from './app';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import merchantRoutes from './routes/merchant.routes';
import offerRoutes from './routes/offer.routes';
import dineInRoutes from './routes/dineIn.routes';
import paymentRoutes from './routes/payment.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = new App();
const expressApp = app.getApp();

// Middleware
expressApp.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

expressApp.use(express.json());

// Swagger documentation
expressApp.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
expressApp.use('/api/auth', authRoutes);
expressApp.use('/api/users', userRoutes);
expressApp.use('/api/merchants', merchantRoutes);
expressApp.use('/api/offers', offerRoutes);
expressApp.use('/api/dine-in', dineInRoutes);
expressApp.use('/api/payments', paymentRoutes);

// Error handling
expressApp.use(errorHandler);

// Start server
const port = process.env.PORT || 3001;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cityfeed')
  .then(() => {
    console.log('Connected to MongoDB');
    expressApp.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });
