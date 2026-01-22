import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const useTestStore = defineStore('test', () => {
  const assignedQuestions = ref([])
  const selectedAnswers = ref({})
  const currentIndex = ref(0)
  const isTestActive = ref(false)
  const testDuration = ref(0)
  const testStartTime = ref(null)
  const timeRemaining = ref(0)

  const score = computed(() => {
    let correct = 0
    assignedQuestions.value.forEach(question => {
      if (selectedAnswers.value[question.id] === question.correct) {
        correct++
      }
    })
    return correct
  })

  const totalQuestions = computed(() => {
    return assignedQuestions.value.length
  })

  const percentage = computed(() => {
    if (totalQuestions.value === 0) return 0
    return Math.round((score.value / totalQuestions.value) * 100)
  })

  // LocalStorage'dan test holatini yuklash
  const loadTestState = () => {
    try {
      const savedState = localStorage.getItem('activeTest')
      if (savedState) {
        const state = JSON.parse(savedState)
        assignedQuestions.value = state.assignedQuestions || []
        selectedAnswers.value = state.selectedAnswers || {}
        currentIndex.value = state.currentIndex || 0
        isTestActive.value = state.isTestActive || false
        testDuration.value = state.testDuration || 0
        testStartTime.value = state.testStartTime || null
        timeRemaining.value = state.timeRemaining || 0
        
        return true
      }
      return false
    } catch (error) {
      console.error('Error loading test state:', error)
      return false
    }
  }

  // LocalStorage'ga test holatini saqlash
  const saveTestState = () => {
    try {
      const state = {
        assignedQuestions: assignedQuestions.value,
        selectedAnswers: selectedAnswers.value,
        currentIndex: currentIndex.value,
        isTestActive: isTestActive.value,
        testDuration: testDuration.value,
        testStartTime: testStartTime.value,
        timeRemaining: timeRemaining.value
      }
      localStorage.setItem('activeTest', JSON.stringify(state))
    } catch (error) {
      console.error('Error saving test state:', error)
    }
  }

  // Test holatini o'chirish
  const clearTestState = () => {
    localStorage.removeItem('activeTest')
  }

  const startTest = async (questions = [], opts = {}) => {
    const { maxQuestions = 50, shuffleQuestions = true, shuffleAnswers = true, groupId = null } = opts

    let pool = Array.isArray(questions) ? [...questions] : []

    pool = pool.map(q => {
      const answers = typeof q.answers === 'string' ? JSON.parse(q.answers) : q.answers
      return { ...q, answers: answers || [], correct: Number(q.correct) }
    })

    if (shuffleQuestions) {
      pool = shuffleArray(pool)
    }

    pool = pool.slice(0, maxQuestions)

    const prepared = pool.map(q => {
      const answersWithIndex = q.answers.map((a, i) => ({ text: a, origIndex: i }))
      const shuffledAnswers = shuffleAnswers ? shuffleArray(answersWithIndex) : answersWithIndex
      const newAnswers = shuffledAnswers.map(x => x.text)
      const newCorrect = shuffledAnswers.findIndex(x => x.origIndex === Number(q.correct))
      return {
        ...q,
        answers: newAnswers,
        correct: newCorrect >= 0 ? newCorrect : 0
      }
    })

    if (groupId) {
      try {
        const { data: groupData, error } = await supabase
          .from('question_groups')
          .select('duration_minutes')
          .eq('id', groupId)
          .single()
        
        if (error) throw error
        
        if (groupData && groupData.duration_minutes) {
          testDuration.value = groupData.duration_minutes * 60
          timeRemaining.value = groupData.duration_minutes * 60
        } else {
          testDuration.value = 1800
          timeRemaining.value = 1800
        }
      } catch (error) {
        console.error('Error loading test duration:', error)
        testDuration.value = 1800
        timeRemaining.value = 1800
      }
    } else {
      testDuration.value = 1800
      timeRemaining.value = 1800
    }

    assignedQuestions.value = prepared
    selectedAnswers.value = {}
    currentIndex.value = 0
    isTestActive.value = prepared.length > 0
    testStartTime.value = new Date().toISOString()

    // Holatni saqlash
    saveTestState()
  }

  const selectAnswer = (questionId, answerIndex) => {
    selectedAnswers.value = {
      ...selectedAnswers.value,
      [questionId]: answerIndex
    }
    // Har safar javob tanlaganda saqlash
    saveTestState()
  }

  const nextQuestion = () => {
    if (currentIndex.value < assignedQuestions.value.length - 1) {
      currentIndex.value++
      saveTestState()
    }
  }

  const previousQuestion = () => {
    if (currentIndex.value > 0) {
      currentIndex.value--
      saveTestState()
    }
  }

  const updateTimeRemaining = (time) => {
    timeRemaining.value = time
    saveTestState()
  }

  const finishTest = () => {
    isTestActive.value = false
    clearTestState()
  }

  const resetTest = () => {
    assignedQuestions.value = []
    selectedAnswers.value = {}
    currentIndex.value = 0
    isTestActive.value = false
    testDuration.value = 0
    testStartTime.value = null
    timeRemaining.value = 0
    clearTestState()
  }

  return {
    assignedQuestions,
    selectedAnswers,
    currentIndex,
    isTestActive,
    score,
    totalQuestions,
    percentage,
    testStartTime,
    timeRemaining,
    startTest,
    selectAnswer,
    nextQuestion,
    previousQuestion,
    finishTest,
    resetTest,
    testDuration,
    loadTestState,
    saveTestState,
    clearTestState,
    updateTimeRemaining
  }
})