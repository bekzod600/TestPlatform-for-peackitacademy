-- =============================================================
-- Migration: Add avatar_url & image_url columns
-- =============================================================
-- Supabase Dashboard → SQL Editor ga tashlang va Run bosing.
--
-- MUHIM: Storage bucketlarini SQL orqali yaratish ishlamaydi
-- (anon key storage.buckets ga yoza olmaydi).
-- Bucketlarni qo'lda yarating:
--   Supabase Dashboard → Storage → New bucket
--   1) Name: avatars   | Public: ON | Max file size: 5 MB
--   2) Name: questions | Public: ON | Max file size: 5 MB
-- =============================================================

-- -------------------------------------------------------------
-- STEP 1  Add avatar_url to users
-- -------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- -------------------------------------------------------------
-- STEP 2  Add image_url to questions
-- -------------------------------------------------------------
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- =============================================================
-- STEP 3  Storage RLS Policies
-- =============================================================
-- Faqat bucketlarni qo'lda yaratgandan KEYIN ishga tushiring.
-- =============================================================

DROP POLICY IF EXISTS "avatars_public_read"            ON storage.objects;
DROP POLICY IF EXISTS "avatars_authenticated_insert"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_authenticated_update"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_authenticated_delete"   ON storage.objects;
DROP POLICY IF EXISTS "questions_public_read"          ON storage.objects;
DROP POLICY IF EXISTS "questions_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "questions_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "questions_authenticated_delete" ON storage.objects;

CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_authenticated_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_authenticated_update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_authenticated_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "questions_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'questions');

CREATE POLICY "questions_authenticated_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'questions');

CREATE POLICY "questions_authenticated_update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'questions');

CREATE POLICY "questions_authenticated_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'questions');
