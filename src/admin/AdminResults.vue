<template>
  <div class="space-y-4 sm:space-y-6 max-w-screen overflow-hidden">
    <!-- Header Card -->
    <fwb-card class="p-4 sm:p-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <i class="mdi mdi-chart-bar text-2xl sm:text-3xl lg:text-4xl text-blue-600 flex-shrink-0"></i>
          <div class="min-w-0">
            <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold truncate">Test natijalari</h1>
            <p class="text-xs sm:text-sm lg:text-base text-gray-600 truncate">Barcha studentlarning test natijalarini ko'ring</p>
          </div>
        </div>
        
        <!-- Export Button -->
        <button
          @click="exportToExcel"
          :disabled="filteredStudents.length === 0 || exporting"
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base font-medium whitespace-nowrap"
        >
          <i class="mdi" :class="exporting ? 'mdi-loading mdi-spin' : 'mdi-file-excel'"></i>
          {{ exporting ? 'Yuklanmoqda...' : 'Excel' }}
        </button>
      </div>
    </fwb-card>

    <!-- Search + Filters -->
    <fwb-card class="p-4 sm:p-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <!-- Search -->
        <div class="relative">
          <i class="mdi mdi-magnify absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-base sm:text-lg"></i>
          <input
            v-model="searchTerm"
            type="text"
            placeholder="Ism bo'yicha qidirish..."
            class="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm sm:text-base"
          />
        </div>

        <!-- Group Filter -->
        <select
          v-model="selectedGroup"
          class="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm sm:text-base"
        >
          <option value="all">Barcha guruhlar</option>
          <option v-for="group in userGroups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </div>

      <!-- Students Table - Responsive -->
      <div class="-mx-4 sm:mx-0 overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                F.I.O
              </th>
              <th class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">
                Guruh
              </th>
              <th class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden lg:table-cell">
                Testlar
              </th>
              <th class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                Oxirgi test
              </th>
              <th class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-gray-700">
                Amal
              </th>
            </tr>
          </thead>

          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="item in filteredStudents"
              :key="item.id"
              class="hover:bg-gray-50"
            >
              <!-- Full Name -->
              <td class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="mdi mdi-account text-white text-xs sm:text-sm"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-gray-900 text-xs sm:text-sm truncate">{{ item.full_name }}</p>
                    <p class="text-xs text-gray-500 truncate">@{{ item.username }}</p>
                    <!-- Mobile: Show test count -->
                    <p class="lg:hidden text-xs text-gray-500 mt-0.5">
                      <i class="mdi mdi-clipboard-text-outline"></i>
                      {{ getTestCount(item) }} ta test
                    </p>
                  </div>
                </div>
              </td>

              <!-- Group -->
              <td class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 hidden md:table-cell">
                <span v-if="item.assigned_user_group" class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs truncate max-w-[150px] inline-block">
                  {{ getUserGroupName(item.assigned_user_group) }}
                </span>
                <span v-else class="text-gray-400 text-sm">—</span>
              </td>

              <!-- Test Count -->
              <td class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 hidden lg:table-cell">
                <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {{ getTestCount(item) }} ta
                </span>
              </td>

              <!-- Last Test Result -->
              <td class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
                <div v-if="getLastTest(item)" class="space-y-1">
                  <div class="flex items-center gap-1">
                    <span class="px-2 py-0.5 rounded text-xs font-medium"
                          :class="getLastTest(item).percentage >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
                      {{ getLastTest(item).percentage }}%
                    </span>
                    <span class="text-xs text-gray-500">
                      ({{ getLastTest(item).score }}/{{ getLastTest(item).total_questions }})
                    </span>
                  </div>
                  <p class="text-xs text-gray-400">
                    {{ formatDateShort(getLastTest(item).completed_at) }}
                  </p>
                </div>
                <span v-else class="text-xs text-gray-400">Test topshirmagan</span>
              </td>

              <!-- Actions -->
              <td class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-center">
                <button
                  @click="viewDetails(item)"
                  :disabled="getTestCount(item) === 0"
                  class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <i class="mdi mdi-eye text-sm"></i>
                  <span class="hidden sm:inline ml-1">Ko'rish</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- No Results -->
      <div v-if="filteredStudents.length === 0" class="text-center py-6 sm:py-8">
        <i class="mdi mdi-account-search text-4xl sm:text-5xl text-gray-300 mb-2"></i>
        <p class="text-gray-500 text-sm sm:text-base">Hech narsa topilmadi</p>
      </div>
    </fwb-card>

    <!-- Test Details Modal -->
    <fwb-modal size="lg" position="center" v-if="showDetailsDialog" @close="showDetailsDialog = false">
      <template #header>
        <div class="flex items-center gap-2 sm:gap-3 pr-8">
          <i class="mdi mdi-account-circle text-xl sm:text-2xl lg:text-3xl text-blue-600 flex-shrink-0"></i>
          <h2 class="text-sm sm:text-base lg:text-xl font-semibold text-gray-900 truncate">
            {{ selectedStudent?.full_name }} — Test natijalari
          </h2>
        </div>
      </template>

      <template #body>
        <!-- Info -->
        <fwb-alert type="info" class="mb-4">
          <div class="text-xs sm:text-sm space-y-1">
            <p><strong>Username:</strong> @{{ selectedStudent?.username }}</p>
            <p><strong>Guruh:</strong> {{ getUserGroupName(selectedStudent?.assigned_user_group) }}</p>
          </div>
        </fwb-alert>

        <!-- Accordion Tests -->
        <fwb-accordion v-if="selectedStudent?.completed_tests?.length" flush class="mb-4">
          <fwb-accordion-panel
            v-for="(test, i) in selectedStudent.completed_tests"
            :key="i"
          >
            <fwb-accordion-header class='accordion-header-svg-px'>
              <div class="flex items-center gap-2 sm:gap-3 lg:gap-4 w-full pr-4">
                <div 
                  :class="[test.percentage >= 60 ? 'bg-green-500' : 'bg-red-500']" 
                  class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <span class="text-white font-bold text-xs sm:text-sm">{{ test.percentage }}%</span>
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-gray-900 text-xs sm:text-sm lg:text-base truncate">
                    {{ getQuestionGroupName(test.group_id) }}
                  </p>
                  <p class="text-xs sm:text-sm text-start text-gray-500 truncate">
                    {{ test.score }}/{{ test.total_questions }} •
                    {{ formatDate(test.completed_at) }}
                  </p>
                </div>
              </div>
            </fwb-accordion-header>
            <fwb-accordion-content>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 text-center py-3">
                <div>
                  <p class="text-gray-500 text-xs mb-1">To'g'ri</p>
                  <span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{{ test.score }}</span>
                </div>

                <div>
                  <p class="text-gray-500 text-xs mb-1">Noto'g'ri</p>
                  <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">{{ test.total_questions - test.score }}</span>
                </div>

                <div>
                  <p class="text-gray-500 text-xs mb-1">Foiz</p>
                  <span :class="test.percentage >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'" class="px-2 py-1 rounded text-xs">
                    {{ test.percentage }}%
                  </span>
                </div>

                <div class="col-span-2 sm:col-span-1">
                  <p class="text-gray-500 text-xs mb-1">Sana</p>
                  <span class="text-xs text-gray-700">{{ formatDate(test.completed_at) }}</span>
                </div>
              </div>

              <div v-if="test.test_started_at && test.test_ended_at" class="mt-3 pt-3 border-t border-gray-200">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>
                    <strong>Boshlangan:</strong> {{ formatDate(test.test_started_at) }}
                  </div>
                  <div>
                    <strong>Yakunlangan:</strong> {{ formatDate(test.test_ended_at) }}
                  </div>
                </div>
              </div>

              <div v-if="test.finished_reason" class="mt-3 pt-3 border-t border-gray-200">
                <fwb-alert type="warning">
                  <p class="text-xs"><strong>Sabab:</strong> {{ test.finished_reason }}</p>
                </fwb-alert>
              </div>
            </fwb-accordion-content>
          </fwb-accordion-panel>
        </fwb-accordion>

        <fwb-alert v-else type="warning">
          <p class="text-xs sm:text-sm">Hali test natijalari yo'q</p>
        </fwb-alert>
      </template>

      <template #footer>
        <div class="flex justify-end">
          <fwb-button color="alternative" @click="showDetailsDialog = false" size="sm" class="text-xs sm:text-sm">
            Yopish
          </fwb-button>
        </div>
      </template>
    </fwb-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUsersStore } from '../stores/users'
import { useQuestionsStore } from '../stores/questions'
import { 
  FwbCard, 
  FwbButton, 
  FwbTable, 
  FwbTableHead, 
  FwbTableBody, 
  FwbTableRow, 
  FwbTableCell, 
  FwbTableHeadCell,
  FwbAvatar,
  FwbBadge,
  FwbModal,
  FwbAlert,
  FwbAccordion,
  FwbAccordionPanel,
  FwbAccordionHeader,
  FwbAccordionContent
} from 'flowbite-vue'

const usersStore = useUsersStore()
const questionsStore = useQuestionsStore()

const users = ref([])
const userGroups = ref([])
const questionGroups = ref([])
const searchTerm = ref('')
const selectedGroup = ref('all')
const showDetailsDialog = ref(false)
const selectedStudent = ref(null)
const exporting = ref(false)

onMounted(async () => {
  users.value = await usersStore.loadUsers()
  userGroups.value = await usersStore.loadUserGroups()
  questionGroups.value = await questionsStore.loadQuestionGroups()
})

const filteredStudents = computed(() => {
  let filtered = users.value.filter(u => u.role === 'student')
  
  // Search by name or username
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(u => 
      u.full_name.toLowerCase().includes(search) ||
      u.username.toLowerCase().includes(search)
    )
  }
  
  // Filter by group
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

const getLastTest = (student) => {
  if (!student.completed_tests || student.completed_tests.length === 0) return null
  return student.completed_tests[student.completed_tests.length - 1]
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

const formatDateShort = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const viewDetails = (student) => {
  selectedStudent.value = student
  showDetailsDialog.value = true
}

const exportToExcel = () => {
  exporting.value = true
  
  try {
    // Prepare data
    const data = []
    
    // Add headers
    data.push([
      '№',
      'F.I.O',
      'Username',
      'Guruh',
      'Jami testlar',
      'Oxirgi test (%)',
      'Oxirgi test (ball)',
      'Oxirgi test sanasi'
    ])
    
    // Add student data
    filteredStudents.value.forEach((student, index) => {
      const lastTest = getLastTest(student)
      
      data.push([
        index + 1,
        student.full_name,
        student.username,
        getUserGroupName(student.assigned_user_group),
        getTestCount(student),
        lastTest ? `${lastTest.percentage}%` : '-',
        lastTest ? `${lastTest.score}/${lastTest.total_questions}` : '-',
        lastTest ? formatDate(lastTest.completed_at) : '-'
      ])
    })
    
    // Convert to CSV
    const csv = data.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    
    // Add BOM for UTF-8
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    
    // Create download link
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `test_natijalari_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    exporting.value = false
  }
}
</script>

<style>
.accordion-header-svg-px svg {
  width: 24px !important;
  height: 24px !important;
  min-width: 24px !important;
  min-height: 24px !important;
}
</style>