// =============================================================
// TestPlatform for Peackit Academy — Admin Questions Store (Pinia)
// =============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  QuestionWithDetails,
  QuestionInsert,
  QuestionUpdate,
  QuestionListFilters,
  AnswerOption,
  AnswerOptionInsert,
  AnswerOptionUpdate,
  CategoryWithSubject,
  CategoryInsert,
  CategoryUpdate,
  Subject,
  SubjectInsert,
  SubjectUpdate,
  PaginatedResponse,
} from '@/types'
import {
  fetchQuestions,
  fetchQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  fetchOptionsForQuestion,
  createOption,
  updateOption,
  deleteOption,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '@/api/admin.api'

export const useAdminQuestionsStore = defineStore('admin-questions', () => {
  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  const questions = ref<QuestionWithDetails[]>([])
  const categories = ref<CategoryWithSubject[]>([])
  const subjects = ref<Subject[]>([])
  const selectedQuestion = ref<QuestionWithDetails | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref<PaginatedResponse<QuestionWithDetails>['pagination'] | null>(null)

  // ---------------------------------------------------------
  // Computed
  // ---------------------------------------------------------

  /** Categories grouped by subject for hierarchical dropdowns. */
  const categoriesBySubject = computed(() => {
    const map = new Map<number | null, CategoryWithSubject[]>()
    for (const cat of categories.value) {
      const key = cat.subject_id
      const list = map.get(key) ?? []
      list.push(cat)
      map.set(key, list)
    }
    return map
  })

  // ---------------------------------------------------------
  // Question Actions
  // ---------------------------------------------------------

  /** Load paginated questions with optional filters. */
  async function loadQuestions(filters: QuestionListFilters = {}): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const result = await fetchQuestions(filters)
      if (result.success) {
        questions.value = result.data
        pagination.value = result.pagination
      } else {
        error.value = result.error
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load questions'
    } finally {
      isLoading.value = false
    }
  }

  /** Fetch a single question and set it as selectedQuestion. */
  async function selectQuestion(id: number): Promise<QuestionWithDetails | null> {
    isLoading.value = true
    error.value = null
    try {
      const result = await fetchQuestionById(id)
      if (result.success && result.data) {
        selectedQuestion.value = result.data
        return result.data
      }
      error.value = result.error
      return null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch question'
      return null
    } finally {
      isLoading.value = false
    }
  }

  /** Create a new question. */
  async function addQuestion(
    payload: QuestionInsert,
  ): Promise<{ success: boolean; error: string | null; data: QuestionWithDetails | null }> {
    isLoading.value = true
    error.value = null
    try {
      const result = await createQuestion(payload)
      if (result.success && result.data) {
        // Re-fetch to get relations populated
        await loadQuestions()
        // Return the newly created question with relations by fetching it
        const detailResult = await fetchQuestionById(result.data.id)
        return {
          success: true,
          error: null,
          data: detailResult.data ?? null,
        }
      }
      error.value = result.error
      return { success: false, error: result.error, data: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create question'
      error.value = msg
      return { success: false, error: msg, data: null }
    } finally {
      isLoading.value = false
    }
  }

  /** Update an existing question. */
  async function editQuestion(
    id: number,
    payload: QuestionUpdate,
  ): Promise<{ success: boolean; error: string | null }> {
    isLoading.value = true
    error.value = null
    try {
      const result = await updateQuestion(id, payload)
      if (result.success) {
        // Update local list
        const index = questions.value.findIndex((q) => q.id === id)
        if (index !== -1) {
          questions.value[index] = { ...questions.value[index], ...result.data }
        }
        if (selectedQuestion.value?.id === id) {
          const detailResult = await fetchQuestionById(id)
          if (detailResult.data) {
            selectedQuestion.value = detailResult.data
          }
        }
        return { success: true, error: null }
      }
      error.value = result.error
      return { success: false, error: result.error }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update question'
      error.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  /** Delete a question. */
  async function removeQuestion(
    id: number,
  ): Promise<{ success: boolean; error: string | null }> {
    isLoading.value = true
    error.value = null
    try {
      const result = await deleteQuestion(id)
      if (result.success) {
        questions.value = questions.value.filter((q) => q.id !== id)
        if (selectedQuestion.value?.id === id) {
          selectedQuestion.value = null
        }
        return { success: true, error: null }
      }
      error.value = result.error
      return { success: false, error: result.error }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete question'
      error.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  // ---------------------------------------------------------
  // Answer Option Actions
  // ---------------------------------------------------------

  /** Load options for a specific question. */
  async function loadOptionsForQuestion(questionId: number): Promise<AnswerOption[]> {
    try {
      const result = await fetchOptionsForQuestion(questionId)
      return result.success && result.data ? result.data : []
    } catch {
      return []
    }
  }

  /** Add an answer option to a question. */
  async function addOption(
    payload: AnswerOptionInsert,
  ): Promise<{ success: boolean; error: string | null; data: AnswerOption | null }> {
    try {
      const result = await createOption(payload)
      if (result.success && result.data) {
        // Update selectedQuestion's options if it matches
        if (selectedQuestion.value?.id === payload.question_id) {
          selectedQuestion.value.answer_options.push(result.data)
        }
        return { success: true, error: null, data: result.data }
      }
      return { success: false, error: result.error, data: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create option'
      return { success: false, error: msg, data: null }
    }
  }

  /** Update an answer option. */
  async function editOption(
    id: number,
    payload: AnswerOptionUpdate,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const result = await updateOption(id, payload)
      if (result.success && result.data) {
        // Update selectedQuestion's options
        if (selectedQuestion.value) {
          const index = selectedQuestion.value.answer_options.findIndex((o) => o.id === id)
          if (index !== -1) {
            selectedQuestion.value.answer_options[index] = result.data
          }
        }
        return { success: true, error: null }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update option'
      return { success: false, error: msg }
    }
  }

  /** Delete an answer option. */
  async function removeOption(
    id: number,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const result = await deleteOption(id)
      if (result.success) {
        if (selectedQuestion.value) {
          selectedQuestion.value.answer_options =
            selectedQuestion.value.answer_options.filter((o) => o.id !== id)
        }
        return { success: true, error: null }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete option'
      return { success: false, error: msg }
    }
  }

  // ---------------------------------------------------------
  // Category Actions
  // ---------------------------------------------------------

  /** Load all categories. */
  async function loadCategories(): Promise<void> {
    try {
      const result = await fetchCategories()
      if (result.success && result.data) {
        categories.value = result.data
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  /** Create a new category. */
  async function addCategory(
    payload: CategoryInsert,
  ): Promise<{ success: boolean; error: string | null; data: CategoryWithSubject | null }> {
    try {
      const result = await createCategory(payload)
      if (result.success && result.data) {
        // Re-fetch to get subject relation
        await loadCategories()
        const found = categories.value.find((c) => c.id === result.data!.id) ?? null
        return { success: true, error: null, data: found }
      }
      return { success: false, error: result.error, data: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create category'
      return { success: false, error: msg, data: null }
    }
  }

  /** Update a category. */
  async function editCategory(
    id: number,
    payload: CategoryUpdate,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const result = await updateCategory(id, payload)
      if (result.success) {
        await loadCategories()
        return { success: true, error: null }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update category'
      return { success: false, error: msg }
    }
  }

  /** Delete a category. */
  async function removeCategory(
    id: number,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const result = await deleteCategory(id)
      if (result.success) {
        categories.value = categories.value.filter((c) => c.id !== id)
        return { success: true, error: null }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete category'
      return { success: false, error: msg }
    }
  }

  // ---------------------------------------------------------
  // Subject Actions
  // ---------------------------------------------------------

  /** Load all subjects. */
  async function loadSubjects(): Promise<void> {
    try {
      const result = await fetchSubjects()
      if (result.success && result.data) {
        subjects.value = result.data
      }
    } catch (err) {
      console.error('Failed to load subjects:', err)
    }
  }

  /** Create a subject. */
  async function addSubject(
    payload: SubjectInsert,
  ): Promise<{ success: boolean; error: string | null; data: Subject | null }> {
    try {
      const result = await createSubject(payload)
      if (result.success && result.data) {
        subjects.value.push(result.data)
        return { success: true, error: null, data: result.data }
      }
      return { success: false, error: result.error, data: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create subject'
      return { success: false, error: msg, data: null }
    }
  }

  /** Update a subject. */
  async function editSubject(
    id: number,
    payload: SubjectUpdate,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const result = await updateSubject(id, payload)
      if (result.success && result.data) {
        const index = subjects.value.findIndex((s) => s.id === id)
        if (index !== -1) {
          subjects.value[index] = result.data
        }
        return { success: true, error: null }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update subject'
      return { success: false, error: msg }
    }
  }

  /** Delete a subject. */
  async function removeSubject(
    id: number,
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const result = await deleteSubject(id)
      if (result.success) {
        subjects.value = subjects.value.filter((s) => s.id !== id)
        return { success: true, error: null }
      }
      return { success: false, error: result.error }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete subject'
      return { success: false, error: msg }
    }
  }

  // ---------------------------------------------------------
  // Expose
  // ---------------------------------------------------------
  return {
    // State
    questions,
    categories,
    subjects,
    selectedQuestion,
    isLoading,
    error,
    pagination,

    // Computed
    categoriesBySubject,

    // Question Actions
    loadQuestions,
    selectQuestion,
    addQuestion,
    editQuestion,
    removeQuestion,

    // Option Actions
    loadOptionsForQuestion,
    addOption,
    editOption,
    removeOption,

    // Category Actions
    loadCategories,
    addCategory,
    editCategory,
    removeCategory,

    // Subject Actions
    loadSubjects,
    addSubject,
    editSubject,
    removeSubject,
  }
})
