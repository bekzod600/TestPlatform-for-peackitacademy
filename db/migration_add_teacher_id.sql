-- =============================================
-- Migration: Add teacher_id to user_groups
-- Date: 2025
-- Description: 
--   user_groups jadvaliga teacher_id ustuni qo'shiladi.
--   Bu orqali o'qituvchilar o'z guruhlarini boshqara oladi
--   va testlarni guruhlariga biriktira oladi.
--
-- Supabase SQL Editor da yoki psql orqali ishlatiladi.
-- Mavjud ma'lumotlar o'chiriLMAYDI.
-- =============================================

-- 1. teacher_id ustunini qo'shish (agar yo'q bo'lsa)
ALTER TABLE public.user_groups
  ADD COLUMN IF NOT EXISTS teacher_id BIGINT;

-- 2. Foreign key constraint qo'shish (agar yo'q bo'lsa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_groups_teacher_fkey'
      AND conrelid = 'public.user_groups'::regclass
  ) THEN
    ALTER TABLE public.user_groups
      ADD CONSTRAINT user_groups_teacher_fkey
        FOREIGN KEY (teacher_id) REFERENCES public.users (id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Index qo'shish (agar yo'q bo'lsa)
CREATE INDEX IF NOT EXISTS idx_user_groups_teacher
  ON public.user_groups (teacher_id);

-- =============================================
-- Tekshirish:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_groups' AND column_name = 'teacher_id';
-- =============================================
