-- =============================================================
-- Migration: Add attempts_count & corrects_count to questions
-- =============================================================
-- Run this script in your Supabase SQL Editor (or via CLI).
--
-- What it does:
--   1. Adds two new INTEGER columns to the `questions` table.
--   2. Back-fills the columns from existing `test_answers` data
--      so historical attempts are not lost.
--   3. Creates the primary RPC `increment_question_stats` that the
--      app calls once per finished attempt.
--   4. Creates a thin single-question helper RPC
--      `increment_question_stats_single` used only as a client-side
--      fallback when the primary RPC is unavailable.
--   5. Creates a DB trigger that keeps the counters up-to-date
--      automatically whenever a `test_answers` row is inserted or
--      updated (belt-and-suspenders safety net).
-- =============================================================

-- -------------------------------------------------------------
-- STEP 1  Add columns (idempotent via IF NOT EXISTS)
-- -------------------------------------------------------------
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS attempts_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS corrects_count INTEGER NOT NULL DEFAULT 0;

-- Optional: ensure counters are never negative
ALTER TABLE questions
  ADD CONSTRAINT IF NOT EXISTS chk_attempts_count_non_negative CHECK (attempts_count >= 0),
  ADD CONSTRAINT IF NOT EXISTS chk_corrects_count_non_negative CHECK (corrects_count >= 0);

-- Create indexes so admin/teacher dashboards can ORDER BY or
-- filter on these stats without a seq-scan.
CREATE INDEX IF NOT EXISTS idx_questions_attempts_count
  ON questions (attempts_count DESC);

CREATE INDEX IF NOT EXISTS idx_questions_corrects_count
  ON questions (corrects_count DESC);

-- -------------------------------------------------------------
-- STEP 2  Back-fill from existing test_answers data
-- -------------------------------------------------------------
-- Update attempts_count: count all existing answers per question
UPDATE questions q
SET attempts_count = subq.cnt
FROM (
  SELECT
    question_id,
    COUNT(*)::INTEGER AS cnt
  FROM test_answers
  GROUP BY question_id
) subq
WHERE q.id = subq.question_id;

-- Update corrects_count: count only correct answers per question
UPDATE questions q
SET corrects_count = subq.cnt
FROM (
  SELECT
    question_id,
    COUNT(*)::INTEGER AS cnt
  FROM test_answers
  WHERE is_correct = TRUE
  GROUP BY question_id
) subq
WHERE q.id = subq.question_id;

-- -------------------------------------------------------------
-- STEP 3  Primary RPC: increment_question_stats(p_attempt_id)
-- -------------------------------------------------------------
-- Atomically increments attempts_count (and optionally
-- corrects_count) for every question answered in the given
-- attempt.  Called once by the app when a test finishes.
--
-- The function uses two separate UPDATE statements (one for all
-- answered questions, one for correctly answered questions) so
-- each update is a single SQL round-trip regardless of how many
-- questions the test has.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_question_stats(p_attempt_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increment attempts_count for every question in this attempt
  UPDATE questions q
  SET attempts_count = attempts_count + delta.cnt
  FROM (
    SELECT
      question_id,
      COUNT(*)::INTEGER AS cnt
    FROM test_answers
    WHERE attempt_id = p_attempt_id
    GROUP BY question_id
  ) delta
  WHERE q.id = delta.question_id;

  -- Increment corrects_count only for correctly answered questions
  UPDATE questions q
  SET corrects_count = corrects_count + delta.cnt
  FROM (
    SELECT
      question_id,
      COUNT(*)::INTEGER AS cnt
    FROM test_answers
    WHERE attempt_id = p_attempt_id
      AND is_correct = TRUE
    GROUP BY question_id
  ) delta
  WHERE q.id = delta.question_id;
END;
$$;

-- Grant execute permission to the anon/authenticated roles used by
-- the Supabase client (adjust role names if your project differs).
GRANT EXECUTE ON FUNCTION increment_question_stats(BIGINT) TO anon, authenticated;

-- -------------------------------------------------------------
-- STEP 4  Fallback RPC: increment_question_stats_single(...)
-- -------------------------------------------------------------
-- Used only by the client-side fallback path when the primary RPC
-- is not yet available.  Increments one question at a time.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_question_stats_single(
  p_question_id   BIGINT,
  p_attempts_delta INTEGER,
  p_corrects_delta INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE questions
  SET
    attempts_count = attempts_count + p_attempts_delta,
    corrects_count = corrects_count + p_corrects_delta
  WHERE id = p_question_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_question_stats_single(BIGINT, INTEGER, INTEGER) TO anon, authenticated;

-- -------------------------------------------------------------
-- STEP 5  Trigger: auto-update counters on test_answers changes
-- -------------------------------------------------------------
-- This trigger is a safety net.  It fires AFTER each INSERT or
-- UPDATE on test_answers so the counters stay correct even if
-- the app-level RPC call is skipped for any reason.
--
-- The trigger handles four cases:
--   INSERT with is_correct = TRUE   -> +1 attempts, +1 corrects
--   INSERT with is_correct = FALSE  -> +1 attempts, +0 corrects
--   INSERT with is_correct = NULL   -> +1 attempts (skip corrects)
--   UPDATE  (is_correct changed)    -> adjust corrects only
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_update_question_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Always count the new attempt
    UPDATE questions
    SET attempts_count = attempts_count + 1
    WHERE id = NEW.question_id;

    -- Count as correct only when explicitly marked so
    IF NEW.is_correct = TRUE THEN
      UPDATE questions
      SET corrects_count = corrects_count + 1
      WHERE id = NEW.question_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- attempts_count does not change on updates (already counted on INSERT)
    -- Only adjust corrects_count when the is_correct field actually changes
    IF OLD.is_correct IS DISTINCT FROM NEW.is_correct THEN
      IF NEW.is_correct = TRUE AND (OLD.is_correct IS NULL OR OLD.is_correct = FALSE) THEN
        -- Became correct
        UPDATE questions
        SET corrects_count = corrects_count + 1
        WHERE id = NEW.question_id;
      ELSIF (NEW.is_correct IS NULL OR NEW.is_correct = FALSE) AND OLD.is_correct = TRUE THEN
        -- Was correct, now is not
        UPDATE questions
        SET corrects_count = GREATEST(corrects_count - 1, 0)
        WHERE id = NEW.question_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the trigger first so this script is re-runnable
DROP TRIGGER IF EXISTS trg_test_answers_update_question_stats ON test_answers;

CREATE TRIGGER trg_test_answers_update_question_stats
  AFTER INSERT OR UPDATE OF is_correct
  ON test_answers
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_question_stats();

-- =============================================================
-- Verification queries (uncomment to check after running)
-- =============================================================
-- SELECT id, question_text, attempts_count, corrects_count
-- FROM   questions
-- ORDER  BY attempts_count DESC
-- LIMIT  20;
