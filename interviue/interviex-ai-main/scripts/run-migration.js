// Simple script to run the migration API
const fetch = require('node-fetch');

async function runMigration() {
  try {
    console.log('Running migration...');
    const response = await fetch('http://localhost:3000/api/migrate');
    const data = await response.json();
    
    if (data.success) {
      console.log('Migration successful:', data.message);
    } else {
      console.error('Migration failed:', data.error);
    }
  } catch (error) {
    console.error('Error running migration:', error.message);
  }
}

runMigration(); 