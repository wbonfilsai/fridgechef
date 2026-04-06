-- Feature 2: Persistent Pantry
create table if not exists public.user_pantry (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ingredient_name text not null,
  quantity text,
  unit text default 'g',
  updated_at timestamptz default now(),
  unique(user_id, ingredient_name)
);

-- Enable RLS
alter table public.user_pantry enable row level security;

-- Users can only see their own pantry
create policy "Users can view own pantry"
  on public.user_pantry for select
  using (auth.uid() = user_id);

create policy "Users can insert own pantry"
  on public.user_pantry for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pantry"
  on public.user_pantry for update
  using (auth.uid() = user_id);

create policy "Users can delete own pantry"
  on public.user_pantry for delete
  using (auth.uid() = user_id);
