// =============================================================
// TestPlatform for Peackit Academy — Auth Store (Pinia)
// =============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SESSION, USER_ROLES, ADMIN_ROLES } from '@/lib/constants'
import type { UserRole } from '@/lib/constants'
import type { SafeUser } from '@/types'
import {
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshSession,
} from '@/api/auth.api'

export const useAuthStore = defineStore('auth', () => {
  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  const user = ref<SafeUser | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)

  // ---------------------------------------------------------
  // Computed
  // ---------------------------------------------------------
  const isAuthenticated = computed<boolean>(() => user.value !== null && token.value !== null)

  const userRole = computed<UserRole | null>(() => user.value?.role ?? null)

  const isSuperAdmin = computed<boolean>(() =>
    user.value?.role === USER_ROLES.SUPER_ADMIN,
  )

  const isAdmin = computed<boolean>(() =>
    user.value !== null && (ADMIN_ROLES as readonly string[]).includes(user.value.role),
  )

  const isTeacher = computed<boolean>(() =>
    user.value?.role === USER_ROLES.TEACHER,
  )

  const isStudent = computed<boolean>(() =>
    user.value?.role === USER_ROLES.STUDENT,
  )

  // ---------------------------------------------------------
  // Actions
  // ---------------------------------------------------------

  /**
   * Authenticate a user with username and password.
   * On success, stores the user and token in both reactive state
   * and localStorage.
   */
  async function login(
    username: string,
    password: string,
  ): Promise<{ success: boolean; error: string | null }> {
    isLoading.value = true
    try {
      const result = await loginUser(username, password)

      if (!result.success || !result.data) {
        return { success: false, error: result.error ?? 'Login failed' }
      }

      user.value = result.data.user
      token.value = result.data.token

      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected login error'
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear user state, remove persisted session data, and redirect
   * to the login page.
   */
  async function logout(): Promise<void> {
    const currentUserId = user.value?.id ?? null
    user.value = null
    token.value = null
    await logoutUser(currentUserId)

    // Redirect via window.location to guarantee a clean navigation
    // even if the Vue Router is not yet available.
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  /**
   * Hydrate user + token state from localStorage (synchronous).
   * Call this on app mount so the UI doesn't flash before async
   * refresh completes.
   */
  function loadFromStorage(): void {
    const raw = localStorage.getItem(SESSION.STORAGE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw)
      if (parsed?.user && parsed?.token) {
        user.value = parsed.user as SafeUser
        token.value = parsed.token as string
      } else if (parsed && !parsed.token) {
        // Legacy format: stored only the user object without a token wrapper.
        // Migrate it into the new shape.
        user.value = parsed as SafeUser
        token.value = `migrated-${Date.now()}`
        // Re-persist in the new shape
        localStorage.setItem(
          SESSION.STORAGE_KEY,
          JSON.stringify({ user: user.value, token: token.value }),
        )
      }
    } catch {
      localStorage.removeItem(SESSION.STORAGE_KEY)
    }
  }

  /**
   * Re-fetch the current user from the database and update local
   * state + localStorage.  Useful when the admin changes a student's
   * permissions or group while they are logged in.
   */
  async function refreshUser(): Promise<SafeUser | null> {
    if (!user.value?.id) return null

    isLoading.value = true
    try {
      const result = await refreshSession(user.value.id)

      if (result.success && result.data) {
        user.value = result.data
        return result.data
      }
      return null
    } catch (err) {
      console.error('Failed to refresh user:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Verify the current session is still valid by fetching the user
   * from the database.  Returns false (and triggers logout) if the
   * user no longer exists or is inactive.
   */
  async function verifySession(): Promise<boolean> {
    if (!user.value) return false

    isLoading.value = true
    try {
      const result = await getCurrentUser(user.value.id)

      if (result.success && result.data) {
        // Check if user is still active
        if (!result.data.is_active) {
          logout()
          return false
        }
        user.value = result.data
        return true
      }

      // User not found — force logout
      logout()
      return false
    } catch {
      return false
    } finally {
      isLoading.value = false
    }
  }

  // ---------------------------------------------------------
  // Expose
  // ---------------------------------------------------------
  return {
    // State
    user,
    token,
    isLoading,

    // Computed
    isAuthenticated,
    userRole,
    isSuperAdmin,
    isAdmin,
    isTeacher,
    isStudent,

    // Actions
    login,
    logout,
    loadFromStorage,
    refreshUser,
    verifySession,
  }
})
