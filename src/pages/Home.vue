<template>
  <div class="min-h-screen bg-linear-to-br from-blue-50 to-blue-100">
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

    <!-- <div class="max-w-4xl mx-auto px-4 py-12">
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
    </div> -->
    <template>
  <div class="min-h-screen bg-gray-100">
    <!-- Navbar -->
    <nav class="bg-blue-600 text-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-2 text-lg font-semibold">
          <span>Test Platformasi</span>
        </div>

        <div class="flex items-center space-x-4">
          <span class="flex items-center space-x-1 bg-blue-500 px-3 py-1 rounded-full">
            <span>{{ currentUser?.fullName }}</span>
          </span>

          <div id="logoutTip" role="tooltip"
               class="absolute z-10 invisible inline-block px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip">
            Chiqish
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="flex justify-center items-center py-12">
      <div class="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-8">
        
        <div class="text-center">
          <div class="mx-auto w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
            <i class="mdi mdi-account-circle text-white text-5xl"></i>
          </div>

          <h2 class="text-3xl font-bold mt-4">Xush kelibsiz, {{ currentUser?.fullName }}!</h2>
          <p class="text-gray-600 mt-2">
            Testni boshlash yoki natijalarni ko‘rish uchun tanlang.
          </p>

          <div v-if="userGroupName" class="inline-flex items-center mt-4 px-4 py-1 bg-blue-100 text-blue-800 rounded-full">
            <i class="mdi mdi-account-group mr-1"></i>
            Guruh: {{ userGroupName }}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">

          <!-- Start Test -->
          <div
            @click="startTest"
            class="cursor-pointer bg-blue-600 text-white rounded-xl p-6 shadow-md hover:bg-blue-700 transition text-center"
          >
            <i class="mdi mdi-clipboard-text text-6xl mb-4"></i>
            <h3 class="text-xl font-semibold">Testni boshlash</h3>
            <p class="text-blue-100 mt-1">Yangi test topshirish</p>
          </div>

          <!-- Results -->
          <div
            @click="viewResults"
            class="cursor-pointer bg-green-600 text-white rounded-xl p-6 shadow-md hover:bg-green-700 transition text-center"
          >
            <i class="mdi mdi-chart-bar text-6xl mb-4"></i>
            <h3 class="text-xl font-semibold">Natijalar</h3>
            <p class="text-green-100 mt-1">Test natijalarini ko‘rish</p>
          </div>

        </div>
      </div>
    </div>

    <!-- Snackbar -->
    <div
      v-if="snackbar"
      :class="[
        'fixed bottom-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg text-white font-medium transition',
        snackbarColor === 'error' ? 'bg-red-600' : '',
        snackbarColor === 'warning' ? 'bg-yellow-600' : '',
        snackbarColor === 'success' ? 'bg-green-600' : ''
      ]"
    >
      {{ snackbarText }}
    </div>
  </div>
</template>

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
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')


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
  // Foydalanuvchiga test biriktirilganmi tekshirish
  if (!currentUser.value?.assigned_question_group) {
    snackbar.value = true
    snackbarText.value = "Sizga hali test biriktirilmagan! Admin bilan bog'laning."
    snackbarColor.value = 'warning'
    return
  }

  const questions = await questionsStore.loadQuestions()
  const questionGroupId = currentUser.value.assigned_question_group

  let filteredQuestions = questions.filter(q => q.group_id === questionGroupId)
  if (filteredQuestions.length === 0) {
    snackbar.value = true
    snackbarText.value = "Sizning test guruhingizda savollar mavjud emas!"
    snackbarColor.value = 'error'
    return
  }
  testStore.startTest(filteredQuestions)
  router.push('/test')

  // const questions = await questionsStore.loadQuestions()
  // const userGroupId = currentUser.value?.assigned_user_group

  // let filteredQuestions = questions
  // if (userGroupId) {
  //   filteredQuestions = questions.filter(q => q.groupId === userGroupId)
  // }

  // if (filteredQuestions.length === 0) {
  //   alert('Sizning guruhingiz uchun test topilmadi!')
  //   return
  // }

  // testStore.startTest(filteredQuestions)
  // router.push('/test')
}

const viewResults = () => {
  router.push('/results')
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>