-- ===========================================================
-- Migration: Convert questions.test_id (1:N) to test_questions (M:N)
-- ===========================================================

-- STEP 1: Create the junction table
CREATE TABLE IF NOT EXISTS public.test_questions (
  id         BIGSERIAL PRIMARY KEY,
  test_id    BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT test_questions_unique UNIQUE (test_id, question_id),
  CONSTRAINT test_questions_test_fkey
    FOREIGN KEY (test_id) REFERENCES public.tests (id)
    ON DELETE CASCADE,
  CONSTRAINT test_questions_question_fkey
    FOREIGN KEY (question_id) REFERENCES public.questions (id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_test_questions_test     ON public.test_questions (test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_question ON public.test_questions (question_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_order    ON public.test_questions (test_id, sort_order);

-- RLS
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.test_questions
  FOR ALL USING (true) WITH CHECK (true);

-- STEP 2: Migrate existing test_id data into junction table
INSERT INTO public.test_questions (test_id, question_id, sort_order)
SELECT q.test_id, q.id, ROW_NUMBER() OVER (PARTITION BY q.test_id ORDER BY q.id) - 1
FROM public.questions q
WHERE q.test_id IS NOT NULL
ON CONFLICT (test_id, question_id) DO NOTHING;

-- STEP 3: Drop the old test_id column
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_test_fkey;
DROP INDEX IF EXISTS idx_questions_test;
ALTER TABLE public.questions DROP COLUMN IF EXISTS test_id;

-- STEP 4: Update calculate_test_score to use junction table
CREATE OR REPLACE FUNCTION public.calculate_test_score(p_attempt_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_correct INTEGER := 0;
  v_wrong INTEGER := 0;
  v_skipped INTEGER := 0;
  v_total INTEGER := 0;
  v_max_score INTEGER := 0;
  v_earned_score INTEGER := 0;
  v_percentage DECIMAL(5, 2) := 0;
  v_time_spent INTEGER := 0;
  v_answered_count INTEGER := 0;
BEGIN
  -- Mark each answer correct/incorrect
  -- Skipped answers (selected_option_id IS NULL) get is_correct = NULL
  UPDATE public.test_answers ta
  SET is_correct = CASE
    WHEN ta.selected_option_id IS NULL THEN NULL
    WHEN EXISTS (
      SELECT 1
      FROM public.answer_options ao
      WHERE ao.id = ta.selected_option_id
        AND ao.is_correct = true
    ) THEN true
    ELSE false
  END
  WHERE ta.attempt_id = p_attempt_id;

  -- Count answers from test_answers table
  SELECT
    COUNT(*) FILTER (WHERE ta.is_correct = true),
    COUNT(*) FILTER (WHERE ta.is_correct = false),
    COUNT(*) FILTER (WHERE ta.is_correct IS NULL)
  INTO v_correct, v_wrong, v_skipped
  FROM public.test_answers ta
  WHERE ta.attempt_id = p_attempt_id;

  -- Get total questions from the attempt (set at test start)
  SELECT att.total_questions
  INTO v_total
  FROM public.test_attempts att
  WHERE att.id = p_attempt_id;

  -- Answered count = rows in test_answers that have a selected option
  v_answered_count := v_correct + v_wrong;

  -- Skipped = total questions minus answered (includes both
  -- test_answers rows with NULL selected_option_id AND questions
  -- that have no test_answers row at all)
  v_skipped := v_total - v_answered_count;

  -- Calculate max_score from only the questions in this attempt's test_answers
  -- (all questions now have test_answers rows, including unanswered ones)
  SELECT COALESCE(SUM(q.points), 0)
  INTO v_max_score
  FROM public.test_answers ta
  JOIN public.questions q ON q.id = ta.question_id
  WHERE ta.attempt_id = p_attempt_id;

  -- Calculate earned score
  SELECT
    COALESCE(SUM(CASE WHEN ta.is_correct = true THEN q.points ELSE 0 END), 0)
  INTO v_earned_score
  FROM public.test_answers ta
  JOIN public.questions q ON q.id = ta.question_id
  WHERE ta.attempt_id = p_attempt_id;

  -- Calculate percentage based on total questions (not max_score)
  -- This gives a straightforward "X out of Y questions correct" percentage
  IF v_total > 0 THEN
    v_percentage := ROUND((v_correct::DECIMAL / v_total) * 100, 2);
  END IF;

  -- Calculate time spent
  SELECT EXTRACT(EPOCH FROM (COALESCE(finished_at, NOW()) - started_at))::INTEGER
  INTO v_time_spent
  FROM public.test_attempts
  WHERE id = p_attempt_id;

  -- Update the attempt row
  UPDATE public.test_attempts
  SET
    correct_answers = v_correct,
    wrong_answers = v_wrong,
    skipped_answers = v_skipped,
    total_questions = v_total,
    max_score = v_max_score,
    earned_score = v_earned_score,
    percentage = v_percentage,
    time_spent_seconds = v_time_spent
  WHERE id = p_attempt_id;

  RETURN json_build_object(
    'correct_answers', v_correct,
    'wrong_answers', v_wrong,
    'skipped_answers', v_skipped,
    'total_questions', v_total,
    'max_score', v_max_score,
    'earned_score', v_earned_score,
    'percentage', v_percentage,
    'time_spent_seconds', v_time_spent
  );
END;
$$;
