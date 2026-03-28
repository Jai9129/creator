// db/client.js — Neon serverless connection pool
const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env');
}

const sql = neon(process.env.DATABASE_URL);

module.exports = { sql };
