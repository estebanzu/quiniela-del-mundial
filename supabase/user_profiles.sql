-- ==========================================
-- USER PROFILES & CUSTOM AVATARS SYSTEM
-- Run this in the Supabase SQL Editor
-- ==========================================

-- 1. Create User Profiles Table
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'anon',
  avatar_type text not null default 'initials',
  favorite_team text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.user_profiles enable row level security;

-- ==========================================
-- RLS Policies
-- ==========================================

-- Anyone (authenticated or public) can view user profiles
drop policy if exists user_profiles_select_all on public.user_profiles;
create policy user_profiles_select_all on public.user_profiles
  for select using (true);

-- Authenticated users can insert their own profile
drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own on public.user_profiles
  for insert with check (auth.uid() = user_id);

-- Authenticated users can update their own profile
drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own on public.user_profiles
  for update using (auth.uid() = user_id);

-- ==========================================
-- Trigger Function: handle_user_profile_sync
-- Automatically sets/resolves the username (email prefix)
-- from auth.users to prevent username spoofing in client payloads.
-- ==========================================
create or replace function public.handle_user_profile_sync()
returns trigger
language plpgsql
security definer
as $$
declare
  user_email text;
begin
  select email into user_email from auth.users where id = new.user_id;
  new.username := coalesce(split_part(user_email, '@', 1), 'anon');
  return new;
end;
$$;

-- Trigger: before insert or update
drop trigger if exists trigger_sync_user_profile on public.user_profiles;
create trigger trigger_sync_user_profile
before insert or update on public.user_profiles
for each row
execute procedure public.handle_user_profile_sync();

-- ==========================================
-- Enable Realtime for the user_profiles table
-- ==========================================
do $$
begin
  alter publication supabase_realtime add table public.user_profiles;
exception
  when others then
    raise notice 'Could not automatically add to publication. Please enable realtime manually if needed.';
end;
$$;
