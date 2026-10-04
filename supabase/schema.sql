-- ========================================================
-- CAMPUS HUB - SUPABASE POSTGRESQL SCHEMA
-- Execute this script in your Supabase SQL Editor if you wish
-- to store persistent cloud profiles, lounge shoutouts,
-- and live hangout rooms.
-- ========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- 1. PROFILES TABLE
-- ========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  batch TEXT NOT NULL,
  avatar TEXT NOT NULL,
  campus TEXT DEFAULT 'uiu',
  status TEXT DEFAULT 'Ready to chat 💬',
  bio TEXT DEFAULT 'UIU student exploring Campus Hub',
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure 'campus' column exists if table was created previously
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS campus TEXT DEFAULT 'uiu';

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to student profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

-- Allow public insert/upsert for campus students
DROP POLICY IF EXISTS "Anyone can insert or update profile" ON public.profiles;
CREATE POLICY "Anyone can insert or update profile"
  ON public.profiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- ========================================================
-- 2. CAMPUS SHOUTOUTS / BULLETIN TABLE
-- ========================================================
CREATE TABLE IF NOT EXISTS public.shoutouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_department TEXT NOT NULL,
  user_avatar TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  campus TEXT DEFAULT 'uiu',
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure 'campus' column exists if table was created previously
ALTER TABLE public.shoutouts ADD COLUMN IF NOT EXISTS campus TEXT DEFAULT 'uiu';

ALTER TABLE public.shoutouts ENABLE ROW LEVEL SECURITY;

-- Shoutouts read policy
DROP POLICY IF EXISTS "Shoutouts are viewable by everyone" ON public.shoutouts;
CREATE POLICY "Shoutouts are viewable by everyone"
  ON public.shoutouts FOR SELECT
  USING (true);

-- Shoutouts create policy
DROP POLICY IF EXISTS "Anyone can create shoutouts" ON public.shoutouts;
CREATE POLICY "Anyone can create shoutouts"
  ON public.shoutouts FOR INSERT
  WITH CHECK (true);

-- Shoutouts update policy (for like/unlike count)
DROP POLICY IF EXISTS "Anyone can update shoutouts (likes)" ON public.shoutouts;
CREATE POLICY "Anyone can update shoutouts (likes)"
  ON public.shoutouts FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ========================================================
-- 3. HANGOUT ROOMS TABLE (Optional persistent lobby)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.hangout_rooms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  max_participants INT DEFAULT 8,
  campus TEXT DEFAULT 'uiu',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure 'campus' column exists if table was created previously
ALTER TABLE public.hangout_rooms ADD COLUMN IF NOT EXISTS campus TEXT DEFAULT 'uiu';

ALTER TABLE public.hangout_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hangout rooms are viewable by everyone" ON public.hangout_rooms;
CREATE POLICY "Hangout rooms are viewable by everyone"
  ON public.hangout_rooms FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can create hangout rooms" ON public.hangout_rooms;
CREATE POLICY "Anyone can create hangout rooms"
  ON public.hangout_rooms FOR ALL
  USING (true)
  WITH CHECK (true);

-- ========================================================
-- 4. AUTOMATED TRIGGER FUNCTION ON auth.users
-- Validates that only '@*.uiu.ac.bd' emails can register
-- and automatically populates public.profiles
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_campus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_email TEXT;
  user_full_name TEXT;
  user_dept TEXT;
  user_batch TEXT;
  user_gender TEXT;
  user_avatar TEXT;
  user_campus TEXT;
BEGIN
  student_email := LOWER(COALESCE(NEW.email, ''));

  -- Validate that only '@*.uiu.ac.bd' student emails are permitted
  IF student_email !~ '^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.)?uiu\.ac\.bd$' THEN
    RAISE EXCEPTION 'Registration restricted: Only official UIU student emails (@*.uiu.ac.bd) are allowed.';
  END IF;

  -- Extract registration metadata
  user_full_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(student_email, '@', 1));
  user_dept := COALESCE(NULLIF(NEW.raw_user_meta_data->>'department', ''), 'Computer Science & Engineering (CSE)');
  user_batch := COALESCE(NULLIF(NEW.raw_user_meta_data->>'batch', ''), '2024');
  user_gender := COALESCE(NULLIF(NEW.raw_user_meta_data->>'gender', ''), 'male');
  user_avatar := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'avatar', ''),
    CASE WHEN user_gender = 'female' THEN '/images/avatar-female.png' ELSE '/images/avatar-male.png' END
  );
  user_campus := COALESCE(NULLIF(NEW.raw_user_meta_data->>'campus', ''), 'uiu');

  -- Automatically populate public.profiles table
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    department,
    batch,
    avatar,
    campus,
    status,
    bio,
    is_online,
    last_seen,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id::text,
    NEW.email,
    user_full_name,
    user_dept,
    user_batch,
    user_avatar,
    user_campus,
    'Ready to chat 💬',
    'UIU student exploring Campus Hub',
    true,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    department = COALESCE(EXCLUDED.department, profiles.department),
    batch = COALESCE(EXCLUDED.batch, profiles.batch),
    avatar = COALESCE(EXCLUDED.avatar, profiles.avatar),
    campus = COALESCE(EXCLUDED.campus, profiles.campus),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_campus ON auth.users;

CREATE TRIGGER on_auth_user_created_campus
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_campus();

-- ========================================================
-- 5. REALTIME PUBLICATION
-- Enable Supabase Realtime publication safely and idempotently
-- ========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'shoutouts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shoutouts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'hangout_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hangout_rooms;
  END IF;
END $$;
