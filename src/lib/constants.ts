// =============================================================
// TestPlatform for Peackit Academy — Application Constants
// =============================================================

// -------------------------------------------------------------
// User Roles
// -------------------------------------------------------------
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

/** Roles that have administrative access */
export const ADMIN_ROLES: readonly UserRole[] = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
] as const

/** Roles that can manage tests and questions */
export const TEACHER_AND_ABOVE: readonly UserRole[] = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.TEACHER,
] as const

/** Human-readable labels for each role */
export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.SUPER_ADMIN]: 'Super Admin',
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.TEACHER]: 'Teacher',
  [USER_ROLES.STUDENT]: 'Student',
}

// -------------------------------------------------------------
// Test Configuration Limits
// -------------------------------------------------------------
export const TEST_LIMITS = {
  /** Minimum test duration in minutes */
  MIN_DURATION_MINUTES: 1,
  /** Maximum test duration in minutes */
  MAX_DURATION_MINUTES: 300,
  /** Default test duration in minutes */
  DEFAULT_DURATION_MINUTES: 60,

  /** Minimum number of questions per test */
  MIN_QUESTIONS: 1,
  /** Maximum number of questions per test */
  MAX_QUESTIONS: 500,
  /** Default number of questions */
  DEFAULT_QUESTIONS: 50,

  /** Minimum passing score percentage */
  MIN_PASSING_SCORE: 0,
  /** Maximum passing score percentage */
  MAX_PASSING_SCORE: 100,
  /** Default passing score percentage */
  DEFAULT_PASSING_SCORE: 60,

  /** Minimum allowed attempts for a test */
  MIN_ATTEMPTS: 1,
  /** Maximum allowed attempts for a test */
  MAX_ATTEMPTS: 10,
  /** Default number of allowed attempts */
  DEFAULT_ATTEMPTS: 1,
} as const

// -------------------------------------------------------------
// Question Configuration
// -------------------------------------------------------------
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TRUE_FALSE: 'true_false',
  FILL_BLANK: 'fill_blank',
} as const

export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES]

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  [QUESTION_TYPES.MULTIPLE_CHOICE]: 'Multiple Choice',
  [QUESTION_TYPES.TRUE_FALSE]: 'True / False',
  [QUESTION_TYPES.FILL_BLANK]: 'Fill in the Blank',
}

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const

export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[keyof typeof DIFFICULTY_LEVELS]

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  [DIFFICULTY_LEVELS.EASY]: 'Easy',
  [DIFFICULTY_LEVELS.MEDIUM]: 'Medium',
  [DIFFICULTY_LEVELS.HARD]: 'Hard',
}

export const QUESTION_POINTS = {
  MIN: 1,
  MAX: 10,
  DEFAULT: 1,
} as const

// -------------------------------------------------------------
// Test Attempt Statuses
// -------------------------------------------------------------
export const ATTEMPT_STATUSES = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  TIMED_OUT: 'timed_out',
  CANCELLED: 'cancelled',
  VIOLATION: 'violation',
} as const

export type AttemptStatus = (typeof ATTEMPT_STATUSES)[keyof typeof ATTEMPT_STATUSES]

export const ATTEMPT_STATUS_LABELS: Record<AttemptStatus, string> = {
  [ATTEMPT_STATUSES.IN_PROGRESS]: 'In Progress',
  [ATTEMPT_STATUSES.COMPLETED]: 'Completed',
  [ATTEMPT_STATUSES.TIMED_OUT]: 'Timed Out',
  [ATTEMPT_STATUSES.CANCELLED]: 'Cancelled',
  [ATTEMPT_STATUSES.VIOLATION]: 'Violation',
}

// -------------------------------------------------------------
// Anti-Cheat / Tab Switch Monitoring
// -------------------------------------------------------------
export const ANTI_CHEAT = {
  /**
   * Maximum number of tab/window switches before the test is
   * automatically terminated with a "violation" status.
   */
  MAX_TAB_SWITCHES: 3,

  /**
   * Warning thresholds — show a warning toast when the student
   * reaches these counts.
   */
  WARNING_THRESHOLDS: [1, 2] as readonly number[],

  /** Whether to enable fullscreen enforcement during tests */
  ENFORCE_FULLSCREEN: true,

  /** Whether to disable right-click context menu during tests */
  DISABLE_CONTEXT_MENU: true,

  /** Whether to disable copy/paste during tests */
  DISABLE_COPY_PASTE: true,
} as const

// -------------------------------------------------------------
// Session / Authentication
// -------------------------------------------------------------
export const SESSION = {
  /** Session token expiry in hours */
  EXPIRY_HOURS: 24,

  /** LocalStorage key for persisted user data */
  STORAGE_KEY: 'peackit_current_user',

  /** LocalStorage key for active test state */
  TEST_STATE_KEY: 'peackit_active_test',

  /** LocalStorage key for theme preference */
  THEME_KEY: 'peackit_theme',
} as const

// -------------------------------------------------------------
// Pagination
// -------------------------------------------------------------
export const PAGINATION = {
  /** Default number of items per page */
  DEFAULT_PAGE_SIZE: 20,

  /** Available page size options */
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100] as readonly number[],
} as const

// -------------------------------------------------------------
// UI / Layout
// -------------------------------------------------------------
export const UI = {
  /** Sidebar collapsed width in pixels */
  SIDEBAR_COLLAPSED_WIDTH: 64,

  /** Sidebar expanded width in pixels */
  SIDEBAR_EXPANDED_WIDTH: 256,

  /** Toast notification auto-dismiss in milliseconds */
  TOAST_DURATION_MS: 5000,

  /** Debounce delay for search inputs in milliseconds */
  SEARCH_DEBOUNCE_MS: 300,
} as const

// -------------------------------------------------------------
// Application Metadata
// -------------------------------------------------------------
export const APP = {
  NAME: 'Peackit Academy',
  DESCRIPTION: 'Test Platform for Peackit Academy',
  VERSION: '2.0.0',
} as const

// -------------------------------------------------------------
// Audit Log Actions (for entity_type + action combos)
// -------------------------------------------------------------
export const AUDIT_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  TEST_START: 'test_start',
  TEST_FINISH: 'test_finish',
  TEST_VIOLATION: 'test_violation',
  ASSIGN_TEST: 'assign_test',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

export const ENTITY_TYPES = {
  USER: 'user',
  USER_GROUP: 'user_group',
  SUBJECT: 'subject',
  CATEGORY: 'category',
  TEST: 'test',
  QUESTION: 'question',
  TEST_ASSIGNMENT: 'test_assignment',
  TEST_ATTEMPT: 'test_attempt',
  SESSION: 'session',
} as const

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES]
