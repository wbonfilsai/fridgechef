-- DEV 2: Recipe history (recently viewed recipes, max 3 per user)
create table if not exists public.recipe_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  recipe_data jsonb not null,
  viewed_at timestamptz default now()
);

create index if not exists recipe_history_user_viewed_idx
  on public.recipe_history (user_id, viewed_at desc);

alter table public.recipe_history enable row level security;

create policy "Users can view own recipe history"
  on public.recipe_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own recipe history"
  on public.recipe_history for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recipe history"
  on public.recipe_history for update
  using (auth.uid() = user_id);

create policy "Users can delete own recipe history"
  on public.recipe_history for delete
  using (auth.uid() = user_id);
