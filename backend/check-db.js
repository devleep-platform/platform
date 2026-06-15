import pg from 'pg';
const { Pool } = pg;

async function checkDB() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Get all sessions for that environment
    const sessions = await pool.query(
      `SELECT id, status, environment_id, terminal_token FROM lab_sessions
       WHERE environment_id = $1
       ORDER BY created_at DESC`,
      ['aa9325ab-a5f8-4201-a5df-590717f40c67']
    );

    console.log('\n=== ALL SESSIONS FOR ENVIRONMENT ===');
    sessions.rows.forEach((row, i) => {
      console.log(`\nSession ${i+1}:`);
      console.log('  ID:', row.id.substring(0, 12) + '...');
      console.log('  Status:', row.status);
      console.log('  Terminal Token:', row.terminal_token ? 'SET' : 'NULL');
    });

    if (sessions.rows.length === 0) {
      console.log('NO SESSIONS FOUND');
    }

  } catch (e) {
    console.error('Error:', e.message);
    console.error(e);
  } finally {
    await pool.end();
  }
}

checkDB();
