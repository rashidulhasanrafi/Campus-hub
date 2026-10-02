-- ========================================================
-- CAMPUS HUB - SUPABASE POSTGRESQL SCHEMA
-- Execute this script in your Supabase SQL Editor if you wish
-- to store persistent cloud profiles and lounge shoutouts.
-- ========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  batch TEXT NOT NULL,
  avatar TEXT NOT NULL,
  status TEXT DEFAULT 'Ready to chat',
  bio TEXT DEFAULT 'Campus Hub student',
  is_online BOOLEAN DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to student profiles
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

-- Allow public insert/upsert for campus students
CREATE POLICY "Anyone can insert or update profile"
  ON public.profiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. CAMPUS SHOUTOUTS / BULLETIN TABLE
CREATE TABLE IF NOT EXISTS public.shoutouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_department TEXT NOT NULL,
  user_avatar TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.shoutouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shoutouts are viewable by everyone"
  ON public.shoutouts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create shoutouts"
  ON public.shoutouts FOR INSERT
  WITH CHECK (true);

-- 3. HANGOUT ROOMS TABLE (Optional persistent lobby)
CREATE TABLE IF NOT EXISTS public.hangout_rooms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  max_participants INT DEFAULT 8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.hangout_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hangout rooms are viewable by everyone"
  ON public.hangout_rooms FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create hangout rooms"
  ON public.hangout_rooms FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Supabase Realtime publication on these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shoutouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hangout_rooms;
