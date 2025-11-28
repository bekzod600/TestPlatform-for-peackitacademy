import { createRouter, createWebHistory } from 'vue-router'
import { useUsersStore } from '../stores/users'
import Login from '../pages/Login.vue'
import Home from '../pages/Home.vue'
import Test from '../pages/Test.vue'
import Results from '../pages/Results.vue'
import AdminLayout from '../admin/AdminLayout.vue'
import AdminHome from '../admin/AdminHome.vue'
import AdminUsers from '../admin/AdminUsers.vue'
import AdminQuestions from '../admin/AdminQuestions.vue'
import AdminUserGroups from '../admin/AdminUserGroups.vue'
import AdminQuestionGroups from '../admin/AdminQuestionGroups.vue'
import AdminAssignTests from '../admin/AdminAssignTests.vue'
import AdminResults from '../admin/AdminResults.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: '/test',
    name: 'Test',
    component: Test,
    meta: { requiresAuth: true }
  },
  {
    path: '/results',
    name: 'Results',
    component: Results,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'AdminHome',
        component: AdminHome
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: AdminUsers
      },
      {
        path: 'user-groups',
        name: 'AdminUserGroups',
        component: AdminUserGroups
      },
      {
        path: 'questions',
        name: 'AdminQuestions',
        component: AdminQuestions
      },
      {
        path: 'question-groups',
        name: 'AdminQuestionGroups',
        component: AdminQuestionGroups
      },
      {
        path: 'assign-tests',
        name: 'AdminAssignTests',
        component: AdminAssignTests
      },
      {
        path: 'results',
        name: 'AdminResults',
        component: AdminResults
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const usersStore = useUsersStore()
  const isAuthenticated = !!usersStore.currentUser
  const isAdmin = isAuthenticated && usersStore.currentUser.role === 'admin'

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresAdmin && !isAdmin) {
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    if (isAdmin) {
      next('/admin')
    } else {
      next('/')
    }
  } else {
    next()
  }
})

export default router