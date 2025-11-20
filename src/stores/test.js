import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useTestStore = defineStore('test', () => {
  const assignedQuestions = ref([])
  const selectedAnswers = ref({})
  const currentIndex = ref(0)
  const isTestActive = ref(false)

  const score = computed(() => {
    let correct = 0
    assignedQuestions.value.forEach(question => {
      if (selectedAnswers.value[question.id] === question.correct) {
        correct++
      }
    })
    return correct
  })

  const totalQuestions = computed(() => assignedQuestions.value.length)

  const percentage = computed(() => {
    if (totalQuestions.value === 0) return 0
    return Math.round((score.value / totalQuestions.value) * 100)
  })

  const startTest = (questions) => {
    assignedQuestions.value = [...questions]
    selectedAnswers.value = {}
    currentIndex.value = 0
    isTestActive.value = true
  }

  const selectAnswer = (questionId, answerIndex) => {
    selectedAnswers.value[questionId] = answerIndex
  }

  const nextQuestion = () => {
    if (currentIndex.value < assignedQuestions.value.length - 1) {
      currentIndex.value++
    }
  }

  const previousQuestion = () => {
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }

  const finishTest = () => {
    isTestActive.value = false
  }

  const resetTest = () => {
    assignedQuestions.value = []
    selectedAnswers.value = {}
    currentIndex.value = 0
    isTestActive.value = false
  }

  return {
    assignedQuestions,
    selectedAnswers,
    currentIndex,
    isTestActive,
    score,
    totalQuestions,
    percentage,
    startTest,
    selectAnswer,
    nextQuestion,
    previousQuestion,
    finishTest,
    resetTest
  }
})
