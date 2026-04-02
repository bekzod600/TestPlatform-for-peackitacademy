// =============================================================
// TestPlatform for Peackit Academy — TypeScript Type Definitions
// =============================================================
// These types mirror the database schema defined in db/schema.sql
// =============================================================

import type {
  UserRole,
  QuestionType,
  DifficultyLevel,
  AttemptStatus,
  AuditAction,
  EntityType,
} from '@/lib/constants'

// -------------------------------------------------------------
// Base / Utility Types
// -------------------------------------------------------------

/** Fields common to most database entities */
export interface BaseEntity {
  id: number
  created_at: string
  updated_at: string
}

/** Fields common to entities that only have created_at */
export interface CreatedEntity {
  id: number
  created_at: string
}

// -------------------------------------------------------------
// 1. Subjects
// -------------------------------------------------------------
export interface Subject extends BaseEntity {
  name: string
  description: string | null
  is_active: boolean
}

export type SubjectInsert = Omit<Subject, 'id' | 'created_at' | 'updated_at'>
export type SubjectUpdate = Partial<SubjectInsert>

// -------------------------------------------------------------
// 2. Categories
// -------------------------------------------------------------
export interface Category extends CreatedEntity {
  name: string
  subject_id: number | null
  description: string | null
}

/** Category with its related subject eagerly loaded */
export interface CategoryWithSubject extends Category {
  subject: Subject | null
}

export type CategoryInsert = Omit<Category, 'id' | 'created_at'>
export type CategoryUpdate = Partial<CategoryInsert>

// -------------------------------------------------------------
// 3. User Groups
// -------------------------------------------------------------
export interface UserGroup extends BaseEntity {
  name: string
  description: string | null
  is_active: boolean
  teacher_id: number | null
}

/** UserGroup with its assigned teacher eagerly loaded */
export interface UserGroupWithTeacher extends UserGroup {
  teacher: SafeUser | null
}

export type UserGroupInsert = Omit<UserGroup, 'id' | 'created_at' | 'updated_at'>
export type UserGroupUpdate = Partial<UserGroupInsert>

// -------------------------------------------------------------
// 4. Users
// -------------------------------------------------------------
export interface User extends BaseEntity {
  full_name: string
  username: string
  password_hash: string
  role: UserRole
  user_group_id: number | null
  is_active: boolean
  last_login_at: string | null
}

/** User with its related group eagerly loaded */
export interface UserWithGroup extends User {
  user_group: UserGroup | null
}

/** Public-safe user representation (excludes password_hash) */
export type SafeUser = Omit<User, 'password_hash'>

export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login_at'>
export type UserUpdate = Partial<Omit<UserInsert, 'username'>>

// -------------------------------------------------------------
// 5. Sessions
// -------------------------------------------------------------
export interface Session {
  id: string // UUID
  user_id: number
  token: string
  ip_address: string | null
  user_agent: string | null
  expires_at: string
  created_at: string
}

export type SessionInsert = Omit<Session, 'id' | 'created_at'>

// -------------------------------------------------------------
// 6. Tests
// -------------------------------------------------------------
export interface Test extends BaseEntity {
  name: string
  description: string | null
  subject_id: number | null
  duration_minutes: number
  max_questions: number
  passing_score: number
  shuffle_questions: boolean
  shuffle_answers: boolean
  show_results: boolean
  max_attempts: number
  is_active: boolean
  created_by: number | null
}

/** Test with related subject and question count */
export interface TestWithDetails extends Test {
  subject: Subject | null
  questions_count?: number
  created_by_user?: SafeUser | null
}

export type TestInsert = Omit<Test, 'id' | 'created_at' | 'updated_at'>
export type TestUpdate = Partial<TestInsert>

// -------------------------------------------------------------
// 7. Questions
// -------------------------------------------------------------
export interface Question extends BaseEntity {
  question_text: string
  question_type: QuestionType
  difficulty: DifficultyLevel
  points: number
  category_id: number | null
  test_id: number | null
  explanation: string | null
  is_active: boolean
  created_by: number | null
  /** Ushbu savolga necha marta urinib ko'rilganligi (har bir attempt uchun +1) */
  attempts_count: number
  /** Ushbu savol necha marta to'g'ri javob berilganligi */
  corrects_count: number
}

/** Question with its answer options eagerly loaded */
export interface QuestionWithOptions extends Question {
  answer_options: AnswerOption[]
}

/** Question with full related data */
export interface QuestionWithDetails extends QuestionWithOptions {
  category: Category | null
  test: Test | null
}

export type QuestionInsert = Omit<Question, 'id' | 'created_at' | 'updated_at'>
export type QuestionUpdate = Partial<QuestionInsert>

// -------------------------------------------------------------
// 8. Answer Options
// -------------------------------------------------------------
export interface AnswerOption extends CreatedEntity {
  question_id: number
  option_text: string
  is_correct: boolean
  sort_order: number
}

export type AnswerOptionInsert = Omit<AnswerOption, 'id' | 'created_at'>
export type AnswerOptionUpdate = Partial<AnswerOptionInsert>

// -------------------------------------------------------------
// 9. Test Assignments
// -------------------------------------------------------------
export interface TestAssignment extends CreatedEntity {
  test_id: number
  user_group_id: number
  start_time: string
  end_time: string
  assigned_by: number | null
}

/** Assignment with related test and group */
export interface TestAssignmentWithDetails extends TestAssignment {
  test: Test | null
  user_group: UserGroup | null
  assigned_by_user?: SafeUser | null
}

export type TestAssignmentInsert = Omit<TestAssignment, 'id' | 'created_at'>
export type TestAssignmentUpdate = Partial<Omit<TestAssignmentInsert, 'test_id' | 'user_group_id'>>

// -------------------------------------------------------------
// 10. Test Attempts
// -------------------------------------------------------------
export interface TestAttempt extends CreatedEntity {
  user_id: number
  test_id: number
  assignment_id: number | null
  status: AttemptStatus
  started_at: string
  finished_at: string | null
  total_questions: number
  correct_answers: number | null
  wrong_answers: number | null
  skipped_answers: number | null
  max_score: number | null
  earned_score: number | null
  percentage: number | null
  time_spent_seconds: number | null
  violation_count: number
  finished_reason: string | null
  ip_address: string | null
  user_agent: string | null
}

/** Attempt with related user, test, and assignment */
export interface TestAttemptWithDetails extends TestAttempt {
  user: SafeUser | null
  test: Test | null
  assignment: TestAssignment | null
}

export type TestAttemptInsert = Omit<
  TestAttempt,
  | 'id'
  | 'created_at'
  | 'started_at'
  | 'finished_at'
  | 'correct_answers'
  | 'wrong_answers'
  | 'skipped_answers'
  | 'max_score'
  | 'earned_score'
  | 'percentage'
  | 'time_spent_seconds'
>

// -------------------------------------------------------------
// 11. Test Answers
// -------------------------------------------------------------
export interface TestAnswer {
  id: number
  attempt_id: number
  question_id: number
  selected_option_id: number | null
  is_correct: boolean | null
  time_spent_seconds: number | null
  answered_at: string | null
}

/** Answer with related question and selected option */
export interface TestAnswerWithDetails extends TestAnswer {
  question: QuestionWithOptions | null
  selected_option: AnswerOption | null
}

export type TestAnswerInsert = Omit<TestAnswer, 'id' | 'answered_at'>
export type TestAnswerUpdate = Partial<Pick<TestAnswer, 'selected_option_id' | 'is_correct' | 'time_spent_seconds'>>

// -------------------------------------------------------------
// 12. Audit Logs
// -------------------------------------------------------------
export interface AuditLog extends CreatedEntity {
  user_id: number | null
  action: AuditAction
  entity_type: EntityType | null
  entity_id: number | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
}

export type AuditLogInsert = Omit<AuditLog, 'id' | 'created_at'>

// =============================================================
// API Response Types
// =============================================================

/** Standard API response wrapper */
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  data: T[]
  error: string | null
  success: boolean
  pagination: {
    page: number
    page_size: number
    total_count: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
  }
}

/** Supabase query error shape */
export interface QueryError {
  message: string
  details: string | null
  hint: string | null
  code: string
}

// =============================================================
// Authentication Types
// =============================================================

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  user: SafeUser
  session: Session
}

export interface AuthState {
  user: SafeUser | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
}

// =============================================================
// Store / State Types
// =============================================================

/** Active test session state (persisted to localStorage) */
export interface ActiveTestState {
  attempt_id: number
  test_id: number
  test: Test
  questions: QuestionWithOptions[]
  answers: Record<number, number | null> // question_id -> selected_option_id
  current_index: number
  is_active: boolean
  duration_seconds: number
  started_at: string
  time_remaining_seconds: number
  violation_count: number
}

/** Result computed after finishing a test (from DB function) */
export interface TestScoreResult {
  correct_answers: number
  wrong_answers: number
  skipped_answers: number
  total_questions: number
  max_score: number
  earned_score: number
  percentage: number
  time_spent_seconds: number
}

/** Filter options used in admin list views */
export interface ListFilters {
  search?: string
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface UserListFilters extends ListFilters {
  role?: UserRole
  user_group_id?: number
  is_active?: boolean
}

export interface QuestionListFilters extends ListFilters {
  test_id?: number
  category_id?: number
  question_type?: QuestionType
  difficulty?: DifficultyLevel
  is_active?: boolean
  created_by?: number
}

export interface TestListFilters extends ListFilters {
  subject_id?: number
  is_active?: boolean
  created_by?: number
}

export interface AttemptListFilters extends ListFilters {
  user_id?: number
  test_id?: number
  status?: AttemptStatus
  date_from?: string
  date_to?: string
}

// =============================================================
// Component Prop / Emit Types
// =============================================================

/** Options for select/dropdown components */
export interface SelectOption<T = string | number> {
  label: string
  value: T
  disabled?: boolean
}

/** Toast notification */
export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
}

/** Confirmation dialog state */
export interface ConfirmDialogState {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void | Promise<void>
}

/** Data table column definition */
export interface DataTableColumn<T = unknown> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (row: T) => string
}
