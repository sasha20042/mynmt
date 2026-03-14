-- Виконай цей SQL у Supabase: SQL Editor → New query → вставте та Run

-- Таблиця питань (з підтримкою фото через image_url)
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  grade smallint not null check (grade in (8, 9, 10, 11)),
  subject text not null check (subject in ('ukrainian', 'math', 'history', 'english')),
  sort_order int not null default 0,
  type text not null check (type in ('multiple', 'matching')),
  question text not null,
  options jsonb,
  correct_index int,
  pairs jsonb,
  image_url text,
  weight numeric not null default 1
);

create index if not exists idx_questions_grade_subject on questions (grade, subject);

-- Таблиця результатів учнів (answer_details — деталізація по питаннях для вчителя)
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invitation text not null,
  grade smallint not null check (grade in (8, 9, 10, 11)),
  date timestamptz not null default now(),
  subjects jsonb not null default '{}',
  answer_details jsonb
);

create index if not exists idx_results_grade on results (grade);
create index if not exists idx_results_date on results (date desc);

-- Якщо таблиця results вже існувала без answer_details, виконай:
-- alter table results add column if not exists answer_details jsonb;

-- Політики (доступ по anon key для читання/запису)
alter table questions enable row level security;
alter table results enable row level security;

create policy "Allow all for questions" on questions for all using (true) with check (true);
create policy "Allow all for results" on results for all using (true) with check (true);

-- Якщо таблиця questions вже існувала без weight, виконай:
-- alter table questions add column if not exists weight numeric not null default 1;

-- Storage: створи бакет вручну в Dashboard → Storage → New bucket
-- Назва: question-images, Public bucket: так (щоб посилання на фото відкривалися)
