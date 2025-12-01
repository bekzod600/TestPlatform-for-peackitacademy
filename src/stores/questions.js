import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

export const useQuestionsStore = defineStore('questions', () => {
  const questions = ref([])
  const categories = ref([])
  const questionGroups = ref([])

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('id', { ascending: true })
      
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
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('id', { ascending: true })
      
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
      const { data, error } = await supabase
        .from('question_groups')
        .select('*')
        .order('id', { ascending: true })
      
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
      const { data, error } = await supabase
        .from('question_groups')
        .insert([newGroup])
        .select()
        .single()

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
      const { data, error } = await supabase
        .from('question_groups')
        .update(updatedGroup)
        .eq('id', id)
        .select()
        .single()

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
      const { error } = await supabase
        .from('question_groups')
        .delete()
        .eq('id', id)

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
      const { data, error } = await supabase
        .from('questions')
        .insert([newQuestion])
        .select()
        .single()

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
      const { data, error } = await supabase
        .from('questions')
        .update(updatedQuestion)
        .eq('id', id)
        .select()
        .single()

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
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id)

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