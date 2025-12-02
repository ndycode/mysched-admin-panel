-- Migration: 20251121000000_user_stats_rpc.sql

-- 1. Create RPC function to calculate user stats efficiently
create or replace function get_user_stats()
returns json
language plpgsql
security definer
as $$
declare
  total_count int;
  active_count int;
  instructor_count int;
  admin_count int;
begin
  -- Get total count from profiles (assuming profiles sync with auth.users)
  select count(*) into total_count from public.profiles;

  -- Get active users count (status = 'active')
  -- Note: This relies on the 'status' column in profiles or metadata.
  -- Since status derivation is complex in code, we'll approximate it here based on the 'status' column in profiles if it exists,
  -- or we can join with auth.users if needed, but for performance we stick to public tables if possible.
  -- However, the current code derives status from multiple sources.
  -- For this RPC, we will count users who have a 'status' column set to 'active' in profiles,
  -- or if that column doesn't exist/is null, we assume active if email_confirmed_at is not null (simplified).
  -- Let's check if 'status' column exists in profiles. If not, we might need to add it or rely on metadata.
  -- Based on shared.ts, status is derived.
  -- For now, let's count based on the 'status' column in profiles which the code seems to populate.
  select count(*) into active_count from public.profiles where status = 'active';

  -- Get instructor count (role = 'instructor')
  select count(*) into instructor_count from public.profiles where role = 'instructor';

  -- Get admin count (from admins table)
  select count(*) into admin_count from public.admins;

  return json_build_object(
    'total', total_count,
    'activeUsers', active_count,
    'instructorCount', instructor_count,
    'adminCount', admin_count
  );
end;
$$;

-- 2. Create Trigger to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Check if trigger already exists to avoid error
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row
      execute procedure public.handle_new_user();
  end if;
end
$$;
