-- =============================================
-- Fix: Test foizini to'g'ri hisoblash
-- =============================================
-- Muammo: Foiz faqat javob berilgan savollar asosida hisoblanayotgan edi.
-- Yechim: Foizni barcha test savollari asosida hisoblash.
-- =============================================

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
BEGIN
  -- Avval har bir javobning to'g'ri/noto'g'ri ekanini aniqlash
  UPDATE public.test_answers ta
  SET is_correct = (
    ta.selected_option_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.answer_options ao
      WHERE ao.id = ta.selected_option_id
        AND ao.is_correct = true
    )
  )
  WHERE ta.attempt_id = p_attempt_id;

  -- Javoblarni hisoblash
  SELECT
    COUNT(*) FILTER (WHERE ta.is_correct = true),
    COUNT(*) FILTER (WHERE ta.is_correct = false),
    COUNT(*) FILTER (WHERE ta.selected_option_id IS NULL)
  INTO v_correct, v_wrong, v_skipped
  FROM public.test_answers ta
  WHERE ta.attempt_id = p_attempt_id;

  -- Barcha testdagi savollar sonini va maksimal ballni olish
  SELECT
    att.total_questions,
    COALESCE(SUM(q.points), 0)
  INTO v_total, v_max_score
  FROM public.test_attempts att
  JOIN public.questions q ON q.test_id = att.test_id AND q.is_active = true
  WHERE att.id = p_attempt_id
  GROUP BY att.total_questions;

  -- Olingan ballni hisoblash (faqat to'g'ri javoblar uchun)
  SELECT
    COALESCE(SUM(CASE WHEN ta.is_correct = true THEN q.points ELSE 0 END), 0)
  INTO v_earned_score
  FROM public.test_answers ta
  JOIN public.questions q ON q.id = ta.question_id
  WHERE ta.attempt_id = p_attempt_id;

  -- Foiz hisoblash
  IF v_max_score > 0 THEN
    v_percentage := ROUND((v_earned_score::DECIMAL / v_max_score) * 100, 2);
  END IF;

  -- Sarflangan vaqtni hisoblash
  SELECT EXTRACT(EPOCH FROM (COALESCE(finished_at, NOW()) - started_at))::INTEGER
  INTO v_time_spent
  FROM public.test_attempts
  WHERE id = p_attempt_id;

  -- Attempt ni yangilash
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
