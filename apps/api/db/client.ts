import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema.js'

// Get the database URL from environment variables
const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

// Create Neon client
const sql = neon(connectionString)

// Create Drizzle instance
export const db = drizzle(sql, { schema })
