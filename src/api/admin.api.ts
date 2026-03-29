// =============================================================
// TestPlatform for Peackit Academy — Admin CRUD API
// =============================================================
// All admin-facing Supabase queries live here.  Every function
// uses the shared helpers from `client.ts` where possible and
// falls back to raw `supabase` queries for complex operations.
// =============================================================

import {
  supabase,
  fetchAll,
  fetchById,
  fetchPaginated,
  insertRow,
  updateRow,
  deleteRow,
} from '@/api/client'
import type {
  ApiResponse,
  PaginatedResponse,
  // Users
  User,
  SafeUser,
  UserInsert,
  UserUpdate,
  UserWithGroup,
  UserListFilters,
  // User Groups
  UserGroup,
  UserGroupInsert,
  UserGroupUpdate,
  // Subjects
  Subject,
  SubjectInsert,
  SubjectUpdate,
  // Categories
  Category,
  CategoryInsert,
  CategoryUpdate,
  CategoryWithSubject,
  // Tests
  Test,
  TestInsert,
  TestUpdate,
  TestWithDetails,
  TestListFilters,
  // Questions
  Question,
  QuestionInsert,
  QuestionUpdate,
  QuestionWithDetails,
  QuestionListFilters,
  // Answer Options
  AnswerOption,
  AnswerOptionInsert,
  AnswerOptionUpdate,
  // Assignments
  TestAssignment,
  TestAssignmentInsert,
  TestAssignmentUpdate,
  TestAssignmentWithDetails,
  // Audit
  AuditLog,
  ListFilters,
  // Attempts
  AttemptListFilters,
  TestAttemptWithDetails,
} from '@/types'

// =============================================================
// USERS
// =============================================================

/** Strip password_hash from a User row. */
function toSafe(u: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...safe } = u
  return safe
}

/**
 * Fetch paginated list of users with optional filters.
 */
export async function fetchUsers(
  filters: UserListFilters = {},
): Promise<PaginatedResponse<UserWithGroup>> {
  return fetchPaginated<UserWithGroup>(
    'users',
    filters,
    '*, user_group:user_groups(*)',
    (qb) => {
      let q = qb
      if (filters.role) {
        q = q.eq('role', filters.role)
      }
      if (filters.user_group_id !== undefined) {
        q = q.eq('user_group_id', filters.user_group_id)
      }
      if (filters.is_active !== undefined) {
        q = q.eq('is_active', filters.is_active)
      }
      if (filters.search) {
        q = q.or(
          `full_name.ilike.%${filters.search}%,username.ilike.%${filters.search}%`,
        )
      }
      return q
    },
  )
}

/** Fetch a single user by id (safe — no password_hash). */
export async function fetchUserById(
  id: number,
): Promise<ApiResponse<SafeUser>> {
  const { data, error } = await supabase
    .from('users')
    .select('*, user_group:user_groups(*)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'User not found', success: false }
  }
  return { data: toSafe(data as User), error: null, success: true }
}

/** Create a new user. */
export async function createUser(
  payload: UserInsert,
): Promise<ApiResponse<SafeUser>> {
  // TODO: Hash password via Edge Function before storing.
  // For now the plain text password is stored in password_hash column.
  const result = await insertRow<UserInsert, User>('users', payload)
  if (result.success && result.data) {
    return { data: toSafe(result.data), error: null, success: true }
  }
  return { data: null, error: result.error, success: false }
}

/** Update an existing user. */
export async function updateUser(
  id: number,
  payload: UserUpdate,
): Promise<ApiResponse<SafeUser>> {
  const result = await updateRow<UserUpdate, User>('users', id, payload)
  if (result.success && result.data) {
    return { data: toSafe(result.data), error: null, success: true }
  }
  return { data: null, error: result.error, success: false }
}

/** Delete a user by id. */
export async function deleteUser(id: number): Promise<ApiResponse<null>> {
  return deleteRow('users', id)
}

// =============================================================
// USER GROUPS
// =============================================================

/** Fetch all user groups (unpaginated — typically a small list). */
export async function fetchUserGroups(): Promise<ApiResponse<UserGroup[]>> {
  return fetchAll<UserGroup>('user_groups', '*', 'name', true)
}

/** Create a new user group. */
export async function createUserGroup(
  payload: UserGroupInsert,
): Promise<ApiResponse<UserGroup>> {
  return insertRow<UserGroupInsert, UserGroup>('user_groups', payload)
}

/** Update a user group. */
export async function updateUserGroup(
  id: number,
  payload: UserGroupUpdate,
): Promise<ApiResponse<UserGroup>> {
  return updateRow<UserGroupUpdate, UserGroup>('user_groups', id, payload)
}

/** Delete a user group. */
export async function deleteUserGroup(id: number): Promise<ApiResponse<null>> {
  return deleteRow('user_groups', id)
}

// =============================================================
// SUBJECTS
// =============================================================

/** Fetch all subjects. */
export async function fetchSubjects(): Promise<ApiResponse<Subject[]>> {
  return fetchAll<Subject>('subjects', '*', 'name', true)
}

/** Create a subject. */
export async function createSubject(
  payload: SubjectInsert,
): Promise<ApiResponse<Subject>> {
  return insertRow<SubjectInsert, Subject>('subjects', payload)
}

/** Update a subject. */
export async function updateSubject(
  id: number,
  payload: SubjectUpdate,
): Promise<ApiResponse<Subject>> {
  return updateRow<SubjectUpdate, Subject>('subjects', id, payload)
}

/** Delete a subject. */
export async function deleteSubject(id: number): Promise<ApiResponse<null>> {
  return deleteRow('subjects', id)
}

// =============================================================
// CATEGORIES
// =============================================================

/** Fetch all categories with their parent subject. */
export async function fetchCategories(): Promise<ApiResponse<CategoryWithSubject[]>> {
  return fetchAll<CategoryWithSubject>(
    'categories',
    '*, subject:subjects(*)',
    'name',
    true,
  )
}

/** Create a category. */
export async function createCategory(
  payload: CategoryInsert,
): Promise<ApiResponse<Category>> {
  return insertRow<CategoryInsert, Category>('categories', payload)
}

/** Update a category. */
export async function updateCategory(
  id: number,
  payload: CategoryUpdate,
): Promise<ApiResponse<Category>> {
  return updateRow<CategoryUpdate, Category>('categories', id, payload)
}

/** Delete a category. */
export async function deleteCategory(id: number): Promise<ApiResponse<null>> {
  return deleteRow('categories', id)
}

// =============================================================
// TESTS
// =============================================================

/** Fetch paginated tests with optional filters. */
export async function fetchTests(
  filters: TestListFilters = {},
): Promise<PaginatedResponse<TestWithDetails>> {
  return fetchPaginated<TestWithDetails>(
    'tests',
    filters,
    '*, subject:subjects(*)',
    (qb) => {
      let q = qb
      if (filters.subject_id !== undefined) {
        q = q.eq('subject_id', filters.subject_id)
      }
      if (filters.is_active !== undefined) {
        q = q.eq('is_active', filters.is_active)
      }
      if (filters.created_by !== undefined) {
        q = q.eq('created_by', filters.created_by)
      }
      if (filters.search) {
        q = q.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
        )
      }
      return q
    },
  )
}

/** Fetch a single test with full details. */
export async function fetchTestById(
  id: number,
): Promise<ApiResponse<TestWithDetails>> {
  return fetchById<TestWithDetails>(
    'tests',
    id,
    '*, subject:subjects(*)',
  )
}

/** Create a test. */
export async function createTest(
  payload: TestInsert,
): Promise<ApiResponse<Test>> {
  return insertRow<TestInsert, Test>('tests', payload)
}

/** Update a test. */
export async function updateTest(
  id: number,
  payload: TestUpdate,
): Promise<ApiResponse<Test>> {
  return updateRow<TestUpdate, Test>('tests', id, payload)
}

/** Delete a test. */
export async function deleteTest(id: number): Promise<ApiResponse<null>> {
  return deleteRow('tests', id)
}

// =============================================================
// QUESTIONS
// =============================================================

/** Fetch paginated questions with optional filters. */
export async function fetchQuestions(
  filters: QuestionListFilters = {},
): Promise<PaginatedResponse<QuestionWithDetails>> {
  return fetchPaginated<QuestionWithDetails>(
    'questions',
    filters,
    '*, answer_options(*), category:categories(*), test:tests(*)',
    (qb) => {
      let q = qb
      if (filters.test_id !== undefined) {
        q = q.eq('test_id', filters.test_id)
      }
      if (filters.category_id !== undefined) {
        q = q.eq('category_id', filters.category_id)
      }
      if (filters.question_type) {
        q = q.eq('question_type', filters.question_type)
      }
      if (filters.difficulty) {
        q = q.eq('difficulty', filters.difficulty)
      }
      if (filters.is_active !== undefined) {
        q = q.eq('is_active', filters.is_active)
      }
      if (filters.search) {
        q = q.ilike('question_text', `%${filters.search}%`)
      }
      return q
    },
  )
}

/** Fetch a single question with options and relations. */
export async function fetchQuestionById(
  id: number,
): Promise<ApiResponse<QuestionWithDetails>> {
  return fetchById<QuestionWithDetails>(
    'questions',
    id,
    '*, answer_options(*), category:categories(*), test:tests(*)',
  )
}

/** Create a question (without answer options — create those separately). */
export async function createQuestion(
  payload: QuestionInsert,
): Promise<ApiResponse<Question>> {
  return insertRow<QuestionInsert, Question>('questions', payload)
}

/** Update a question. */
export async function updateQuestion(
  id: number,
  payload: QuestionUpdate,
): Promise<ApiResponse<Question>> {
  return updateRow<QuestionUpdate, Question>('questions', id, payload)
}

/** Delete a question (cascading deletes answer_options via DB FK). */
export async function deleteQuestion(id: number): Promise<ApiResponse<null>> {
  return deleteRow('questions', id)
}

// =============================================================
// ANSWER OPTIONS
// =============================================================

/** Fetch all answer options for a given question. */
export async function fetchOptionsForQuestion(
  questionId: number,
): Promise<ApiResponse<AnswerOption[]>> {
  const { data, error } = await supabase
    .from('answer_options')
    .select('*')
    .eq('question_id', questionId)
    .order('sort_order', { ascending: true })

  if (error) {
    return { data: null, error: error.message, success: false }
  }
  return { data: (data as AnswerOption[]) ?? [], error: null, success: true }
}

/** Create an answer option. */
export async function createOption(
  payload: AnswerOptionInsert,
): Promise<ApiResponse<AnswerOption>> {
  return insertRow<AnswerOptionInsert, AnswerOption>('answer_options', payload)
}

/** Update an answer option. */
export async function updateOption(
  id: number,
  payload: AnswerOptionUpdate,
): Promise<ApiResponse<AnswerOption>> {
  return updateRow<AnswerOptionUpdate, AnswerOption>('answer_options', id, payload)
}

/** Delete an answer option. */
export async function deleteOption(id: number): Promise<ApiResponse<null>> {
  return deleteRow('answer_options', id)
}

// =============================================================
// TEST ASSIGNMENTS
// =============================================================

/** Fetch all assignments with related test and group info. */
export async function fetchAssignments(
  filters: ListFilters = {},
): Promise<PaginatedResponse<TestAssignmentWithDetails>> {
  return fetchPaginated<TestAssignmentWithDetails>(
    'test_assignments',
    filters,
    '*, test:tests(*), user_group:user_groups(*)',
  )
}

/** Create a test assignment. */
export async function createAssignment(
  payload: TestAssignmentInsert,
): Promise<ApiResponse<TestAssignment>> {
  return insertRow<TestAssignmentInsert, TestAssignment>(
    'test_assignments',
    payload,
  )
}

/** Update a test assignment. */
export async function updateAssignment(
  id: number,
  payload: TestAssignmentUpdate,
): Promise<ApiResponse<TestAssignment>> {
  return updateRow<TestAssignmentUpdate, TestAssignment>(
    'test_assignments',
    id,
    payload,
  )
}

/** Delete a test assignment. */
export async function deleteAssignment(id: number): Promise<ApiResponse<null>> {
  return deleteRow('test_assignments', id)
}

// =============================================================
// AUDIT LOGS
// =============================================================

/** Fetch paginated audit logs (read-only). */
export async function fetchAuditLogs(
  filters: ListFilters = {},
): Promise<PaginatedResponse<AuditLog>> {
  return fetchPaginated<AuditLog>(
    'audit_logs',
    { ...filters, sort_by: filters.sort_by ?? 'created_at', sort_order: filters.sort_order ?? 'desc' },
    '*',
  )
}

// =============================================================
// TEST ATTEMPTS (admin view)
// =============================================================

/** Fetch paginated test attempts with optional filters (admin view). */
export async function fetchAttempts(
  filters: AttemptListFilters = {},
): Promise<PaginatedResponse<TestAttemptWithDetails>> {
  return fetchPaginated<TestAttemptWithDetails>(
    'test_attempts',
    { ...filters, sort_by: filters.sort_by ?? 'created_at', sort_order: filters.sort_order ?? 'desc' },
    '*, user:users(id, full_name, username, role, user_group_id, is_active, created_at, updated_at, last_login_at), test:tests(*), assignment:test_assignments(*)',
    (qb) => {
      let q = qb
      if (filters.user_id !== undefined) {
        q = q.eq('user_id', filters.user_id)
      }
      if (filters.test_id !== undefined) {
        q = q.eq('test_id', filters.test_id)
      }
      if (filters.status) {
        q = q.eq('status', filters.status)
      }
      if (filters.date_from) {
        q = q.gte('started_at', filters.date_from)
      }
      if (filters.date_to) {
        q = q.lte('started_at', filters.date_to)
      }
      return q
    },
  )
}

// =============================================================
// DASHBOARD STATISTICS
// =============================================================

export interface DashboardStats {
  totalUsers: number
  totalStudents: number
  totalTests: number
  totalQuestions: number
  totalAttempts: number
  totalAssignments: number
  totalCategories: number
  totalSubjects: number
}

/**
 * Fetch aggregate counts for the admin dashboard.
 * Uses individual count queries which are fast on indexed tables.
 */
export async function fetchDashboardStats(): Promise<ApiResponse<DashboardStats>> {
  try {
    const [
      usersRes,
      studentsRes,
      testsRes,
      questionsRes,
      attemptsRes,
      assignmentsRes,
      categoriesRes,
      subjectsRes,
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('tests').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('test_attempts').select('*', { count: 'exact', head: true }),
      supabase.from('test_assignments').select('*', { count: 'exact', head: true }),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('subjects').select('*', { count: 'exact', head: true }),
    ])

    const stats: DashboardStats = {
      totalUsers: usersRes.count ?? 0,
      totalStudents: studentsRes.count ?? 0,
      totalTests: testsRes.count ?? 0,
      totalQuestions: questionsRes.count ?? 0,
      totalAttempts: attemptsRes.count ?? 0,
      totalAssignments: assignmentsRes.count ?? 0,
      totalCategories: categoriesRes.count ?? 0,
      totalSubjects: subjectsRes.count ?? 0,
    }

    return { data: stats, error: null, success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch dashboard stats'
    return { data: null, error: message, success: false }
  }
}
