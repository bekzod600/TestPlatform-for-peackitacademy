-- =============================================
-- 0. TRIGGER FUNCTION (eng avval yaratiladi)
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================
-- 1. SUBJECTS
-- =============================================
CREATE TABLE public.subjects (
  id          BIGSERIAL NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT subjects_pkey        PRIMARY KEY (id),
  CONSTRAINT subjects_name_unique UNIQUE (name)
) TABLESPACE pg_default;

CREATE TRIGGER tr_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================
-- 2. USER_GROUPS
-- =============================================
-- users jadvaliga bog'liq emas (teacher_id keyinroq qo'shiladi),
-- shuning uchun users'dan oldin yaratiladi.
CREATE TABLE public.user_groups (
  id          BIGSERIAL NOT NULL,
  name        TEXT NOT NULL,
  description TEXT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  teacher_id  BIGINT NULL,          -- FK quyida ALTER bilan qo'shiladi
  CONSTRAINT user_groups_pkey        PRIMARY KEY (id),
  CONSTRAINT user_groups_name_unique UNIQUE (name)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_user_groups_teacher
  ON public.user_groups USING BTREE (teacher_id);

CREATE TRIGGER tr_user_groups_updated_at
  BEFORE UPDATE ON user_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================
-- 3. USERS  (user_groups'dan keyin)
-- =============================================
CREATE TABLE public.users (
  id             BIGSERIAL NOT NULL,
  full_name      TEXT NOT NULL,
  username       TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'student',
  user_group_id  BIGINT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMP WITH TIME ZONE NULL,
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  avatar_url     TEXT NULL,
  CONSTRAINT users_pkey           PRIMARY KEY (id),
  CONSTRAINT users_username_unique UNIQUE (username),
  CONSTRAINT users_user_group_fkey FOREIGN KEY (user_group_id)
      REFERENCES user_groups (id) ON DELETE SET NULL,
  CONSTRAINT users_role_check CHECK (
    role = ANY (ARRAY['super_admin','admin','teacher','student'])
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_users_username   ON public.users USING BTREE (username);
CREATE INDEX IF NOT EXISTS idx_users_role        ON public.users USING BTREE (role);
CREATE INDEX IF NOT EXISTS idx_users_user_group  ON public.users USING BTREE (user_group_id);

CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================
-- 4. user_groups.teacher_id → users  (circular FK)
-- =============================================
ALTER TABLE public.user_groups
  ADD CONSTRAINT user_groups_teacher_fkey
    FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE SET NULL;


-- =============================================
-- 5. CATEGORIES  (subjects'dan keyin)
-- =============================================
CREATE TABLE public.categories (
  id          BIGSERIAL NOT NULL,
  name        TEXT NOT NULL,
  subject_id  BIGINT NULL,
  description TEXT NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT categories_pkey         PRIMARY KEY (id),
  CONSTRAINT categories_subject_fkey FOREIGN KEY (subject_id)
      REFERENCES subjects (id) ON DELETE SET NULL
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_categories_subject
  ON public.categories USING BTREE (subject_id);


-- =============================================
-- 6. TESTS  (subjects + users'dan keyin)
-- =============================================
CREATE TABLE public.tests (
  id                BIGSERIAL NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT NULL,
  subject_id        BIGINT NULL,
  duration_minutes  INTEGER NOT NULL DEFAULT 60,
  max_questions     INTEGER NOT NULL DEFAULT 50,
  passing_score     INTEGER NOT NULL DEFAULT 60,
  shuffle_questions BOOLEAN NOT NULL DEFAULT TRUE,
  shuffle_answers   BOOLEAN NOT NULL DEFAULT TRUE,
  show_results      BOOLEAN NOT NULL DEFAULT TRUE,
  max_attempts      INTEGER NOT NULL DEFAULT 1,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        BIGINT NULL,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT tests_pkey            PRIMARY KEY (id),
  CONSTRAINT tests_created_by_fkey FOREIGN KEY (created_by)
      REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT tests_subject_fkey    FOREIGN KEY (subject_id)
      REFERENCES subjects (id) ON DELETE SET NULL,
  CONSTRAINT tests_passing_score_check  CHECK (passing_score  BETWEEN 0   AND 100),
  CONSTRAINT tests_max_questions_check  CHECK (max_questions  BETWEEN 1   AND 500),
  CONSTRAINT tests_duration_check       CHECK (duration_minutes BETWEEN 1 AND 300),
  CONSTRAINT tests_max_attempts_check   CHECK (max_attempts   BETWEEN 1   AND 100)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tests_subject ON public.tests USING BTREE (subject_id);
CREATE INDEX IF NOT EXISTS idx_tests_active  ON public.tests USING BTREE (is_active);

CREATE TRIGGER tr_tests_updated_at
  BEFORE UPDATE ON tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================
-- 7. QUESTIONS  (categories + tests + users'dan keyin)
-- =============================================
CREATE TABLE public.questions (
  id              BIGSERIAL NOT NULL,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL DEFAULT 'multiple_choice',
  difficulty      TEXT NOT NULL DEFAULT 'medium',
  points          INTEGER NOT NULL DEFAULT 1,
  category_id     BIGINT NULL,
  test_id         BIGINT NULL,
  explanation     TEXT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      BIGINT NULL,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  attempts_count  INTEGER NOT NULL DEFAULT 0,
  corrects_count  INTEGER NOT NULL DEFAULT 0,
  image_url       TEXT NULL,
  CONSTRAINT questions_pkey            PRIMARY KEY (id),
  CONSTRAINT questions_created_by_fkey FOREIGN KEY (created_by)
      REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT questions_test_fkey       FOREIGN KEY (test_id)
      REFERENCES tests (id) ON DELETE CASCADE,
  CONSTRAINT questions_category_fkey   FOREIGN KEY (category_id)
      REFERENCES categories (id) ON DELETE SET NULL,
  CONSTRAINT chk_attempts_count_non_negative CHECK (attempts_count >= 0),
  CONSTRAINT chk_corrects_count_non_negative CHECK (corrects_count >= 0),
  CONSTRAINT questions_type_check CHECK (
    question_type = ANY (ARRAY['multiple_choice','true_false','fill_blank'])
  ),
  CONSTRAINT questions_difficulty_check CHECK (
    difficulty = ANY (ARRAY['easy','medium','hard'])
  ),
  CONSTRAINT questions_points_check CHECK (points BETWEEN 1 AND 10)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_questions_test           ON public.questions USING BTREE (test_id);
CREATE INDEX IF NOT EXISTS idx_questions_category       ON public.questions USING BTREE (category_id);
CREATE INDEX IF NOT EXISTS idx_questions_type           ON public.questions USING BTREE (question_type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty     ON public.questions USING BTREE (difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_attempts_count ON public.questions USING BTREE (attempts_count DESC);
CREATE INDEX IF NOT EXISTS idx_questions_corrects_count ON public.questions USING BTREE (corrects_count DESC);

CREATE TRIGGER tr_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================
-- 8. ANSWER_OPTIONS  (questions'dan keyin)
-- =============================================
CREATE TABLE public.answer_options (
  id          BIGSERIAL NOT NULL,
  question_id BIGINT NOT NULL,
  option_text TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT answer_options_pkey          PRIMARY KEY (id),
  CONSTRAINT answer_options_question_fkey FOREIGN KEY (question_id)
      REFERENCES questions (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_answer_options_question
  ON public.answer_options USING BTREE (question_id);


-- =============================================
-- 9. SESSIONS  (users'dan keyin)
-- =============================================
CREATE TABLE public.sessions (
  id         UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id    BIGINT NOT NULL,
  token      TEXT NOT NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT sessions_pkey         PRIMARY KEY (id),
  CONSTRAINT sessions_token_unique UNIQUE (token),
  CONSTRAINT sessions_user_fkey   FOREIGN KEY (user_id)
      REFERENCES users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_sessions_token   ON public.sessions USING BTREE (token);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON public.sessions USING BTREE (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.sessions USING BTREE (expires_at);


-- =============================================
-- 10. TEST_ASSIGNMENTS  (tests + user_groups + users'dan keyin)
-- =============================================
CREATE TABLE public.test_assignments (
  id                BIGSERIAL NOT NULL,
  test_id           BIGINT NOT NULL,
  user_group_id     BIGINT NOT NULL,
  start_time        TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time          TIMESTAMP WITH TIME ZONE NOT NULL,
  assigned_by       BIGINT NULL,
  -- Override sozlamalar (NULL = testning default qiymati ishlatiladi)
  duration_minutes  INTEGER NULL,
  max_questions     INTEGER NULL,
  passing_score     INTEGER NULL,
  max_attempts      INTEGER NULL,
  shuffle_questions BOOLEAN NULL,
  shuffle_answers   BOOLEAN NULL,
  show_results      BOOLEAN NULL,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT test_assignments_pkey    PRIMARY KEY (id),
  CONSTRAINT assignments_unique        UNIQUE (test_id, user_group_id),
  CONSTRAINT assignments_assigned_by_fkey FOREIGN KEY (assigned_by)
      REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT assignments_group_fkey   FOREIGN KEY (user_group_id)
      REFERENCES user_groups (id) ON DELETE CASCADE,
  CONSTRAINT assignments_test_fkey    FOREIGN KEY (test_id)
      REFERENCES tests (id) ON DELETE CASCADE,
  CONSTRAINT assignments_time_check   CHECK (end_time > start_time),
  CONSTRAINT assignments_duration_check      CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 300),
  CONSTRAINT assignments_max_questions_check CHECK (max_questions IS NULL OR max_questions BETWEEN 1 AND 500),
  CONSTRAINT assignments_passing_score_check CHECK (passing_score IS NULL OR passing_score BETWEEN 0 AND 100),
  CONSTRAINT assignments_max_attempts_check  CHECK (max_attempts IS NULL OR max_attempts BETWEEN 1 AND 100)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_assignments_test  ON public.test_assignments USING BTREE (test_id);
CREATE INDEX IF NOT EXISTS idx_assignments_group ON public.test_assignments USING BTREE (user_group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_time  ON public.test_assignments USING BTREE (start_time, end_time);


-- =============================================
-- 11. TEST_ATTEMPTS  (users + tests + test_assignments'dan keyin)
-- =============================================
CREATE TABLE public.test_attempts (
  id               BIGSERIAL NOT NULL,
  user_id          BIGINT NOT NULL,
  test_id          BIGINT NOT NULL,
  assignment_id    BIGINT NULL,
  status           TEXT NOT NULL DEFAULT 'in_progress',
  started_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  finished_at      TIMESTAMP WITH TIME ZONE NULL,
  total_questions  INTEGER NOT NULL DEFAULT 0,
  correct_answers  INTEGER NULL DEFAULT 0,
  wrong_answers    INTEGER NULL DEFAULT 0,
  skipped_answers  INTEGER NULL DEFAULT 0,
  max_score        INTEGER NULL DEFAULT 0,
  earned_score     INTEGER NULL DEFAULT 0,
  percentage       NUMERIC(5,2) NULL DEFAULT 0,
  time_spent_seconds INTEGER NULL DEFAULT 0,
  violation_count  INTEGER NOT NULL DEFAULT 0,
  finished_reason  TEXT NULL,
  ip_address       INET NULL,
  user_agent       TEXT NULL,
  created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT test_attempts_pkey       PRIMARY KEY (id),
  CONSTRAINT attempts_assignment_fkey FOREIGN KEY (assignment_id)
      REFERENCES test_assignments (id) ON DELETE SET NULL,
  CONSTRAINT attempts_test_fkey       FOREIGN KEY (test_id)
      REFERENCES tests (id) ON DELETE CASCADE,
  CONSTRAINT attempts_user_fkey       FOREIGN KEY (user_id)
      REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT attempts_status_check CHECK (
    status = ANY (ARRAY['in_progress','completed','timed_out','cancelled','violation'])
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_attempts_user    ON public.test_attempts USING BTREE (user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test    ON public.test_attempts USING BTREE (test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status  ON public.test_attempts USING BTREE (status);
CREATE INDEX IF NOT EXISTS idx_attempts_started ON public.test_attempts USING BTREE (started_at);


-- =============================================
-- 12. TEST_ANSWERS  (test_attempts + answer_options + questions'dan keyin)
-- =============================================

-- trg_update_question_stats funksiyasi (trigger uchun)
CREATE OR REPLACE FUNCTION trg_update_question_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.is_correct IS DISTINCT FROM NEW.is_correct) THEN
    UPDATE questions
    SET
      attempts_count = attempts_count + CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE 0 END,
      corrects_count = corrects_count
        + CASE WHEN NEW.is_correct = TRUE  THEN 1 ELSE 0 END
        - CASE WHEN TG_OP = 'UPDATE' AND OLD.is_correct = TRUE THEN 1 ELSE 0 END
    WHERE id = NEW.question_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.test_answers (
  id                 BIGSERIAL NOT NULL,
  attempt_id         BIGINT NOT NULL,
  question_id        BIGINT NOT NULL,
  selected_option_id BIGINT NULL,
  is_correct         BOOLEAN NULL,
  time_spent_seconds INTEGER NULL DEFAULT 0,
  answered_at        TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT test_answers_pkey    PRIMARY KEY (id),
  CONSTRAINT test_answers_unique  UNIQUE (attempt_id, question_id),
  CONSTRAINT test_answers_attempt_fkey  FOREIGN KEY (attempt_id)
      REFERENCES test_attempts (id) ON DELETE CASCADE,
  CONSTRAINT test_answers_option_fkey   FOREIGN KEY (selected_option_id)
      REFERENCES answer_options (id) ON DELETE SET NULL,
  CONSTRAINT test_answers_question_fkey FOREIGN KEY (question_id)
      REFERENCES questions (id) ON DELETE CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_test_answers_attempt  ON public.test_answers USING BTREE (attempt_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_question ON public.test_answers USING BTREE (question_id);

CREATE TRIGGER trg_test_answers_update_question_stats
  AFTER INSERT OR UPDATE OF is_correct ON test_answers
  FOR EACH ROW EXECUTE FUNCTION trg_update_question_stats();


-- =============================================
-- 13. AUDIT_LOGS  (users'dan keyin, eng oxirida)
-- =============================================
CREATE TABLE public.audit_logs (
  id          BIGSERIAL NOT NULL,
  user_id     BIGINT NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NULL,
  entity_id   BIGINT NULL,
  old_data    JSONB NULL,
  new_data    JSONB NULL,
  ip_address  INET NULL,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT audit_logs_pkey      PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_fkey FOREIGN KEY (user_id)
      REFERENCES users (id) ON DELETE SET NULL
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_audit_user    ON public.audit_logs USING BTREE (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON public.audit_logs USING BTREE (action);
CREATE INDEX IF NOT EXISTS idx_audit_entity  ON public.audit_logs USING BTREE (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs USING BTREE (created_at DESC);