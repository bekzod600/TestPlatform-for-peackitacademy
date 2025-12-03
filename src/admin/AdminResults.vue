<template>
  <div class="space-y-4 sm:space-y-6">
    <!-- Header -->
    <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <i class="mdi mdi-chart-bar text-2xl text-blue-600"></i>
        </div>
        <div>
          <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Test natijalari</h1>
          <p class="text-sm sm:text-base text-gray-600">Barcha studentlarning test natijalarini ko'ring</p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl shadow-lg p-4 sm:p-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <!-- Search -->
        <div class="relative">
          <i class="mdi mdi-magnify absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg"></i>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Ism bo'yicha qidirish..."
            class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm sm:text-base"
          />
        </div>

        <!-- Group Filter -->
        <select
          v-model="selectedGroup"
          class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm sm:text-base"
        >
          <option value="all">Barcha guruhlar</option>
          <option v-for="group in userGroups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Students Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      <div
        v-for="student in filteredStudents"
        :key="student.id"
        class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
      >
        <!-- Card Header -->
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-4 sm:p-5">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <i class="mdi mdi-account text-2xl text-blue-600"></i>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-white text-sm sm:text-base truncate">
                {{ student.full_name }}
              </h3>
              <p class="text-blue-100 text-xs sm:text-sm truncate">@{{ student.username }}</p>
            </div>
          </div>
        </div>

        <!-- Card Body -->
        <div class="p-4 sm:p-5">
          <!-- Group Badge -->
          <div class="mb-4">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
              <i class="mdi mdi-account-group"></i>
              {{ getUserGroupName(student.assigned_user_group) }}
            </span>
          </div>

          <!-- Stats -->
          <div class="space-y-3 mb-4">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600 flex items-center gap-1.5">
                <i class="mdi mdi-clipboard-text-outline text-blue-600"></i>
                Testlar soni
              </span>
              <span class="font-semibold text-gray-800">
                {{ getTestCount(student) }} ta
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600 flex items-center gap-1.5">
                <i class="mdi mdi-checkbox-marked-circle-outline text-green-600"></i>
                Status
              </span>
              <span
                class="px-2.5 py-0.5 rounded-full text-xs font-medium"
                :class="getTestCount(student) > 0 
                  ? 'bg-green-100 text-green-700' 
                  : student.assigned_question_group 
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'"
              >
                {{ getTestCount(student) > 0 ? 'Topshirgan' : student.assigned_question_group ? 'Kutilmoqda' : 'Test yo\'q' }}
              </span>
            </div>
          </div>

          <!-- Action Button -->
          <button
            @click="viewDetails(student)"
            :disabled="getTestCount(student) === 0"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <i class="mdi mdi-eye"></i>
            {{ getTestCount(student) === 0 ? 'Natijalar yo\'q' : 'Natijalarni ko\'rish' }}
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredStudents.length === 0" class="col-span-full">
        <div class="bg-white rounded-xl shadow-lg p-12 text-center">
          <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="mdi mdi-account-search text-4xl text-gray-400"></i>
          </div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">Hech narsa topilmadi</h3>
          <p class="text-gray-600">Qidiruv shartlaringizni o'zgartiring</p>
        </div>
      </div>
    </div>

    <!-- Details Modal -->
    <transition name="modal">
      <div
        v-if="showDetailsDialog"
        class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="showDetailsDialog = false"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <!-- Modal Header -->
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <i class="mdi mdi-account-circle text-2xl text-blue-600"></i>
                </div>
                <div>
                  <h2 class="text-xl sm:text-2xl font-bold text-white">
                    {{ selectedStudent?.full_name }}
                  </h2>
                  <p class="text-blue-100 text-sm">@{{ selectedStudent?.username }}</p>
                </div>
              </div>
              <button
                @click="showDetailsDialog = false"
                class="w-10 h-10 flex items-center justify-center rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition text-white"
              >
                <i class="mdi mdi-close text-xl"></i>
              </button>
            </div>
          </div>

          <!-- Modal Body -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- Student Info -->
            <div class="bg-blue-50 rounded-xl p-4 mb-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span class="text-gray-600">Username:</span>
                  <span class="font-medium text-gray-800 ml-2">@{{ selectedStudent?.username }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Guruh:</span>
                  <span class="font-medium text-gray-800 ml-2">
                    {{ getUserGroupName(selectedStudent?.assigned_user_group) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Tests List -->
            <div v-if="selectedStudent?.completed_tests?.length" class="space-y-4">
              <h3 class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <i class="mdi mdi-clipboard-text text-blue-600"></i>
                Test natijalari
              </h3>

              <div
                v-for="(test, i) in selectedStudent.completed_tests"
                :key="i"
                class="bg-white border-2 rounded-xl overflow-hidden hover:shadow-md transition"
                :class="test.percentage >= 60 ? 'border-green-200' : 'border-red-200'"
              >
                <!-- Test Header -->
                <div 
                  class="p-4 cursor-pointer"
                  :class="test.percentage >= 60 ? 'bg-green-50' : 'bg-red-50'"
                  @click="toggleTest(i)"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                      <div 
                        class="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                        :class="test.percentage >= 60 ? 'bg-green-500' : 'bg-red-500'"
                      >
                        {{ test.percentage }}%
                      </div>
                      <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-gray-800 text-sm sm:text-base truncate">
                          {{ getQuestionGroupName(test.group_id) }}
                        </h4>
                        <p class="text-xs sm:text-sm text-gray-600">
                          <i class="mdi mdi-calendar"></i>
                          {{ formatDate(test.completed_at) }}
                        </p>
                      </div>
                    </div>
                    <i 
                      class="mdi text-xl text-gray-400 transition-transform flex-shrink-0"
                      :class="[
                        expandedTests.includes(i) ? 'mdi-chevron-up' : 'mdi-chevron-down'
                      ]"
                    ></i>
                  </div>
                </div>

                <!-- Test Details (Expandable) -->
                <transition name="expand">
                  <div v-if="expandedTests.includes(i)" class="p-4 border-t">
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div class="text-center p-3 bg-green-50 rounded-lg">
                        <i class="mdi mdi-check-circle text-2xl text-green-600 mb-1"></i>
                        <p class="text-xs text-gray-600 mb-1">To'g'ri</p>
                        <p class="text-xl font-bold text-green-700">{{ test.score }}</p>
                      </div>

                      <div class="text-center p-3 bg-red-50 rounded-lg">
                        <i class="mdi mdi-close-circle text-2xl text-red-600 mb-1"></i>
                        <p class="text-xs text-gray-600 mb-1">Noto'g'ri</p>
                        <p class="text-xl font-bold text-red-700">{{ test.total_questions - test.score }}</p>
                      </div>

                      <div class="text-center p-3 bg-blue-50 rounded-lg">
                        <i class="mdi mdi-format-list-numbered text-2xl text-blue-600 mb-1"></i>
                        <p class="text-xs text-gray-600 mb-1">Jami</p>
                        <p class="text-xl font-bold text-blue-700">{{ test.total_questions }}</p>
                      </div>

                      <div class="text-center p-3 bg-purple-50 rounded-lg">
                        <i class="mdi mdi-percent text-2xl text-purple-600 mb-1"></i>
                        <p class="text-xs text-gray-600 mb-1">Foiz</p>
                        <p class="text-xl font-bold text-purple-700">{{ test.percentage }}%</p>
                      </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="mb-4">
                      <div class="flex justify-between text-xs text-gray-600 mb-2">
                        <span>Natija</span>
                        <span>{{ test.score }}/{{ test.total_questions }}</span>
                      </div>
                      <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          class="h-full rounded-full transition-all"
                          :class="test.percentage >= 60 ? 'bg-green-500' : 'bg-red-500'"
                          :style="{ width: test.percentage + '%' }"
                        ></div>
                      </div>
                    </div>

                    <!-- Additional Info -->
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                      <i class="mdi mdi-information-outline"></i>
                      <span v-if="test.finished_reason">
                        Sabab: {{ test.finished_reason }}
                      </span>
                      <span v-else>
                        Muvaffaqiyatli yakunlandi
                      </span>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <!-- No Tests -->
            <div v-else class="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 text-center">
              <i class="mdi mdi-clipboard-alert text-5xl text-yellow-600 mb-3"></i>
              <h3 class="text-lg font-semibold text-gray-800 mb-2">
                Hali test natijalari yo'q
              </h3>
              <p class="text-sm text-gray-600">
                Bu student hali birorta test topshirmagan
              </p>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="border-t p-4 sm:p-6 bg-gray-50">
            <button
              @click="showDetailsDialog = false"
              class="w-full sm:w-auto px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium"
            >
              <i class="mdi mdi-close"></i>
              Yopish
            </button>
          </div>
        </div>
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

const users = ref([])
const userGroups = ref([])
const questionGroups = ref([])
const searchTerm = ref('')
const selectedGroup = ref('all')
const showDetailsDialog = ref(false)
const selectedStudent = ref(null)
const expandedTests = ref([])

onMounted(async () => {
  users.value = await usersStore.loadUsers()
  userGroups.value = await usersStore.loadUserGroups()
  questionGroups.value = await questionsStore.loadQuestionGroups()
})

const filteredStudents = computed(() => {
  let filtered = users.value.filter(u => u.role === 'student')
  
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(u => 
      u.full_name.toLowerCase().includes(search) ||
      u.username.toLowerCase().includes(search)
    )
  }
  
  if (selectedGroup.value !== 'all') {
    filtered = filtered.filter(u => u.assigned_user_group === parseInt(selectedGroup.value))
  }
  
  return filtered
})

const getUserGroupName = (id) => {
  if (!id) return '—'
  return userGroups.value.find(g => g.id === id)?.name || 'Noma\'lum'
}

const getQuestionGroupName = (id) => {
  if (!id) return '—'
  return questionGroups.value.find(g => g.id === id)?.name || 'Noma\'lum'
}

const getTestCount = (student) => {
  return student.completed_tests?.length || 0
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const viewDetails = (student) => {
  selectedStudent.value = student
  expandedTests.value = []
  showDetailsDialog.value = true
}

const toggleTest = (index) => {
  const idx = expandedTests.value.indexOf(index)
  if (idx > -1) {
    expandedTests.value.splice(idx, 1)
  } else {
    expandedTests.value.push(index)
  }
}
</script>

<style scoped>
/* Modal Animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .bg-white,
.modal-leave-active .bg-white {
  transition: transform 0.3s ease;
}

.modal-enter-from .bg-white,
.modal-leave-to .bg-white {
  transform: scale(0.9);
}

/* Expand Animations */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
  opacity: 1;
}
</style>