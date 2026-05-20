const { Pool } = require('pg');
require('dotenv').config();

// This creates a connection pool to your PostgreSQL database
// A pool means multiple connections can happen at the same time
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test the connection when server starts
pool.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to PostgreSQL database ✅');
  }
});

module.exports = pool;