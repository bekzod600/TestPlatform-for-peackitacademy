// =============================================================
// TestPlatform for Peackit Academy — Admin CRUD API
// =============================================================
// All admin-facing Supabase queries live here.  Every function
// uses the shared helpers from `client.ts` where possible and
// falls back to raw `supabase` queries for complex operations.
// =============================================================

import bcrypt from 'bcryptjs'
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
  UserGroupWithTeacher,
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

/** Create a new user. Password is bcrypt-hashed before storing. */
export async function createUser(
  payload: UserInsert,
  actorId?: number | null,
): Promise<ApiResponse<SafeUser>> {
  const hashedPayload = {
    ...payload,
    password_hash: await bcrypt.hash(payload.password_hash, 10),
  }
  const result = await insertRow<UserInsert, User>('users', hashedPayload)
  if (result.success && result.data) {
    const safe = toSafe(result.data)
    await logAudit({
      user_id: actorId,
      action: 'create',
      entity_type: 'user',
      entity_id: safe.id,
      new_data: { username: safe.username, role: safe.role, full_name: safe.full_name },
    })
    return { data: safe, error: null, success: true }
  }
  return { data: null, error: result.error, success: false }
}

/** Update an existing user. If password_hash is provided, it is bcrypt-hashed first. */
export async function updateUser(
  id: number,
  payload: UserUpdate,
  actorId?: number | null,
): Promise<ApiResponse<SafeUser>> {
  const finalPayload = { ...payload }
  if (finalPayload.password_hash) {
    finalPayload.password_hash = await bcrypt.hash(finalPayload.password_hash, 10)
  }
  const result = await updateRow<UserUpdate, User>('users', id, finalPayload)
  if (result.success && result.data) {
    const safe = toSafe(result.data)
    const logData: Record<string, unknown> = { ...payload }
    if (logData.password_hash) logData.password_hash = '***'
    await logAudit({
      user_id: actorId,
      action: 'update',
      entity_type: 'user',
      entity_id: id,
      new_data: logData,
    })
    return { data: safe, error: null, success: true }
  }
  return { data: null, error: result.error, success: false }
}

/** Delete a user by id. */
export async function deleteUser(id: number, actorId?: number | null): Promise<ApiResponse<null>> {
  const result = await deleteRow('users', id)
  if (result.success) {
    await logAudit({ user_id: actorId, action: 'delete', entity_type: 'user', entity_id: id })
  }
  return result
}

// =============================================================
// USER GROUPS
// =============================================================

/** Fetch all user groups with their assigned teacher. */
export async function fetchUserGroups(): Promise<ApiResponse<UserGroupWithTeacher[]>> {
  return fetchAll<UserGroupWithTeacher>(
    'user_groups',
    '*, teacher:users!user_groups_teacher_fkey(id, full_name, username, role, user_group_id, is_active, created_at, updated_at, last_login_at)',
    'name',
    true,
  )
}

/** Fetch all teachers (role = teacher) for dropdowns. */
export async function fetchTeachers(): Promise<ApiResponse<SafeUser[]>> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, username, role, user_group_id, is_active, created_at, updated_at, last_login_at')
    .eq('role', 'teacher')
    .eq('is_active', true)
    .order('full_name', { ascending: true })
  if (error) return { data: null, error: error.message, success: false }
  return { data: (data ?? []) as SafeUser[], error: null, success: true }
}

/** Create a new user group. */
export async function createUserGroup(
  payload: UserGroupInsert,
  actorId?: number | null,
): Promise<ApiResponse<UserGroup>> {
  const result = await insertRow<UserGroupInsert, UserGroup>('user_groups', payload)
  if (result.success && result.data) {
    await logAudit({ user_id: actorId, action: 'create', entity_type: 'user_group', entity_id: result.data.id, new_data: payload as Record<string, unknown> })
  }
  return result
}

/** Update a user group. */
export async function updateUserGroup(
  id: number,
  payload: UserGroupUpdate,
  actorId?: number | null,
): Promise<ApiResponse<UserGroup>> {
  const result = await updateRow<UserGroupUpdate, UserGroup>('user_groups', id, payload)
  if (result.success) {
    await logAudit({ user_id: actorId, action: 'update', entity_type: 'user_group', entity_id: id, new_data: payload as Record<string, unknown> })
  }
  return result
}

/** Delete a user group. */
export async function deleteUserGroup(id: number, actorId?: number | null): Promise<ApiResponse<null>> {
  const result = await deleteRow('user_groups', id)
  if (result.success) {
    await logAudit({ user_id: actorId, action: 'delete', entity_type: 'user_group', entity_id: id })
  }
  return result
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
  actorId?: number | null,
): Promise<ApiResponse<Subject>> {
  const result = await insertRow<SubjectInsert, Subject>('subjects', payload)
  if (result.success && result.data) {
    await logAudit({ user_id: actorId, action: 'create', entity_type: 'subject', entity_id: result.data.id, new_data: payload as Record<string, unknown> })
  }
  return result
}

/** Update a subject. */
export async function updateSubject(
  id: number,
  payload: SubjectUpdate,
  actorId?: number | null,
): Promise<ApiResponse<Subject>> {
  const result = await updateRow<SubjectUpdate, Subject>('subjects', id, payload)
  if (result.success) {
    await logAudit({ user_id: actorId, action: 'update', entity_type: 'subject', entity_id: id, new_data: payload as Record<string, unknown> })
  }
  return result
}

/** Delete a subject. */
export async function deleteSubject(id: number, actorId?: number | null): Promise<ApiResponse<null>> {
  const result = await deleteRow('subjects', id)
  if (result.success) {
    await logAudit({ user_id: actorId, action: 'delete', entity_type: 'subject', entity_id: id })
  }
  return result
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
  actorId?: number | null,
): Promise<ApiResponse<Category>> {
  const result = await insertRow<CategoryInsert, Category>('categories', payload)
  if (result.success && result.data) {
    await logAudit({ user_id: actorId, action: 'create', entity_type: 'category', entity_id: result.data.id, new_data: payload as Record<string, unknown> })
  }
  return result
}

/** Update a category. */
export async function updateCategory(
  id: number,
  payload: CategoryUpdate,
  actorId?: number | null,
): Promise<ApiResponse<Category>> {
  const result = await updateRow<CategoryUpdate, Category>('categories', id, payload)
  if (result.success) {
    await logAudit({ user_id: actorId, action: 'update', entity_type: 'category', entity_id: id, new_data: payload as Record<string, unknown> })
  }
  return result
}

/** Delete a category. */
export async function deleteCategory(id: number, actorId?: number | null): Promise<ApiResponse<null>> {
  const result = await deleteRow('categories', id)
  if (result.success) {
    await logAudit({ user_id: actorId, action: 'delete', entity_type: 'category', entity_id: id })
  }
  return result
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
    '*, subject:subjects(*), created_by_user:users!tests_created_by_fkey(id, full_name, username, role, user_group_id, is_active, created_at, updated_at, last_login_at)',
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
  actorId?: number | null,
): Promise<ApiResponse<Test>> {
  // actorId is embedded in created_by field if not explicitly passed
  const resolvedActorId = actorId ?? payload.created_by ?? null
  const result = await insertRow<TestInsert, Test>('tests', payload)
  if (result.success && result.data) {
    await logAudit({ user_id: resolvedActorId, action: 'create', entity_type: 'test', entity_id: result.data.id, new_data: { name: (payload as Record<string, unknown>).name } })
  }
  return result
}

/** Update a test. */
export async function updateTest(
  id: number,
  payload: TestUpdate,
  actorId?: number | null,
): Promise<ApiResponse<Test>> {
  const result = await updateRow<TestUpdate, Test>('tests', id, payload)
  if (result.success) {
    await logAudit({ user_id: actorId, action: 'update', entity_type: 'test', entity_id: id, new_data: payload as Record<string, unknown> })
  }
  return result
}

/** Delete a test. */
export async function deleteTest(id: number, actorId?: number | null): Promise<ApiResponse<null>> {
  const result = await deleteRow('tests', id)
  if (result.success) {
    await logAudit({ user_id: actorId, action: 'delete', entity_type: 'test', entity_id: id })
  }
  return result
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
      if (filters.created_by !== undefined) {
        q = q.eq('created_by', filters.created_by)
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
  actorId?: number | null,
): Promise<ApiResponse<Question>> {
  const result = await insertRow<QuestionInsert, Question>('questions', payload)
  if (result.success && result.data) {
    await logAudit({
      user_id: actorId ?? payload.created_by,
      action: 'create',
      entity_type: 'question',
      entity_id: result.data.id,
      new_data: { question_text: payload.question_text?.slice(0, 100), difficulty: payload.difficulty },
    })
  }
  return result
}

/** Update a question. */
export async function updateQuestion(
  id: number,
  payload: QuestionUpdate,
  actorId?: number | null,
): Promise<ApiResponse<Question>> {
  const result = await updateRow<QuestionUpdate, Question>('questions', id, payload)
  if (result.success) {
    await logAudit({ user_id: actorId, action: 'update', entity_type: 'question', entity_id: id, new_data: payload as Record<string, unknown> })
  }
  return result
}

/** Delete a question (cascading deletes answer_options via DB FK). */
export async function deleteQuestion(id: number, actorId?: number | null): Promise<ApiResponse<null>> {
  const result = await deleteRow('questions', id)
  if (result.success) {
    await logAudit({ user_id: actorId, action: 'delete', entity_type: 'question', entity_id: id })
  }
  return result
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

/**
 * Internal helper — write one row to audit_logs.
 * Never throws: audit failures must not break main operations.
 */
async function logAudit(entry: {
  user_id?: number | null
  action: string
  entity_type?: string | null
  entity_id?: number | null
  old_data?: Record<string, unknown> | null
  new_data?: Record<string, unknown> | null
}): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: entry.user_id ?? null,
      action: entry.action,
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      old_data: entry.old_data ?? null,
      new_data: entry.new_data ?? null,
      ip_address: null,
    })
  } catch {
    // Audit log xatosi asosiy jarayonni to'xtatmasligi kerak
  }
}

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
// TEACHER-SCOPED API
// =============================================================
// These functions are used by the teacher panel.
// All queries are filtered by the teacher's own ID so teachers
// can only see / manage their own data.
// =============================================================

/** Fetch all groups assigned to a specific teacher. */
export async function fetchGroupsByTeacher(
  teacherId: number,
): Promise<ApiResponse<UserGroupWithTeacher[]>> {
  const { data, error } = await supabase
    .from('user_groups')
    .select(
      '*, teacher:users!user_groups_teacher_fkey(id, full_name, username, role, user_group_id, is_active, created_at, updated_at, last_login_at)',
    )
    .eq('teacher_id', teacherId)
    .order('name', { ascending: true })

  if (error) return { data: null, error: error.message, success: false }
  return { data: (data ?? []) as UserGroupWithTeacher[], error: null, success: true }
}

/** Teacher creates a new group (teacher_id is auto-set). */
export async function createGroupAsTeacher(
  payload: Omit<UserGroupInsert, 'teacher_id'>,
  teacherId: number,
): Promise<ApiResponse<UserGroup>> {
  const result = await insertRow<UserGroupInsert, UserGroup>('user_groups', {
    ...payload,
    teacher_id: teacherId,
  })
  if (result.success && result.data) {
    await logAudit({
      user_id: teacherId,
      action: 'create',
      entity_type: 'user_group',
      entity_id: result.data.id,
      new_data: { name: payload.name, teacher_id: teacherId },
    })
  }
  return result
}

/** Teacher updates their own group. */
export async function updateGroupAsTeacher(
  id: number,
  payload: UserGroupUpdate,
  teacherId: number,
): Promise<ApiResponse<UserGroup>> {
  // Verify ownership before update
  const { data: existing } = await supabase
    .from('user_groups')
    .select('teacher_id')
    .eq('id', id)
    .single()
  if (!existing || existing.teacher_id !== teacherId) {
    return { data: null, error: 'Bu guruh sizga tegishli emas', success: false }
  }
  const result = await updateRow<UserGroupUpdate, UserGroup>('user_groups', id, payload)
  if (result.success) {
    await logAudit({
      user_id: teacherId,
      action: 'update',
      entity_type: 'user_group',
      entity_id: id,
      new_data: payload as Record<string, unknown>,
    })
  }
  return result
}

/** Teacher deletes their own group. */
export async function deleteGroupAsTeacher(
  id: number,
  teacherId: number,
): Promise<ApiResponse<null>> {
  const { data: existing } = await supabase
    .from('user_groups')
    .select('teacher_id')
    .eq('id', id)
    .single()
  if (!existing || existing.teacher_id !== teacherId) {
    return { data: null, error: 'Bu guruh sizga tegishli emas', success: false }
  }
  const result = await deleteRow('user_groups', id)
  if (result.success) {
    await logAudit({
      user_id: teacherId,
      action: 'delete',
      entity_type: 'user_group',
      entity_id: id,
    })
  }
  return result
}

/** Fetch paginated assignments for the teacher's own groups. */
export async function fetchAssignmentsByTeacher(
  teacherId: number,
): Promise<ApiResponse<TestAssignmentWithDetails[]>> {
  // First get group IDs belonging to this teacher
  const { data: groups, error: gErr } = await supabase
    .from('user_groups')
    .select('id')
    .eq('teacher_id', teacherId)

  if (gErr) return { data: null, error: gErr.message, success: false }
  const groupIds = (groups ?? []).map((g: { id: number }) => g.id)

  if (groupIds.length === 0) {
    return { data: [], error: null, success: true }
  }

  const { data, error } = await supabase
    .from('test_assignments')
    .select('*, test:tests(*), user_group:user_groups(*)')
    .in('user_group_id', groupIds)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message, success: false }
  return { data: (data ?? []) as TestAssignmentWithDetails[], error: null, success: true }
}

/** Teacher creates an assignment for their own group using their own test. */
export async function createAssignmentAsTeacher(
  payload: TestAssignmentInsert,
  teacherId: number,
): Promise<ApiResponse<TestAssignment>> {
  // Verify the test belongs to this teacher
  const { data: test } = await supabase
    .from('tests')
    .select('created_by')
    .eq('id', payload.test_id)
    .single()
  if (!test || test.created_by !== teacherId) {
    return { data: null, error: 'Bu test sizga tegishli emas', success: false }
  }
  // Verify the group belongs to this teacher
  const { data: group } = await supabase
    .from('user_groups')
    .select('teacher_id')
    .eq('id', payload.user_group_id)
    .single()
  if (!group || group.teacher_id !== teacherId) {
    return { data: null, error: 'Bu guruh sizga tegishli emas', success: false }
  }

  const result = await insertRow<TestAssignmentInsert, TestAssignment>(
    'test_assignments',
    { ...payload, assigned_by: teacherId },
  )
  if (result.success && result.data) {
    await logAudit({
      user_id: teacherId,
      action: 'assign_test',
      entity_type: 'test_assignment',
      entity_id: result.data.id,
      new_data: {
        test_id: payload.test_id,
        user_group_id: payload.user_group_id,
        start_time: payload.start_time,
        end_time: payload.end_time,
      },
    })
  }
  return result
}

/** Teacher removes their own assignment. */
export async function deleteAssignmentAsTeacher(
  id: number,
  teacherId: number,
): Promise<ApiResponse<null>> {
  // Verify assigned_by matches
  const { data: existing } = await supabase
    .from('test_assignments')
    .select('assigned_by')
    .eq('id', id)
    .single()
  if (!existing || existing.assigned_by !== teacherId) {
    return { data: null, error: 'Bu tayinlash sizga tegishli emas', success: false }
  }
  const result = await deleteRow('test_assignments', id)
  if (result.success) {
    await logAudit({
      user_id: teacherId,
      action: 'delete',
      entity_type: 'test_assignment',
      entity_id: id,
    })
  }
  return result
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
