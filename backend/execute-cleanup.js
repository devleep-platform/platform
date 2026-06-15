import pg from 'pg';

const client = new pg.Client({
  host: 'ep-calm-heart-apdxwlxx.c-7.us-east-1.aws.neon.tech',
  user: 'neondb_owner',
  password: 'npg_ECVXv2G5ctsU',
  database: 'neondb',
  ssl: true
});

client.connect().then(() => {
  client.query(`
    UPDATE lab_environments
    SET status = 'failed'
    WHERE user_id = 'b0c29dd3-a814-4d45-b3e8-d317a2a9afd4'
      AND status IN ('provisioning', 'active')
      AND (tunnel_id IS NULL OR tunnel_hostname IS NULL);
  `).then(res => {
    console.log(`✓ Updated ${res.rowCount} stale environments to 'failed'`);
    client.end();
  }).catch(e => {
    console.error('❌ Error:', e.message);
    client.end();
  });
}).catch(e => console.error('❌ Connection error:', e.message));
