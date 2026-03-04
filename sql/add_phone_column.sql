-- Add phone column to users table
-- Run this in Supabase SQL Editor or your database

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Verify the column was added
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone';
