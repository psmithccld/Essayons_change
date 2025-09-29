// server/db.ts

// Import pg in a way that works with ESM
import pkg from 'pg';
const { Pool } = pkg;

import { drizzle } from 'drizzle-orm/node-postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Render Postgres requires SSL
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// Create a drizzle instance backed by pg
export const db = drizzle(pool);

