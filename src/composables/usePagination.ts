import { ref, computed } from 'vue'
import { PAGINATION } from '@/lib/constants'
import type { PaginatedResponse } from '@/types'

export interface PaginationOptions {
  /** Initial page size. Defaults to `PAGINATION.DEFAULT_PAGE_SIZE`. */
  pageSize?: number
  /** Initial page number. Defaults to `1`. */
  initialPage?: number
}

/**
 * Generic pagination composable.
 *
 * Wraps an async fetch function that returns a `PaginatedResponse<T>` and
 * exposes reactive pagination state plus navigation helpers.
 *
 * @param fetchFn - Async function that receives `(page, pageSize)` and returns
 *                  a `PaginatedResponse<T>`.
 * @param options - Optional configuration (page size, initial page).
 *
 * @example
 * ```ts
 * const { items, currentPage, totalPages, isLoading, goToPage, nextPage, prevPage, refresh } =
 *   usePagination(
 *     (page, pageSize) => api.getUsers({ page, page_size: pageSize }),
 *     { pageSize: 20 },
 *   )
 * ```
 */
export function usePagination<T>(
  fetchFn: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  options?: PaginationOptions,
) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const pageSize = ref<number>(options?.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE)
  const currentPage = ref<number>(options?.initialPage ?? 1)
  const totalCount = ref<number>(0)
  const items = ref<T[]>([]) as { value: T[] }
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const totalPages = computed<number>(() => {
    if (totalCount.value === 0) return 1
    return Math.ceil(totalCount.value / pageSize.value)
  })

  const hasNextPage = computed<boolean>(() => currentPage.value < totalPages.value)
  const hasPreviousPage = computed<boolean>(() => currentPage.value > 1)

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  async function fetchPage(page: number): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetchFn(page, pageSize.value)

      if (response.error) {
        error.value = response.error
        return
      }

      items.value = response.data
      currentPage.value = response.pagination.page
      totalCount.value = response.pagination.total_count
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'An unknown error occurred'
    } finally {
      isLoading.value = false
    }
  }

  // ---------------------------------------------------------------------------
  // Public actions
  // ---------------------------------------------------------------------------

  /** Navigate to a specific page. */
  async function goToPage(page: number): Promise<void> {
    const target = Math.max(1, Math.min(page, totalPages.value || 1))
    await fetchPage(target)
  }

  /** Navigate to the next page (no-op if already on the last page). */
  async function nextPage(): Promise<void> {
    if (hasNextPage.value) {
      await fetchPage(currentPage.value + 1)
    }
  }

  /** Navigate to the previous page (no-op if already on the first page). */
  async function prevPage(): Promise<void> {
    if (hasPreviousPage.value) {
      await fetchPage(currentPage.value - 1)
    }
  }

  /** Re-fetch the current page. */
  async function refresh(): Promise<void> {
    await fetchPage(currentPage.value)
  }

  /**
   * Change the page size and re-fetch from page 1.
   */
  async function setPageSize(size: number): Promise<void> {
    pageSize.value = size
    currentPage.value = 1
    await fetchPage(1)
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    // state
    items,
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    isLoading,
    error,
    hasNextPage,
    hasPreviousPage,
    // actions
    goToPage,
    nextPage,
    prevPage,
    refresh,
    setPageSize,
  }
}
