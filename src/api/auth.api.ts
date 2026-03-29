// =============================================================
// TestPlatform for Peackit Academy — Authentication API
// =============================================================
// Direct Supabase client queries for authentication.
// Edge Functions will replace these in production later.
// =============================================================

import bcrypt from 'bcryptjs'
import {
  supabase,
  setStoredSession,
  clearStoredSession,
} from '@/api/client'
import { SESSION } from '@/lib/constants'
import type { ApiResponse, SafeUser, User } from '@/types'

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

/** Strip password_hash from a full User row, returning SafeUser. */
function toSafeUser(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...safe } = user
  return safe
}

/** Generate a pseudo-random token (used as session id in localStorage). */
function generateToken(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// -------------------------------------------------------------
// Public API
// -------------------------------------------------------------

/**
 * Authenticate a user by username + password.
 *
 * TODO: Replace plain-text password comparison with bcrypt hash
 * verification once Supabase Edge Functions are in place. The
 * current implementation queries the password_hash column and
 * compares it directly — this is a temporary shortcut for local
 * development / prototyping only.
 */
export async function loginUser(
  username: string,
  password: string,
): Promise<ApiResponse<{ user: SafeUser; token: string }>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return {
        data: null,
        error: error?.message ?? 'Invalid username or password',
        success: false,
      }
    }

    const user = data as User

    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return {
        data: null,
        error: 'Invalid username or password',
        success: false,
      }
    }

    // Update last_login_at
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)

    const safeUser = toSafeUser(user)
    const token = generateToken()

    // Persist to localStorage
    setStoredSession({
      user: safeUser as unknown as Record<string, unknown>,
      token,
    })

    return {
      data: { user: safeUser, token },
      error: null,
      success: true,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed'
    return { data: null, error: message, success: false }
  }
}

/**
 * Log out the current user by clearing the stored session.
 */
export function logoutUser(): void {
  clearStoredSession()
  localStorage.removeItem(SESSION.TEST_STATE_KEY)
}

/**
 * Fetch a user by id (returns SafeUser, no password hash).
 */
export async function getCurrentUser(
  userId: number,
): Promise<ApiResponse<SafeUser>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return {
        data: null,
        error: error?.message ?? 'User not found',
        success: false,
      }
    }

    return {
      data: toSafeUser(data as User),
      error: null,
      success: true,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch user'
    return { data: null, error: message, success: false }
  }
}

/**
 * Re-fetch the current user from the database and update localStorage.
 * Useful when admin updates a student's data while they are logged in.
 */
export async function refreshSession(
  userId: number,
): Promise<ApiResponse<SafeUser>> {
  const result = await getCurrentUser(userId)

  if (result.success && result.data) {
    // Update localStorage with fresh data while keeping existing token
    const raw = localStorage.getItem(SESSION.STORAGE_KEY)
    let token = generateToken()
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        token = parsed.token ?? token
      } catch {
        // ignore
      }
    }
    setStoredSession({
      user: result.data as unknown as Record<string, unknown>,
      token,
    })
  }

  return result
}
