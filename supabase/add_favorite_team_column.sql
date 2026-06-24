-- Add favorite_team column to existing user_profiles table
-- Run this in the Supabase SQL Editor

alter table public.user_profiles
add column if not exists favorite_team text;
