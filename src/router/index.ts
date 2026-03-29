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
    /** Route requires teacher role. */
    requiresTeacher?: boolean
    /** Page title shown in the document / breadcrumbs. */
    title?: string
    /** Route is in test mode (full-screen, no navigation). */
    isTestMode?: boolean
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

  // --- Root redirect (handled by guard based on role) -----------------------
  {
    path: '/',
    name: 'Root',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { title: 'Kirish' },
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
        path: 'results',
        name: 'StudentResults',
        component: () => import('@/pages/student/ResultsPage.vue'),
        meta: { title: 'Natijalar' },
      },
    ],
  },

  // --- Student Test (full-screen, no layout) --------------------------------
  {
    path: '/student/test',
    name: 'StudentTest',
    component: () => import('@/pages/student/TestPage.vue'),
    meta: { requiresAuth: true, title: 'Test', isTestMode: true },
  },

  // --- Teacher routes (wrapped in TeacherLayout) ----------------------------
  {
    path: '/teacher',
    component: () => import('@/layouts/TeacherLayout.vue'),
    meta: { requiresAuth: true, requiresTeacher: true },
    children: [
      {
        path: '',
        name: 'TeacherDashboard',
        component: () => import('@/pages/teacher/DashboardPage.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'questions',
        name: 'TeacherQuestions',
        component: () => import('@/pages/teacher/QuestionsPage.vue'),
        meta: { title: 'Savollar' },
      },
      {
        path: 'groups',
        name: 'TeacherGroups',
        component: () => import('@/pages/teacher/GroupsPage.vue'),
        meta: { title: 'Guruhlarim' },
      },
      {
        path: 'assignments',
        name: 'TeacherAssignments',
        component: () => import('@/pages/teacher/AssignmentsPage.vue'),
        meta: { title: 'Test biriktirish' },
      },
      {
        path: 'tests',
        name: 'TeacherTests',
        component: () => import('@/pages/teacher/TestsPage.vue'),
        meta: { title: 'Testlar' },
      },
      {
        path: 'results',
        name: 'TeacherResults',
        component: () => import('@/pages/teacher/ResultsPage.vue'),
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
        path: 'subjects',
        name: 'AdminSubjects',
        component: () => import('@/pages/admin/SubjectsPage.vue'),
        meta: { title: 'Fanlar' },
      },
      {
        path: 'categories',
        name: 'AdminCategories',
        component: () => import('@/pages/admin/CategoriesPage.vue'),
        meta: { title: 'Kategoriyalar' },
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
