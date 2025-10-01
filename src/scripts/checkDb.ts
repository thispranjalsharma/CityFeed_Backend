import mongoose from 'mongoose';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';

async function checkDatabase() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Check collections
    const collections = await db.listCollections().toArray();
    logger.info('Available collections:', collections.map(c => c.name));

    // Check indexes
    for (const collection of collections) {
      const indexes = await db.collection(collection.name).indexes();
      logger.info(`Indexes for ${collection.name}:`, indexes);
    }

    await mongoose.disconnect();
    logger.info('Database check completed successfully');
  } catch (error) {
    logger.error('Database check failed:', error);
    process.exit(1);
  }
}

checkDatabase(); 