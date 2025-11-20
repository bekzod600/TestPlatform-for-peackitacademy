<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-gray-800">Foydalanuvchilarni boshqarish</h2>
      <button
        @click="showForm = !showForm"
        class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        {{ showForm ? 'Bekor qilish' : 'Yangi foydalanuvchi qo\'shish' }}
      </button>
    </div>

    <div v-if="showForm" class="bg-white rounded-lg shadow-lg p-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-4">
        {{ editingId ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi qo\'shish' }}
      </h3>

      <form @submit.prevent="saveUser" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              To'liq ism
            </label>
            <input
              v-model="form.fullName"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="To'liq ism"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Foydalanuvchi nomi
            </label>
            <input
              v-model="form.username"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Username"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Parol
            </label>
            <input
              v-model="form.password"
              type="password"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Parol"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Rol
            </label>
            <select
              v-model="form.role"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="student">O'quvchi</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div v-if="form.role === 'student'">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Guruhi
          </label>
          <UserGroupSelect v-model="form.assignedUserGroup" :groups="userGroups" />
        </div>

        <div class="flex gap-2">
          <button
            type="submit"
            class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            {{ editingId ? 'Saqlash' : 'Qo\'shish' }}
          </button>
          <button
            type="button"
            @click="resetForm"
            class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
          >
            Bekor qilish
          </button>
        </div>
      </form>
    </div>

    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              To'liq ism
            </th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Foydalanuvchi nomi
            </th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Rol
            </th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Guruhi
            </th>
            <th class="px-6 py-3 text-center text-sm font-semibold text-gray-700">
              Amallar
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="border-t border-gray-200 hover:bg-gray-50">
            <td class="px-6 py-3 text-gray-700">
              {{ user.fullName }}
            </td>
            <td class="px-6 py-3 text-gray-700">
              {{ user.username }}
            </td>
            <td class="px-6 py-3">
              <span
                class="px-3 py-1 rounded-full text-sm font-medium"
                :class="{
                  'bg-red-100 text-red-700': user.role === 'admin',
                  'bg-blue-100 text-blue-700': user.role === 'student'
                }"
              >
                {{ user.role === 'admin' ? 'Admin' : 'O\'quvchi' }}
              </span>
            </td>
            <td class="px-6 py-3 text-gray-600">
              {{ getUserGroupName(user.assignedUserGroup) }}
            </td>
            <td class="px-6 py-3 text-center space-x-2">
              <button
                @click="editUser(user)"
                class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
              >
                Tahrirlash
              </button>
              <button
                @click="deleteUser(user.id)"
                :disabled="user.id === 1"
                class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                O'chirish
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUsersStore } from '../stores/users'
import UserGroupSelect from './components/UserGroupSelect.vue'

const usersStore = useUsersStore()
const users = ref([])
const userGroups = ref([])
const showForm = ref(false)
const editingId = ref(null)

const form = ref({
  fullName: '',
  username: '',
  password: '',
  role: 'student',
  assignedUserGroup: null
})

onMounted(async () => {
  await usersStore.loadUsers()
  await usersStore.loadUserGroups()
  users.value = usersStore.users
  userGroups.value = usersStore.userGroups
})

const getUserGroupName = (id) => {
  if (!id) return 'Yoq'
  return userGroups.value.find(g => g.id === id)?.name || 'Noma\'lum'
}

const saveUser = async () => {
  if (!form.value.fullName || !form.value.username || !form.value.password) {
    alert('Barcha maydonlarni to\'ldiring!')
    return
  }

  if (form.value.role === 'student' && !form.value.assignedUserGroup) {
    alert('O\'quvchi uchun guruh tanlang!')
    return
  }

  if (editingId.value) {
    await usersStore.editUser(editingId.value, {
      fullName: form.value.fullName,
      username: form.value.username,
      password: form.value.password,
      role: form.value.role,
      assignedUserGroup: form.value.role === 'admin' ? null : form.value.assignedUserGroup
    })
    alert('Foydalanuvchi tahrirlandi')
  } else {
    await usersStore.addUser({
      fullName: form.value.fullName,
      username: form.value.username,
      password: form.value.password,
      role: form.value.role,
      assignedUserGroup: form.value.role === 'admin' ? null : form.value.assignedUserGroup
    })
    alert('Foydalanuvchi qo\'shildi')
  }

  users.value = usersStore.users
  resetForm()
}

const editUser = (user) => {
  editingId.value = user.id
  form.value = {
    fullName: user.fullName,
    username: user.username,
    password: user.password,
    role: user.role,
    assignedUserGroup: user.assignedUserGroup
  }
  showForm.value = true
}

const deleteUser = async (id) => {
  if (confirm('Rostdan o\'chirmoqchisiz?')) {
    await usersStore.deleteUser(id)
    users.value = usersStore.users
    alert('Foydalanuvchi o\'chirildi')
  }
}

const resetForm = () => {
  editingId.value = null
  form.value = {
    fullName: '',
    username: '',
    password: '',
    role: 'student',
    assignedUserGroup: null
  }
  showForm.value = false
}
</script>
