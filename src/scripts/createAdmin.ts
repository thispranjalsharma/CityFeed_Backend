import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { config } from '../config/config';
import { logger } from '../utils/logger.util';
import { Admin } from '../models/admin.model';

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    const adminData = {
      email: 'admin@cityfeed.com',
      password: 'admin123', // We'll use plain text for now
      name: 'Admin User',
      role: 'admin',
      isActive: true,
      isEmailVerified: true
    };

    console.log('Creating admin account...');
    const admin = await Admin.create(adminData);
    console.log('Admin created successfully with ID:', admin._id);

    // List all collections to verify
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    
    const collections = await db.listCollections().toArray();
    console.log('\nCollections in database:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin(); 