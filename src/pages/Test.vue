<template>
  <div class="min-h-screen bg-gray-100">

    <!-- NAVBAR -->
    <nav class="bg-blue-600 text-white shadow-md px-4 py-3">
      <div class="flex justify-between items-center max-w-7xl mx-auto">

        <!-- Title -->
        <div class="flex items-center space-x-2">
          <i class="mdi mdi-school text-2xl"></i>
          <span class="font-semibold text-lg">Test Platformasi</span>
        </div>

        <!-- User -->
        <div class="flex items-center space-x-4">
          <span class="flex items-center bg-white text-blue-700 px-3 py-1 rounded-full shadow-sm">
            <i class="mdi mdi-account-circle mr-1"></i>
            {{ currentUser?.fullName }}
          </span>

          <button
            @click="goHome"
            class="flex items-center bg-white text-blue-700 px-3 py-1 rounded-lg shadow hover:bg-gray-200 transition"
          >
            <i class="mdi mdi-home mr-1"></i>
            Bosh sahifa
          </button>
        </div>
      </div>
    </nav>




    <!-- MAIN AREA -->
    <div class="max-w-4xl mx-auto py-10 px-4">

      <!-- IF TEST NOT ACTIVE -->
      <div v-if="!testStore.isTestActive"
           class="bg-white rounded-2xl shadow-lg p-12 text-center">
        
        <i class="mdi mdi-alert-circle text-yellow-500 text-7xl mb-6"></i>

        <h2 class="text-3xl font-bold mb-4">Test topilmadi</h2>
        <p class="text-gray-600 mb-6">Iltimos, avval testni boshlang.</p>

        <button
          @click="goHome"
          class="bg-blue-600 text-white px-6 py-3 rounded-xl shadow hover:bg-blue-700 transition flex items-center mx-auto"
        >
          <i class="mdi mdi-home mr-2"></i>
          Bosh sahifaga qaytish
        </button>
      </div>




      <!-- IF TEST IS ACTIVE -->
      <div v-else class="bg-white rounded-2xl shadow-lg overflow-hidden">

        <!-- Title Bar -->
        <div class="bg-blue-600 text-white p-6">
          <div class="flex flex-col sm:flex-row justify-between items-center">

            <div class="text-xl font-semibold flex items-center mb-3 sm:mb-0">
              <i class="mdi mdi-clipboard-text mr-2 text-2xl"></i>
              Savol {{ currentIndex + 1 }} / {{ totalQuestions }}
            </div>

            <div class="bg-white text-blue-700 px-4 py-1 rounded-full shadow flex items-center">
              <i class="mdi mdi-check-circle mr-1"></i>
              Javob berilgan: {{ answeredCount }} / {{ totalQuestions }}
            </div>

          </div>
        </div>


        <!-- Progress Bar -->
        <div class="w-full bg-gray-200 h-2">
          <div
            class="bg-green-500 h-2 transition-all duration-300"
            :style="{ width: ((currentIndex + 1) / totalQuestions) * 100 + '%' }"
          ></div>
        </div>


        <!-- QUESTION -->
        <div class="p-8">

          <div v-if="currentQuestion">

            <!-- Question Text -->
            <div class="bg-gray-100 p-5 rounded-lg text-lg font-semibold mb-6">
              {{ currentQuestion.question }}
            </div>


            <!-- Answers -->
            <div class="space-y-4">
              <div v-for="(answer, index) in currentQuestion.answers"
                   :key="index"
                   class="border rounded-xl p-4 cursor-pointer transition hover:bg-blue-50"
                   :class="selectedAnswers[currentQuestion.id] === index 
                            ? 'border-blue-600 bg-blue-100' 
                            : 'border-gray-300'"
                   @click="handleAnswerSelect(currentQuestion.id, index)">

                <label class="flex items-center">
                  <input 
                    type="radio"
                    class="w-5 h-5 text-blue-600"
                    :value="index"
                    v-model="selectedAnswers[currentQuestion.id]"
                  />
                  <span class="ml-3 text-gray-800">{{ answer }}</span>
                </label>
              </div>
            </div>

          </div>

        </div>


        <!-- ACTION BUTTONS -->
        <div class="border-t p-6 flex justify-between">

          <button
            @click="previousQuestion"
            :disabled="currentIndex === 0"
            class="px-5 py-3 rounded-lg shadow bg-gray-200 hover:bg-gray-300 disabled:opacity-40 flex items-center transition"
          >
            <i class="mdi mdi-arrow-left mr-1"></i>
            Orqaga
          </button>

          <button
            v-if="currentIndex < totalQuestions - 1"
            @click="nextQuestion"
            class="px-6 py-3 rounded-lg shadow bg-blue-600 text-white hover:bg-blue-700 transition flex items-center"
          >
            Keyingi
            <i class="mdi mdi-arrow-right ml-2"></i>
          </button>

          <button
            v-else
            @click="showFinishDialog = true"
            class="px-6 py-3 rounded-lg shadow bg-green-600 text-white hover:bg-green-700 transition flex items-center"
          >
            <i class="mdi mdi-check-circle mr-2"></i>
            Yakunlash
          </button>

        </div>
      </div>
    </div>




    <!-- FINISH MODAL -->
    <div v-if="showFinishDialog"
         class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">

      <div class="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in">

        <div class="flex items-center text-green-600 mb-4">
          <i class="mdi mdi-check-circle text-3xl mr-2"></i>
          <h2 class="text-xl font-bold">Testni yakunlash</h2>
        </div>

        <p class="text-gray-700 mb-2">
          Testni yakunlashni xohlaysizmi?
        </p>

        <p class="text-gray-500 text-sm mb-6">
          Javob berilgan: {{ answeredCount }} / {{ totalQuestions }}
        </p>

        <div class="flex justify-end space-x-3">
          <button
            @click="showFinishDialog = false"
            class="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition">
            Bekor qilish
          </button>

          <button
            @click="finishTest"
            class="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition">
            Ha, yakunlash
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
const showFinishDialog = ref(false)

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

const finishTest = async () => {
  testStore.finishTest()
  
  // Test natijasini saqlash
  const testResult = {
    group_id: currentQuestion.value?.group_id || currentUser.value?.assigned_question_group,
    group_name: 'Test guruhi', // Bu nom ni olish kerak
    score: testStore.score,
    total_questions: testStore.totalQuestions,
    percentage: testStore.percentage,
    completed_at: new Date().toISOString()
  }
  
  // Natijani bazaga saqlash
  await usersStore.saveTestResult(currentUser.value.id, testResult)
  
  router.push('/results')
}

const goHome = () => {
  router.push('/')
}
</script>
