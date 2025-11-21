<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-xl font-bold text-gray-800">Test Platformasi</h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-600">{{ currentUser?.full_name }}</span>
          <button
            @click="handleLogout"
            class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Chiqish
          </button>
        </div>
      </div>
    </nav>

    <div class="max-w-4xl mx-auto px-4 py-12">
      <div class="bg-white rounded-lg shadow-xl p-8">
        <h2 class="text-3xl font-bold text-gray-800 mb-4">
          Xush kelibsiz, {{ currentUser?.full_name }}!
        </h2>
        <p class="text-gray-600 mb-2">
          Test topshirish yoki natijalarni ko'rish uchun quyidagi tugmalardan birini tanlang.
        </p>
        <p v-if="userGroupName" class="text-sm text-gray-500 mb-8">
          Sizning guruhi: <span class="font-semibold">{{ userGroupName }}</span>
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            @click="startTest"
            class="bg-blue-600 text-white py-6 px-8 rounded-lg hover:bg-blue-700 transition font-medium text-lg"
          >
            Testni boshlash
          </button>

          <button
            @click="viewResults"
            class="bg-green-600 text-white py-6 px-8 rounded-lg hover:bg-green-700 transition font-medium text-lg"
          >
            Natijalar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'
import { useQuestionsStore } from '../stores/questions'
import { useTestStore } from '../stores/test'

const router = useRouter()
const usersStore = useUsersStore()
const questionsStore = useQuestionsStore()
const testStore = useTestStore()

const currentUser = computed(() => usersStore.currentUser)
const userGroupName = ref('')

onMounted(async () => {
  if (currentUser.value?.assigned_user_group) {
    await usersStore.loadUserGroups()
    const group = usersStore.userGroups.find(g => g.id === currentUser.value.assigned_user_group)
    userGroupName.value = group?.name || ''
  }
})

const handleLogout = () => {
  usersStore.logout()
  router.push('/login')
}

const startTest = async () => {
  const questions = await questionsStore.loadQuestions()
  const userGroupId = currentUser.value?.assigned_user_group

  let filteredQuestions = questions
  if (userGroupId) {
    filteredQuestions = questions.filter(q => q.groupId === userGroupId)
  }

  if (filteredQuestions.length === 0) {
    alert('Sizning guruhingiz uchun test topilmadi!')
    return
  }

  testStore.startTest(filteredQuestions)
  router.push('/test')
}

const viewResults = () => {
  router.push('/results')
}
</script>
