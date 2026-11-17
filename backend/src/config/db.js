import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isMemoryServer = false;
let memoryServerInstance = null;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log(`[DB] Attempting connection to MongoDB at: ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      console.log('[DB] Successfully connected to configured MongoDB');
      return;
    } catch (err) {
      console.warn(`[DB] Configured MONGODB_URI failed (${err.message}). Falling back to in-memory MongoDB.`);
    }
  }

  // Fallback to mongodb-memory-server
  try {
    console.log('[DB] Initializing embedded MongoDB memory server...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServerInstance = await MongoMemoryServer.create();
    const memUri = memoryServerInstance.getUri();
    await mongoose.connect(memUri);
    isMemoryServer = true;
    console.log(`[DB] Connected to embedded in-memory MongoDB at ${memUri}`);
  } catch (memErr) {
    console.error('[DB] Failed to start MongoDB memory server:', memErr.message);
    throw memErr;
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (isMemoryServer && memoryServerInstance) {
      await memoryServerInstance.stop();
      console.log('[DB] Embedded MongoDB stopped.');
    }
  } catch (err) {
    console.error('[DB] Error during disconnect:', err.message);
  }
}
