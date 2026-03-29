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
// Internal audit log helper (mirrors admin.api.ts version but
// avoids a circular import by calling supabase directly)
// -------------------------------------------------------------
async function writeAuditLog(entry: {
  user_id?: number | null
  action: string
  entity_type?: string | null
  entity_id?: number | null
  new_data?: Record<string, unknown> | null
}): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: entry.user_id ?? null,
      action: entry.action,
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      old_data: null,
      new_data: entry.new_data ?? null,
      ip_address: null,
    })
  } catch {
    // Audit log xatosi asosiy jarayonni to'xtatmasligi kerak
  }
}

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

    // Dual-mode password check: support both bcrypt hashes and legacy plain-text
    const isBcryptHash = user.password_hash.startsWith('$2')
    let isValidPassword = false

    if (isBcryptHash) {
      isValidPassword = await bcrypt.compare(password, user.password_hash)
    } else {
      // Legacy plain-text comparison
      isValidPassword = password === user.password_hash
    }

    if (!isValidPassword) {
      return {
        data: null,
        error: 'Invalid username or password',
        success: false,
      }
    }

    // If password was plain-text, migrate it to bcrypt hash
    const updatePayload: Record<string, unknown> = {
      last_login_at: new Date().toISOString(),
    }
    if (!isBcryptHash) {
      updatePayload.password_hash = await bcrypt.hash(password, 10)
    }

    await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id)

    const safeUser = toSafeUser(user)
    const token = generateToken()

    // Persist to localStorage
    setStoredSession({
      user: safeUser as unknown as Record<string, unknown>,
      token,
    })

    // Audit: login
    await writeAuditLog({
      user_id: safeUser.id,
      action: 'login',
      entity_type: 'session',
      entity_id: safeUser.id,
      new_data: { username: safeUser.username, role: safeUser.role },
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
 * userId is optional — pass it to write an audit log entry.
 */
export async function logoutUser(userId?: number | null): Promise<void> {
  if (userId) {
    await writeAuditLog({
      user_id: userId,
      action: 'logout',
      entity_type: 'session',
      entity_id: userId,
    })
  }
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
