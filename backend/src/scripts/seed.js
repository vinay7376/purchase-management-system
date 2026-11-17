import { connectDB, disconnectDB } from '../config/db.js';
import { DataController } from '../controllers/dataController.js';

async function runSeed() {
  try {
    console.log('[Seed Script] Connecting to database...');
    await connectDB();
    console.log('[Seed Script] Seeding data...');
    const counts = await DataController.seedDatabase();
    console.log('[Seed Script] Seeding completed successfully:', counts);
  } catch (err) {
    console.error('[Seed Script] Seeding failed:', err.message);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

runSeed();
