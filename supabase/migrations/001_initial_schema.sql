-- Lock In: Initial Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', 'user') || '_' || left(new.id::text, 4),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- GROUPS
-- ============================================
create table public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  invite_code text unique not null default left(md5(random()::text), 8),
  created_at timestamptz default now() not null
);

-- ============================================
-- GROUP MEMBERS
-- ============================================
create table public.group_members (
  group_id uuid references public.groups on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  joined_at timestamptz default now() not null,
  primary key (group_id, user_id)
);

-- ============================================
-- HABITS
-- ============================================
create type habit_category as enum ('running', 'gym', 'general');

create table public.habits (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles on delete cascade not null,
  group_id uuid references public.groups on delete cascade not null,
  title text not null,
  category habit_category not null default 'general',
  is_private boolean default false not null,
  goal_value float,
  unit text,
  created_at timestamptz default now() not null
);

-- ============================================
-- LOGS
-- ============================================
create table public.logs (
  id uuid default uuid_generate_v4() primary key,
  habit_id uuid references public.habits on delete cascade not null,
  user_id uuid references public.profiles on delete cascade not null,
  value float,
  duration_minutes int,
  pace text,
  notes text,
  is_rest_day boolean default false not null,
  created_at timestamptz default now() not null
);

-- Auto-calculate pace for running logs
create or replace function public.calculate_pace()
returns trigger as $$
begin
  if new.value is not null and new.value > 0 and new.duration_minutes is not null and new.duration_minutes > 0 then
    new.pace := (new.duration_minutes / new.value)::int || ':' || lpad(((new.duration_minutes / new.value * 60)::int % 60)::text, 2, '0') || ' /km';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_log_calculate_pace
  before insert or update on public.logs
  for each row execute function public.calculate_pace();

-- ============================================
-- STREAKS
-- ============================================
create table public.streaks (
  user_id uuid references public.profiles on delete cascade not null,
  habit_id uuid references public.habits on delete cascade not null,
  current_streak int default 0 not null,
  longest_streak int default 0 not null,
  last_log_date date,
  shields int default 0 not null,
  primary key (user_id, habit_id)
);

-- ============================================
-- REACTIONS
-- ============================================
create type reaction_type as enum ('water', 'fire', 'flex', 'rage');

create table public.reactions (
  id uuid default uuid_generate_v4() primary key,
  from_user_id uuid references public.profiles on delete cascade not null,
  to_user_id uuid references public.profiles on delete cascade not null,
  log_id uuid references public.logs on delete cascade,
  type reaction_type not null,
  created_at timestamptz default now() not null
);

-- ============================================
-- MARATHON GOALS
-- ============================================
create table public.marathon_goals (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups on delete cascade not null,
  title text not null,
  target_km float not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now() not null
);

-- ============================================
-- STREAK UPDATE FUNCTION
-- ============================================
create or replace function public.update_streak(p_user_id uuid, p_habit_id uuid)
returns void as $$
declare
  v_last_log date;
  v_current int;
  v_longest int;
  v_shields int;
  v_today date := current_date;
begin
  -- Get current streak data
  select last_log_date, current_streak, longest_streak, shields
  into v_last_log, v_current, v_longest, v_shields
  from public.streaks
  where user_id = p_user_id and habit_id = p_habit_id;

  if not found then
    -- First log ever for this habit
    insert into public.streaks (user_id, habit_id, current_streak, longest_streak, last_log_date, shields)
    values (p_user_id, p_habit_id, 1, 1, v_today, 0);
    return;
  end if;

  -- Already logged today
  if v_last_log = v_today then
    return;
  end if;

  -- Logged yesterday — continue streak
  if v_last_log = v_today - 1 then
    v_current := v_current + 1;
  -- Missed yesterday
  elsif v_shields > 0 then
    -- Use a shield
    v_shields := v_shields - 1;
    v_current := v_current + 1;
  else
    -- Reset streak
    v_current := 1;
  end if;

  -- Update longest
  if v_current > v_longest then
    v_longest := v_current;
  end if;

  -- Award shield every 7 days
  if v_current > 0 and v_current % 7 = 0 then
    v_shields := v_shields + 1;
  end if;

  update public.streaks
  set current_streak = v_current,
      longest_streak = v_longest,
      last_log_date = v_today,
      shields = v_shields
  where user_id = p_user_id and habit_id = p_habit_id;
end;
$$ language plpgsql security definer;

-- ============================================
-- INDEXES
-- ============================================
create index idx_logs_habit_user on public.logs(habit_id, user_id);
create index idx_logs_created_at on public.logs(created_at desc);
create index idx_habits_group on public.habits(group_id);
create index idx_habits_creator on public.habits(creator_id);
create index idx_group_members_user on public.group_members(user_id);
create index idx_reactions_to_user on public.reactions(to_user_id, created_at desc);

-- ============================================
-- REALTIME
-- ============================================
alter publication supabase_realtime add table public.logs;
alter publication supabase_realtime add table public.reactions;
