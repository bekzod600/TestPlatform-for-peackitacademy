<template>
  <div class="space-y-4 sm:space-y-6">
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <h2 class="text-2xl sm:text-3xl font-bold text-gray-800">Foydalanuvchilarni boshqarish</h2>
      <button
        @click="showForm = !showForm"
        class="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base font-medium"
      >
        {{ showForm ? 'Bekor qilish' : 'Yangi foydalanuvchi qo\'shish' }}
      </button>
    </div>

    <div v-if="showForm" class="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <h3 class="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
        {{ editingId ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi qo\'shish' }}
      </h3>

      <form @submit.prevent="saveUser" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              To'liq ism
            </label>
            <input
              v-model="form.full_name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
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
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
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
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
              placeholder="Parol"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Rol
            </label>
            <select
              v-model="form.role"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
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
          <UserGroupSelect v-model="form.assigned_user_group" :groups="userGroups" />
        </div>

        <div class="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            class="bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-green-700 transition text-sm sm:text-base"
          >
            {{ editingId ? 'Saqlash' : 'Qo\'shish' }}
          </button>
          <button
            type="button"
            @click="resetForm"
            class="bg-gray-500 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-600 transition text-sm sm:text-base"
          >
            Bekor qilish
          </button>
        </div>
      </form>
    </div>

    <!-- Filters Section -->
    <div class="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6">
        <!-- Search -->
        <div class="relative">
          <i class="mdi mdi-magnify absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="To'liq ism yoki username qidirish..."
            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm sm:text-base"
          />
        </div>

        <!-- Group Filter -->
        <select
          v-model="selectedGroup"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm sm:text-base"
        >
          <option value="all">Barcha guruhlar</option>
          <option v-for="group in userGroups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </div>

      <!-- Table - Responsive -->
      <div class="overflow-x-auto -mx-4 sm:mx-0">
        <table class="w-full min-w-min">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                To'liq ism
              </th>
              <th class="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden sm:table-cell">
                Foydalanuvchi nomi
              </th>
              <th class="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">
                Rol
              </th>
              <th class="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden lg:table-cell">
                Guruhi
              </th>
              <th class="px-4 sm:px-6 py-3 text-center text-xs sm:text-sm font-semibold text-gray-700">
                Amallar
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id" class="border-t border-gray-200 hover:bg-gray-50">
              <td class="px-4 sm:px-6 py-3">
                <div>
                  <p class="font-medium text-gray-800 text-sm sm:text-base">{{ user.full_name }}</p>
                  <!-- Mobile: Show username, role, group -->
                  <div class="sm:hidden space-y-1 mt-1">
                    <p class="text-xs text-gray-500">@{{ user.username }}</p>
                    <div class="flex flex-wrap gap-1">
                      <span
                        class="px-2 py-0.5 rounded-full text-xs font-medium"
                        :class="{
                          'bg-red-100 text-red-700': user.role === 'admin',
                          'bg-blue-100 text-blue-700': user.role === 'student'
                        }"
                      >
                        {{ user.role === 'admin' ? 'Admin' : 'O\'quvchi' }}
                      </span>
                      <span v-if="user.assigned_user_group" class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                        {{ getUserGroupName(user.assigned_user_group) }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <!-- {{ user }} -->
              <td class="px-4 sm:px-6 py-3 text-gray-700 text-sm hidden sm:table-cell">
                @{{ user.username }}
              </td>
              <td class="px-4 sm:px-6 py-3 hidden md:table-cell">
                <span
                  class="px-3 py-1 rounded-full text-xs font-medium"
                  :class="{
                    'bg-red-100 text-red-700': user.role === 'admin',
                    'bg-blue-100 text-blue-700': user.role === 'student'
                  }"
                >
                  {{ user.role === 'admin' ? 'Admin' : 'O\'quvchi' }}
                </span>
              </td>
              <td class="px-4 sm:px-6 py-3 text-gray-600 text-sm hidden lg:table-cell">
                {{ getUserGroupName(user.assigned_user_group) }}
              </td>
              <td class="px-4 sm:px-6 py-3 text-center">
                <div class="flex flex-col sm:flex-row justify-center gap-2">
                  <button
                    @click="editUser(user)"
                    class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition whitespace-nowrap"
                  >
                    Tahrirlash
                  </button>
                  <button
                    @click="deleteUser(user.id)"
                    :disabled="user.id === 1"
                    class="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    O'chirish
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- No Results -->
      <div v-if="filteredUsers.length === 0" class="text-center py-8">
        <i class="mdi mdi-account-search text-5xl text-gray-300 mb-2"></i>
        <p class="text-gray-500 text-sm sm:text-base">Hech narsa topilmadi</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUsersStore } from '../stores/users'
import {
  FwbButton,
  FwbInput,
  FwbSelect,
  FwbTable,
  FwbTableHead,
  FwbTableBody,
  FwbTableRow,
  FwbTableCell,
  FwbBadge
} from 'flowbite-vue'
import UserGroupSelect from './components/UserGroupSelect.vue'

const usersStore = useUsersStore()
const users = ref([])
const userGroups = ref([])
const showForm = ref(false)
const editingId = ref(null)

// Filter states
const searchTerm = ref('')
const selectedGroup = ref('all')

const form = ref({
  full_name: '',
  username: '',
  password: '',
  role: 'student',
  assigned_user_group: null
})

onMounted(async () => {
  await usersStore.loadUsers()
  await usersStore.loadUserGroups()
  users.value = usersStore.users
  userGroups.value = usersStore.userGroups
})

const filteredUsers = computed(() => {
  let filtered = users.value

  // Search by full name or username
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(u => 
      u.full_name.toLowerCase().includes(search) ||
      u.username.toLowerCase().includes(search)
    )
  }

  // Filter by group
  if (selectedGroup.value !== 'all') {
    filtered = filtered.filter(u => u.assigned_user_group === parseInt(selectedGroup.value))
  }

  return filtered
})

const getUserGroupName = (id) => {
  if (!id) return 'Yoq'
  return userGroups.value.find(g => g.id === id)?.name || 'Noma\'lum'
}

const saveUser = async () => {
  if (!form.value.full_name || !form.value.username || !form.value.password) {
    alert('Barcha maydonlarni to\'ldiring!')
    return
  }

  if (form.value.role === 'student' && !form.value.assigned_user_group) {
    alert('O\'quvchi uchun guruh tanlang!')
    return
  }

  if (editingId.value) {
    await usersStore.editUser(editingId.value, {
      full_name: form.value.full_name,
      username: form.value.username,
      password: form.value.password,
      role: form.value.role,
      assigned_user_group: form.value.assigned_user_group
    })
    alert('Foydalanuvchi tahrirlandi')
  } else {
    await usersStore.addUser({
      full_name: form.value.full_name,
      username: form.value.username,
      password: form.value.password,
      role: form.value.role,
      assigned_user_group: form.value.assigned_user_group
    })
    alert('Foydalanuvchi qo\'shildi')
  }

  users.value = usersStore.users
  resetForm()
}

const editUser = (user) => {
  editingId.value = user.id
  form.value = {
    full_name: user.full_name,
    username: user.username,
    password: user.password,
    role: user.role,
    assigned_user_group: user.assigned_user_group
  }
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
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
    full_name: '',
    username: '',
    password: '',
    role: 'student',
    assigned_user_group: null
  }
  showForm.value = false
}
</script>