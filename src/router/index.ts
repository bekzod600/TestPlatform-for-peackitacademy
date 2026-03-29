import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { globalBeforeEach } from './guards'

// =============================================================================
// Route meta type augmentation
// =============================================================================
declare module 'vue-router' {
  interface RouteMeta {
    /** Route requires an authenticated user. */
    requiresAuth?: boolean
    /** Route requires an admin-level role (admin / super_admin). */
    requiresAdmin?: boolean
    /** Page title shown in the document / breadcrumbs. */
    title?: string
  }
}

// =============================================================================
// Route definitions (all components are lazy-loaded)
// =============================================================================
const routes: RouteRecordRaw[] = [
  // --- Login (guest only) ----------------------------------------------------
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { title: 'Kirish' },
  },

  // --- Root redirect ---------------------------------------------------------
  {
    path: '/',
    name: 'Root',
    redirect: '/student/dashboard',
  },

  // --- Student routes (wrapped in StudentLayout) -----------------------------
  {
    path: '/student',
    component: () => import('@/layouts/StudentLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'StudentDashboard',
        component: () => import('@/pages/student/DashboardPage.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'test',
        name: 'StudentTest',
        component: () => import('@/pages/student/TestPage.vue'),
        meta: { title: 'Test' },
      },
      {
        path: 'results',
        name: 'StudentResults',
        component: () => import('@/pages/student/ResultsPage.vue'),
        meta: { title: 'Natijalar' },
      },
    ],
  },

  // --- Admin routes ----------------------------------------------------------
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/pages/admin/DashboardPage.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/pages/admin/UsersPage.vue'),
        meta: { title: 'Foydalanuvchilar' },
      },
      {
        path: 'user-groups',
        name: 'AdminUserGroups',
        component: () => import('@/pages/admin/UserGroupsPage.vue'),
        meta: { title: 'Guruhlar' },
      },
      {
        path: 'questions',
        name: 'AdminQuestions',
        component: () => import('@/pages/admin/QuestionsPage.vue'),
        meta: { title: 'Savollar' },
      },
      {
        path: 'tests',
        name: 'AdminTests',
        component: () => import('@/pages/admin/TestsPage.vue'),
        meta: { title: 'Testlar' },
      },
      {
        path: 'assignments',
        name: 'AdminAssignments',
        component: () => import('@/pages/admin/AssignmentsPage.vue'),
        meta: { title: 'Test tayinlash' },
      },
      {
        path: 'results',
        name: 'AdminResults',
        component: () => import('@/pages/admin/ResultsPage.vue'),
        meta: { title: 'Natijalar' },
      },
      {
        path: 'audit-log',
        name: 'AdminAuditLog',
        component: () => import('@/pages/admin/AuditLogPage.vue'),
        meta: { title: 'Audit Log' },
      },
    ],
  },

  // --- Catch-all 404 ---------------------------------------------------------
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/',
  },
]

// =============================================================================
// Router instance
// =============================================================================
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

// =============================================================================
// Global navigation guard
// =============================================================================
router.beforeEach(globalBeforeEach)

// Update document title after each navigation
router.afterEach((to) => {
  const title = to.meta.title
  document.title = title ? `${title} | Peackit Academy` : 'Peackit Academy'
})

export default router
