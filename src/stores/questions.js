import { defineStore } from 'pinia'
import { ref } from 'vue'
import { queryDB, queryDBSingle } from '../lib/neon'

export const useQuestionsStore = defineStore('questions', () => {
  const questions = ref([])
  const categories = ref([])
  const questionGroups = ref([])

  const loadQuestions = async () => {
    try {
      const { data, error } = await queryDB('SELECT * FROM questions ORDER BY id ASC')
      
      if (error) throw error
      questions.value = (data || []).map(q => ({
        ...q,
        answers: typeof q.answers === 'string' ? JSON.parse(q.answers) : q.answers
      }))
      return data
    } catch (error) {
      console.error('Error loading questions:', error)
      return []
    }
  }

  const loadCategories = async () => {
    try {
      const { data, error } = await queryDB('SELECT * FROM categories ORDER BY id ASC')
      
      if (error) throw error
      categories.value = data || []
      return data
    } catch (error) {
      console.error('Error loading categories:', error)
      return []
    }
  }

  const loadQuestionGroups = async () => {
    try {
      const { data, error } = await queryDB('SELECT * FROM question_groups ORDER BY id ASC')
      
      if (error) throw error
      questionGroups.value = data || []
      return data
    } catch (error) {
      console.error('Error loading question groups:', error)
      return []
    }
  }

  const addQuestionGroup = async (newGroup) => {
    try {
      const groupData = {
        ...newGroup,
        duration_minutes: newGroup.duration_minutes || 60,
        questions_count: newGroup.questions_count || 50
      }
      
      const columns = Object.keys(groupData).join(', ')
      const values = Object.values(groupData)
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
      
      const { data, error } = await queryDBSingle(
        `INSERT INTO question_groups (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      )

      if (error) throw error
      
      questionGroups.value.push(data)
      return data
    } catch (error) {
      console.error('Error adding question group:', error)
      return null
    }
  }

  const editQuestionGroup = async (id, updatedGroup) => {
    try {
      const setClauses = Object.keys(updatedGroup).map((key, i) => `${key} = $${i + 1}`).join(', ')
      const values = Object.values(updatedGroup)
      
      const { data, error } = await queryDBSingle(
        `UPDATE question_groups SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
      )

      if (error) throw error

      const index = questionGroups.value.findIndex(g => g.id === id)
      if (index !== -1) {
        questionGroups.value[index] = data
      }

      return data
    } catch (error) {
      console.error('Error editing question group:', error)
      return null
    }
  }

  const deleteQuestionGroup = async (id) => {
    try {
      const { error } = await queryDB('DELETE FROM question_groups WHERE id = $1', [id])

      if (error) throw error

      const index = questionGroups.value.findIndex(g => g.id === id)
      if (index !== -1) {
        questionGroups.value.splice(index, 1)
      }
      return true
    } catch (error) {
      console.error('Error deleting question group:', error)
      return false
    }
  }

  const filterByGroup = (groupId) => {
    return questions.value.filter(q => q.group_id === groupId)
  }

  const addQuestion = async (newQuestion) => {
    try {
      const columns = Object.keys(newQuestion).join(', ')
      const values = Object.values(newQuestion)
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
      
      const { data, error } = await queryDBSingle(
        `INSERT INTO questions (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
      )

      if (error) throw error
      
      questions.value.push(data)
      return data
    } catch (error) {
      console.error('Error adding question:', error)
      return null
    }
  }

  const editQuestion = async (id, updatedQuestion) => {
    try {
      const setClauses = Object.keys(updatedQuestion).map((key, i) => `${key} = $${i + 1}`).join(', ')
      const values = Object.values(updatedQuestion)
      
      const { data, error } = await queryDBSingle(
        `UPDATE questions SET ${setClauses} WHERE id = $${values.length + 1} RETURNING *`,
        [...values, id]
      )

      if (error) throw error

      const index = questions.value.findIndex(q => q.id === id)
      if (index !== -1) {
        questions.value[index] = data
      }

      return data
    } catch (error) {
      console.error('Error editing question:', error)
      return null
    }
  }

  const deleteQuestion = async (id) => {
    try {
      const { error } = await queryDB('DELETE FROM questions WHERE id = $1', [id])

      if (error) throw error

      const index = questions.value.findIndex(q => q.id === id)
      if (index !== -1) {
        questions.value.splice(index, 1)
      }
      return true
    } catch (error) {
      console.error('Error deleting question:', error)
      return false
    }
  }

  return {
    questions,
    categories,
    questionGroups,
    loadQuestions,
    loadCategories,
    loadQuestionGroups,
    addQuestionGroup,
    editQuestionGroup,
    deleteQuestionGroup,
    filterByGroup,
    addQuestion,
    editQuestion,
    deleteQuestion
  }
})
