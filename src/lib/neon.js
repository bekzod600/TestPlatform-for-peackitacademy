// NeonDB Connection Module
import { neon } from '@neondatabase/serverless'

const databaseUrl = import.meta.env.VITE_DATABASE_URL || 'YOUR_NEON_DATABASE_URL'

// Create query function
const sql = neon(databaseUrl)

export { sql }

// Helper functions for common operations
export const queryDB = async (query, params = []) => {
  try {
    const result = await sql(query, params)
    return { data: result, error: null }
  } catch (error) {
    console.error('Database error:', error)
    return { data: null, error }
  }
}

export const queryDBSingle = async (query, params = []) => {
  try {
    const result = await sql(query, params)
    return { data: result[0] || null, error: null }
  } catch (error) {
    console.error('Database error:', error)
    return { data: null, error }
  }
}
