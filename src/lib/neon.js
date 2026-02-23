// NeonDB Connection Module
import { neon } from '@neondatabase/serverless'

const databaseUrl = import.meta.env.VITE_DATABASE_URL

console.log('[v0] NeonDB URL set:', !!databaseUrl)

if (!databaseUrl) {
  console.error('[v0] VITE_DATABASE_URL is not set in environment variables')
}

// Create query function
const sql = neon(databaseUrl || 'postgresql://localhost/test')

export { sql }

// Helper functions for common operations
export const queryDB = async (query, params = []) => {
  try {
    console.log('[v0] Executing query:', query.substring(0, 50) + '...')
    const result = await sql(query, params)
    console.log('[v0] Query successful, rows:', result?.length || 0)
    return { data: result, error: null }
  } catch (error) {
    console.error('[v0] Database error:', error.message)
    return { data: null, error }
  }
}

export const queryDBSingle = async (query, params = []) => {
  try {
    console.log('[v0] Executing single query:', query.substring(0, 50) + '...')
    const result = await sql(query, params)
    console.log('[v0] Query successful, returning first row')
    return { data: result[0] || null, error: null }
  } catch (error) {
    console.error('[v0] Database error:', error.message)
    return { data: null, error }
  }
}
