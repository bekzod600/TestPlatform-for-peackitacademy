import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useQuestionsStore = defineStore('questions', () => {
  const questions = ref([])
  const categories = ref([])
  const questionGroups = ref([])

  const loadQuestions = async () => {
    try {
      const response = await fetch('/questions.json')
      const data = await response.json()
      questions.value = data
      return data
    } catch (error) {
      console.error('Error loading questions:', error)
      return []
    }
  }

  const loadCategories = async () => {
    try {
      const response = await fetch('/categories.json')
      const data = await response.json()
      categories.value = data
      return data
    } catch (error) {
      console.error('Error loading categories:', error)
      return []
    }
  }

  const loadQuestionGroups = async () => {
    try {
      const response = await fetch('/question_groups.json')
      const data = await response.json()
      questionGroups.value = data
      return data
    } catch (error) {
      console.error('Error loading question groups:', error)
      return []
    }
  }

  const filterByGroup = (groupId) => {
    return questions.value.filter(q => q.groupId === groupId)
  }

  const addQuestion = async (newQuestion) => {
    try {
      const maxId = questions.value.length > 0 ? Math.max(...questions.value.map(q => q.id)) : 0
      const questionToAdd = {
        id: maxId + 1,
        ...newQuestion
      }
      questions.value.push(questionToAdd)
      await saveQuestions()
      return questionToAdd
    } catch (error) {
      console.error('Error adding question:', error)
      return null
    }
  }

  const editQuestion = async (id, updatedQuestion) => {
    try {
      const index = questions.value.findIndex(q => q.id === id)
      if (index !== -1) {
        questions.value[index] = { ...questions.value[index], ...updatedQuestion }
        await saveQuestions()
        return questions.value[index]
      }
      return null
    } catch (error) {
      console.error('Error editing question:', error)
      return null
    }
  }

  const deleteQuestion = async (id) => {
    try {
      const index = questions.value.findIndex(q => q.id === id)
      if (index !== -1) {
        questions.value.splice(index, 1)
        await saveQuestions()
        return true
      }
      return false
    } catch (error) {
      console.error('Error deleting question:', error)
      return false
    }
  }

  const saveQuestions = async () => {
    console.log('Saving questions:', questions.value)
    return true
  }

  return {
    questions,
    categories,
    questionGroups,
    loadQuestions,
    loadCategories,
    loadQuestionGroups,
    filterByGroup,
    addQuestion,
    editQuestion,
    deleteQuestion,
    saveQuestions
  }
})
