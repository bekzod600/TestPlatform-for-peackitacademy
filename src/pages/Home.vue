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
          <span class="hidden md:flex items-center space-x-1 bg-blue-500 px-3 py-1 rounded-full">
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
      <div class="w-full max-w-[calc(100%-2rem)] md:max-w-2xl lg:max-w-3xl xl:max-w-4xl bg-white shadow-xl rounded-2xl p-8">
        
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
            @click="showRulesModal = true"
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

    <!-- Rules Modal -->
    <transition name="fade">
      <div
        v-if="showRulesModal"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="showRulesModal = false"
      >
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="bg-blue-600 text-white p-6 rounded-t-2xl">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <i class="mdi mdi-information text-3xl"></i>
                <h3 class="text-2xl font-bold">Test qoidalari</h3>
              </div>
              <button
                @click="showRulesModal = false"
                class="text-white hover:bg-blue-700 rounded-full p-2 transition"
              >
                <i class="mdi mdi-close text-2xl"></i>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="p-6 space-y-6">
            <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <div class="flex items-start gap-3">
                <i class="mdi mdi-alert text-yellow-600 text-2xl flex-shrink-0"></i>
                <div>
                  <h4 class="font-bold text-yellow-800 mb-2">Muhim!</h4>
                  <p class="text-sm text-yellow-700">
                    Test davomida qoidalarga rioya qilmasangiz, test avtomatik yakunlanadi va natija saqlanadi.
                  </p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="mdi mdi-window-close text-red-600 text-xl"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-gray-800 mb-1">Tab almashtirmang</h4>
                  <p class="text-sm text-gray-600">
                    Test davomida boshqa tab yoki oynaga o'tishga 3 marta ruxsat. Undan ortiq bo'lsa test avtomatik yakunlanadi.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="mdi mdi-content-copy text-red-600 text-xl"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-gray-800 mb-1">Nusxa olmang</h4>
                  <p class="text-sm text-gray-600">
                    Savol yoki javoblarni copy-paste qilish, screenshot olish va matnni tanlash taqiqlanadi.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="mdi mdi-code-tags text-red-600 text-xl"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-gray-800 mb-1">Developer Tools taqiqlangan</h4>
                  <p class="text-sm text-gray-600">
                    F12, Ctrl+Shift+I va boshqa developer tools tugmalarini ishlatish taqiqlanadi.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="mdi mdi-clock-outline text-green-600 text-xl"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-gray-800 mb-1">Vaqt cheklangan</h4>
                  <p class="text-sm text-gray-600">
                    Test uchun vaqt cheklovi bor, belgilangan vaqtda testni yakunlashingiz kerak.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="mdi mdi-arrow-left-right text-green-600 text-xl"></i>
                </div>
                <div>
                  <h4 class="font-semibold text-gray-800 mb-1">Savollar o'rtasida harakat qilish</h4>
                  <p class="text-sm text-gray-600">
                    Istalgan savol tartibida javob berishingiz va oldingi savollarga qaytishingiz mumkin.
                  </p>
                </div>
              </div>
            </div>

            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p class="text-sm text-blue-800 text-center font-medium">
                Testni yakunlash tugmasini bosgandan so'ng natijalar avtomatik saqlanadi va o'zgartirib bo'lmaydi.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="p-6 bg-gray-50 rounded-b-2xl flex flex-col sm:flex-row gap-3 justify-end">
            <button
              @click="showRulesModal = false"
              class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Ortga
            </button>
            <button
              @click="acceptRulesAndStart"
              :disabled="loading"
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <i v-if="loading" class="mdi mdi-loading mdi-spin"></i>
              <i v-else class="mdi mdi-check-circle"></i>
              Tanishib chiqdim, testni boshlash
            </button>
          </div>
        </div>
      </div>
    </transition>

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
const showRulesModal = ref(false)
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

const shuffleArray = (array) => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const acceptRulesAndStart = async () => {
  if (!currentUser.value?.assigned_question_group) {
    showSnackbar("Sizga hali test biriktirilmagan! Admin bilan bog'laning.", 'warning')
    showRulesModal.value = false
    return
  }

  loading.value = true
  try {
    const questions = await questionsStore.loadQuestions()
    const questionGroupId = currentUser.value.assigned_question_group

    let filteredQuestions = questions.filter(q => q.group_id === questionGroupId)
    
    if (filteredQuestions.length === 0) {
      showSnackbar("Sizning test guruhingizda savollar mavjud emas!", 'error')
      showRulesModal.value = false
      return
    }

    let shuffledQuestions = shuffleArray(filteredQuestions)
    
    if (shuffledQuestions.length > 50) {
      shuffledQuestions = shuffledQuestions.slice(0, 50)
    }
    
    testStore.startTest(shuffledQuestions)
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