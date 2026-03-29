import type { NavigationGuardWithThis } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useStudentTestStore } from '@/stores/student/test'
import { USER_ROLES, ADMIN_ROLES } from '@/lib/constants'

/**
 * Returns the correct home path for a given user role.
 */
function getHomePath(role: string): string {
  if ((ADMIN_ROLES as readonly string[]).includes(role)) return '/admin'
  if (role === USER_ROLES.TEACHER) return '/teacher'
  return '/student/dashboard'
}

/**
 * Composite guard intended for use in `router.beforeEach`.
 *
 * Handles:
 * 1. Root redirect — sends to the correct panel based on role
 * 2. Guest guard — authenticated users away from login
 * 3. Auth guard — block unauthenticated access
 * 4. Admin guard — block non-admin from /admin
 * 5. Teacher guard — block non-teacher from /teacher
 * 6. Student guard — block non-student from /student
 */
export const globalBeforeEach: NavigationGuardWithThis<undefined> = (to, from, next) => {
  const authStore = useAuthStore()
  const testStore = useStudentTestStore()
  const role = authStore.user?.role

  // --- Test mode protection: prevent navigation away from active test ---
  if (testStore.isActive && from.path === '/student/test' && to.path !== '/student/test') {
    // User is trying to leave an active test - block it
    const confirmed = window.confirm(
      'Test hali yakunlanmagan! Agar sahifadan chiqsangiz, test avtomatik bekor qilinadi. Davom etmoqchimisiz?'
    )
    if (!confirmed) {
      next(false) // Block navigation
      return
    } else {
      // User confirmed - cancel the test
      testStore.clearTest()
      // Continue with navigation
    }
  }

  // --- Prevent direct access to test page without active test ---
  if (to.path === '/student/test' && !testStore.isActive && from.path !== '/student/dashboard') {
    // Redirect to dashboard if trying to access test page without active test
    next('/student/dashboard')
    return
  }

  // --- Root redirect: send to correct panel based on role ---
  if (to.path === '/') {
    if (authStore.isAuthenticated && role) {
      next(getHomePath(role))
    } else {
      next('/login')
    }
    return
  }

  // --- Guest guard: redirect authenticated users away from login ---
  if (to.path === '/login') {
    if (authStore.isAuthenticated && role) {
      next(getHomePath(role))
    } else {
      next()
    }
    return
  }

  // --- Auth guard: block unauthenticated access to protected routes ---
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  // --- Admin guard: only admin/super_admin can access /admin ---
  if (to.meta.requiresAdmin) {
    if (!role || !(ADMIN_ROLES as readonly string[]).includes(role)) {
      next(role ? getHomePath(role) : '/login')
      return
    }
  }

  // --- Teacher guard: only teacher can access /teacher ---
  if (to.meta.requiresTeacher) {
    if (role !== USER_ROLES.TEACHER) {
      next(role ? getHomePath(role) : '/login')
      return
    }
  }

  // --- Student guard: prevent non-students from accessing /student ---
  if (to.path.startsWith('/student') && to.meta.requiresAuth) {
    if (role && role !== USER_ROLES.STUDENT) {
      next(getHomePath(role))
      return
    }
  }

  // --- All checks passed ---
  next()
}
