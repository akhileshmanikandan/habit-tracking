-- Allow users to insert their own profile (needed when the trigger doesn't fire)
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- Create a test group with invite code '1234'
insert into public.groups (name, invite_code)
values ('Test Group', '1234')
on conflict (invite_code) do nothing;
