import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env';

let memoryServer: MongoMemoryServer | null = null;
let usingMemoryServer = false;

export const isUsingMemoryDb = () => usingMemoryServer;

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 2500 });
    usingMemoryServer = false;
    console.log(`[ClaimWise DB] Connected to MongoDB: ${env.mongodbUri}`);
  } catch {
    console.warn('[ClaimWise DB] Local MongoDB unavailable. Starting embedded MongoMemoryServer...');
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri('claimwise');
    await mongoose.connect(uri);
    usingMemoryServer = true;
    console.log(`[ClaimWise DB] Connected to embedded MongoMemoryServer: ${uri}`);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

