<template>
  <div class="space-y-4 sm:space-y-6 lg:space-y-8">
    <div class="flex flex-col gap-2 sm:gap-4">
      <h2 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-2">
        <i class="mdi mdi-link-variant text-blue-600 text-2xl sm:text-3xl lg:text-4xl"></i>
        <span>Guruhlarga test biriktirish</span>
      </h2>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
      <!-- LEFT: Groups list -->
      <div class="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6">
        <h3 class="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <i class="mdi mdi-account-group text-blue-600 text-lg sm:text-xl"></i>
          <span>O'quv markaz guruhlari</span>
        </h3>

        <div class="space-y-2">
          <div
            v-for="group in userGroups"
            :key="group.id"
            @click="selectGroup(group)"
            class="flex flex-col gap-2 p-3 sm:p-4 cursor-pointer hover:bg-gray-50 active:bg-blue-50 transition rounded-lg border"
            :class="selectedGroup?.id === group.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'border-gray-200'"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm sm:text-base text-gray-800 line-clamp-2">
                  {{ group.name }}
                </p>
                <p class="text-xs sm:text-sm text-gray-500 mt-0.5">
                  <i class="mdi mdi-account-multiple text-xs"></i>
                  {{ getStudentCount(group.id) }} ta student
                </p>
                
                <!-- Test vaqti ko'rsatish -->
                <div v-if="group.test_start_time && group.test_end_time" class="mt-2 text-xs text-gray-600">
                  <div class="flex items-center gap-1">
                    <i class="mdi mdi-calendar-clock"></i>
                    <span>{{ formatDateTime(group.test_start_time) }}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <i class="mdi mdi-arrow-down"></i>
                    <span>{{ formatDateTime(group.test_end_time) }}</span>
                  </div>
                  
                  <!-- Status badge -->
                  <div class="mt-1">
                    <span 
                      class="px-2 py-0.5 rounded text-xs font-medium"
                      :class="getTestStatusClass(group)"
                    >
                      {{ getTestStatus(group) }}
                    </span>
                  </div>
                </div>
              </div>

              <span
                class="px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
                :class="group.assigned_question_group
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'"
              >
                <i class="mdi text-xs" :class="group.assigned_question_group ? 'mdi-check' : 'mdi-alert-circle'" />
                <span class="hidden sm:inline ml-1">
                  {{ group.assigned_question_group ? 'Test bor' : 'Test yo\'q' }}
                </span>
              </span>
            </div>
          </div>

          <div v-if="userGroups.length === 0" class="text-center py-6 sm:py-8">
            <i class="mdi mdi-account-group-outline text-4xl sm:text-5xl text-gray-300 mb-2 block"></i>
            <p class="text-gray-500 text-xs sm:text-sm">Hozircha guruhlar yo'q</p>
          </div>
        </div>
      </div>

      <!-- RIGHT: Assign test -->
      <div class="space-y-3 sm:space-y-4 lg:space-y-6">
        <div class="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6"
             :class="!selectedGroup ? 'opacity-60 pointer-events-none' : ''">

          <h3 class="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <i class="mdi mdi-help-circle text-blue-600 text-lg sm:text-xl"></i>
            <span>Test guruhini tanlang</span>
          </h3>

          <div v-if="!selectedGroup" class="bg-blue-50 text-blue-600 p-3 sm:p-4 rounded-lg flex items-start gap-2 sm:gap-3">
            <i class="mdi mdi-information text-lg sm:text-xl flex-shrink-0 mt-0.5"></i>
            <span class="text-xs sm:text-sm">Avval chap tomondan guruhni tanlang</span>
          </div>

          <div v-else class="space-y-3 sm:space-y-4">
            <div class="bg-green-50 text-green-700 p-3 sm:p-4 rounded-lg border border-green-200">
              <strong class="text-xs sm:text-sm font-semibold block mb-1">Tanlangan guruh:</strong>
              <p class="text-xs sm:text-sm line-clamp-2">{{ selectedGroup.name }}</p>
            </div>

            <!-- Select test group -->
            <div>
              <label class="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Test guruhini tanlang
              </label>
              <select
                v-model="selectedQuestionGroup"
                class="w-full px-3 sm:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs sm:text-sm"
              >
                <option disabled value="">Tanlang…</option>
                <option
                  v-for="qg in questionGroups"
                  :key="qg.id" :value="qg.id"
                  class="text-xs sm:text-sm"
                >
                  {{ qg.name }} — ({{ getQuestionCount(qg.id) }} ta savol, {{ qg.duration_minutes || 60 }} daqiqa)
                </option>
              </select>
            </div>

            <!-- Time range inputs -->
            <div class="space-y-3 border-t pt-3">
              <p class="text-xs sm:text-sm font-medium text-gray-700">
                <i class="mdi mdi-calendar-clock text-blue-600"></i>
                Test amal qilish vaqti
              </p>
              
              <div>
                <label class="block text-xs text-gray-600 mb-1">
                  Boshlanish vaqti
                </label>
                <input
                  v-model="testStartTime"
                  type="datetime-local"
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs sm:text-sm"
                  required
                />
              </div>

              <div>
                <label class="block text-xs text-gray-600 mb-1">
                  Tugash vaqti
                </label>
                <input
                  v-model="testEndTime"
                  type="datetime-local"
                  class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs sm:text-sm"
                  required
                />
              </div>

              <!-- Time validation warning -->
              <div v-if="testStartTime && testEndTime && !isValidTimeRange" 
                   class="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-xs flex items-start gap-2">
                <i class="mdi mdi-alert flex-shrink-0 mt-0.5"></i>
                <span>Tugash vaqti boshlanish vaqtidan kechroq bo'lishi kerak!</span>
              </div>
            </div>

            <!-- Warning -->
            <div
              v-if="selectedGroup.assigned_question_group"
              class="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded-lg flex items-start gap-2 text-xs sm:text-sm"
            >
              <i class="mdi mdi-alert flex-shrink-0 mt-0.5 text-base"></i>
              <span>Yangi test tanlansa — eski test o'chadi.</span>
            </div>

            <!-- Button -->
            <button
              @click="assignTest"
              :disabled="assigning || !selectedQuestionGroup || !testStartTime || !testEndTime || !isValidTimeRange"
              class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 sm:py-2.5 lg:py-3 rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed text-xs sm:text-sm lg:text-base font-medium flex items-center justify-center gap-2"
            >
              <i class="mdi" :class="assigning ? 'mdi-loading mdi-spin' : 'mdi-link-variant'"></i>
              {{ assigning ? 'Biriktirilmoqda...' : 'Testni biriktirish' }}
            </button>
          </div>
        </div>

        <!-- Students in group -->
        <div v-if="selectedGroup" class="bg-white rounded-xl shadow-lg p-3 sm:p-4 lg:p-6">
          <h3 class="text-base sm:text-lg lg:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <i class="mdi mdi-account-multiple text-blue-600 text-lg sm:text-xl"></i>
            <span>Guruh ichidagi studentlar</span>
          </h3>

          <div class="space-y-2">
            <div
              v-for="student in getGroupStudents(selectedGroup.id)"
              :key="student.id"
              class="p-2 sm:p-3 lg:p-4 flex items-center justify-between gap-2 hover:bg-gray-50 transition rounded-lg border border-gray-200"
            >
              <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div class="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <i class="mdi mdi-account text-blue-600 text-sm sm:text-base"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-gray-800 text-xs sm:text-sm truncate">{{ student.full_name }}</p>
                  <p class="text-xs text-gray-500 truncate">@{{ student.username }}</p>
                </div>
              </div>

              <span
                class="px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
                :class="student.assigned_question_group
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-600'"
              >
                <i class="mdi text-xs" :class="student.assigned_question_group ? 'mdi-check' : 'mdi-close'" />
                <span class="hidden sm:inline ml-1">
                  {{ student.assigned_question_group ? 'Test bor' : 'Test yo\'q' }}
                </span>
              </span>
            </div>

            <div
              v-if="getGroupStudents(selectedGroup.id).length === 0"
              class="p-6 sm:p-8 text-center text-gray-500 border border-dashed border-gray-300 rounded-lg"
            >
              <i class="mdi mdi-account-off text-3xl sm:text-4xl text-gray-300 mb-2 block"></i>
              <p class="text-xs sm:text-sm">Bu guruhda studentlar yo'q</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Snackbar -->
    <transition name="fade">
      <div
        v-if="snackbar"
        class="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md px-4 sm:px-6 py-3 rounded-lg shadow-lg text-white text-sm sm:text-base z-50"
        :class="snackbarColor === 'success' ? 'bg-green-600' : 'bg-red-600'"
      >
        {{ snackbarText }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUsersStore } from '../stores/users'
import { useQuestionsStore } from '../stores/questions'

const usersStore = useUsersStore()
const questionsStore = useQuestionsStore()

const userGroups = ref([])
const questionGroups = ref([])
const users = ref([])
const questions = ref([])

const selectedGroup = ref(null)
const selectedQuestionGroup = ref(null)
const testStartTime = ref('')
const testEndTime = ref('')
const assigning = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const isValidTimeRange = computed(() => {
  if (!testStartTime.value || !testEndTime.value) return true
  return new Date(testEndTime.value) > new Date(testStartTime.value)
})

onMounted(async () => {
  await loadData()
  setDefaultTimes()
})

const loadData = async () => {
  users.value = await usersStore.loadUsers()
  userGroups.value = await usersStore.loadUserGroups()
  questionGroups.value = await questionsStore.loadQuestionGroups()
  questions.value = await questionsStore.loadQuestions()
}

const setDefaultTimes = () => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  // Format: YYYY-MM-DDTHH:MM
  testStartTime.value = formatDateTimeLocal(now)
  testEndTime.value = formatDateTimeLocal(tomorrow)
}

const formatDateTimeLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const formatDateTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getTestStatus = (group) => {
  if (!group.test_start_time || !group.test_end_time) return ''
  
  const now = new Date()
  const start = new Date(group.test_start_time)
  const end = new Date(group.test_end_time)
  
  if (now < start) return 'Hali boshlanmagan'
  if (now > end) return 'Tugagan'
  return 'Aktiv'
}

const getTestStatusClass = (group) => {
  const status = getTestStatus(group)
  if (status === 'Aktiv') return 'bg-green-100 text-green-700'
  if (status === 'Tugagan') return 'bg-red-100 text-red-700'
  return 'bg-blue-100 text-blue-700'
}

const selectGroup = (group) => {
  selectedGroup.value = group
  selectedQuestionGroup.value = group.assigned_question_group || null
  
  if (group.test_start_time && group.test_end_time) {
    testStartTime.value = formatDateTimeLocal(new Date(group.test_start_time))
    testEndTime.value = formatDateTimeLocal(new Date(group.test_end_time))
  } else {
    setDefaultTimes()
  }
}

const getStudentCount = (groupId) => {
  return users.value.filter(u => u.assigned_user_group === groupId && u.role === 'student').length
}

const getGroupStudents = (groupId) => {
  return users.value.filter(u => u.assigned_user_group === groupId && u.role === 'student')
}

const getQuestionCount = (groupId) => {
  return questions.value.filter(q => q.group_id === groupId).length
}

const assignTest = async () => {
  if (!selectedGroup.value || !selectedQuestionGroup.value || !testStartTime.value || !testEndTime.value) {
    showSnackbar('Barcha maydonlarni to\'ldiring!', 'error')
    return
  }

  if (!isValidTimeRange.value) {
    showSnackbar('Vaqt oralig\'i noto\'g\'ri!', 'error')
    return
  }

  assigning.value = true

  try {
    const startISO = new Date(testStartTime.value).toISOString()
    const endISO = new Date(testEndTime.value).toISOString()
    
    const success = await usersStore.assignTestToGroup(
      selectedGroup.value.id,
      selectedQuestionGroup.value,
      startISO,
      endISO
    )

    if (success) {
      showSnackbar(
        `Test ${selectedGroup.value.name} guruhiga muvaffaqiyatli biriktirildi! ${getStudentCount(selectedGroup.value.id)} ta student test oldi.`, 
        'success'
      )
      
      await loadData()
      
      const updatedGroup = userGroups.value.find(g => g.id === selectedGroup.value.id)
      if (updatedGroup) {
        selectedGroup.value = updatedGroup
      }
    } else {
      showSnackbar('Xatolik yuz berdi!', 'error')
    }
  } finally {
    assigning.value = false
  }
}

const showSnackbar = (text, color) => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true

  setTimeout(() => (snackbar.value = false), 3000)
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>