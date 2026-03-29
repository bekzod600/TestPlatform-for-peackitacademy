import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ADMIN_ROLES } from '@/lib/constants'

/**
 * Navigation guard that ensures the user is authenticated.
 *
 * Redirects to `/login` if the user is not logged in and the target route
 * has `meta.requiresAuth` set to `true`.
 */
export const authGuard: NavigationGuardWithThis<undefined> = (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next,
) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
}

/**
 * Navigation guard that ensures the user has an admin-level role
 * (`admin` or `super_admin`).
 *
 * Redirects to `/login` if the user is not authenticated, or to the
 * student dashboard if authenticated but without admin privileges.
 */
export const adminGuard: NavigationGuardWithThis<undefined> = (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next,
) => {
  const authStore = useAuthStore()

  if (!to.meta.requiresAdmin) {
    next()
    return
  }

  if (!authStore.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (!authStore.user || !ADMIN_ROLES.includes(authStore.user.role)) {
    next('/student/dashboard')
    return
  }

  next()
}

/**
 * Navigation guard that redirects already-authenticated users away from
 * guest-only pages (e.g., the login page).
 *
 * - Admin users are sent to `/admin`.
 * - All other users are sent to `/student/dashboard`.
 */
export const guestGuard: NavigationGuardWithThis<undefined> = (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next,
) => {
  const authStore = useAuthStore()

  if (to.path === '/login' && authStore.isAuthenticated) {
    if (authStore.user && ADMIN_ROLES.includes(authStore.user.role)) {
      next('/admin')
    } else {
      next('/student/dashboard')
    }
    return
  }

  next()
}

/**
 * Composite guard intended for use in `router.beforeEach`.
 *
 * Runs the guest guard, then the auth guard, then the admin guard
 * in sequence.
 */
export const globalBeforeEach: NavigationGuardWithThis<undefined> = (to, from, next) => {
  const authStore = useAuthStore()

  // --- Guest guard: redirect authenticated users away from login ---
  if (to.path === '/login' && authStore.isAuthenticated) {
    if (authStore.user && ADMIN_ROLES.includes(authStore.user.role)) {
      next('/admin')
    } else {
      next('/student/dashboard')
    }
    return
  }

  // --- Auth guard: block unauthenticated access to protected routes ---
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  // --- Admin guard: block non-admin access to admin routes ---
  if (to.meta.requiresAdmin) {
    if (!authStore.user || !ADMIN_ROLES.includes(authStore.user.role)) {
      next('/student/dashboard')
      return
    }
  }

  // --- All checks passed ---
  next()
}
