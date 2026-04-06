// =============================================================
// TestPlatform for Peackit Academy — Student Test Store (Pinia)
// =============================================================
// Manages the active test session state for students:
//   - start / navigate / answer / finish test attempts
//   - persist active test state to localStorage for recovery
//   - track anti-cheat violation counts
// =============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SESSION, ATTEMPT_STATUSES, ANTI_CHEAT } from '@/lib/constants'
import type { ActiveTestState, QuestionWithOptions, TestScoreResult } from '@/types'
import type { AttemptStatus } from '@/lib/constants'
import {
  startTestAttempt,
  submitAnswer,
  finishTestAttempt,
} from '@/api/student.api'

export const useStudentTestStore = defineStore('student-test', () => {
  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  const activeTest = ref<ActiveTestState | null>(null)
  const isStarting = ref(false)
  const isSubmitting = ref(false)
  const isFinishing = ref(false)
  const error = ref<string | null>(null)

  // ---------------------------------------------------------
  // Computed
  // ---------------------------------------------------------

  /** Whether a test session is currently in progress. */
  const isActive = computed<boolean>(() => activeTest.value?.is_active === true)

  /** The current question based on the active index. */
  const currentQuestion = computed<QuestionWithOptions | null>(() => {
    if (!activeTest.value) return null
    return activeTest.value.questions[activeTest.value.current_index] ?? null
  })

  /** Total number of questions in the active test. */
  const totalQuestions = computed<number>(() => {
    if (!activeTest.value) return 0
    return activeTest.value.questions.length
  })

  /** Count of questions that have been answered (non-null in answers map). */
  const answeredCount = computed<number>(() => {
    if (!activeTest.value) return 0
    return Object.values(activeTest.value.answers).filter((v) => v !== null).length
  })

  /** Percentage of questions answered (0-100). */
  const progress = computed<number>(() => {
    if (totalQuestions.value === 0) return 0
    return Math.round((answeredCount.value / totalQuestions.value) * 100)
  })

  // ---------------------------------------------------------
  // Storage Actions
  // ---------------------------------------------------------

  /** Hydrate activeTest from localStorage. */
  function loadFromStorage(): void {
    const raw = localStorage.getItem(SESSION.TEST_STATE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as ActiveTestState
      if (parsed && parsed.attempt_id && parsed.is_active) {
        activeTest.value = parsed
      }
    } catch {
      localStorage.removeItem(SESSION.TEST_STATE_KEY)
    }
  }

  /** Persist activeTest to localStorage. */
  function saveToStorage(): void {
    if (activeTest.value) {
      localStorage.setItem(SESSION.TEST_STATE_KEY, JSON.stringify(activeTest.value))
    } else {
      localStorage.removeItem(SESSION.TEST_STATE_KEY)
    }
  }

  // ---------------------------------------------------------
  // Test Lifecycle Actions
  // ---------------------------------------------------------

  /**
   * Start a new test attempt.
   *
   * 1. Call startTestAttempt API.
   * 2. Build ActiveTestState from the result.
   * 3. Persist to localStorage.
   */
  async function startTest(
    userId: number,
    testId: number,
    assignmentId: number | null,
  ): Promise<{ success: boolean; error: string | null }> {
    isStarting.value = true
    error.value = null
    try {
      const result = await startTestAttempt(userId, testId, assignmentId)

      if (!result.success || !result.data) {
        error.value = result.error ?? 'Failed to start test'
        return { success: false, error: error.value }
      }

      const { attempt, test, questions, effectiveSettings } = result.data

      // Initialise the answers map with null for every question
      const answers: Record<number, number | null> = {}
      for (const q of questions) {
        answers[q.id] = null
      }

      activeTest.value = {
        attempt_id: attempt.id,
        test_id: test.id,
        test,
        questions,
        answers,
        current_index: 0,
        is_active: true,
        duration_seconds: effectiveSettings.duration_minutes * 60,
        started_at: attempt.started_at,
        time_remaining_seconds: effectiveSettings.duration_minutes * 60,
        violation_count: attempt.violation_count,
      }

      saveToStorage()
      return { success: true, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error starting test'
      error.value = message
      return { success: false, error: message }
    } finally {
      isStarting.value = false
    }
  }

  // ---------------------------------------------------------
  // Answer Actions
  // ---------------------------------------------------------

  /**
   * Select an answer for a question.
   *
   * 1. Update activeTest.answers locally (instant UI feedback).
   * 2. Persist to localStorage.
   * 3. Submit to the API in the background (non-blocking).
   */
  async function selectAnswer(questionId: number, optionId: number): Promise<void> {
    if (!activeTest.value) return

    // 1. Update locally
    activeTest.value.answers[questionId] = optionId

    // 2. Persist
    saveToStorage()

    // 3. Submit in background — don't block the UI
    isSubmitting.value = true
    submitAnswer(activeTest.value.attempt_id, questionId, optionId)
      .catch((err) => {
        console.error('Failed to submit answer to server:', err)
      })
      .finally(() => {
        isSubmitting.value = false
      })
  }

  // ---------------------------------------------------------
  // Navigation Actions
  // ---------------------------------------------------------

  /** Navigate to a specific question by index. */
  function goToQuestion(index: number): void {
    if (!activeTest.value) return
    if (index < 0 || index >= activeTest.value.questions.length) return

    activeTest.value.current_index = index
    saveToStorage()
  }

  /** Navigate to the next question. */
  function nextQuestion(): void {
    if (!activeTest.value) return
    goToQuestion(activeTest.value.current_index + 1)
  }

  /** Navigate to the previous question. */
  function prevQuestion(): void {
    if (!activeTest.value) return
    goToQuestion(activeTest.value.current_index - 1)
  }

  // ---------------------------------------------------------
  // Anti-Cheat Actions
  // ---------------------------------------------------------

  /**
   * Increment the tab-switch violation counter.
   * If the count reaches MAX_TAB_SWITCHES, automatically finish
   * the test with a "violation" status.
   */
  function incrementViolation(): void {
    if (!activeTest.value) return

    activeTest.value.violation_count++
    saveToStorage()

    if (activeTest.value.violation_count >= ANTI_CHEAT.MAX_TAB_SWITCHES) {
      finishTest(ATTEMPT_STATUSES.VIOLATION, 'Maximum tab switches exceeded')
    }
  }

  // ---------------------------------------------------------
  // Finish / Clear Actions
  // ---------------------------------------------------------

  /**
   * Finish the current test attempt.
   *
   * 1. Call finishTestAttempt API.
   * 2. Clear localStorage test state.
   * 3. Reset activeTest to null.
   * 4. Return the score result.
   */
  async function finishTest(
    status: AttemptStatus = ATTEMPT_STATUSES.COMPLETED,
    reason: string | null = null,
  ): Promise<{ success: boolean; error: string | null; score: TestScoreResult | null }> {
    if (!activeTest.value) {
      return { success: false, error: 'No active test to finish', score: null }
    }

    isFinishing.value = true
    error.value = null
    try {
      const attemptId = activeTest.value.attempt_id
      const result = await finishTestAttempt(attemptId, status, reason)

      if (!result.success || !result.data) {
        error.value = result.error ?? 'Failed to finish test'
        return { success: false, error: error.value, score: null }
      }

      const score = result.data.score ?? null

      // Clear state
      activeTest.value = null
      localStorage.removeItem(SESSION.TEST_STATE_KEY)

      return { success: true, error: null, score }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error finishing test'
      error.value = message
      return { success: false, error: message, score: null }
    } finally {
      isFinishing.value = false
    }
  }

  /** Clear activeTest and remove persisted state from localStorage. */
  function clearTest(): void {
    activeTest.value = null
    localStorage.removeItem(SESSION.TEST_STATE_KEY)
  }

  // ---------------------------------------------------------
  // Expose
  // ---------------------------------------------------------
  return {
    // State
    activeTest,
    isStarting,
    isSubmitting,
    isFinishing,
    error,

    // Computed
    isActive,
    currentQuestion,
    totalQuestions,
    answeredCount,
    progress,

    // Actions
    loadFromStorage,
    saveToStorage,
    startTest,
    selectAnswer,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    incrementViolation,
    finishTest,
    clearTest,
  }
})
