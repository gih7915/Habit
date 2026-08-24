create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar text default 'M',
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, scheduled_date date not null, scheduled_time time, recurrence text not null default 'none',
  priority text not null default 'medium', category text not null default 'Rotina', completed_dates date[] not null default '{}', created_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, frequency text not null default 'daily', icon text default '✧', tone text default 'green', created_at timestamptz not null default now()
);

create table public.habit_completions (
  habit_id uuid references public.habits(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
  completed_date date not null, primary key (habit_id, completed_date)
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, rest_seconds integer not null default 60, exercises jsonb not null default '[]', created_at timestamptz not null default now()
);

create table public.workout_completions (
  id uuid primary key default gen_random_uuid(), workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, completed_date date not null default current_date, completed_at timestamptz not null default now()
);

create table public.mood_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null, mood text not null, note text, unique (user_id, entry_date)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, professor text, absence_limit integer not null default 10, absences integer not null default 0, grades numeric[] not null default '{}'
);

create table public.diet_plans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  calories_goal integer not null default 2100, protein_goal integer not null default 140, carbs_goal integer not null default 250, fat_goal integer not null default 70,
  meals jsonb not null default '[]', updated_at timestamptz not null default now(), unique (user_id)
);

create table public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  task text, minutes integer not null, started_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_completions enable row level security;
alter table public.mood_entries enable row level security;
alter table public.subjects enable row level security;
alter table public.diet_plans enable row level security;
alter table public.pomodoro_sessions enable row level security;

do $$ declare table_name text; begin
  execute 'create policy "Users manage own profiles" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id)';
  foreach table_name in array array['tasks','habits','habit_completions','workouts','workout_completions','mood_entries','subjects','diet_plans','pomodoro_sessions'] loop
    execute format('create policy "Users manage own %1$s" on public.%1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name);
  end loop;
end $$;
