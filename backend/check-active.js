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
    SELECT id, status, tunnel_id, tunnel_hostname, created_at 
    FROM lab_environments 
    WHERE user_id = 'b0c29dd3-a814-4d45-b3e8-d317a2a9afd4'
      AND status = 'active'
      AND expires_at > NOW()
  `).then(res => {
    console.log('Active environments that match query:');
    console.log(JSON.stringify(res.rows, null, 2));
    client.end();
  }).catch(e => {
    console.error(e.message);
    client.end();
  });
}).catch(e => console.error(e.message));
