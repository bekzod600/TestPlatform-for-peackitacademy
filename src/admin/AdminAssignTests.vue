<template>
  <div class="space-y-8">

    <!-- Page header -->
    <div class="flex justify-between items-center">
      <h2 class="text-3xl font-bold text-gray-800 flex items-center gap-2">
        <i class="mdi mdi-link-variant text-blue-600 text-4xl"></i>
        Guruhlarga test biriktirish
      </h2>
    </div>

    <!-- Main grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

      <!-- LEFT: Groups list -->
      <div class="bg-white rounded-xl shadow-lg p-6">
        <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
          <i class="mdi mdi-account-group text-blue-600"></i>
          O‘quv markaz guruhlari
        </h3>

        <div class="">
          <div
            v-for="group in userGroups"
            :key="group.id"
            @click="selectGroup(group)"
            class="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition border-t border-gray-200"
            :class="selectedGroup?.id === group.id ? 'bg-blue-50' : ''"
          >
            <div class="flex items-center gap-3">
              <div>
                <p class="font-medium text-lg text-gray-800">{{ group.name }}</p>
                <p class="text-gray-500 text-sm">{{ getStudentCount(group.id) }} ta student</p>
              </div>
            </div>

            <span
              class="px-3 py-1 rounded-full text-sm font-medium"
              :class="group.assigned_question_group
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'"
            >
              <i class="mdi" :class="group.assigned_question_group ? 'mdi-check' : 'mdi-alert-circle'" />
              {{ group.assigned_question_group ? 'Test bor' : 'Test yo‘q' }}
            </span>
          </div>
        </div>
      </div>

      <!-- RIGHT: Assign test -->
      <div class="space-y-8">

        <!-- Select test card -->
        <div class="bg-white rounded-xl shadow-lg p-6"
             :class="!selectedGroup ? 'opacity-60 pointer-events-none' : ''">

          <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
            <i class="mdi mdi-help-circle text-blue-600"></i>
            Test guruhini tanlang
          </h3>

          <div v-if="!selectedGroup" class="bg-blue-50 text-blue-600 p-4 rounded-lg flex items-center gap-3">
            <i class="mdi mdi-information text-xl"></i>
            Avval chap tomondan guruhni tanlang
          </div>

          <div v-else>

            <!-- Selected group box -->
            <div class="bg-green-50 text-green-700 p-4 rounded-lg mb-5">
              <strong>Tanlangan guruh:</strong> {{ selectedGroup.name }}
            </div>

            <!-- Select test group dropdown -->
            <label class="block text-sm font-medium text-gray-700 mb-2">Test guruhini tanlang</label>
            <select
              v-model="selectedQuestionGroup"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option disabled value="">Tanlang…</option>

              <option
                v-for="qg in questionGroups"
                :key="qg.id" :value="qg.id"
              >
                {{ qg.name }} — ({{ getQuestionCount(qg.id) }} ta savol)
              </option>
            </select>

            <!-- Warning -->
            <div
              v-if="selectedGroup.assigned_question_group"
              class="bg-yellow-50 text-yellow-700 p-3 rounded-lg mt-4 flex items-center gap-2"
            >
              <i class="mdi mdi-alert"></i>
              Yangi test tanlansa — eski test o‘chadi.
            </div>

            <!-- Button -->
            <button
              @click="assignTest"
              :disabled="assigning || !selectedQuestionGroup"
              class="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition disabled:bg-gray-400"
            >
              <i class="mdi mdi-link-variant mr-1"></i>
              Testni biriktirish
            </button>
          </div>
        </div>

        <!-- Students in group -->
        <div v-if="selectedGroup" class="bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-xl font-semibold mb-4 flex items-center gap-2">
            <i class="mdi mdi-account-multiple text-blue-600"></i>
            Guruh ichidagi studentlar
          </h3>

          <div class="">
            <div
              v-for="student in getGroupStudents(selectedGroup.id)"
              :key="student.id"
              class="p-4 flex justify-between items-center hover:bg-gray-50 transition border-t border-gray-200"
            >
              <div class="flex items-center gap-3">
                <div>
                  <p class="font-medium text-gray-800">{{ student.full_name }}</p>
                  <p class="text-sm text-gray-500">@{{ student.username }}</p>
                </div>
              </div>

              <span
                class="px-3 py-1 rounded-full text-sm font-medium"
                :class="student.assigned_question_group
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-600'"
              >
                {{ student.assigned_question_group ? 'Test bor' : 'Test yo‘q' }}
              </span>
            </div>

            <div
              v-if="getGroupStudents(selectedGroup.id).length === 0"
              class="p-4 text-center text-gray-500"
            >
              Bu guruhda studentlar yo‘q
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Snackbar -->
    <transition name="fade">
      <div
        v-if="snackbar"
        class="fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-lg text-white"
        :class="snackbarColor === 'success' ? 'bg-green-600' : 'bg-red-600'"
      >
        {{ snackbarText }}
      </div>
    </transition>

  </div>
</template>



<script setup>
import { ref, onMounted, computed } from 'vue'
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
const assigning = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  users.value = await usersStore.loadUsers()
  userGroups.value = await usersStore.loadUserGroups()
  questionGroups.value = await questionsStore.loadQuestionGroups()
  questions.value = await questionsStore.loadQuestions()
}

const selectGroup = (group) => {
  selectedGroup.value = group
  selectedQuestionGroup.value = group.assigned_question_group || null
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
  if (!selectedGroup.value || !selectedQuestionGroup.value) {
    showSnackbar('Guruh va testni tanlang!', 'error')
    return
  }

  assigning.value = true

  try {
    const success = await usersStore.assignTestToGroup(
      selectedGroup.value.id,
      selectedQuestionGroup.value
    )

    if (success) {
      showSnackbar(`Test ${selectedGroup.value.name} guruhiga muvaffaqiyatli biriktirildi! ${getStudentCount(selectedGroup.value.id)} ta student test oldi.`, 'success')
      
      // Ma'lumotlarni yangilash
      await loadData()
      
      // Tanlangan guruhni yangilash
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
.cursor-pointer {
  cursor: pointer;
}
</style>