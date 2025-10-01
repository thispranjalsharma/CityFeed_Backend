import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';
import { Admin } from '../models/admin.model';

async function createAdmin() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    logger.info('Connected to MongoDB');

    const adminData = {
      email: 'admin@cityfeed.com',
      password: 'admin123', // We'll use plain text for now
      name: 'Admin User',
      role: 'admin',
      isActive: true,
      isEmailVerified: true
    };

    logger.info('Creating admin account...');
    const admin = await Admin.create(adminData);
    logger.info('Admin created successfully with ID:', admin._id);

    // List all collections to verify
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    const collections = await db.listCollections().toArray();
    logger.info('\nCollections in database:');
    collections.forEach(collection => {
      logger.info(`- ${collection.name}`);
    });

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

createAdmin(); 