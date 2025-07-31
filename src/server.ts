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
// @ts-ignore
expressApp.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
expressApp.use('/api/auth', authRoutes);
expressApp.use('/api/users', userRoutes);
expressApp.use('/api/offers', offerRoutes);
expressApp.use('/api/dine-in', dineInRoutes);
expressApp.use('/api/payments', paymentRoutes);

// Error handling
expressApp.use(errorHandler);

// Start server with Socket.IO
import { createServer } from 'http';
import { Server } from 'socket.io';

const port = process.env.PORT || 3001;
const httpServer = createServer(expressApp);

const io = new Server(httpServer, {
  cors: { origin: '*', credentials: true }
});

io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);
  // Example: join event room
  socket.on('joinEvent', (eventId) => {
    socket.join(`event_${eventId}`);
    logger.info(`Socket ${socket.id} joined room event_${eventId}`);
  });
  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

// Export io for use in controllers/services
export { io };

// Connect to MongoDB before starting the server
mongoose.connect(config.mongoUri)
  .then(() => {
    logger.info('✅ Connected to MongoDB');
    httpServer.listen(port, () => {
      logger.info(`Server (with WebSocket) is running on port ${port}`);
    });
  })
  .catch((err) => {
    logger.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
