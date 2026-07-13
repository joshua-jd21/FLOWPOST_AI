import mongoose, { ConnectOptions } from 'mongoose';
import { config } from './index.js';
import pino from 'pino';

const logger = pino({ name: 'db', level: config.isDev ? 'debug' : 'info' });

const options: ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri, options);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error(error, 'Failed to connect to MongoDB');
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error(err, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}
