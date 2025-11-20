<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-xl font-bold text-gray-800">Test Platformasi</h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-600">{{ currentUser?.fullName }}</span>
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
      <div v-if="!testStore.isTestActive" class="bg-white rounded-lg shadow-xl p-8 text-center">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Test topilmadi</h2>
        <p class="text-gray-600 mb-6">Iltimos, avval testni boshlang.</p>
        <button
          @click="goHome"
          class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Bosh sahifaga qaytish
        </button>
      </div>

      <div v-else class="bg-white rounded-lg shadow-xl p-8">
        <div class="mb-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-800">
              Savol {{ currentIndex + 1 }} / {{ totalQuestions }}
            </h2>
            <div class="text-sm text-gray-600">
              Javob berilgan: {{ answeredCount }} / {{ totalQuestions }}
            </div>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all"
              :style="{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }"
            ></div>
          </div>
        </div>

        <div v-if="currentQuestion" class="mb-8">
          <h3 class="text-xl font-semibold text-gray-800 mb-6">
            {{ currentQuestion.question }}
          </h3>

          <div class="space-y-3">
            <label
              v-for="(answer, index) in currentQuestion.answers"
              :key="index"
              class="flex items-center p-4 border-2 rounded-lg cursor-pointer transition hover:bg-blue-50"
              :class="{
                'border-blue-600 bg-blue-50': selectedAnswers[currentQuestion.id] === index,
                'border-gray-300': selectedAnswers[currentQuestion.id] !== index
              }"
            >
              <input
                type="radio"
                :name="'question-' + currentQuestion.id"
                :value="index"
                v-model="selectedAnswers[currentQuestion.id]"
                @change="handleAnswerSelect(currentQuestion.id, index)"
                class="w-5 h-5 text-blue-600"
              />
              <span class="ml-3 text-gray-700">{{ answer }}</span>
            </label>
          </div>
        </div>

        <div class="flex justify-between items-center">
          <button
            @click="previousQuestion"
            :disabled="currentIndex === 0"
            class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Orqaga
          </button>

          <button
            v-if="currentIndex < totalQuestions - 1"
            @click="nextQuestion"
            class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Keyingi
          </button>

          <button
            v-else
            @click="finishTest"
            class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Yakunlash
          </button>
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
const currentIndex = computed(() => testStore.currentIndex)
const totalQuestions = computed(() => testStore.totalQuestions)
const currentQuestion = computed(() => testStore.assignedQuestions[testStore.currentIndex])
const selectedAnswers = computed(() => testStore.selectedAnswers)

const answeredCount = computed(() => {
  return Object.keys(selectedAnswers.value).length
})

const handleAnswerSelect = (questionId, answerIndex) => {
  testStore.selectAnswer(questionId, answerIndex)
}

const previousQuestion = () => {
  testStore.previousQuestion()
}

const nextQuestion = () => {
  testStore.nextQuestion()
}

const finishTest = () => {
  testStore.finishTest()
  router.push('/results')
}

const goHome = () => {
  router.push('/')
}
</script>
