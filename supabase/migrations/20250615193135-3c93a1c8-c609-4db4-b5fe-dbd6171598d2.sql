
-- This migration adds Row Level Security policies to the `profiles` table
-- to allow authenticated users to manage profile data.

-- Drop existing policies if they exist to avoid conflicts.
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON public.profiles;

-- Enable Row Level Security on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy to allow any authenticated user to view any profile.
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy to allow any authenticated user to create a profile.
CREATE POLICY "Authenticated users can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow any authenticated user to update any profile.
CREATE POLICY "Authenticated users can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy to allow any authenticated user to delete any profile.
CREATE POLICY "Authenticated users can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (auth.role() = 'authenticated');
