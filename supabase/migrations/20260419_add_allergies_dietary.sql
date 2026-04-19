-- Add allergies and dietary_preferences columns to profiles
alter table public.profiles
  add column if not exists allergies text[] default '{}',
  add column if not exists dietary_preferences text[] default '{}';
