<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-xl font-bold text-gray-800">Test Platformasi</h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-600">{{ currentUser?.full_name }}</span>
          <button
            @click="goHome"
            class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
          >
            Bosh sahifa
          </button>
        </div>
      </div>
    </nav>

    <div class="max-w-4xl mx-auto px-4 py-12">
      <div v-if="!hasResults" class="bg-white rounded-lg shadow-xl p-8 text-center">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Natijalar topilmadi</h2>
        <p class="text-gray-600 mb-6">Siz hali test topshirmadingiz.</p>
        <button
          @click="goHome"
          class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Bosh sahifaga qaytish
        </button>
      </div>

      <div v-else class="space-y-6">
        <div class="bg-white rounded-lg shadow-xl p-8">
          <h2 class="text-3xl font-bold text-gray-800 mb-6 text-center">
            Test natijalari
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="bg-blue-50 rounded-lg p-6 text-center">
              <div class="text-3xl font-bold text-blue-600 mb-2">
                {{ testStore.score }}
              </div>
              <div class="text-gray-600">To'g'ri javoblar</div>
            </div>

            <div class="bg-green-50 rounded-lg p-6 text-center">
              <div class="text-3xl font-bold text-green-600 mb-2">
                {{ testStore.percentage }}%
              </div>
              <div class="text-gray-600">Foiz</div>
            </div>

            <div class="bg-gray-50 rounded-lg p-6 text-center">
              <div class="text-3xl font-bold text-gray-600 mb-2">
                {{ testStore.totalQuestions }}
              </div>
              <div class="text-gray-600">Jami savollar</div>
            </div>
          </div>

          <div class="flex justify-center">
            <button
              @click="goHome"
              class="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Bosh sahifaga qaytish
            </button>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-xl p-8">
          <h3 class="text-2xl font-bold text-gray-800 mb-6">
            Batafsil natijalar
          </h3>

          <div class="space-y-6">
            <div
              v-for="(question, index) in testStore.assignedQuestions"
              :key="question.id"
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="flex items-start gap-3">
                <div
                  class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                  :class="{
                    'bg-green-500': isCorrect(question),
                    'bg-red-500': !isCorrect(question)
                  }"
                >
                  {{ index + 1 }}
                </div>

                <div class="flex-1">
                  <h4 class="font-semibold text-gray-800 mb-3">
                    {{ question.question }}
                  </h4>

                  <div class="space-y-2">
                    <div
                      v-for="(answer, answerIndex) in question.answers"
                      :key="answerIndex"
                      class="p-3 rounded-lg border"
                      :class="{
                        'bg-green-50 border-green-500': answerIndex === question.correct,
                        'bg-red-50 border-red-500': answerIndex === selectedAnswers[question.id] && answerIndex !== question.correct,
                        'bg-gray-50 border-gray-200': answerIndex !== question.correct && answerIndex !== selectedAnswers[question.id]
                      }"
                    >
                      <span class="text-gray-700">{{ answer }}</span>
                      <span v-if="answerIndex === question.correct" class="ml-2 text-green-600 font-semibold">
                        (To'g'ri javob)
                      </span>
                      <span v-if="answerIndex === selectedAnswers[question.id] && answerIndex !== question.correct" class="ml-2 text-red-600 font-semibold">
                        (Sizning javobingiz)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '../stores/users'
import { useTestStore } from '../stores/test'

const router = useRouter()
const usersStore = useUsersStore()
const testStore = useTestStore()

const currentUser = computed(() => usersStore.currentUser)
const selectedAnswers = computed(() => testStore.selectedAnswers)

const hasResults = computed(() => {
  return testStore.assignedQuestions.length > 0
})

const isCorrect = (question) => {
  return selectedAnswers.value[question.id] === question.correct
}

const goHome = () => {
  router.push('/')
}
</script>
