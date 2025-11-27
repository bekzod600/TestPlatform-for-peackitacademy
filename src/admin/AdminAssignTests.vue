<template>
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
    snackbar.value = true
    snackbarText.value = 'Guruh va testni tanlang!'
    snackbarColor.value = 'error'
    return
  }

  assigning.value = true

  try {
    const success = await usersStore.assignTestToGroup(
      selectedGroup.value.id,
      selectedQuestionGroup.value
    )

    if (success) {
      snackbar.value = true
      snackbarText.value = `Test ${selectedGroup.value.name} guruhiga muvaffaqiyatli biriktirildi! ${getStudentCount(selectedGroup.value.id)} ta student test oldi.`
      snackbarColor.value = 'success'
      
      // Ma'lumotlarni yangilash
      await loadData()
      
      // Tanlangan guruhni yangilash
      const updatedGroup = userGroups.value.find(g => g.id === selectedGroup.value.id)
      if (updatedGroup) {
        selectedGroup.value = updatedGroup
      }
    } else {
      snackbar.value = true
      snackbarText.value = 'Xatolik yuz berdi!'
      snackbarColor.value = 'error'
    }
  } finally {
    assigning.value = false
  }
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>