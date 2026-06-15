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

async function verify() {
  const client = await pool.connect();
  try {
    console.log('Verifying lab definitions seeding...\n');
    
    // Count total labs
    const countResult = await client.query(
      'SELECT COUNT(*) as total, COUNT(DISTINCT terraform_module) as modules FROM lab_definitions'
    );
    
    console.log(`Total labs seeded: ${countResult.rows[0].total}`);
    console.log(`Terraform modules: ${countResult.rows[0].modules}`);
    
    // Get all labs
    const labsResult = await client.query(
      'SELECT slug, difficulty, scenario_id FROM lab_definitions ORDER BY slug'
    );
    
    console.log(`\nAll ${labsResult.rows.length} labs:`);
    labsResult.rows.forEach((lab, i) => {
      const scenario = lab.scenario_id ? ` [${lab.scenario_id}]` : '';
      console.log(`  ${i + 1}. ${lab.slug} (${lab.difficulty})${scenario}`);
    });
    
    if (labsResult.rows.length === 25) {
      console.log('\n✓ SUCCESS: All 25 labs seeded successfully!');
    } else {
      console.log(`\n⚠ WARNING: Expected 25 labs, found ${labsResult.rows.length}`);
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

verify().catch(console.error);
