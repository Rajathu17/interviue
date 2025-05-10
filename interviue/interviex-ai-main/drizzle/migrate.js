const { db } = require('../neon/index');
const { sql } = require('drizzle-orm');

// Function to run migrations
async function runMigrations() {
  console.log('Running migrations...');
  
  try {
    // Add missing columns to the interview table
    await db.execute(sql`
      ALTER TABLE interview 
      ADD COLUMN IF NOT EXISTS role VARCHAR,
      ADD COLUMN IF NOT EXISTS level VARCHAR,
      ADD COLUMN IF NOT EXISTS techstack TEXT,
      ADD COLUMN IF NOT EXISTS type VARCHAR,
      ADD COLUMN IF NOT EXISTS "coverImage" VARCHAR;
    `);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigrations(); 