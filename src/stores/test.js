import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

function shuffleArray(arr) {
  // non-mutating copy
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

  const startTest = (questions = [], opts = {}) => {
    const { maxQuestions = 50, shuffleQuestions = true, shuffleAnswers = true } = opts

    // ensure we have array
    let pool = Array.isArray(questions) ? [...questions] : []

    // normalize answers: if answers field is a JSON string, parse it
    pool = pool.map(q => {
      const answers = typeof q.answers === 'string' ? JSON.parse(q.answers) : q.answers
      return { ...q, answers: answers || [], correct: Number(q.correct) }
    })

    if (shuffleQuestions) {
      pool = shuffleArray(pool)
    }

    // limit to maxQuestions
    pool = pool.slice(0, maxQuestions)

    // shuffle answers for each question and recalc correct index
    const prepared = pool.map(q => {
      // keep original index for reference
      const answersWithIndex = q.answers.map((a, i) => ({ text: a, origIndex: i }))
      const shuffledAnswers = shuffleAnswers ? shuffleArray(answersWithIndex) : answersWithIndex
      const newAnswers = shuffledAnswers.map(x => x.text)
      const newCorrect = shuffledAnswers.findIndex(x => x.origIndex === Number(q.correct))
      return {
        ...q,
        answers: newAnswers,
        correct: newCorrect >= 0 ? newCorrect : 0 // fallback
      }
    })

    const { data: groupData } = await supabase
      .from('question_groups')
      .select('duration_minutes')
      .eq('id', groupId)
      .single()
    
    if (groupData) {
      testDuration.value = groupData.duration_minutes * 60 // daqiqani sekundga
    }

    assignedQuestions.value = prepared
    selectedAnswers.value = {}
    currentIndex.value = 0
    isTestActive.value = prepared.length > 0
  }

  const selectAnswer = (questionId, answerIndex) => {
    // ensure reactivity by replacing object
    selectedAnswers.value = {
      ...selectedAnswers.value,
      [questionId]: answerIndex
    }
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
    resetTest,
    testDuration
  }
})