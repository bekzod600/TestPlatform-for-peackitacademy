-- ===========================================================
-- Migration: Add override settings columns to test_assignments
-- ===========================================================
-- COALESCE pattern: test_assignments da nullable override sozlamalar
-- NULL = testning default qiymati ishlatiladi
-- ===========================================================

-- STEP 1: Add nullable override columns
ALTER TABLE public.test_assignments
  ADD COLUMN IF NOT EXISTS duration_minutes  INTEGER NULL,
  ADD COLUMN IF NOT EXISTS max_questions     INTEGER NULL,
  ADD COLUMN IF NOT EXISTS passing_score     INTEGER NULL,
  ADD COLUMN IF NOT EXISTS max_attempts      INTEGER NULL,
  ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS shuffle_answers   BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS show_results      BOOLEAN NULL;

-- STEP 2: CHECK constraints (nullable but must be in valid range if provided)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_duration_check') THEN
    ALTER TABLE public.test_assignments
      ADD CONSTRAINT assignments_duration_check
        CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 300);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_max_questions_check') THEN
    ALTER TABLE public.test_assignments
      ADD CONSTRAINT assignments_max_questions_check
        CHECK (max_questions IS NULL OR max_questions BETWEEN 1 AND 500);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_passing_score_check') THEN
    ALTER TABLE public.test_assignments
      ADD CONSTRAINT assignments_passing_score_check
        CHECK (passing_score IS NULL OR passing_score BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignments_max_attempts_check') THEN
    ALTER TABLE public.test_assignments
      ADD CONSTRAINT assignments_max_attempts_check
        CHECK (max_attempts IS NULL OR max_attempts BETWEEN 1 AND 100);
  END IF;
END $$;

-- STEP 3: Agar constraint eski limitda (1-10) yaratilgan bo'lsa, yangilash
-- Bu qadam faqat allaqachon migration ishlatilgan DBlar uchun
ALTER TABLE public.test_assignments DROP CONSTRAINT IF EXISTS assignments_max_attempts_check;
ALTER TABLE public.test_assignments
  ADD CONSTRAINT assignments_max_attempts_check
    CHECK (max_attempts IS NULL OR max_attempts BETWEEN 1 AND 100);

-- Tests jadvalidagi max_attempts limitini ham kengaytirish
ALTER TABLE public.tests DROP CONSTRAINT IF EXISTS tests_max_attempts_check;
ALTER TABLE public.tests
  ADD CONSTRAINT tests_max_attempts_check
    CHECK (max_attempts BETWEEN 1 AND 100);
