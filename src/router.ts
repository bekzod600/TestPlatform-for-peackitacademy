import { createRouter, createWebHistory } from 'vue-router'
import { useUsersStore } from './stores/users'

const routes = [
  {
    path: '/login',
    component: () => import('./pages/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/home',
    component: () => import('./pages/Home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/test/:id',
    component: () => import('./pages/Test.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/results',
    component: () => import('./pages/Results.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    component: () => import('./admin/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        component: () => import('./admin/AdminHome.vue')
      },
      {
        path: 'users',
        component: () => import('./admin/AdminUsers.vue')
      },
      {
        path: 'user-groups',
        component: () => import('./admin/AdminUserGroups.vue')
      },
      {
        path: 'questions',
        component: () => import('./admin/AdminQuestions.vue')
      },
      {
        path: 'question-groups',
        component: () => import('./admin/AdminQuestionGroups.vue')
      },
      {
        path: 'assign-tests',
        component: () => import('./admin/AdminAssignTests.vue')
      },
      {
        path: 'results',
        component: () => import('./admin/AdminResults.vue')
      }
    ]
  },
  {
    path: '/',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const usersStore = useUsersStore()
  const isAuthenticated = !!usersStore.currentUser

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    next(usersStore.currentUser.role === 'admin' ? '/admin' : '/student')
  } else {
    next()
  }
})

export default router
