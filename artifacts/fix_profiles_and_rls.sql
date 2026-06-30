-- SQL script to fix user sync and RLS policies on the 'profiles' table.
-- Run this in the Supabase SQL Editor.

-- 1. Create a security definer helper function to check if the caller is an admin
-- This function runs with database owner privileges (bypassing RLS) to avoid infinite recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Sync any missing profiles from auth.users to public.profiles
-- This ensures all users in auth.users have a corresponding record in public.profiles.
INSERT INTO public.profiles (id, full_name, mobile, email, role, created_at)
SELECT 
  id, 
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as full_name,
  coalesce(raw_user_meta_data->>'mobile', '') as mobile,
  email,
  'customer' as role,
  created_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email;

-- 3. Ensure RLS is enabled on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing conflicting policies on public.profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can select their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can select all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read-only access" ON public.profiles;

-- 5. Create new clean policies using public.is_admin() to avoid recursion

-- SELECT Policies:
-- Users can view their own profile
CREATE POLICY "Users can select their own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can select all profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.is_admin());

-- INSERT Policies:
-- Users can insert their own profile during registration
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Admins can insert any profile
CREATE POLICY "Admins can insert all profiles" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- UPDATE Policies:
-- Users can update their own profile details
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE TO authenticated USING (public.is_admin());

-- DELETE Policies:
-- Only admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON public.profiles
FOR DELETE TO authenticated USING (public.is_admin());

-- 6. Verify the profiles sync and roles
SELECT email, role, full_name FROM public.profiles;
