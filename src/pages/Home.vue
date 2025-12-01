<template>
  <div class="min-h-screen bg-gray-100" @contextmenu.prevent @copy.prevent @cut.prevent>
    <!-- Navbar -->
    <nav class="bg-blue-600 text-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-2 text-lg font-semibold">
          <i class="mdi mdi-school text-2xl"></i>
          <span>Test Platformasi</span>
        </div>

        <div class="flex items-center space-x-4">
          <span class="flex items-center space-x-1 bg-blue-500 px-3 py-1 rounded-full">
            <i class="mdi mdi-account-circle"></i>
            <span>{{ currentUser?.full_name }}</span>
          </span>

          <button
            @click="handleLogout"
            class="flex items-center bg-red-500 px-3 py-1 rounded-lg shadow hover:bg-red-600 transition"
          >
            <i class="mdi mdi-logout mr-1"></i>
            Chiqish
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="flex justify-center items-center py-12">
      <div class="w-full max-w-[calc(100%-2rem)] md:max-w-2xl lg:max-w-3xl xl:max-w-4xl  bg-white shadow-xl rounded-2xl p-8">
        
        <div class="text-center">
          <div class="mx-auto w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
            <i class="mdi mdi-account-circle text-white text-5xl"></i>
          </div>

          <h2 class="text-3xl font-bold mt-4">Xush kelibsiz, {{ currentUser?.full_name }}!</h2>
          <p class="text-gray-600 mt-2">
            Testni boshlash yoki natijalarni ko'rish uchun tanlang.
          </p>

          <div v-if="userGroupName" class="inline-flex items-center mt-4 px-4 py-1 bg-blue-100 text-blue-800 rounded-full">
            <i class="mdi mdi-account-group mr-1"></i>
            Guruh: {{ userGroupName }}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">

          <!-- Start Test -->
          <button
            @click="startTest"
            :disabled="loading"
            class="cursor-pointer bg-blue-600 text-white rounded-xl p-6 shadow-md hover:bg-blue-700 transition text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i class="mdi mdi-clipboard-text text-6xl mb-4 block"></i>
            <h3 class="text-xl font-semibold">
              <i v-if="loading" class="mdi mdi-loading mdi-spin"></i>
              <span v-else>Testni boshlash</span>
            </h3>
            <p class="text-blue-100 mt-1">Yangi test topshirish</p>
          </button>

          <!-- Results -->
          <button
            @click="viewResults"
            class="cursor-pointer bg-green-600 text-white rounded-xl p-6 shadow-md hover:bg-green-700 transition text-center"
          >
            <i class="mdi mdi-chart-bar text-6xl mb-4 block"></i>
            <h3 class="text-xl font-semibold">Natijalar</h3>
            <p class="text-green-100 mt-1">Test natijalarini ko'rish</p>
          </button>

        </div>
      </div>
    </div>

    <!-- Snackbar -->
    <transition name="fade">
      <div
        v-if="snackbar.show"
        :class="[
          'fixed bottom-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg text-white font-medium transition z-50',
          snackbar.type === 'error' ? 'bg-red-600' : '',
          snackbar.type === 'warning' ? 'bg-yellow-600' : '',
          snackbar.type === 'success' ? 'bg-green-600' : ''
        ]"
      >
        {{ snackbar.message }}
      </div>
    </transition>
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
const loading = ref(false)
const snackbar = ref({ show: false, message: '', type: 'success' })

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

// Savollarni shuffle qilish funksiyasi
const shuffleArray = (array) => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const startTest = async () => {
  // Foydalanuvchiga test biriktirilganmi tekshirish
  if (!currentUser.value?.assigned_question_group) {
    showSnackbar("Sizga hali test biriktirilmagan! Admin bilan bog'laning.", 'warning')
    return
  }

  loading.value = true
  try {
    const questions = await questionsStore.loadQuestions()
    const questionGroupId = currentUser.value.assigned_question_group

    let filteredQuestions = questions.filter(q => q.group_id === questionGroupId)
    
    if (filteredQuestions.length === 0) {
      showSnackbar("Sizning test guruhingizda savollar mavjud emas!", 'error')
      return
    }
    // Savollarni shuffle qilish
    let shuffledQuestions = shuffleArray(filteredQuestions)
    
    // Maksimum 50 ta savol olish
    if (shuffledQuestions.length > 50) {
      shuffledQuestions = shuffledQuestions.slice(0, 50)
    }
    
    testStore.startTest(filteredQuestions)
    router.push('/test')
  } finally {
    loading.value = false
  }
}

const viewResults = () => {
  router.push('/results')
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