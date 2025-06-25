import mongoose from 'mongoose';
import { config } from './config';
import { logger } from '../utils/logger.util';

const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000;

export const connectDB = async (retryCount = 0): Promise<void> => {
  try {
    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true,
      maxPoolSize: 10,
      minPoolSize: 5,
      heartbeatFrequencyMS: 10000,
      autoIndex: true,
      family: 4
    };

    await mongoose.connect(config.mongoUri, options);
    logger.info('✅ MongoDB successfully connected!');

    const db = mongoose.connection;

    db.on('error', (err) => {
      logger.error('❌ MongoDB connection error:', err);
      if (retryCount < MAX_RETRIES) {
        logger.info(`Retrying connection (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => connectDB(retryCount + 1), RETRY_INTERVAL);
      } else {
        logger.error('❌ Max retries reached. Could not connect to MongoDB.');
        process.exit(1);
      }
    });

    db.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => connectDB(retryCount + 1), RETRY_INTERVAL);
      }
    });

    db.on('reconnected', () => {
      logger.info('✅ MongoDB reconnected successfully!');
    });

    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('✅ MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        logger.error('❌ Error during MongoDB connection closure:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying connection (${retryCount + 1}/${MAX_RETRIES})...`);
      setTimeout(() => connectDB(retryCount + 1), RETRY_INTERVAL);
    } else {
      logger.error('❌ Max retries reached. Could not connect to MongoDB.');
      process.exit(1);
    }
  }
}; 