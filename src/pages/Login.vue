<template>
  <div class="min-h-screen bg-linear-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
      <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">Test Platformasi</h1>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Foydalanuvchi nomi
          </label>
          <input
            v-model="username"
            type="text"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            placeholder="Username"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Parol
          </label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            placeholder="Password"
          />
        </div>

        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Kirish
        </button>
      </form>

      <div class="mt-6 text-sm text-gray-600">
        <p class="font-semibold mb-2">Test uchun:</p>
        <p>Admin: admin / admin123</p>
        <p>Student: student1 / 1234</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'

const router = useRouter()
const usersStore = useUsersStore()

const username = ref('')
const password = ref('')
const error = ref('')

const handleLogin = async () => {
  error.value = ''

  const user = await usersStore.login(username.value, password.value)

  if (user) {
    if (user.role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/')
    }
  } else {
    error.value = "Noto'g'ri foydalanuvchi nomi yoki parol"
  }
}
</script>
