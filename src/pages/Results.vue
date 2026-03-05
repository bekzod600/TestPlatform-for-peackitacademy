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
        <h2 class="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Natijalar topilmadi</h2>
        <p class="text-gray-600 mb-6">Siz hali test topshirmadingiz yoki barcha testlar o'chirilgan.</p>
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
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-xs sm:text-sm font-medium">Jami testlar</p>
                <p class="text-2xl sm:text-3xl font-bold text-gray-800 mt-1">{{ totalTests }}</p>
              </div>
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i class="mdi mdi-clipboard-text text-xl sm:text-2xl text-blue-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-xs sm:text-sm font-medium">O'rtacha ball</p>
                <p class="text-2xl sm:text-3xl font-bold text-gray-800 mt-1">{{ averageScore.toFixed(1) }}</p>
              </div>
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i class="mdi mdi-star text-xl sm:text-2xl text-green-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-xs sm:text-sm font-medium">O'rtacha foiz</p>
                <p class="text-2xl sm:text-3xl font-bold text-gray-800 mt-1">{{ averagePercentage.toFixed(0) }}%</p>
              </div>
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i class="mdi mdi-percent text-xl sm:text-2xl text-purple-600"></i>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-md p-4 sm:p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-500 text-xs sm:text-sm font-medium">Eng yuqori natija</p>
                <p class="text-2xl sm:text-3xl font-bold text-gray-800 mt-1">{{ bestScore }}</p>
              </div>
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <i class="mdi mdi-trophy text-xl sm:text-2xl text-yellow-600"></i>
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
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-semibold text-gray-800 mb-1 truncate">
                    {{ getQuestionGroupName(test.group_id) }}
                  </h3>
                  <p class="text-sm text-gray-500 flex items-center gap-1">
                    <i class="mdi mdi-calendar"></i>
                    {{ formatDate(test.completed_at) }}
                  </p>
                </div>
                <div
                  class="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ml-3"
                  :class="getScoreColor(test.percentage)"
                >
                  {{ test.percentage }}%
                </div>
              </div>

              <!-- Stats Grid -->
              <div class="grid grid-cols-3 gap-3 mb-4">
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

              <!-- Status Badge -->
              <div
                v-if="test.finished_reason"
                class="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 mb-4"
              >
                <i class="mdi mdi-alert-circle text-red-600 flex-shrink-0"></i>
                <span class="text-sm text-red-700 font-medium">{{ test.finished_reason }}</span>
              </div>
              <div v-else class="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 mb-4">
                <i class="mdi mdi-check-circle text-green-600 flex-shrink-0"></i>
                <span class="text-sm text-green-700 font-medium">Test muvaffaqiyatli yakunlandi</span>
              </div>

              <!-- View Answers Button -->
              <button
                v-if="test.answers && test.answers.length"
                @click="openAnswersModal(test, index)"
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-medium text-sm"
              >
                <i class="mdi mdi-format-list-checks text-base"></i>
                Javoblarni ko'rish
              </button>
              <div v-else class="text-center text-xs text-gray-400 py-1">
                <i class="mdi mdi-information-outline mr-1"></i>
                Eski test — batafsil javoblar mavjud emas
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ===================== ANSWERS REVIEW MODAL ===================== -->
    <transition name="modal-fade">
      <div
        v-if="showAnswersModal"
        class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        @click.self="closeAnswersModal"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-6">

          <!-- Modal Header -->
          <div class="sticky top-0 bg-white rounded-t-2xl border-b z-10">
            <div class="flex items-center justify-between p-5">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                     :class="getScoreColor(selectedTest?.percentage)">
                  <span class="text-white font-bold text-sm">{{ selectedTest?.percentage }}%</span>
                </div>
                <div class="min-w-0">
                  <h2 class="font-bold text-gray-900 text-base sm:text-lg truncate">
                    {{ getQuestionGroupName(selectedTest?.group_id) }}
                  </h2>
                  <p class="text-xs text-gray-500">
                    {{ selectedTest?.score }}/{{ selectedTest?.total_questions }} to'g'ri •
                    {{ formatDate(selectedTest?.completed_at) }}
                  </p>
                </div>
              </div>
              <button
                @click="closeAnswersModal"
                class="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition ml-2"
              >
                <i class="mdi mdi-close text-xl text-gray-600"></i>
              </button>
            </div>

            <!-- Filter Tabs -->
            <div class="flex gap-1 px-5 pb-3">
              <button
                v-for="tab in filterTabs"
                :key="tab.key"
                @click="activeFilter = tab.key"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                :class="activeFilter === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              >
                {{ tab.label }}
                <span class="ml-1 opacity-75">({{ tab.count }})</span>
              </button>
            </div>
          </div>

          <!-- Answers List -->
          <div class="p-4 sm:p-5 space-y-3 max-h-[65vh] overflow-y-auto">
            <div v-if="filteredAnswers.length === 0" class="text-center py-10 text-gray-400">
              <i class="mdi mdi-check-all text-4xl mb-2 block"></i>
              <p class="text-sm">Bu filtrdagi savollar yo'q</p>
            </div>

            <div
              v-for="(ans, i) in filteredAnswers"
              :key="ans.question_id"
              class="rounded-xl border p-4 transition"
              :class="ans.is_correct
                ? 'border-green-200 bg-green-50'
                : ans.selected_index === null
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-red-200 bg-red-50'"
            >
              <!-- Question header -->
              <div class="flex items-start gap-3 mb-3">
                <div class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                     :class="ans.is_correct ? 'bg-green-500' : ans.selected_index === null ? 'bg-yellow-500' : 'bg-red-500'">
                  {{ getGlobalIndex(ans) }}
                </div>
                <p class="font-medium text-gray-800 text-sm sm:text-base leading-snug">
                  {{ ans.question_text }}
                </p>
                <!-- Result icon -->
                <div class="flex-shrink-0 ml-auto">
                  <i v-if="ans.is_correct" class="mdi mdi-check-circle text-green-500 text-xl"></i>
                  <i v-else-if="ans.selected_index === null" class="mdi mdi-minus-circle text-yellow-500 text-xl"></i>
                  <i v-else class="mdi mdi-close-circle text-red-500 text-xl"></i>
                </div>
              </div>

              <!-- Options -->
              <div class="space-y-2 ml-10">
                <div
                  v-for="(option, optIdx) in ans.options"
                  :key="optIdx"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition"
                  :class="getOptionClass(ans, optIdx)"
                >
                  <!-- Option label A B C D -->
                  <span class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        :class="getOptionLabelClass(ans, optIdx)">
                    {{ String.fromCharCode(65 + optIdx) }}
                  </span>
                  <span class="flex-1">{{ option }}</span>
                  <!-- Icons -->
                  <span class="flex-shrink-0 flex items-center gap-1">
                    <!-- To'g'ri javob belgisi -->
                    <i v-if="optIdx === ans.correct_index" class="mdi mdi-check-bold text-green-600 text-base"></i>
                    <!-- Student noto'g'ri tanlov -->
                    <i v-if="optIdx === ans.selected_index && optIdx !== ans.correct_index" class="mdi mdi-close text-red-600 text-base"></i>
                  </span>
                </div>
              </div>

              <!-- Status label -->
              <div class="mt-3 ml-10">
                <span v-if="ans.is_correct" class="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                  <i class="mdi mdi-check-circle"></i> To'g'ri javob
                </span>
                <span v-else-if="ans.selected_index === null" class="inline-flex items-center gap-1 text-xs text-yellow-700 font-medium">
                  <i class="mdi mdi-minus-circle"></i> Javob berilmagan
                </span>
                <span v-else class="inline-flex items-center gap-1 text-xs text-red-700 font-medium">
                  <i class="mdi mdi-close-circle"></i>
                  Noto'g'ri — to'g'ri javob:
                  <strong>{{ String.fromCharCode(65 + ans.correct_index) }}</strong>
                </span>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="border-t p-4 sm:p-5 flex justify-between items-center bg-gray-50 rounded-b-2xl">
            <div class="flex gap-4 text-sm text-gray-600">
              <span class="flex items-center gap-1">
                <i class="mdi mdi-check-circle text-green-500"></i>
                {{ selectedTest?.score }} to'g'ri
              </span>
              <span class="flex items-center gap-1">
                <i class="mdi mdi-close-circle text-red-500"></i>
                {{ selectedTest?.total_questions - selectedTest?.score }} noto'g'ri
              </span>
              <span class="flex items-center gap-1 hidden sm:flex">
                <i class="mdi mdi-minus-circle text-yellow-500"></i>
                {{ unansweredCount }} javob berilmagan
              </span>
            </div>
            <button
              @click="closeAnswersModal"
              class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition"
            >
              Yopish
            </button>
          </div>
        </div>
      </div>
    </transition>
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

// Answers modal state
const showAnswersModal = ref(false)
const selectedTest = ref(null)
const selectedTestIndex = ref(null)
const activeFilter = ref('all')

onMounted(async () => {
  questionGroups.value = await questionsStore.loadQuestionGroups()
})

// ─── Computed ───────────────────────────────────────────────────────────────

const hasResults = computed(() =>
  currentUser.value?.completed_tests && currentUser.value.completed_tests.length > 0
)

const sortedTests = computed(() => {
  if (!hasResults.value) return []
  return [...currentUser.value.completed_tests].sort(
    (a, b) => new Date(b.completed_at) - new Date(a.completed_at)
  )
})

const totalTests      = computed(() => hasResults.value ? currentUser.value.completed_tests.length : 0)
const averageScore    = computed(() => {
  if (!hasResults.value) return 0
  return currentUser.value.completed_tests.reduce((s, t) => s + t.score, 0) / totalTests.value
})
const averagePercentage = computed(() => {
  if (!hasResults.value) return 0
  return currentUser.value.completed_tests.reduce((s, t) => s + t.percentage, 0) / totalTests.value
})
const bestScore = computed(() => {
  if (!hasResults.value) return 0
  return Math.max(...currentUser.value.completed_tests.map(t => t.score))
})

// ─── Answers modal ──────────────────────────────────────────────────────────

const filterTabs = computed(() => {
  const answers = selectedTest.value?.answers || []
  return [
    { key: 'all',       label: 'Hammasi',        count: answers.length },
    { key: 'correct',   label: '✓ To\'g\'ri',    count: answers.filter(a => a.is_correct).length },
    { key: 'wrong',     label: '✗ Noto\'g\'ri',  count: answers.filter(a => !a.is_correct && a.selected_index !== null).length },
    { key: 'skipped',   label: '— O\'tkazilgan', count: answers.filter(a => a.selected_index === null).length },
  ]
})

const filteredAnswers = computed(() => {
  const answers = selectedTest.value?.answers || []
  if (activeFilter.value === 'correct')  return answers.filter(a => a.is_correct)
  if (activeFilter.value === 'wrong')    return answers.filter(a => !a.is_correct && a.selected_index !== null)
  if (activeFilter.value === 'skipped')  return answers.filter(a => a.selected_index === null)
  return answers
})

const unansweredCount = computed(() =>
  (selectedTest.value?.answers || []).filter(a => a.selected_index === null).length
)

const getGlobalIndex = (ans) => {
  const allAnswers = selectedTest.value?.answers || []
  return allAnswers.indexOf(ans) + 1
}

const openAnswersModal = (test, index) => {
  selectedTest.value = test
  selectedTestIndex.value = index
  activeFilter.value = 'all'
  showAnswersModal.value = true
  document.body.style.overflow = 'hidden'
}

const closeAnswersModal = () => {
  showAnswersModal.value = false
  document.body.style.overflow = ''
}

// Option styling helpers
const getOptionClass = (ans, optIdx) => {
  const isCorrect  = optIdx === ans.correct_index
  const isSelected = optIdx === ans.selected_index

  if (isCorrect && isSelected) return 'bg-green-100 border border-green-400'
  if (isCorrect)               return 'bg-green-50 border border-green-300'
  if (isSelected)              return 'bg-red-100 border border-red-400'
  return 'bg-white border border-gray-200'
}

const getOptionLabelClass = (ans, optIdx) => {
  const isCorrect  = optIdx === ans.correct_index
  const isSelected = optIdx === ans.selected_index

  if (isCorrect && isSelected) return 'bg-green-500 text-white'
  if (isCorrect)               return 'bg-green-400 text-white'
  if (isSelected)              return 'bg-red-500 text-white'
  return 'bg-gray-200 text-gray-600'
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const getQuestionGroupName = (groupId) => {
  const group = questionGroups.value.find(g => g.id === groupId)
  return group?.name || 'Test guruhi'
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1)   return 'Hozir'
  if (diffMins < 60)  return `${diffMins} daqiqa oldin`
  if (diffHours < 24) return `${diffHours} soat oldin`
  if (diffDays < 7)   return `${diffDays} kun oldin`

  return date.toLocaleDateString('uz-UZ', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
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

const goHome = () => router.push('/')
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>