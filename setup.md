# 🚀 Supabase Sozlash - 5 daqiqada!

## 1️⃣ Supabase akkaunt ochish (BEPUL!)

1. [supabase.com](https://supabase.com) ga kiring
2. "Start your project" tugmasini bosing
3. GitHub orqali login qiling (yoki email bilan)
4. **BEPUL** - Kredit karta kerak EMAS! ✅

## 2️⃣ Yangi project yaratish

1. Dashboard da "New Project" tugmasini bosing
2. Project nomi kiriting: `test-platform`
3. Database Password kiriting (eslab qoling!)
4. Region tanlang: **Singapore** (O'zbekistonga yaqin)
5. "Create new project" bosing
6. ⏳ 2 daqiqa kuting (database yaratilmoqda...)

## 3️⃣ API kalitlarini olish

Project yaratilgandan keyin:

1. Chap menuda **"Settings"** (pastda)
2. **"API"** bo'limiga o'ting
3. Quyidagi ma'lumotlarni ko'chirib oling:

```
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4️⃣ .env faylini yaratish

Loyihangizda `.env` fayl yarating va quyidagilarni yozing:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ Muhim:** `.env` faylini `.gitignore` ga qo'shing!

## 5️⃣ Database jadvallari yaratish

Supabase Dashboard da:

1. Chap menuda **"SQL Editor"** ni toping
2. **"New query"** tugmasini bosing
3. Quyidagi SQL kodini ko'chiring va ishga tushiring:

```sql
-- 1. User Groups jadvali
CREATE TABLE user_groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users jadvali
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
  assigned_user_group BIGINT REFERENCES user_groups(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Categories jadvali
CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Question Groups jadvali
CREATE TABLE question_groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Questions jadvali
CREATE TABLE questions (
  id BIGSERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answers JSONB NOT NULL,
  correct INTEGER NOT NULL,
  category_id BIGINT REFERENCES categories(id),
  group_id BIGINT REFERENCES question_groups(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dastlabki ma'lumotlar qo'shish

-- User Groups
INSERT INTO user_groups (id, name) VALUES
(1, 'Kompyuter savodxonligi juft 10:00'),
(2, 'Kompyuter savodxonligi juft 14:00'),
(3, 'Kompyuter savodxonligi juft 16:00');

-- Users
INSERT INTO users (id, full_name, username, password, role, assigned_user_group) VALUES
(1, 'Admin User', 'admin', 'admin123', 'admin', NULL),
(2, 'Student Test', 'student', '1234', 'student', 1);

-- Categories
INSERT INTO categories (id, name) VALUES
(1, 'Kompyuter savodxonligi'),
(2, 'Ingliz tili'),
(3, 'Matematika');

-- Question Groups
INSERT INTO question_groups (id, name) VALUES
(1, 'Kompyuter savodxonligi 1–7 darslar'),
(2, 'Kompyuter savodxonligi 8–12 darslar'),
(3, 'Kompyuter savodxonligi 13–20 darslar');

-- Questions
INSERT INTO questions (id, question, answers, correct, category_id, group_id) VALUES
(1, 'HTML nima?', '["Til", "Protokol", "Kod", "Ma''lumot ombori"]', 0, 1, 1),
(2, 'Kompyuterning asosiy qurilmasi?', '["Monitor", "Sichqoncha", "Sistem blok", "Printer"]', 2, 1, 1);

-- ID sequence larini yangilash
SELECT setval('user_groups_id_seq', (SELECT MAX(id) FROM user_groups));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('question_groups_id_seq', (SELECT MAX(id) FROM question_groups));
SELECT setval('questions_id_seq', (SELECT MAX(id) FROM questions));
```

4. **"Run"** tugmasini bosing ▶️
5. "Success" yozuvini ko'rasiz! ✅

## 6️⃣ RLS (Row Level Security) ni o'chirish

**MUHIM:** Test uchun xavfsizlikni o'chiramiz (keyinchalik yoqish mumkin)

SQL Editor da quyidagi kodni ishga tushiring:

```sql
-- Barcha jadvallarda RLS ni o'chirish
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE question_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_groups DISABLE ROW LEVEL SECURITY;
```

## 7️⃣ Ishga tushirish

```bash
# Paketlarni o'rnatish
npm install

# Ishga tushirish
npm run dev
```

🎉 **Tayyor!** Endi barcha ma'lumotlar Supabase da saqlanadi!

## ✅ Tekshirish

Supabase Dashboard da:

1. **"Table Editor"** ga o'ting
2. Har bir jadvalni ko'ring:
   - `users` - 2 ta user
   - `questions` - 2 ta savol
   - `categories` - 3 ta kategoriya
   - va hokazo...

## 🌐 Deployment (Production)

### Vercel/Netlify ga deploy qilish:

1. `.env` faylini `.gitignore` ga qo'shing
2. Vercel/Netlify da environment variables qo'shing:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy qiling!

## 🔒 Xavfsizlik (Keyinchalik)

RLS ni yoqish uchun:

```sql
-- RLS yoqish
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy yaratish (misol)
CREATE POLICY "Users can read all users"
ON users FOR SELECT
TO authenticated
USING (true);
```

## 💰 Narxlar (Supabase)

**FREE PLAN:**
- ✅ 500MB Database
- ✅ 1GB File Storage
- ✅ 2GB Data Transfer
- ✅ 50,000 Monthly Active Users
- ✅ 100% BEPUL forever!

**Test platformangiz uchun bu ko'proq yetarli!**

## 🆘 Yordam

**Muammo:** "Invalid API key"
- ✅ `.env` faylini tekshiring
- ✅ `npm run dev` ni qaytadan ishga tushiring

**Muammo:** "relation does not exist"
- ✅ SQL jadvallarini yaratdingizmi?
- ✅ SQL Editor da kodlarni ishga tushiring

**Muammo:** "RLS policy violation"
- ✅ RLS ni o'chiring (yuqoridagi 6-qadamga qarang)

---

**Tayyor!** Endi sizning test platformangiz butun dunyo bo'ylab ishlaydi! 🌍