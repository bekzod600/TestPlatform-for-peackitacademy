<template>
  <div class="min-h-screen bg-gray-50 flex">
    <aside class="w-64 bg-white shadow-lg">
      <div class="p-6">
        <h1 class="text-xl font-bold text-gray-800">Admin Panel</h1>
      </div>

      <nav class="mt-8">
        <router-link
          to="/admin"
          :class="{
            'bg-blue-50 text-blue-600 border-r-4 border-blue-600': $route.path === '/admin',
            'text-gray-600 hover:bg-gray-50': $route.path !== '/admin'
          }"
          class="block px-6 py-3 font-medium transition"
        >
          Bosh sahifa
        </router-link>

        <router-link
          to="/admin/users"
          :class="{
            'bg-blue-50 text-blue-600 border-r-4 border-blue-600': $route.path === '/admin/users',
            'text-gray-600 hover:bg-gray-50': $route.path !== '/admin/users'
          }"
          class="block px-6 py-3 font-medium transition"
        >
          Foydalanuvchilar
        </router-link>

        <router-link
          to="/admin/questions"
          :class="{
            'bg-blue-50 text-blue-600 border-r-4 border-blue-600': $route.path === '/admin/questions',
            'text-gray-600 hover:bg-gray-50': $route.path !== '/admin/questions'
          }"
          class="block px-6 py-3 font-medium transition"
        >
          Savollar
        </router-link>
      </nav>

      <div class="absolute bottom-0 left-0 w-64 p-6 border-t border-gray-200">
        <button
          @click="handleLogout"
          class="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
        >
          Chiqish
        </button>
      </div>
    </aside>

    <main class="flex-1">
      <div class="bg-white shadow-sm p-6 flex justify-between items-center">
        <h2 class="text-lg font-semibold text-gray-800">
          Salom, {{ currentUser?.full_name }}!
        </h2>
      </div>

      <div class="p-8">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'

const router = useRouter()
const usersStore = useUsersStore()

const currentUser = computed(() => usersStore.currentUser)

const handleLogout = () => {
  usersStore.logout()
  router.push('/login')
}
</script>
