-- Push notification subscriptions
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

-- Enable RLS
alter table push_subscriptions enable row level security;

-- Users can manage their own subscriptions
create policy "Users can insert own push subscriptions"
  on push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can view own push subscriptions"
  on push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can delete own push subscriptions"
  on push_subscriptions for delete
  using (auth.uid() = user_id);

-- Service role can read all subscriptions (for sending notifications)
create policy "Service role can read all push subscriptions"
  on push_subscriptions for select
  using (auth.role() = 'service_role');
