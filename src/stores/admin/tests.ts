// =============================================================
// TestPlatform for Peackit Academy — Admin Tests Store (Pinia)
// =============================================================

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  TestWithDetails,
  TestInsert,
  TestUpdate,
  TestListFilters,
  PaginatedResponse,
} from '@/types'
import {
  fetchTests,
  fetchTestById,
  createTest,
  updateTest,
  deleteTest,
} from '@/api/admin.api'

export const useAdminTestsStore = defineStore('admin-tests', () => {
  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  const tests = ref<TestWithDetails[]>([])
  const selectedTest = ref<TestWithDetails | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /** Pagination metadata from the last fetchTests call. */
  const pagination = ref<PaginatedResponse<TestWithDetails>['pagination'] | null>(null)

  // ---------------------------------------------------------
  // Actions
  // ---------------------------------------------------------

  /** Load paginated tests with optional filters. */
  async function loadTests(filters: TestListFilters = {}): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const result = await fetchTests(filters)
      if (result.success) {
        tests.value = result.data
        pagination.value = result.pagination
      } else {
        error.value = result.error
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load tests'
    } finally {
      isLoading.value = false
    }
  }

  /** Fetch a single test and set it as selectedTest. */
  async function selectTest(id: number): Promise<TestWithDetails | null> {
    isLoading.value = true
    error.value = null
    try {
      const result = await fetchTestById(id)
      if (result.success && result.data) {
        selectedTest.value = result.data
        return result.data
      }
      error.value = result.error
      return null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch test'
      return null
    } finally {
      isLoading.value = false
    }
  }

  /** Create a new test. Re-fetches the list on success. */
  async function addTest(
    payload: TestInsert,
  ): Promise<{ success: boolean; error: string | null; data: TestWithDetails | null }> {
    isLoading.value = true
    error.value = null
    try {
      const result = await createTest(payload)
      if (result.success && result.data) {
        // Re-fetch the full list so we get relations populated
        await loadTests()
        return { success: true, error: null, data: { ...result.data, subject: null } as TestWithDetails }
      }
      error.value = result.error
      return { success: false, error: result.error, data: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create test'
      error.value = msg
      return { success: false, error: msg, data: null }
    } finally {
      isLoading.value = false
    }
  }

  /** Update an existing test. */
  async function editTest(
    id: number,
    payload: TestUpdate,
  ): Promise<{ success: boolean; error: string | null; data: TestWithDetails | null }> {
    isLoading.value = true
    error.value = null
    try {
      const result = await updateTest(id, payload)
      if (result.success && result.data) {
        // Update the local list
        const index = tests.value.findIndex((t) => t.id === id)
        if (index !== -1) {
          tests.value[index] = {
            ...tests.value[index],
            ...result.data,
          } as TestWithDetails
        }
        if (selectedTest.value?.id === id) {
          selectedTest.value = { ...selectedTest.value, ...result.data } as TestWithDetails
        }
        return { success: true, error: null, data: { ...result.data, subject: null } as TestWithDetails }
      }
      error.value = result.error
      return { success: false, error: result.error, data: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update test'
      error.value = msg
      return { success: false, error: msg, data: null }
    } finally {
      isLoading.value = false
    }
  }

  /** Delete a test by id. */
  async function removeTest(
    id: number,
  ): Promise<{ success: boolean; error: string | null }> {
    isLoading.value = true
    error.value = null
    try {
      const result = await deleteTest(id)
      if (result.success) {
        tests.value = tests.value.filter((t) => t.id !== id)
        if (selectedTest.value?.id === id) {
          selectedTest.value = null
        }
        return { success: true, error: null }
      }
      error.value = result.error
      return { success: false, error: result.error }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete test'
      error.value = msg
      return { success: false, error: msg }
    } finally {
      isLoading.value = false
    }
  }

  // ---------------------------------------------------------
  // Expose
  // ---------------------------------------------------------
  return {
    // State
    tests,
    selectedTest,
    isLoading,
    error,
    pagination,

    // Actions
    loadTests,
    selectTest,
    addTest,
    editTest,
    removeTest,
  }
})
