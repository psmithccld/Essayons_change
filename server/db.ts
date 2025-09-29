// server/db.ts
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

// Use Render's DATABASE_URL (already set in your env)
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

// Render Postgres requires SSL
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

// Export a drizzle instance backed by node-postgres
export const db = drizzle(pool)
