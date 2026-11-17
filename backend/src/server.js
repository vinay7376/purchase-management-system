import dotenv from 'dotenv';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { Item } from './models/Item.js';
import { DataController } from './controllers/dataController.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    // Auto-seed if database is empty and kit is present
    const itemCount = await Item.countDocuments();
    if (itemCount === 0) {
      console.log('[Server] Database is empty. Attempting auto-seeding from master data...');
      try {
        await DataController.seedDatabase();
      } catch (seedErr) {
        console.warn('[Server] Auto-seed failed (kit may be external or data directory not set):', seedErr.message);
      }
    }

    const app = createApp();
    app.listen(PORT, () => {
      console.log(`[Server] Corvo Procurement Backend listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Fatal error during startup:', err);
    process.exit(1);
  }
}

startServer();
