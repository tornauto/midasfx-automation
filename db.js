const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credentials (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      demo1_login TEXT,
      demo1_password TEXT,
      demo2_login TEXT,
      demo2_password TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('[DB] Table ready');
}

async function saveCredentials(email, demo1Login, demo1Pass, demo2Login, demo2Pass) {
  await pool.query(
    `INSERT INTO credentials (email, demo1_login, demo1_password, demo2_login, demo2_password)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE
     SET demo1_login=$2, demo1_password=$3, demo2_login=$4, demo2_password=$5`,
    [email, demo1Login, demo1Pass, demo2Login, demo2Pass]
  );
}

async function getCredentials(email) {
  const res = await pool.query(
    `SELECT * FROM credentials WHERE email = $1`, [email]
  );
  return res.rows[0] || null;
}

module.exports = { init, saveCredentials, getCredentials };
