-- Lock In: Row Level Security Policies

-- ============================================
-- PROFILES
-- ============================================
alter table public.profiles enable row level security;

-- Anyone authenticated can read profiles of group members
create policy "Users can view profiles in their groups"
  on public.profiles for select
  using (
    id = auth.uid()
    or id in (
      select gm2.user_id from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
    )
  );

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- ============================================
-- GROUPS
-- ============================================
alter table public.groups enable row level security;

create policy "Group members can view their groups"
  on public.groups for select
  using (
    id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "Authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() is not null);

-- ============================================
-- GROUP MEMBERS
-- ============================================
alter table public.group_members enable row level security;

create policy "Group members can view membership"
  on public.group_members for select
  using (
    group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "Users can join groups"
  on public.group_members for insert
  with check (user_id = auth.uid());

-- ============================================
-- HABITS
-- ============================================
alter table public.habits enable row level security;

-- Can see own habits + non-private habits from group members
create policy "Users can view accessible habits"
  on public.habits for select
  using (
    creator_id = auth.uid()
    or (
      is_private = false
      and group_id in (select group_id from public.group_members where user_id = auth.uid())
    )
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

-- ============================================
-- LOGS
-- ============================================
alter table public.logs enable row level security;

-- Can see own logs + logs for non-private habits in same group
create policy "Users can view accessible logs"
  on public.logs for select
  using (
    user_id = auth.uid()
    or (
      habit_id in (
        select h.id from public.habits h
        where h.is_private = false
        and h.group_id in (select group_id from public.group_members where user_id = auth.uid())
      )
    )
  );

create policy "Users can create their own logs"
  on public.logs for insert
  with check (user_id = auth.uid());

create policy "Users can delete their own logs"
  on public.logs for delete
  using (user_id = auth.uid());

-- ============================================
-- STREAKS
-- ============================================
alter table public.streaks enable row level security;

-- Everyone in group can see streaks (for forest display)
create policy "Users can view streaks in their groups"
  on public.streaks for select
  using (
    user_id = auth.uid()
    or user_id in (
      select gm2.user_id from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
    )
  );

create policy "System can manage streaks"
  on public.streaks for all
  using (user_id = auth.uid());

-- ============================================
-- REACTIONS
-- ============================================
alter table public.reactions enable row level security;

create policy "Group members can view reactions"
  on public.reactions for select
  using (
    from_user_id = auth.uid()
    or to_user_id = auth.uid()
  );

create policy "Users can create reactions"
  on public.reactions for insert
  with check (from_user_id = auth.uid());

-- ============================================
-- MARATHON GOALS
-- ============================================
alter table public.marathon_goals enable row level security;

create policy "Group members can view marathon goals"
  on public.marathon_goals for select
  using (
    group_id in (select group_id from public.group_members where user_id = auth.uid())
  );

create policy "Group members can create marathon goals"
  on public.marathon_goals for insert
  with check (
    group_id in (select group_id from public.group_members where user_id = auth.uid())
  );
