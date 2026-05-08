-- =============================================================
-- Migration: question_complaints table
-- =============================================================
-- Allows students to file complaints about specific questions
-- during a test attempt. Admin can review and manage complaints.
-- =============================================================

CREATE TABLE IF NOT EXISTS question_complaints (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id         INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id     INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    attempt_id      INTEGER NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    complaint_text  TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
    admin_note      TEXT,
    reviewed_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_complaints_user_id    ON question_complaints(user_id);
CREATE INDEX idx_complaints_test_id    ON question_complaints(test_id);
CREATE INDEX idx_complaints_question_id ON question_complaints(question_id);
CREATE INDEX idx_complaints_attempt_id ON question_complaints(attempt_id);
CREATE INDEX idx_complaints_status     ON question_complaints(status);
CREATE INDEX idx_complaints_created_at ON question_complaints(created_at DESC);

-- Prevent duplicate complaints for the same question in the same attempt
CREATE UNIQUE INDEX idx_complaints_unique_per_attempt
    ON question_complaints(attempt_id, question_id);

-- RLS
ALTER TABLE question_complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON question_complaints
    FOR ALL USING (true) WITH CHECK (true);
