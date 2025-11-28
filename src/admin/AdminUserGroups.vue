<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-gray-800 flex items-center gap-2">
        <i class="mdi mdi-account-group text-blue-600 text-4xl"></i>
        O'quv guruhlarini boshqarish
      </h2>
      <button
        @click="showForm = !showForm"
        :disabled="loading"
        class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <i class="mdi" :class="showForm ? 'mdi-close' : 'mdi-plus'"></i>
        {{ showForm ? 'Bekor qilish' : 'Yangi guruh qo\'shish' }}
      </button>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="bg-white rounded-lg shadow-lg p-6">
      <h3 class="text-xl font-semibold text-gray-800 mb-4">
        {{ editingId ? 'Guruhni tahrirlash' : 'Yangi guruh qo\'shish' }}
      </h3>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Guruh nomi
          </label>
          <input
            v-model="form.name"
            type="text"
            required
            :disabled="loading"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Masalan: Kompyuter savodxonligi juft 10:00"
          />
        </div>

        <div class="flex gap-2">
          <button
            @click="saveGroup"
            :disabled="loading || !form.name"
            class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i v-if="loading" class="mdi mdi-loading mdi-spin"></i>
            <i v-else class="mdi mdi-content-save"></i>
            {{ loading ? 'Saqlanmoqda...' : (editingId ? 'Saqlash' : 'Qo\'shish') }}
          </button>
          <button
            @click="resetForm"
            :disabled="loading"
            class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
          >
            Bekor qilish
          </button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">№</th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Guruh nomi</th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Studentlar soni</th>
            <th class="px-6 py-3 text-center text-sm font-semibold text-gray-700">Amallar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(group, index) in userGroups" :key="group.id" class="border-t border-gray-200 hover:bg-gray-50">
            <td class="px-6 py-3 text-gray-700">{{ index + 1 }}</td>
            <td class="px-6 py-3 text-gray-700 font-medium">{{ group.name }}</td>
            <td class="px-6 py-3 text-gray-600">
              <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {{ getStudentCount(group.id) }} ta
              </span>
            </td>
            <td class="px-6 py-3 text-center space-x-2">
              <button
                @click="editGroup(group)"
                :disabled="loading"
                class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition inline-flex items-center gap-1 disabled:opacity-50"
              >
                <i class="mdi mdi-pencil"></i>
                Tahrirlash
              </button>
              <button
                @click="deleteGroup(group.id)"
                :disabled="loading"
                class="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition inline-flex items-center gap-1 disabled:opacity-50"
              >
                <i class="mdi mdi-delete"></i>
                O'chirish
              </button>
            </td>
          </tr>
          <tr v-if="userGroups.length === 0">
            <td colspan="4" class="px-6 py-8 text-center text-gray-500">
              Hozircha guruhlar yo'q
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Snackbar -->
    <transition name="fade">
      <div
        v-if="snackbar.show"
        class="fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg text-white z-50"
        :class="snackbar.type === 'success' ? 'bg-green-600' : 'bg-red-600'"
      >
        {{ snackbar.message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUsersStore } from '../stores/users'

const usersStore = useUsersStore()
const users = ref([])
const userGroups = ref([])
const showForm = ref(false)
const editingId = ref(null)
const loading = ref(false)
const form = ref({ name: '' })
const snackbar = ref({ show: false, message: '', type: 'success' })

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    users.value = await usersStore.loadUsers()
    userGroups.value = await usersStore.loadUserGroups()
  } finally {
    loading.value = false
  }
}

const getStudentCount = (groupId) => {
  return users.value.filter(u => u.assigned_user_group === groupId && u.role === 'student').length
}

const saveGroup = async () => {
  if (!form.value.name.trim()) {
    showSnackbar('Guruh nomini kiriting!', 'error')
    return
  }

  loading.value = true
  try {
    if (editingId.value) {
      const success = await usersStore.editUserGroup(editingId.value, { name: form.value.name })
      if (success) {
        showSnackbar('Guruh tahrirlandi!')
        await loadData()
        resetForm()
      } else {
        showSnackbar('Xatolik yuz berdi!', 'error')
      }
    } else {
      const success = await usersStore.addUserGroup({ name: form.value.name })
      if (success) {
        showSnackbar('Yangi guruh qo\'shildi!')
        await loadData()
        resetForm()
      } else {
        showSnackbar('Xatolik yuz berdi!', 'error')
      }
    }
  } finally {
    loading.value = false
  }
}

const editGroup = (group) => {
  editingId.value = group.id
  form.value = { name: group.name }
  showForm.value = true
}

const deleteGroup = async (id) => {
  if (!confirm('Rostdan ham o\'chirmoqchisiz?')) return

  loading.value = true
  try {
    const success = await usersStore.deleteUserGroup(id)
    if (success) {
      showSnackbar('Guruh o\'chirildi!', 'error')
      await loadData()
    } else {
      showSnackbar('Xatolik yuz berdi!', 'error')
    }
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  showForm.value = false
  editingId.value = null
  form.value = { name: '' }
}

const showSnackbar = (message, type = 'success') => {
  snackbar.value = { show: true, message, type }
  setTimeout(() => {
    snackbar.value = { show: false, message: '', type: 'success' }
  }, 3000)
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>