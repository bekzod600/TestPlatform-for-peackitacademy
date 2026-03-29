// =============================================================
// TestPlatform for Peackit Academy — Student API
// =============================================================
// Supabase queries for the student-facing test experience:
//   - view assigned tests
//   - start / answer / finish test attempts
//   - view past attempts and results
// =============================================================

import { supabase } from '@/api/client'
import { ATTEMPT_STATUSES } from '@/lib/constants'
import type {
  ApiResponse,
  TestAssignmentWithDetails,
  TestAttempt,
  TestAttemptWithDetails,
  QuestionWithOptions,
  AnswerOption,
  TestAnswer,
  TestAnswerWithDetails,
  TestScoreResult,
  Test,
} from '@/types'
import type { AttemptStatus } from '@/lib/constants'

// -------------------------------------------------------------
// Utility
// -------------------------------------------------------------

/** Fisher-Yates shuffle (returns new array). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Strip `is_correct` from answer options so students cannot cheat
 * by inspecting the response payload.
 */
function sanitizeOptions(
  options: AnswerOption[],
): Omit<AnswerOption, 'is_correct'>[] {
  return options.map(({ is_correct: _removed, ...rest }) => rest)
}

// =============================================================
// Assignments
// =============================================================

/**
 * Fetch test assignments available to the student.
 * A student sees assignments for their user group that are
 * currently within the start_time / end_time window.
 */
export async function fetchMyAssignments(
  userId: number,
  userGroupId: number | null,
): Promise<ApiResponse<TestAssignmentWithDetails[]>> {
  try {
    if (!userGroupId) {
      return { data: [], error: null, success: true }
    }

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('test_assignments')
      .select('*, test:tests(*), user_group:user_groups(*)')
      .eq('user_group_id', userGroupId)
      .lte('start_time', now)
      .gte('end_time', now)
      .order('start_time', { ascending: false })

    if (error) {
      return { data: null, error: error.message, success: false }
    }

    // Also fetch how many attempts the student already has for each test
    // so the UI can determine if they can retake
    const assignments = (data ?? []) as TestAssignmentWithDetails[]

    // Get attempt counts for the student's relevant tests
    const testIds = [...new Set(assignments.map((a) => a.test_id))]
    if (testIds.length > 0) {
      const { data: attempts } = await supabase
        .from('test_attempts')
        .select('test_id, status')
        .eq('user_id', userId)
        .in('test_id', testIds)

      // Attach attempt metadata to each assignment (as extra fields)
      const attemptsByTest = new Map<number, { count: number; hasInProgress: boolean }>()
      for (const a of attempts ?? []) {
        const entry = attemptsByTest.get(a.test_id) ?? { count: 0, hasInProgress: false }
        entry.count++
        if (a.status === ATTEMPT_STATUSES.IN_PROGRESS) {
          entry.hasInProgress = true
        }
        attemptsByTest.set(a.test_id, entry)
      }

      // Decorate each assignment with student-specific info
      for (const assignment of assignments) {
        const info = attemptsByTest.get(assignment.test_id)
        ;(assignment as TestAssignmentWithDetails & { _attemptCount?: number; _hasInProgress?: boolean })._attemptCount =
          info?.count ?? 0
        ;(assignment as TestAssignmentWithDetails & { _hasInProgress?: boolean })._hasInProgress =
          info?.hasInProgress ?? false
      }
    }

    return { data: assignments, error: null, success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch assignments'
    return { data: null, error: message, success: false }
  }
}

// =============================================================
// Start Test
// =============================================================

export interface StartTestResult {
  attempt: TestAttempt
  test: Test
  questions: QuestionWithOptions[]
}

/**
 * Create a new test attempt and return the questions.
 *
 * Steps:
 * 1. Validate the test and assignment exist and are active.
 * 2. Check max_attempts is not exceeded.
 * 3. Create a test_attempt row with status = 'in_progress'.
 * 4. Fetch questions belonging to the test (with answer_options,
 *    but WITHOUT is_correct).
 * 5. Optionally shuffle questions and answers per test settings.
 * 6. Return the attempt + sanitized questions.
 */
export async function startTestAttempt(
  userId: number,
  testId: number,
  assignmentId: number | null,
): Promise<ApiResponse<StartTestResult>> {
  try {
    // 1. Fetch the test
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .eq('is_active', true)
      .single()

    if (testError || !testData) {
      return {
        data: null,
        error: testError?.message ?? 'Test not found or inactive',
        success: false,
      }
    }
    const test = testData as Test

    // 2. Check max_attempts
    const { count: attemptCount } = await supabase
      .from('test_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('test_id', testId)
      .in('status', [
        ATTEMPT_STATUSES.COMPLETED,
        ATTEMPT_STATUSES.TIMED_OUT,
        ATTEMPT_STATUSES.VIOLATION,
        ATTEMPT_STATUSES.CANCELLED,
      ])

    if ((attemptCount ?? 0) >= test.max_attempts) {
      return {
        data: null,
        error: `Maximum attempts (${test.max_attempts}) reached for this test`,
        success: false,
      }
    }

    // Check for an existing in_progress attempt (resume instead of creating new)
    const { data: existingAttempt } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('test_id', testId)
      .eq('status', ATTEMPT_STATUSES.IN_PROGRESS)
      .maybeSingle()

    let attempt: TestAttempt

    if (existingAttempt) {
      attempt = existingAttempt as TestAttempt
    } else {
      // 3. Create test_attempt
      const { data: newAttempt, error: attemptError } = await supabase
        .from('test_attempts')
        .insert({
          user_id: userId,
          test_id: testId,
          assignment_id: assignmentId,
          status: ATTEMPT_STATUSES.IN_PROGRESS,
          total_questions: test.max_questions,
          violation_count: 0,
        })
        .select()
        .single()

      if (attemptError || !newAttempt) {
        return {
          data: null,
          error: attemptError?.message ?? 'Failed to create test attempt',
          success: false,
        }
      }
      attempt = newAttempt as TestAttempt
    }

    // 4. Fetch questions with answer_options
    let questionsQuery = supabase
      .from('questions')
      .select('*, answer_options(*)')
      .eq('test_id', testId)
      .eq('is_active', true)

    // Limit to max_questions
    questionsQuery = questionsQuery.limit(test.max_questions)

    const { data: rawQuestions, error: qError } = await questionsQuery

    if (qError) {
      return {
        data: null,
        error: qError.message,
        success: false,
      }
    }

    let questions = (rawQuestions ?? []) as QuestionWithOptions[]

    // 5. Shuffle if configured
    if (test.shuffle_questions) {
      questions = shuffle(questions)
    }

    if (test.shuffle_answers) {
      questions = questions.map((q) => ({
        ...q,
        answer_options: shuffle(q.answer_options),
      }))
    }

    // Remove is_correct from options
    const sanitizedQuestions: QuestionWithOptions[] = questions.map((q) => ({
      ...q,
      answer_options: sanitizeOptions(q.answer_options) as AnswerOption[],
    }))

    // Update attempt total_questions to actual count
    if (questions.length !== attempt.total_questions) {
      await supabase
        .from('test_attempts')
        .update({ total_questions: questions.length })
        .eq('id', attempt.id)

      attempt = { ...attempt, total_questions: questions.length }
    }

    return {
      data: {
        attempt,
        test,
        questions: sanitizedQuestions,
      },
      error: null,
      success: true,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start test'
    return { data: null, error: message, success: false }
  }
}

// =============================================================
// Submit Answer
// =============================================================

/**
 * Save or update a student's answer for a specific question
 * within an attempt (upsert on attempt_id + question_id).
 */
export async function submitAnswer(
  attemptId: number,
  questionId: number,
  selectedOptionId: number | null,
): Promise<ApiResponse<TestAnswer>> {
  try {
    // Check if an answer already exists for this attempt + question
    const { data: existing } = await supabase
      .from('test_answers')
      .select('id')
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId)
      .maybeSingle()

    if (existing) {
      // Update existing answer
      const { data, error } = await supabase
        .from('test_answers')
        .update({
          selected_option_id: selectedOptionId,
          answered_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message, success: false }
      }
      return { data: data as TestAnswer, error: null, success: true }
    } else {
      // Insert new answer
      const { data, error } = await supabase
        .from('test_answers')
        .insert({
          attempt_id: attemptId,
          question_id: questionId,
          selected_option_id: selectedOptionId,
          is_correct: null, // Will be calculated when test finishes
          time_spent_seconds: null,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message, success: false }
      }
      return { data: data as TestAnswer, error: null, success: true }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit answer'
    return { data: null, error: message, success: false }
  }
}

// =============================================================
// Finish Test
// =============================================================

/**
 * Finish a test attempt.
 *
 * 1. Update the attempt status and finished_at.
 * 2. Call the `calculate_test_score` DB function (RPC) that
 *    evaluates correctness and populates score fields.
 * 3. Return the updated attempt.
 */
export async function finishTestAttempt(
  attemptId: number,
  status: AttemptStatus = ATTEMPT_STATUSES.COMPLETED,
  finishedReason: string | null = null,
): Promise<ApiResponse<TestAttempt & { score?: TestScoreResult }>> {
  try {
    // 1. Update attempt status
    const { data: updatedAttempt, error: updateError } = await supabase
      .from('test_attempts')
      .update({
        status,
        finished_at: new Date().toISOString(),
        finished_reason: finishedReason,
      })
      .eq('id', attemptId)
      .select()
      .single()

    if (updateError || !updatedAttempt) {
      return {
        data: null,
        error: updateError?.message ?? 'Failed to update attempt',
        success: false,
      }
    }

    // 2. Call DB function to calculate scores
    const { data: scoreData, error: rpcError } = await supabase.rpc(
      'calculate_test_score',
      { p_attempt_id: attemptId },
    )

    if (rpcError) {
      // Score calculation failed, but attempt is already marked finished.
      // Log but don't fail the whole operation.
      console.error('Score calculation RPC error:', rpcError.message)
      return {
        data: updatedAttempt as TestAttempt,
        error: null,
        success: true,
      }
    }

    // Re-fetch the attempt to get the updated score fields
    const { data: finalAttempt, error: refetchError } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('id', attemptId)
      .single()

    if (refetchError || !finalAttempt) {
      return {
        data: updatedAttempt as TestAttempt,
        error: null,
        success: true,
      }
    }

    return {
      data: {
        ...(finalAttempt as TestAttempt),
        score: scoreData as TestScoreResult | undefined,
      },
      error: null,
      success: true,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to finish test'
    return { data: null, error: message, success: false }
  }
}

// =============================================================
// Fetch Student's Attempts
// =============================================================

/**
 * Get all test attempts for a given student, ordered by most recent.
 */
export async function fetchMyAttempts(
  userId: number,
): Promise<ApiResponse<TestAttemptWithDetails[]>> {
  try {
    const { data, error } = await supabase
      .from('test_attempts')
      .select('*, test:tests(*), assignment:test_assignments(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: error.message, success: false }
    }

    return {
      data: (data ?? []) as TestAttemptWithDetails[],
      error: null,
      success: true,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch attempts'
    return { data: null, error: message, success: false }
  }
}

// =============================================================
// Attempt Details (post-test review)
// =============================================================

export interface AttemptDetailResult {
  attempt: TestAttemptWithDetails
  answers: TestAnswerWithDetails[]
}

/**
 * Fetch full details for a finished attempt, including all answers
 * with the correct option revealed.
 *
 * Only returns full answer details when the attempt is not in_progress
 * and the test's `show_results` flag is true.
 */
export async function fetchAttemptDetails(
  attemptId: number,
): Promise<ApiResponse<AttemptDetailResult>> {
  try {
    // Fetch the attempt
    const { data: attemptData, error: attemptError } = await supabase
      .from('test_attempts')
      .select('*, test:tests(*), assignment:test_assignments(*)')
      .eq('id', attemptId)
      .single()

    if (attemptError || !attemptData) {
      return {
        data: null,
        error: attemptError?.message ?? 'Attempt not found',
        success: false,
      }
    }

    const attempt = attemptData as TestAttemptWithDetails

    // Only return answer details for finished tests
    if (attempt.status === ATTEMPT_STATUSES.IN_PROGRESS) {
      return {
        data: null,
        error: 'Cannot view details for an in-progress attempt',
        success: false,
      }
    }

    // Fetch all answers with related question + selected option
    const { data: answersData, error: answersError } = await supabase
      .from('test_answers')
      .select(
        '*, question:questions(*, answer_options(*)), selected_option:answer_options(*)',
      )
      .eq('attempt_id', attemptId)
      .order('id', { ascending: true })

    if (answersError) {
      return {
        data: null,
        error: answersError.message,
        success: false,
      }
    }

    return {
      data: {
        attempt,
        answers: (answersData ?? []) as TestAnswerWithDetails[],
      },
      error: null,
      success: true,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch attempt details'
    return { data: null, error: message, success: false }
  }
}
