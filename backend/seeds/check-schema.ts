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

async function checkAndAddColumns() {
  const client = await pool.connect();
  try {
    console.log('Checking lab_definitions table structure...\n');
    
    // Get existing columns
    const result = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'lab_definitions'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    const existingColumns = result.rows.map(r => r.column_name);
    
    // List columns to add if missing
    const columnsToAdd = [
      { name: 'outputs_mapping', type: 'JSONB' },
      { name: 'scenario_id', type: 'TEXT' },
      { name: 'published', type: 'BOOLEAN DEFAULT true' },
    ];
    
    console.log('\nAdding missing columns...');
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`  Adding ${col.name}...`);
        await client.query(`ALTER TABLE lab_definitions ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`  ✓ ${col.name} added`);
      } else {
        console.log(`  ✓ ${col.name} already exists`);
      }
    }
    
    console.log('\nFinal columns:');
    const finalResult = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'lab_definitions'
      ORDER BY ordinal_position
    `);
    finalResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndAddColumns().catch(console.error);
