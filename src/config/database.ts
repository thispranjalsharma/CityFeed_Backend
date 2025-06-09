import mongoose from 'mongoose';
import { config } from './config';

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
    console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB successfully connected!');

    const db = mongoose.connection;

    db.on('error', (err) => {
      console.error('\x1b[31m%s\x1b[0m', '❌ MongoDB connection error:', err);
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying connection (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => connectDB(retryCount + 1), RETRY_INTERVAL);
      } else {
        console.error('\x1b[31m%s\x1b[0m', '❌ Max retries reached. Could not connect to MongoDB.');
        process.exit(1);
      }
    });

    db.on('disconnected', () => {
      console.log('\x1b[33m%s\x1b[0m', '⚠️ MongoDB disconnected. Attempting to reconnect...');
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => connectDB(retryCount + 1), RETRY_INTERVAL);
      }
    });

    db.on('reconnected', () => {
      console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB reconnected successfully!');
    });

    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('\x1b[32m%s\x1b[0m', '✅ MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('\x1b[31m%s\x1b[0m', '❌ Error during MongoDB connection closure:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ MongoDB connection error:', error);
    if (retryCount < MAX_RETRIES) {
      console.log(`Retrying connection (${retryCount + 1}/${MAX_RETRIES})...`);
      setTimeout(() => connectDB(retryCount + 1), RETRY_INTERVAL);
    } else {
      console.error('\x1b[31m%s\x1b[0m', '❌ Max retries reached. Could not connect to MongoDB.');
      process.exit(1);
    }
  }
}; 