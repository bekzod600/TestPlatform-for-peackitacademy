<template>
  <div class="min-h-screen bg-gray-50 flex relative">

    <!-- Overlay (faqat mobile) -->
    <div
      v-if="isOpen"
      @click="isOpen = false"
      class="fixed inset-0 bg-black/40 z-40 md:hidden"
    ></div>

    <!-- Sidebar -->
     <div class="md:w-64">
      <aside
        :class="[
          'bg-white shadow-lg fixed top-0 left-0 h-screen w-64 z-50 transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'md:fixed md:shadow-none'
        ]"
      >
        <div class="p-6 border-b border-gray-200">
          <h1 class="text-xl font-bold text-gray-800">Admin Panel</h1>
        </div>

        <nav class="mt-6 flex flex-col space-y-1">
          <router-link
            v-for="item in menu"
            :key="item.to"
            :to="item.to"
            @click="isOpen = false"
            :class="[
              $route.path === item.to
                ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                : 'text-gray-700 hover:bg-gray-100',
              'px-6 py-3 font-medium flex items-center gap-2 transition'
            ]"
          >
            <i :class="item.icon"></i>
            {{ item.title }}
          </router-link>
        </nav>

        <div class="absolute bottom-0 left-0 w-full p-6 border-t border-gray-200">
          <button
            @click="handleLogout"
            class="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition flex items-center justify-center gap-2"
          >
            <i class="mdi mdi-logout"></i>
            Chiqish
          </button>
        </div>
      </aside>
     </div>

    <!-- Main content -->
    <main class="flex-1">
      <header class="bg-white shadow-sm p-6 flex items-center justify-between sticky top-0 z-30">
        <!-- Burger button faqat mobile -->
        <button
          @click="isOpen = true"
          class="md:hidden text-3xl text-gray-700"
          aria-label="Open menu"
        >
          <i class="mdi mdi-menu"></i>
        </button>

        <h2 class="text-lg font-semibold text-gray-800">
          Salom, {{ currentUser?.full_name }}!
        </h2>
      </header>

      <section class="p-4 md:p-8">
        <router-view />
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'

const router = useRouter()
const usersStore = useUsersStore()
const currentUser = computed(() => usersStore.currentUser)

const isOpen = ref(false)

const menu = [
  { to: '/admin', title: 'Bosh sahifa', icon: 'mdi mdi-view-dashboard' },
  { to: '/admin/users', title: 'Foydalanuvchilar', icon: 'mdi mdi-account-multiple' },
  { to: '/admin/user-groups', title: "O'quv guruhlari", icon: 'mdi mdi-account-group' },
  { to: '/admin/questions', title: 'Savollar', icon: 'mdi mdi-help-circle' },
  { to: '/admin/question-groups', title: 'Savollar guruhi', icon: 'mdi mdi-format-list-group' },
  { to: '/admin/assign-tests', title: 'Test biriktirish', icon: 'mdi mdi-link-variant' },
  { to: '/admin/results', title: 'Test natijalari', icon: 'mdi mdi-chart-bar' }
]

const handleLogout = () => {
  usersStore.logout()
  router.push('/login')
}
</script>
