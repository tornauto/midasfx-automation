const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  // Drop old table and recreate with correct columns
  await pool.query(`DROP TABLE IF EXISTS credentials`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credentials (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      login TEXT,
      password TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('[DB] Table ready');
}

async function saveCredentials(email, login, password) {
  await pool.query(
    `INSERT INTO credentials (email, login, password)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET login=$2, password=$3`,
    [email, login, password]
  );
}

async function getCredentials(email) {
  const res = await pool.query(`SELECT * FROM credentials WHERE email = $1`, [email]);
  return res.rows[0] || null;
}

module.exports = { init, saveCredentials, getCredentials };
