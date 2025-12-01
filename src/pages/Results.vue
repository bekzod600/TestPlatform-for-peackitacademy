<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Navbar -->
    <nav class="bg-white shadow-md">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <i class="mdi mdi-chart-box text-3xl text-blue-600"></i>
            <h1 class="text-xl sm:text-2xl font-bold text-gray-800">Test Natijalari</h1>
          </div>
          <div class="flex items-center gap-3">
            <div class="hidden sm:flex items-center gap-2 text-gray-600">
              <i class="mdi mdi-account-circle text-xl"></i>
              <span class="font-medium">{{ currentUser?.full_name }}</span>
            </div>
            <button
              @click="goHome"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <i class="mdi mdi-home"></i>
              <span class="hidden sm:inline">Bosh sahifa</span>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- No Results State -->
      <div v-if="!hasResults" class="bg-white rounded-2xl shadow-xl p-8 sm:p-12 text-center">
        <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <i class="mdi mdi-clipboard-alert text-5xl text-gray-400"></i>
        </div>
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
          Natijalar topilmadi
        </h2>
        <p class="text-gray-600 mb-6">
          Siz hali test topshirmadingiz yoki barcha testlar o'chirilgan.
        </p>
        <button
          @click="goHome"
          class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
        >
          <i class="mdi mdi-arrow-left"></i>
          Bosh sahifaga qaytish
        </button>
      </div>

      <!-- Results List -->
      <div v-else class="space-y-6">
        
        <!-- Statistics Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white rounded-xl shadow-md p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-sm font-medium">Jami testlar</p>
                <p class="text-3xl font-bold text-gray-800 mt-1">{{ totalTests }}</p>
              </div>
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i class="mdi mdi-clipboard-text text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-md p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-sm font-medium">O'rtacha ball</p>
                <p class="text-3xl font-bold text-gray-800 mt-1">{{ averageScore.toFixed(1) }}</p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i class="mdi mdi-star text-2xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-md p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-sm font-medium">O'rtacha foiz</p>
                <p class="text-3xl font-bold text-gray-800 mt-1">{{ averagePercentage.toFixed(0) }}%</p>
              </div>
              <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i class="mdi mdi-percent text-2xl text-purple-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-md p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-sm font-medium">Eng yuqori natija</p>
                <p class="text-3xl font-bold text-gray-800 mt-1">{{ bestScore }}</p>
              </div>
              <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <i class="mdi mdi-trophy text-2xl text-yellow-600"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Test Results Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            v-for="(test, index) in sortedTests"
            :key="index"
            class="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300"
          >
            <div class="p-6">
              <!-- Header -->
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-gray-800 mb-1">
                    {{ getQuestionGroupName(test.group_id) }}
                  </h3>
                  <p class="text-sm text-gray-500 flex items-center gap-1">
                    <i class="mdi mdi-calendar"></i>
                    {{ formatDate(test.completed_at) }}
                  </p>
                </div>
                <div 
                  class="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
                  :class="getScoreColor(test.percentage)"
                >
                  {{ test.percentage }}%
                </div>
              </div>

              <!-- Stats Grid -->
              <div class="grid grid-cols-3 gap-4 mb-4">
                <div class="text-center p-3 bg-green-50 rounded-lg">
                  <p class="text-xs text-green-600 font-medium mb-1">To'g'ri</p>
                  <p class="text-xl font-bold text-green-700">{{ test.score }}</p>
                </div>
                <div class="text-center p-3 bg-red-50 rounded-lg">
                  <p class="text-xs text-red-600 font-medium mb-1">Noto'g'ri</p>
                  <p class="text-xl font-bold text-red-700">{{ test.total_questions - test.score }}</p>
                </div>
                <div class="text-center p-3 bg-blue-50 rounded-lg">
                  <p class="text-xs text-blue-600 font-medium mb-1">Jami</p>
                  <p class="text-xl font-bold text-blue-700">{{ test.total_questions }}</p>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="mb-4">
                <div class="flex justify-between text-xs text-gray-600 mb-1">
                  <span>To'g'ri javoblar nisbati</span>
                  <span>{{ test.score }}/{{ test.total_questions }}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    class="h-2 rounded-full transition-all duration-300"
                    :class="getProgressColor(test.percentage)"
                    :style="{ width: test.percentage + '%' }"
                  ></div>
                </div>
              </div>

              <!-- Warning Badge (if exists) -->
              <div 
                v-if="test.finished_reason" 
                class="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2"
              >
                <i class="mdi mdi-alert-circle text-red-600"></i>
                <span class="text-sm text-red-700 font-medium">{{ test.finished_reason }}</span>
              </div>

              <!-- Status Badge -->
              <div 
                v-else
                class="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2"
              >
                <i class="mdi mdi-check-circle text-green-600"></i>
                <span class="text-sm text-green-700 font-medium">Test muvaffaqiyatli yakunlandi</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'
import { useQuestionsStore } from '../stores/questions'

const router = useRouter()
const usersStore = useUsersStore()
const questionsStore = useQuestionsStore()

const currentUser = computed(() => usersStore.currentUser)
const questionGroups = ref([])

onMounted(async () => {
  // Question groups ni yuklash (group_id dan nom olish uchun)
  questionGroups.value = await questionsStore.loadQuestionGroups()
})

const hasResults = computed(() => {
  return currentUser.value?.completed_tests && 
         currentUser.value.completed_tests.length > 0
})

const sortedTests = computed(() => {
  if (!hasResults.value) return []
  
  // Eng yangi testni birinchi ko'rsatish
  return [...currentUser.value.completed_tests].sort((a, b) => {
    return new Date(b.completed_at) - new Date(a.completed_at)
  })
})

const totalTests = computed(() => {
  return hasResults.value ? currentUser.value.completed_tests.length : 0
})

const averageScore = computed(() => {
  if (!hasResults.value) return 0
  const total = currentUser.value.completed_tests.reduce((sum, test) => sum + test.score, 0)
  return total / currentUser.value.completed_tests.length
})

const averagePercentage = computed(() => {
  if (!hasResults.value) return 0
  const total = currentUser.value.completed_tests.reduce((sum, test) => sum + test.percentage, 0)
  return total / currentUser.value.completed_tests.length
})

const bestScore = computed(() => {
  if (!hasResults.value) return 0
  return Math.max(...currentUser.value.completed_tests.map(test => test.score))
})

const getQuestionGroupName = (groupId) => {
  const group = questionGroups.value.find(g => g.id === groupId)
  return group?.name || 'Test guruhi'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Hozir'
  if (diffMins < 60) return `${diffMins} daqiqa oldin`
  if (diffHours < 24) return `${diffHours} soat oldin`
  if (diffDays < 7) return `${diffDays} kun oldin`
  
  return date.toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getScoreColor = (percentage) => {
  if (percentage >= 80) return 'bg-green-500'
  if (percentage >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

const getProgressColor = (percentage) => {
  if (percentage >= 80) return 'bg-green-500'
  if (percentage >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
/* Smooth transitions */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover effect */
.hover\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Responsive text */
@media (max-width: 640px) {
  .text-3xl {
    font-size: 1.875rem;
  }
}
</style>