import { Pool } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function addScenarioIdColumn() {
  const client = await pool.connect();
  try {
    console.log('Adding scenario_id column if it does not exist...');
    
    await client.query(`
      ALTER TABLE lab_definitions
      ADD COLUMN IF NOT EXISTS scenario_id TEXT;
    `);
    
    console.log('✓ scenario_id column added or already exists');
    
    // Verify the column exists
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'lab_definitions' AND column_name = 'scenario_id'
    `);
    
    if (result.rows.length > 0) {
      console.log('✓ Verified: scenario_id column exists in lab_definitions');
    } else {
      console.log('✗ ERROR: scenario_id column still not found');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addScenarioIdColumn().catch(console.error);
