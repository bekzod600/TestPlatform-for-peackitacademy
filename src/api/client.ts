// =============================================================
// TestPlatform for Peackit Academy — Supabase Client Helpers
// =============================================================
// Thin wrapper around the Supabase client that provides:
//   - typed error handling via ApiResponse / PaginatedResponse
//   - session token management (localStorage)
//   - reusable query helpers (single, list, paginated, mutate)
// =============================================================

import { supabase } from '@/lib/supabase'
import { SESSION, PAGINATION } from '@/lib/constants'
import type {
  ApiResponse,
  PaginatedResponse,
  ListFilters,
} from '@/types'
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'

// -------------------------------------------------------------
// Token / Session helpers (localStorage)
// -------------------------------------------------------------

export interface StoredSession {
  user: Record<string, unknown>
  token: string
}

/** Retrieve the persisted session JSON (user + token). */
export function getStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION.STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredSession
  } catch {
    clearStoredSession()
    return null
  }
}

/** Persist user + token to localStorage. */
export function setStoredSession(session: StoredSession): void {
  localStorage.setItem(SESSION.STORAGE_KEY, JSON.stringify(session))
}

/** Remove persisted session from localStorage. */
export function clearStoredSession(): void {
  localStorage.removeItem(SESSION.STORAGE_KEY)
}

// -------------------------------------------------------------
// Generic error handling
// -------------------------------------------------------------

/** Wrap a Supabase query result into our standard ApiResponse shape. */
function wrapResponse<T>(
  data: T | null,
  error: { message: string } | null,
): ApiResponse<T> {
  if (error) {
    return { data: null, error: error.message, success: false }
  }
  return { data, error: null, success: true }
}

// -------------------------------------------------------------
// Query helpers
// -------------------------------------------------------------

/**
 * Fetch a single row from a table by id.
 * Returns `ApiResponse<T>`.
 */
export async function fetchById<T>(
  table: string,
  id: number,
  select = '*',
): Promise<ApiResponse<T>> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('id', id)
    .single()

  return wrapResponse<T>(data as T | null, error)
}

/**
 * Fetch all rows from a table (optionally filtered/ordered).
 * Returns `ApiResponse<T[]>`.
 */
export async function fetchAll<T>(
  table: string,
  select = '*',
  orderBy = 'id',
  ascending = true,
): Promise<ApiResponse<T[]>> {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order(orderBy, { ascending })

  return wrapResponse<T[]>((data as T[] | null) ?? [], error)
}

/**
 * Fetch a paginated list from a table.
 *
 * The caller can supply a `buildQuery` callback that receives the base
 * query builder and can chain `.eq()`, `.ilike()`, etc.  This keeps
 * filtering logic in the API layer.
 */
export async function fetchPaginated<T>(
  table: string,
  filters: ListFilters = {},
  select = '*',
  buildQuery?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qb: PostgrestFilterBuilder<any, any, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => PostgrestFilterBuilder<any, any, any>,
): Promise<PaginatedResponse<T>> {
  const page = filters.page ?? 1
  const pageSize = filters.page_size ?? PAGINATION.DEFAULT_PAGE_SIZE
  const sortBy = filters.sort_by ?? 'id'
  const sortOrder = filters.sort_order ?? 'asc'

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // Start building query
  let query = supabase
    .from(table)
    .select(select, { count: 'exact' })

  // Apply caller-provided filters
  if (buildQuery) {
    query = buildQuery(query)
  }

  // Ordering + pagination range
  query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to)

  const { data, error, count } = await query

  const totalCount = count ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)

  if (error) {
    return {
      data: [],
      error: error.message,
      success: false,
      pagination: {
        page,
        page_size: pageSize,
        total_count: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false,
      },
    }
  }

  return {
    data: (data as T[]) ?? [],
    error: null,
    success: true,
    pagination: {
      page,
      page_size: pageSize,
      total_count: totalCount,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_previous: page > 1,
    },
  }
}

// -------------------------------------------------------------
// Mutation helpers
// -------------------------------------------------------------

/** Insert a single row and return the created record. */
export async function insertRow<TInsert, TReturn>(
  table: string,
  payload: TInsert,
  select = '*',
): Promise<ApiResponse<TReturn>> {
  const { data, error } = await supabase
    .from(table)
    .insert(payload as Record<string, unknown>)
    .select(select)
    .single()

  return wrapResponse<TReturn>(data as TReturn | null, error)
}

/** Update a single row by id and return the updated record. */
export async function updateRow<TUpdate, TReturn>(
  table: string,
  id: number,
  payload: TUpdate,
  select = '*',
): Promise<ApiResponse<TReturn>> {
  const { data, error } = await supabase
    .from(table)
    .update(payload as Record<string, unknown>)
    .eq('id', id)
    .select(select)
    .single()

  return wrapResponse<TReturn>(data as TReturn | null, error)
}

/** Delete a single row by id. Returns success/error only. */
export async function deleteRow(
  table: string,
  id: number,
): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)

  return wrapResponse<null>(null, error)
}

// Re-export supabase for one-off queries in API files
export { supabase }
