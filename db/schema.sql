-- =============================================
-- TestPlatform for Peackit Academy
-- Production Database Schema
-- =============================================

-- Avval eski jadvallarni o'chirish (agar mavjud bo'lsa)
-- DIQQAT: Production da faqat migration ishlating!
DROP TABLE IF EXISTS public.test_answers CASCADE;
DROP TABLE IF EXISTS public.test_attempts CASCADE;
DROP TABLE IF EXISTS public.test_assignments CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.answer_options CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.tests CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.user_groups CASCADE;

-- =============================================
-- 1. FANLAR (Subjects)
-- =============================================
CREATE TABLE public.subjects (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT subjects_name_unique UNIQUE (name)
);

-- =============================================
-- 2. KATEGORIYALAR (Categories)
-- =============================================
CREATE TABLE public.categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  subject_id BIGINT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT categories_subject_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects (id)
    ON DELETE SET NULL
);

CREATE INDEX idx_categories_subject ON public.categories (subject_id);

-- =============================================
-- 3. TALABALAR GURUHLARI (User Groups)
-- =============================================
CREATE TABLE public.user_groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_groups_name_unique UNIQUE (name)
);

-- =============================================
-- 4. FOYDALANUVCHILAR (Users)
-- =============================================
CREATE TABLE public.users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  user_group_id BIGINT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_username_unique UNIQUE (username),
  CONSTRAINT users_role_check CHECK (
    role IN ('super_admin', 'admin', 'teacher', 'student')
  ),
  CONSTRAINT users_user_group_fkey
    FOREIGN KEY (user_group_id) REFERENCES public.user_groups (id)
    ON DELETE SET NULL
);

CREATE INDEX idx_users_username ON public.users (username);
CREATE INDEX idx_users_role ON public.users (role);
CREATE INDEX idx_users_user_group ON public.users (user_group_id);

-- =============================================
-- 5. SESSIYALAR (Sessions)
-- =============================================
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,
  token TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT sessions_token_unique UNIQUE (token),
  CONSTRAINT sessions_user_fkey
    FOREIGN KEY (user_id) REFERENCES public.users (id)
    ON DELETE CASCADE
);

CREATE INDEX idx_sessions_token ON public.sessions (token);
CREATE INDEX idx_sessions_user ON public.sessions (user_id);
CREATE INDEX idx_sessions_expires ON public.sessions (expires_at);

-- =============================================
-- 6. TESTLAR (Tests) — avvalgi question_groups o'rniga
-- =============================================
CREATE TABLE public.tests (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject_id BIGINT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_questions INTEGER NOT NULL DEFAULT 50,
  passing_score INTEGER NOT NULL DEFAULT 60,
  shuffle_questions BOOLEAN NOT NULL DEFAULT true,
  shuffle_answers BOOLEAN NOT NULL DEFAULT true,
  show_results BOOLEAN NOT NULL DEFAULT true,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT tests_duration_check CHECK (duration_minutes BETWEEN 1 AND 300),
  CONSTRAINT tests_max_questions_check CHECK (max_questions BETWEEN 1 AND 500),
  CONSTRAINT tests_passing_score_check CHECK (passing_score BETWEEN 0 AND 100),
  CONSTRAINT tests_max_attempts_check CHECK (max_attempts BETWEEN 1 AND 10),
  CONSTRAINT tests_subject_fkey
    FOREIGN KEY (subject_id) REFERENCES public.subjects (id)
    ON DELETE SET NULL,
  CONSTRAINT tests_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users (id)
    ON DELETE SET NULL
);

CREATE INDEX idx_tests_subject ON public.tests (subject_id);
CREATE INDEX idx_tests_active ON public.tests (is_active);

-- =============================================
-- 7. SAVOLLAR (Questions)
-- =============================================
CREATE TABLE public.questions (
  id BIGSERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  points INTEGER NOT NULL DEFAULT 1,
  category_id BIGINT,
  test_id BIGINT,
  explanation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT questions_type_check CHECK (
    question_type IN ('multiple_choice', 'true_false', 'fill_blank')
  ),
  CONSTRAINT questions_difficulty_check CHECK (
    difficulty IN ('easy', 'medium', 'hard')
  ),
  CONSTRAINT questions_points_check CHECK (points BETWEEN 1 AND 10),
  CONSTRAINT questions_category_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories (id)
    ON DELETE SET NULL,
  CONSTRAINT questions_test_fkey
    FOREIGN KEY (test_id) REFERENCES public.tests (id)
    ON DELETE CASCADE,
  CONSTRAINT questions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users (id)
    ON DELETE SET NULL
);

CREATE INDEX idx_questions_test ON public.questions (test_id);
CREATE INDEX idx_questions_category ON public.questions (category_id);
CREATE INDEX idx_questions_type ON public.questions (question_type);
CREATE INDEX idx_questions_difficulty ON public.questions (difficulty);

-- =============================================
-- 8. JAVOB VARIANTLARI (Answer Options)
-- =============================================
CREATE TABLE public.answer_options (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT answer_options_question_fkey
    FOREIGN KEY (question_id) REFERENCES public.questions (id)
    ON DELETE CASCADE
);

CREATE INDEX idx_answer_options_question ON public.answer_options (question_id);

-- =============================================
-- 9. TEST TAYINLASH (Test Assignments)
-- =============================================
CREATE TABLE public.test_assignments (
  id BIGSERIAL PRIMARY KEY,
  test_id BIGINT NOT NULL,
  user_group_id BIGINT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  assigned_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT assignments_time_check CHECK (end_time > start_time),
  CONSTRAINT assignments_unique UNIQUE (test_id, user_group_id),
  CONSTRAINT assignments_test_fkey
    FOREIGN KEY (test_id) REFERENCES public.tests (id)
    ON DELETE CASCADE,
  CONSTRAINT assignments_group_fkey
    FOREIGN KEY (user_group_id) REFERENCES public.user_groups (id)
    ON DELETE CASCADE,
  CONSTRAINT assignments_assigned_by_fkey
    FOREIGN KEY (assigned_by) REFERENCES public.users (id)
    ON DELETE SET NULL
);

CREATE INDEX idx_assignments_test ON public.test_assignments (test_id);
CREATE INDEX idx_assignments_group ON public.test_assignments (user_group_id);
CREATE INDEX idx_assignments_time ON public.test_assignments (start_time, end_time);

-- =============================================
-- 10. TEST URINISHLARI (Test Attempts)
-- =============================================
CREATE TABLE public.test_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  test_id BIGINT NOT NULL,
  assignment_id BIGINT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  skipped_answers INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  earned_score INTEGER DEFAULT 0,
  percentage DECIMAL(5, 2) DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  violation_count INTEGER NOT NULL DEFAULT 0,
  finished_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT attempts_status_check CHECK (
    status IN ('in_progress', 'completed', 'timed_out', 'cancelled', 'violation')
  ),
  CONSTRAINT attempts_user_fkey
    FOREIGN KEY (user_id) REFERENCES public.users (id)
    ON DELETE CASCADE,
  CONSTRAINT attempts_test_fkey
    FOREIGN KEY (test_id) REFERENCES public.tests (id)
    ON DELETE CASCADE,
  CONSTRAINT attempts_assignment_fkey
    FOREIGN KEY (assignment_id) REFERENCES public.test_assignments (id)
    ON DELETE SET NULL
);

CREATE INDEX idx_attempts_user ON public.test_attempts (user_id);
CREATE INDEX idx_attempts_test ON public.test_attempts (test_id);
CREATE INDEX idx_attempts_status ON public.test_attempts (status);
CREATE INDEX idx_attempts_started ON public.test_attempts (started_at);

-- =============================================
-- 11. TEST JAVOBLARI (Test Answers)
-- =============================================
CREATE TABLE public.test_answers (
  id BIGSERIAL PRIMARY KEY,
  attempt_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  selected_option_id BIGINT,
  is_correct BOOLEAN,
  time_spent_seconds INTEGER DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT test_answers_unique UNIQUE (attempt_id, question_id),
  CONSTRAINT test_answers_attempt_fkey
    FOREIGN KEY (attempt_id) REFERENCES public.test_attempts (id)
    ON DELETE CASCADE,
  CONSTRAINT test_answers_question_fkey
    FOREIGN KEY (question_id) REFERENCES public.questions (id)
    ON DELETE CASCADE,
  CONSTRAINT test_answers_option_fkey
    FOREIGN KEY (selected_option_id) REFERENCES public.answer_options (id)
    ON DELETE SET NULL
);

CREATE INDEX idx_test_answers_attempt ON public.test_answers (attempt_id);
CREATE INDEX idx_test_answers_question ON public.test_answers (question_id);

-- =============================================
-- 12. AUDIT LOG
-- =============================================
CREATE TABLE public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id BIGINT,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT audit_logs_user_fkey
    FOREIGN KEY (user_id) REFERENCES public.users (id)
    ON DELETE SET NULL
);

CREATE INDEX idx_audit_user ON public.audit_logs (user_id);
CREATE INDEX idx_audit_action ON public.audit_logs (action);
CREATE INDEX idx_audit_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_created ON public.audit_logs (created_at DESC);

-- =============================================
-- 13. DATABASE FUNCTIONS
-- =============================================

-- Testni yakunlash va natijani server-side hisoblash
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
  -- Javoblarni hisoblash
  SELECT
    COUNT(*) FILTER (WHERE ta.is_correct = true),
    COUNT(*) FILTER (WHERE ta.is_correct = false),
    COUNT(*) FILTER (WHERE ta.selected_option_id IS NULL),
    COUNT(*)
  INTO v_correct, v_wrong, v_skipped, v_total
  FROM public.test_answers ta
  WHERE ta.attempt_id = p_attempt_id;

  -- Ball hisoblash (har bir savol uchun points)
  SELECT
    COALESCE(SUM(q.points), 0),
    COALESCE(SUM(CASE WHEN ta.is_correct = true THEN q.points ELSE 0 END), 0)
  INTO v_max_score, v_earned_score
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

-- Muddati o'tgan sessiyalarni tozalash
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.sessions
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- updated_at avtomatik yangilash trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- updated_at trigger larni qo'shish
CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_user_groups_updated_at
  BEFORE UPDATE ON public.user_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_tests_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tr_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 14. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Users jadvalida RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Admin barcha usersni ko'ra oladi
CREATE POLICY "Admins can do everything with users"
  ON public.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.users u ON u.id = s.user_id
      WHERE s.token = current_setting('request.headers', true)::json->>'authorization'
        AND u.role IN ('super_admin', 'admin')
        AND s.expires_at > NOW()
    )
  );

-- Student faqat o'zini ko'radi
CREATE POLICY "Students can view own profile"
  ON public.users
  FOR SELECT
  USING (
    id = (
      SELECT s.user_id FROM public.sessions s
      WHERE s.token = current_setting('request.headers', true)::json->>'authorization'
        AND s.expires_at > NOW()
      LIMIT 1
    )
  );

-- Test attempts uchun RLS
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see own attempts"
  ON public.test_attempts
  FOR SELECT
  USING (
    user_id = (
      SELECT s.user_id FROM public.sessions s
      WHERE s.token = current_setting('request.headers', true)::json->>'authorization'
        AND s.expires_at > NOW()
      LIMIT 1
    )
  );

CREATE POLICY "Admins see all attempts"
  ON public.test_attempts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.users u ON u.id = s.user_id
      WHERE s.token = current_setting('request.headers', true)::json->>'authorization'
        AND u.role IN ('super_admin', 'admin', 'teacher')
        AND s.expires_at > NOW()
    )
  );

-- Test answers uchun RLS
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see own answers"
  ON public.test_answers
  FOR SELECT
  USING (
    attempt_id IN (
      SELECT ta.id FROM public.test_attempts ta
      JOIN public.sessions s ON s.user_id = ta.user_id
      WHERE s.token = current_setting('request.headers', true)::json->>'authorization'
        AND s.expires_at > NOW()
    )
  );

CREATE POLICY "Admins see all answers"
  ON public.test_answers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.users u ON u.id = s.user_id
      WHERE s.token = current_setting('request.headers', true)::json->>'authorization'
        AND u.role IN ('super_admin', 'admin', 'teacher')
        AND s.expires_at > NOW()
    )
  );

-- =============================================
-- 15. BOSHLANG'ICH MA'LUMOTLAR (Seed Data)
-- =============================================

-- Default admin foydalanuvchi (parol: admin123 — bcrypt hash)
-- Hash: $2a$12$LJ3m4ys3GZfnMQXYCzsk4.W6gRFN.IMRiR2cEOmS3FXPSlVymVOFy
INSERT INTO public.users (full_name, username, password_hash, role)
VALUES ('Super Admin', 'admin', '$2a$12$LJ3m4ys3GZfnMQXYCzsk4.W6gRFN.IMRiR2cEOmS3FXPSlVymVOFy', 'super_admin');
