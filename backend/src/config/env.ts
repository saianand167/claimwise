import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/claimwise',
  jwtSecret: process.env.JWT_SECRET || 'claimwise_dev_secret_key_change_in_prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mlServiceUrl: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8001',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024,
};

