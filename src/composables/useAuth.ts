import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ADMIN_ROLES } from '@/lib/constants'
import type { SafeUser } from '@/types'

/**
 * Composable that wraps the auth store for convenient use in components.
 *
 * Provides reactive user state, role checks, and login/logout actions
 * with automatic navigation.
 */
export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  const user = computed<SafeUser | null>(() => authStore.user)
  const isAuthenticated = computed<boolean>(() => authStore.isAuthenticated)
  const isAdmin = computed<boolean>(() => authStore.isAdmin)
  const isTeacher = computed<boolean>(() => authStore.isTeacher)
  const isStudent = computed<boolean>(() => authStore.isStudent)
  const isLoading = computed<boolean>(() => authStore.isLoading)

  /**
   * Log in with the provided credentials and navigate to the appropriate
   * dashboard on success.
   *
   * @returns The authenticated user, or `null` if login failed.
   */
  async function login(username: string, password: string): Promise<SafeUser | null> {
    const result = await authStore.login(username, password)

    if (result.success && authStore.user) {
      const targetRoute = ADMIN_ROLES.includes(authStore.user.role)
        ? '/admin'
        : '/student/dashboard'

      await router.push(targetRoute)
      return authStore.user
    }

    return null
  }

  /**
   * Log out the current user and redirect to the login page.
   */
  async function logout(): Promise<void> {
    authStore.logout()
    await router.push('/login')
  }

  return {
    user,
    isAuthenticated,
    isAdmin,
    isTeacher,
    isStudent,
    isLoading,
    login,
    logout,
  }
}
