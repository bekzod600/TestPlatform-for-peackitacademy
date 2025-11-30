<template>
  <div class="space-y-6">

    <!-- Header Card -->
    <fwb-card class="p-6">
      <div class="flex items-center gap-3">
        <i class="mdi mdi-chart-bar text-4xl text-blue-600"></i>
        <div>
          <h1 class="text-3xl font-bold">Test natijalari</h1>
          <p class="text-gray-600">Barcha studentlarning test natijalarini ko'ring</p>
        </div>
      </div>
    </fwb-card>

    <!-- Search + Export -->
    <fwb-card class="p-6">
      <!-- <div class="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <fwb-input
          v-model="search"
          placeholder="Qidirish..."
          class="md:w-1/3"
        >
          <template #prefix>
            <i class="mdi mdi-magnify"></i>
          </template>
        </fwb-input>

        <fwb-button color="green">
          <i class="mdi mdi-microsoft-excel text-xl mr-2"></i>
          Excelga export
        </fwb-button>
      </div> -->

      <!-- Students Table -->
      <div class="overflow-x-auto">
        <fwb-table hoverable>
          <fwb-table-head>
            <fwb-table-head-cell>F.I.O</fwb-table-head-cell>
            <fwb-table-head-cell>Guruh</fwb-table-head-cell>
            <fwb-table-head-cell>Status</fwb-table-head-cell>
            <fwb-table-head-cell>Testlar</fwb-table-head-cell>
            <fwb-table-head-cell>Amal</fwb-table-head-cell>
          </fwb-table-head>

          <fwb-table-body>
            <fwb-table-row
              v-for="(item, i) in filteredStudents"
              :key="i"
              class="border-b border-gray-200"
            >
              <!-- Full Name -->
              <fwb-table-cell>
                <div class="flex items-center gap-3">
                  <fwb-avatar size="8" rounded class="bg-blue-500">
                    <i class="mdi mdi-account text-white text-lg"></i>
                  </fwb-avatar>
                  <div>
                    <p class="font-semibold text-gray-900">{{ item.full_name }}</p>
                    <p class="text-sm text-gray-500">@{{ item.username }}</p>
                  </div>
                </div>
              </fwb-table-cell>

              <!-- Group -->
              <fwb-table-cell>
                <fwb-badge v-if="item.assigned_user_group" type="yellow">
                  {{ getUserGroupName(item.assigned_user_group) }}
                </fwb-badge>
                <span v-else class="text-gray-400">—</span>
              </fwb-table-cell>

              <!-- Status -->
              <fwb-table-cell>
                <fwb-badge v-if="getTestCount(item) > 0" type="green">
                  Topshirgan
                </fwb-badge>

                <fwb-badge v-else-if="item.assigned_question_group" type="yellow">
                  Kutilmoqda
                </fwb-badge>

                <fwb-badge v-else type="red">
                  Test yo'q
                </fwb-badge>
              </fwb-table-cell>

              <!-- Test Count -->
              <fwb-table-cell>
                <fwb-badge type="blue">
                  {{ getTestCount(item) }} ta
                </fwb-badge>
              </fwb-table-cell>

              <!-- Actions -->
              <fwb-table-cell>
                <fwb-button
                  size="xs"
                  @click="viewDetails(item)"
                  :disabled="getTestCount(item) === 0"
                  class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <i class="mdi mdi-eye text-lg"></i>
                </fwb-button>
              </fwb-table-cell>
            </fwb-table-row>
          </fwb-table-body>
        </fwb-table>
      </div>
    </fwb-card>

    <!-- Test Details Modal -->
    <fwb-modal size='3xl' v-if="showDetailsDialog" @close="showDetailsDialog = false">
      <template #header>
        <div class="flex items-center gap-3 min-w-2/3">
          <i class="mdi mdi-account-circle text-3xl text-blue-600"></i>
          <h2 class="text-xl font-semibold text-gray-900">
            {{ selectedStudent?.full_name }} — Test natijalari
          </h2>
        </div>
      </template>

      <template #body>
        <!-- Info -->
        <fwb-alert type="info" class="mb-4">
          <p><strong>Username:</strong> @{{ selectedStudent?.username }}</p>
          <p><strong>Guruh:</strong> {{ getUserGroupName(selectedStudent?.assigned_user_group) }}</p>
        </fwb-alert>

        <!-- Accordion Tests -->
        <fwb-accordion v-if="selectedStudent?.completed_tests?.length" flush class="mb-4">
          <fwb-accordion-panel
            v-for="(test, i) in selectedStudent.completed_tests"
            :key="i"
          >
            <fwb-accordion-header>
              <div class="flex items-center gap-4">
                <fwb-avatar 
                  :class="test.percentage >= 60 ? 'bg-green-500' : 'bg-red-500'" 
                  size="8" 
                  rounded
                >jhknkjn
                  <span class="text-white font-bold">{{ test.percentage }}%</span>
                </fwb-avatar>
                <fwb-avatar 
                  class="bg-green-500" 
                  size="8" 
                  rounded
                >
                jhknkjn
                </fwb-avatar>
                <div>
                  <p class="font-semibold text-gray-900">
                    {{ getQuestionGroupName(test.group_id) }}
                  </p>
                  <p class="text-sm text-start text-gray-500">
                    {{ test.score }}/{{ test.total_questions }} •
                    {{ formatDate(test.completed_at) }}
                  </p>
                </div>
              </div>
            </fwb-accordion-header>
            <fwb-accordion-content>
              <div class="grid grid-cols-4 gap-4 text-center py-3">
                <div>
                  <p class="text-gray-500 text-sm mb-1">To'g'ri</p>
                  <fwb-badge type="green">{{ test.score }}</fwb-badge>
                </div>

                <div>
                  <p class="text-gray-500 text-sm mb-1">Noto'g'ri</p>
                  <fwb-badge type="red">{{ test.total_questions - test.score }}</fwb-badge>
                </div>

                <div>
                  <p class="text-gray-500 text-sm mb-1">Foiz</p>
                  <fwb-badge :type="test.percentage >= 60 ? 'green' : 'red'">
                    {{ test.percentage }}%
                  </fwb-badge>
                </div>

                <div>
                  <p class="text-gray-500 text-sm mb-1">Sana</p>
                  <span class="text-sm text-gray-700">{{ formatDate(test.completed_at) }}</span>
                </div>
              </div>
            </fwb-accordion-content>
          </fwb-accordion-panel>
        </fwb-accordion>

        <fwb-alert v-else type="warning">
          Hali test natijalari yo'q
        </fwb-alert>
      </template>

      <template #footer>
        <div class="flex justify-end">
          <fwb-button color="alternative" @click="showDetailsDialog = false">
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
  FwbInput, 
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
const search = ref('')
const showDetailsDialog = ref(false)
const selectedStudent = ref(null)

const headers = [
  { title: 'Student', key: 'full_name', sortable: true },
  { title: 'Guruh', key: 'assigned_user_group', sortable: true },
  { title: 'Status', key: 'status', sortable: false },
  { title: 'Test soni', key: 'test_count', sortable: true },
  { title: 'Amallar', key: 'actions', sortable: false, align: 'end' }
]

onMounted(async () => {
  users.value = await usersStore.loadUsers()
  userGroups.value = await usersStore.loadUserGroups()
  questionGroups.value = await questionsStore.loadQuestionGroups()
})

const filteredStudents = computed(() => {
  return users.value.filter(u => u.role === 'student')
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