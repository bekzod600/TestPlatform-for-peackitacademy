<template>
  <div class="space-y-4 sm:space-y-6 max-w-screen overflow-hidden">
    <!-- Header Card -->
    <fwb-card class="p-4 sm:p-6">
      <div class="flex items-center gap-2 sm:gap-3">
        <i class="mdi mdi-chart-bar text-2xl sm:text-3xl lg:text-4xl text-blue-600 flex-shrink-0"></i>
        <div class="min-w-0">
          <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold truncate">Test natijalari</h1>
          <p class="text-xs sm:text-sm lg:text-base text-gray-600 truncate">Barcha studentlarning test natijalarini ko'ring</p>
        </div>
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
      <div class="-mx-4 sm:mx-0">
        <fwb-table hoverable class="min-w-full">
          <fwb-table-head>
            <fwb-table-head-cell class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm">
              F.I.O
            </fwb-table-head-cell>
            <fwb-table-head-cell class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm hidden md:table-cell">
              Guruh
            </fwb-table-head-cell>
            <fwb-table-head-cell class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm hidden lg:table-cell">
              Status
            </fwb-table-head-cell>
            <fwb-table-head-cell class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm hidden lg:table-cell">
              Testlar
            </fwb-table-head-cell>
            <fwb-table-head-cell class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm text-center">
              Amal
            </fwb-table-head-cell>
          </fwb-table-head>

          <fwb-table-body>
            <fwb-table-row
              v-for="item in filteredStudents"
              :key="item.id"
            >
              <!-- Full Name -->
              <fwb-table-cell class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
                <div class="flex items-center gap-2">
                  <fwb-avatar size="xs" rounded class="bg-blue-500 flex-shrink-0">
                    <i class="mdi mdi-account text-white text-xs sm:text-sm"></i>
                  </fwb-avatar>
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
              </fwb-table-cell>

              <!-- Group -->
              <fwb-table-cell class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 hidden md:table-cell">
                <fwb-badge v-if="item.assigned_user_group" type="yellow" class="text-xs">
                  <span class="truncate max-w-[120px] sm:max-w-[150px] inline-block">
                    {{ getUserGroupName(item.assigned_user_group) }}
                  </span>
                </fwb-badge>
                <span v-else class="text-gray-400 text-sm">—</span>
              </fwb-table-cell>

              <!-- Status -->
              <fwb-table-cell class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 hidden lg:table-cell">
                <fwb-badge v-if="getTestCount(item) > 0" type="green" class="text-xs">
                  <i class="mdi mdi-check-circle mr-1"></i>
                  <span class="hidden sm:inline">Topshirgan</span>
                  <span class="sm:hidden">✓</span>
                </fwb-badge>
                <fwb-badge v-else-if="item.assigned_question_group" type="yellow" class="text-xs">
                  <i class="mdi mdi-clock-outline mr-1"></i>
                  <span class="hidden sm:inline">Kutilmoqda</span>
                  <span class="sm:hidden">⏳</span>
                </fwb-badge>
                <fwb-badge v-else type="red" class="text-xs">
                  <i class="mdi mdi-close-circle mr-1"></i>
                  <span class="hidden sm:inline">Test yo'q</span>
                  <span class="sm:hidden">✗</span>
                </fwb-badge>
              </fwb-table-cell>

              <!-- Test Count -->
              <fwb-table-cell class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 hidden lg:table-cell">
                <fwb-badge type="blue" class="text-xs">
                  {{ getTestCount(item) }} ta
                </fwb-badge>
              </fwb-table-cell>

              <!-- Actions -->
              <fwb-table-cell class="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-center">
                <fwb-button
                  size="xs"
                  @click="viewDetails(item)"
                  :disabled="getTestCount(item) === 0"
                  class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <i class="mdi mdi-eye text-sm"></i>
                  <span class="hidden sm:inline ml-1">Ko'rish</span>
                </fwb-button>
              </fwb-table-cell>
            </fwb-table-row>
          </fwb-table-body>
        </fwb-table>
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
            <fwb-accordion-header class='accordion-header-svg-px  '>
              <div class="flex items-center gap-2 sm:gap-3 lg:gap-4 w-full pr-4">
                <fwb-avatar 
                  :class="[test.percentage >= 60 ? 'bg-green-500' : 'bg-red-500']" 
                  size="md" 
                  rounded
                >
                  <span class="text-white font-bold text-xs sm:text-sm">{{ test.percentage }}%</span>
                </fwb-avatar>
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
                  <fwb-badge type="green" class="text-xs">{{ test.score }}</fwb-badge>
                </div>

                <div>
                  <p class="text-gray-500 text-xs mb-1">Noto'g'ri</p>
                  <fwb-badge type="red" class="text-xs">{{ test.total_questions - test.score }}</fwb-badge>
                </div>

                <div>
                  <p class="text-gray-500 text-xs mb-1">Foiz</p>
                  <fwb-badge :type="test.percentage >= 60 ? 'green' : 'red'" class="text-xs">
                    {{ test.percentage }}%
                  </fwb-badge>
                </div>

                <div class="col-span-2 sm:col-span-1">
                  <p class="text-gray-500 text-xs mb-1">Sana</p>
                  <span class="text-xs text-gray-700">{{ formatDate(test.completed_at) }}</span>
                </div>
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
  showDetailsDialog.value = true
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