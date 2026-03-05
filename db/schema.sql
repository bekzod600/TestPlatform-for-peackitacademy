create table public.categories (
  id bigserial not null,
  name text not null,
  created_at timestamp with time zone null default now(),
  constraint categories_pkey primary key (id)
) TABLESPACE pg_default;

create table public.question_groups (
  id bigserial not null,
  name text not null,
  created_at timestamp with time zone null default now(),
  duration_minutes integer null default 60,
  questions_count integer null default 50,
  constraint question_groups_pkey primary key (id)
) TABLESPACE pg_default;

create table public.questions (
  id bigserial not null,
  question text not null,
  answers jsonb not null,
  correct integer not null,
  category_id bigint null,
  group_id bigint null,
  created_at timestamp with time zone null default now(),
  constraint questions_pkey primary key (id),
  constraint questions_category_id_fkey foreign KEY (category_id) references categories (id),
  constraint questions_group_id_fkey foreign KEY (group_id) references question_groups (id)
) TABLESPACE pg_default;

create table public.user_groups (
  id bigserial not null,
  name text not null,
  assigned_question_group bigint null,
  created_at timestamp with time zone null default now(),
  test_start_time timestamp with time zone null,
  test_end_time timestamp with time zone null,
  constraint user_groups_pkey primary key (id)
) TABLESPACE pg_default;

create table public.users (
  id bigserial not null,
  full_name text not null,
  username text not null,
  password text not null,
  role text not null,
  assigned_user_group bigint null,
  assigned_question_group bigint null,
  completed_tests jsonb null default '[]'::jsonb,
  created_at timestamp with time zone null default now(),
  test_started_at timestamp with time zone null,
  constraint users_pkey primary key (id),
  constraint users_username_key unique (username),
  constraint users_assigned_question_group_fkey foreign KEY (assigned_question_group) references question_groups (id),
  constraint users_assigned_user_group_fkey foreign KEY (assigned_user_group) references user_groups (id),
  constraint users_role_check check (
    (
      role = any (array['admin'::text, 'student'::text])
    )
  )
) TABLESPACE pg_default;