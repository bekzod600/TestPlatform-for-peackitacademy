<template>
<<<<<<< HEAD
  <div>
    <v-card elevation="2" class="mb-6">
      <v-card-title class="text-h4 font-weight-bold pa-6">
        <v-icon start size="large" color="primary">mdi-link-variant</v-icon>
        Guruhlarga test biriktirish
      </v-card-title>
      <v-card-subtitle class="px-6 pb-6">
        Guruhni tanlang va unga test biriktiring. Guruh ichidagi barcha studentlar avtomatik test oladi.
      </v-card-subtitle>
    </v-card>

    <v-row>
      <v-col cols="12" md="6">
        <v-card elevation="4">
          <v-card-title class="bg-grey-lighten-3 pa-4">
            <v-icon start>mdi-account-group</v-icon>
            O'quv markaz guruhlari
          </v-card-title>
          <v-card-text class="pa-0">
            <v-list>
              <v-list-item
                v-for="group in userGroups"
                :key="group.id"
                @click="selectGroup(group)"
                :active="selectedGroup?.id === group.id"
                class="cursor-pointer"
              >
                <template #prepend>
                  <v-avatar color="primary">
                    <v-icon color="white">mdi-account-multiple</v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ group.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ getStudentCount(group.id) }} ta student
                </v-list-item-subtitle>

                <template #append>
                  <v-chip
                    v-if="group.assigned_question_group"
                    color="success"
                    size="small"
                    variant="tonal"
                  >
                    <v-icon start size="small">mdi-check-circle</v-icon>
                    Test biriktirilgan
                  </v-chip>
                  <v-chip v-else color="warning" size="small" variant="tonal">
                    <v-icon start size="small">mdi-alert</v-icon>
                    Test yo'q
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card elevation="4" :disabled="!selectedGroup">
          <v-card-title class="bg-grey-lighten-3 pa-4">
            <v-icon start>mdi-help-circle</v-icon>
            Test guruhini tanlang
          </v-card-title>
          <v-card-text>
            <v-alert v-if="!selectedGroup" type="info" variant="tonal" class="mb-4">
              <v-icon start>mdi-information</v-icon>
              Avval guruh tanlang
            </v-alert>

            <div v-else>
              <v-alert type="success" variant="tonal" class="mb-4">
                <strong>Tanlangan guruh:</strong> {{ selectedGroup.name }}
              </v-alert>

              <v-select
                v-model="selectedQuestionGroup"
                label="Test guruhini tanlang"
                prepend-inner-icon="mdi-help-circle"
                :items="questionGroups"
                item-title="name"
                item-value="id"
                variant="outlined"
                color="primary"
                class="mb-4"
              >
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <v-avatar color="success">
                        <v-icon color="white">mdi-file-document</v-icon>
                      </v-avatar>
                    </template>
                    <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ getQuestionCount(item.raw.id) }} ta savol
                    </v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-select>

              <v-alert v-if="selectedGroup.assigned_question_group" type="warning" variant="tonal" class="mb-4">
                <v-icon start>mdi-alert</v-icon>
                Diqqat! Bu guruhda allaqachon test bor. Yangi test biriktirish eski testni almashtiradi.
              </v-alert>

              <v-btn
                block
                size="large"
                color="primary"
                :disabled="!selectedQuestionGroup"
                :loading="assigning"
                @click="assignTest"
              >
                <v-icon start>mdi-link-variant</v-icon>
                Testni biriktirish
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Guruh ichidagi studentlar -->
        <v-card v-if="selectedGroup" elevation="4" class="mt-6">
          <v-card-title class="bg-grey-lighten-3 pa-4">
            <v-icon start>mdi-account-multiple</v-icon>
            Guruh ichidagi studentlar
          </v-card-title>
          <v-card-text class="pa-0">
            <v-list>
              <v-list-item
                v-for="student in getGroupStudents(selectedGroup.id)"
                :key="student.id"
              >
                <template #prepend>
                  <v-avatar color="blue">
                    <v-icon color="white">mdi-account</v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ student.full_name }}</v-list-item-title>
                <v-list-item-subtitle>@{{ student.username }}</v-list-item-subtitle>

                <template #append>
                  <v-chip
                    v-if="student.assigned_question_group"
                    color="success"
                    size="small"
                    variant="tonal"
                  >
                    Test bor
                  </v-chip>
                  <v-chip v-else color="grey" size="small" variant="tonal">
                    Test yo'q
                  </v-chip>
                </template>
              </v-list-item>

              <v-list-item v-if="getGroupStudents(selectedGroup.id).length === 0">
                <v-list-item-title class="text-center text-medium-emphasis">
                  Bu guruhda hali studentlar yo'q
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

=======
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



>>>>>>> a01c4d68e7dd89f58dbe8bcfba6086cecdc9189a
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
<<<<<<< HEAD
    snackbar.value = true
    snackbarText.value = 'Guruh va testni tanlang!'
    snackbarColor.value = 'error'
=======
    showSnackbar('Guruh va testni tanlang!', 'error')
>>>>>>> a01c4d68e7dd89f58dbe8bcfba6086cecdc9189a
    return
  }

  assigning.value = true

  try {
    const success = await usersStore.assignTestToGroup(
      selectedGroup.value.id,
      selectedQuestionGroup.value
    )

    if (success) {
<<<<<<< HEAD
      snackbar.value = true
      snackbarText.value = `Test ${selectedGroup.value.name} guruhiga muvaffaqiyatli biriktirildi! ${getStudentCount(selectedGroup.value.id)} ta student test oldi.`
      snackbarColor.value = 'success'
=======
      showSnackbar(`Test ${selectedGroup.value.name} guruhiga muvaffaqiyatli biriktirildi! ${getStudentCount(selectedGroup.value.id)} ta student test oldi.`, 'success')
>>>>>>> a01c4d68e7dd89f58dbe8bcfba6086cecdc9189a
      
      // Ma'lumotlarni yangilash
      await loadData()
      
      // Tanlangan guruhni yangilash
      const updatedGroup = userGroups.value.find(g => g.id === selectedGroup.value.id)
      if (updatedGroup) {
        selectedGroup.value = updatedGroup
      }
    } else {
<<<<<<< HEAD
      snackbar.value = true
      snackbarText.value = 'Xatolik yuz berdi!'
      snackbarColor.value = 'error'
=======
      showSnackbar('Xatolik yuz berdi!', 'error')
>>>>>>> a01c4d68e7dd89f58dbe8bcfba6086cecdc9189a
    }
  } finally {
    assigning.value = false
  }
}
<<<<<<< HEAD
=======
const showSnackbar = (text, color) => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true

  setTimeout(() => (snackbar.value = false), 3000)
}
>>>>>>> a01c4d68e7dd89f58dbe8bcfba6086cecdc9189a
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>