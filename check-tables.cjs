// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_6rdXsx2MzSPy@ep-lingering-shadow-azpi5jg2-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});
pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_type = \'BASE TABLE\'').then((result) => {
  const rows = result.rows;
  console.log('Tables:', rows.map(r => r.table_name));
  pool.end();
}).catch(e => console.error('Error:', e));