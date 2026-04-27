-- Fix: RLS infinite recursion on group_members
-- Run this in the Supabase SQL Editor to patch the live database.
-- It drops all old policies and recreates them using SECURITY DEFINER helpers.

-- ============================================
-- 1. Create helper functions (bypass RLS)
-- ============================================
create or replace function public.my_group_ids()
returns setof uuid as $$
  select group_id from public.group_members where user_id = auth.uid();
$$ language sql security definer stable;

create or replace function public.my_group_member_ids()
returns setof uuid as $$
  select distinct gm.user_id
  from public.group_members gm
  where gm.group_id in (select group_id from public.group_members where user_id = auth.uid());
$$ language sql security definer stable;

-- ============================================
-- 2. Drop ALL existing policies
-- ============================================
-- profiles
drop policy if exists "Users can view profiles in their groups" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
-- groups
drop policy if exists "Group members can view their groups" on public.groups;
drop policy if exists "Authenticated users can view groups" on public.groups;
drop policy if exists "Authenticated users can create groups" on public.groups;
-- group_members
drop policy if exists "Group members can view membership" on public.group_members;
drop policy if exists "Users can join groups" on public.group_members;
-- habits
drop policy if exists "Users can view accessible habits" on public.habits;
drop policy if exists "Users can create habits" on public.habits;
drop policy if exists "Users can update their own habits" on public.habits;
drop policy if exists "Users can delete their own habits" on public.habits;
-- logs
drop policy if exists "Users can view accessible logs" on public.logs;
drop policy if exists "Users can create their own logs" on public.logs;
drop policy if exists "Users can delete their own logs" on public.logs;
-- streaks
drop policy if exists "Users can view streaks in their groups" on public.streaks;
drop policy if exists "System can manage streaks" on public.streaks;
-- reactions
drop policy if exists "Group members can view reactions" on public.reactions;
drop policy if exists "Users can create reactions" on public.reactions;
-- marathon_goals
drop policy if exists "Group members can view marathon goals" on public.marathon_goals;
drop policy if exists "Group members can create marathon goals" on public.marathon_goals;

-- ============================================
-- 3. Recreate all policies using helper functions
-- ============================================

-- PROFILES
create policy "Users can view profiles in their groups"
  on public.profiles for select
  using (id = auth.uid() or id in (select public.my_group_member_ids()));

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- GROUPS (any authenticated user can read — group data is not sensitive)
create policy "Authenticated users can view groups"
  on public.groups for select
  using (auth.uid() is not null);

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() is not null);

-- GROUP MEMBERS
create policy "Group members can view membership"
  on public.group_members for select
  using (user_id = auth.uid() or group_id in (select public.my_group_ids()));

create policy "Users can join groups"
  on public.group_members for insert
  with check (user_id = auth.uid());

-- HABITS
create policy "Users can view accessible habits"
  on public.habits for select
  using (
    creator_id = auth.uid()
    or (is_private = false and group_id in (select public.my_group_ids()))
  );

create policy "Users can create habits"
  on public.habits for insert
  with check (creator_id = auth.uid());

create policy "Users can update their own habits"
  on public.habits for update
  using (creator_id = auth.uid());

create policy "Users can delete their own habits"
  on public.habits for delete
  using (creator_id = auth.uid());

-- LOGS
create policy "Users can view accessible logs"
  on public.logs for select
  using (
    user_id = auth.uid()
    or habit_id in (
      select h.id from public.habits h
      where h.is_private = false
      and h.group_id in (select public.my_group_ids())
    )
  );

create policy "Users can create their own logs"
  on public.logs for insert
  with check (user_id = auth.uid());

create policy "Users can delete their own logs"
  on public.logs for delete
  using (user_id = auth.uid());

-- STREAKS
create policy "Users can view streaks in their groups"
  on public.streaks for select
  using (user_id = auth.uid() or user_id in (select public.my_group_member_ids()));

create policy "System can manage streaks"
  on public.streaks for all
  using (user_id = auth.uid());

-- REACTIONS
create policy "Group members can view reactions"
  on public.reactions for select
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

create policy "Users can create reactions"
  on public.reactions for insert
  with check (from_user_id = auth.uid());

-- MARATHON GOALS
create policy "Group members can view marathon goals"
  on public.marathon_goals for select
  using (group_id in (select public.my_group_ids()));

create policy "Group members can create marathon goals"
  on public.marathon_goals for insert
  with check (group_id in (select public.my_group_ids()));

-- ============================================
-- 4. Clean up orphan groups (created but no members)
-- ============================================
delete from public.groups
where id not in (select distinct group_id from public.group_members);
