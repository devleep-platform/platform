const pg = require('pg');

const client = new pg.Client({
  host: 'ep-calm-heart-apdxwlxx.c-7.us-east-1.aws.neon.tech',
  database: 'neondb',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: true
});

client.connect(err => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
  
  client.query(
    `SELECT ls.id, ls.terminal_token, le.tunnel_hostname 
     FROM lab_sessions ls 
     JOIN lab_environments le ON le.id = ls.environment_id 
     WHERE le.id = $1`,
    ['64fc5008-76c9-435b-a3c8-5e99b6aaeb77'],
    (err, res) => {
      if (err) {
        console.error('Query error:', err);
      } else {
        console.log('Session data:');
        console.log(JSON.stringify(res.rows, null, 2));
      }
      client.end();
    }
  );
});
