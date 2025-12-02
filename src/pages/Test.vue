<template>
  <div class="min-h-screen bg-gray-100" @contextmenu.prevent @copy.prevent @cut.prevent @paste.prevent>
    <nav class="bg-blue-600 text-white shadow-md px-4 py-3">
      <div class="flex justify-between items-center max-w-7xl mx-auto">
        <div class="flex items-center space-x-2">
          <span class="font-semibold text-lg">Test Platformasi</span>
        </div>

        <div class="flex items-center space-x-4">
          <!-- Timer -->
          <div 
            class="flex items-center bg-white px-4 py-2 rounded-full shadow-sm"
            :class="timeRemaining <= 300 ? 'text-red-600' : 'text-blue-700'"
          >
            <i class="mdi mdi-clock-outline mr-2"></i>
            <span class="font-bold text-lg">{{ formatTime(timeRemaining) }}</span>
          </div>

          <span class="flex items-center bg-white text-blue-700 px-3 py-1 rounded-full shadow-sm">
            {{ currentUser?.full_name }}
          </span>
        </div> 
      </div>
    </nav>

    <div class="max-w-4xl mx-auto py-10 px-4">
      <div v-if="!testStore.isTestActive" class="bg-white rounded-2xl shadow-lg p-12 text-center">
        <div class="text-yellow-500 text-7xl mb-6">⚠️</div>
        <h2 class="text-3xl font-bold mb-4">Test topilmadi</h2>
        <p class="text-gray-600 mb-6">Iltimos, avval testni boshlang.</p>
        <button
          @click="goHome"
          class="bg-blue-600 text-white px-6 py-3 rounded-xl shadow hover:bg-blue-700 transition"
        >
          Bosh sahifaga qaytish
        </button>
      </div>

      <div v-else class="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div class="bg-blue-600 text-white p-6">
          <div class="flex flex-col sm:flex-row justify-between items-center">
            <div class="text-xl font-semibold mb-3 sm:mb-0">
              Savol {{ currentIndex + 1 }} / {{ totalQuestions }}
            </div>

            <div class="bg-white text-blue-700 px-4 py-1 rounded-full shadow">
              Javob berilgan: {{ answeredCount }} / {{ totalQuestions }}
            </div>
          </div>
        </div>

        <div class="w-full bg-gray-200 h-2">
          <div
            class="bg-green-500 h-2 transition-all duration-300"
            :style="{ width: ((currentIndex + 1) / totalQuestions) * 100 + '%' }"
          ></div>
        </div>

        <div class="p-8">
          <div v-if="currentQuestion">
            <div class="bg-gray-100 p-5 rounded-lg text-lg font-semibold mb-6">
              {{ currentQuestion.question }}
            </div>

            <div class="space-y-4">
              <div v-for="(answer, index) in currentQuestion.answers"
                   :key="index"
                   class="border rounded-xl p-4 cursor-pointer transition hover:bg-blue-50"
                   :class="selectedAnswers[currentQuestion.id] === index 
                            ? 'border-blue-600 bg-blue-100' 
                            : 'border-gray-300'"
                   @click="handleAnswerSelect(currentQuestion.id, index)">

                <label class="flex items-center cursor-pointer">
                  <input 
                    type="radio"
                    class="w-5 h-5 text-blue-600"
                    :value="index"
                    v-model="selectedAnswers[currentQuestion.id]"
                  />
                  <span class="ml-3 text-gray-800">{{ answer }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t p-6 flex justify-between">
          <button
            @click="previousQuestion"
            :disabled="currentIndex === 0"
            class="px-5 py-3 rounded-lg shadow bg-gray-200 hover:bg-gray-300 disabled:opacity-40 transition"
          >
            ← Orqaga
          </button>

          <button
            v-if="currentIndex < totalQuestions - 1"
            @click="nextQuestion"
            class="px-6 py-3 rounded-lg shadow bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Keyingi →
          </button>

          <button
            v-else
            @click="showFinishDialog = true"
            class="px-6 py-3 rounded-lg shadow bg-green-600 text-white hover:bg-green-700 transition"
          >
            ✓ Yakunlash
          </button>
        </div>
      </div>
    </div>

    <div v-if="showFinishDialog"
         class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
        <div class="flex items-center text-green-600 mb-4">
          <span class="text-3xl mr-2">✓</span>
          <h2 class="text-xl font-bold">Testni yakunlash</h2>
        </div>

        <p class="text-gray-700 mb-2">Testni yakunlashni xohlaysizmi?</p>
        <p class="text-gray-500 text-sm mb-6">
          Javob berilgan: {{ answeredCount }} / {{ totalQuestions }}
        </p>

        <div class="flex justify-end space-x-3">
          <button
            @click="showFinishDialog = false"
            class="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition">
            Bekor qilish
          </button>

          <button
            @click="finishTest"
            class="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition">
            Ha, yakunlash
          </button>
        </div>
      </div>
    </div>

    <div v-if="showTabWarning"
         class="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
      ⚠️ Ogohlantirish {{ tabSwitchCount }}/3: Tab almashtirmang!
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'
import { useTestStore } from '../stores/test'
import { useQuestionsStore } from '../stores/questions'

const router = useRouter()
const usersStore = useUsersStore()
const testStore = useTestStore()
const questionsStore = useQuestionsStore()

const currentUser = computed(() => usersStore.currentUser)
const currentIndex = computed(() => testStore.currentIndex)
const totalQuestions = computed(() => testStore.totalQuestions)
const currentQuestion = computed(() => testStore.assignedQuestions[testStore.currentIndex])
const selectedAnswers = computed(() => testStore.selectedAnswers)
const showFinishDialog = ref(false)

const answeredCount = computed(() => {
  return Object.keys(selectedAnswers.value).length
})

// Timer
const timeRemaining = ref(0)
let timerInterval = null

// Tab switch himoya
const tabSwitchCount = ref(0)
const maxTabSwitches = 3
const showTabWarning = ref(false)
let devToolsCheck = null

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

const startTimer = async () => {
  // Question group ma'lumotlarini olish
  const questionGroups = await questionsStore.loadQuestionGroups()
  const questionGroup = questionGroups.find(qg => qg.id === currentUser.value?.assigned_question_group)
  
  const durationMinutes = questionGroup?.duration_minutes || 60
  
  // Test boshlangan vaqtni olish
  const startedAt = currentUser.value?.test_started_at
  
  if (!startedAt) {
    timeRemaining.value = durationMinutes * 60
  } else {
    const startTime = new Date(startedAt).getTime()
    const currentTime = new Date().getTime()
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000)
    timeRemaining.value = Math.max(0, (durationMinutes * 60) - elapsedSeconds)
  }
  
  timerInterval = setInterval(() => {
    timeRemaining.value--
    
    if (timeRemaining.value <= 0) {
      clearInterval(timerInterval)
      alert('⏰ Vaqt tugadi! Test avtomatik yakunlanadi.')
      finishTestAutomatically('Vaqt tugadi')
    }
  }, 1000)
}

const checkDevTools = () => {
  const threshold = 160
  if (window.outerWidth - window.innerWidth > threshold || 
      window.outerHeight - window.innerHeight > threshold) {
    alert('⚠️ Developer Tools aniqlandi! Test yakunlanadi.')
    finishTestAutomatically('Developer Tools aniqlandi')
  }
}

const handleVisibilityChange = () => {
  if (document.hidden && testStore.isTestActive) {
    tabSwitchCount.value++
    
    showTabWarning.value = true
    setTimeout(() => {
      showTabWarning.value = false
    }, 3000)
    
    if (tabSwitchCount.value >= maxTabSwitches) {
      alert(`⚠️ Siz ${maxTabSwitches} marta tab almashtiringiz! Test avtomatik yakunlanadi.`)
      finishTestAutomatically('Qoidabuzarlik aniqlandi')
    }
  }
}

const preventScreenshot = (e) => {
  if ((e.key === 'PrintScreen') || 
      (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) ||
      (e.ctrlKey && e.key === 'p')) {
    e.preventDefault()
    alert('⚠️ Screenshot va print qilish taqiqlanadi!')
    return false
  }
}

const preventDevTools = (e) => {
  if (e.key === 'F12' || 
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && e.key === 'U')) {
    e.preventDefault()
    alert('⚠️ Developer Tools ochish taqiqlanadi!')
    return false
  }
}

const preventSelection = () => {
  const selectionStyle = document.createElement('style')
  selectionStyle.textContent = `
    * {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }
    input[type="radio"] {
      -webkit-user-select: auto !important;
      -moz-user-select: auto !important;
      -ms-user-select: auto !important;
      user-select: auto !important;
    }
  `
  document.head.appendChild(selectionStyle)
}

const finishTestAutomatically = async (reason) => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
  
  testStore.finishTest()
  
  const testResult = {
    group_id: currentQuestion.value?.group_id || currentUser.value?.assigned_question_group,
    group_name: 'Test guruhi',
    score: testStore.score,
    total_questions: testStore.totalQuestions,
    percentage: testStore.percentage,
    completed_at: new Date().toISOString(),
    finished_reason: reason
  }
  
  await usersStore.saveTestResult(currentUser.value.id, testResult)
  router.push('/results')
}

onMounted(() => {
  preventSelection()
  startTimer()
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
  document.addEventListener('keydown', preventScreenshot)
  document.addEventListener('keydown', preventDevTools)
  
  devToolsCheck = setInterval(checkDevTools, 1000)
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
  
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  document.removeEventListener('keydown', preventScreenshot)
  document.removeEventListener('keydown', preventDevTools)
  
  if (devToolsCheck) {
    clearInterval(devToolsCheck)
  }
})

const handleAnswerSelect = (questionId, answerIndex) => {
  testStore.selectAnswer(questionId, answerIndex)
}

const previousQuestion = () => {
  testStore.previousQuestion()
}

const nextQuestion = () => {
  testStore.nextQuestion()
}

const finishTest = async () => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
  
  testStore.finishTest()
  
  const testResult = {
    group_id: currentQuestion.value?.group_id || currentUser.value?.assigned_question_group,
    group_name: 'Test guruhi',
    score: testStore.score,
    total_questions: testStore.totalQuestions,
    percentage: testStore.percentage,
    completed_at: new Date().toISOString()
  }
  
  await usersStore.saveTestResult(currentUser.value.id, testResult)
  
  router.push('/results')
}

const goHome = () => {
  router.push('/')
}
</script>