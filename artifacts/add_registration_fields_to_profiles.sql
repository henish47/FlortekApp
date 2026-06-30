-- SQL Migration: Add Registration Fields to Profiles Table
-- Run this script in the Supabase SQL Editor.

-- 1. Add new columns to public.profiles if they do not exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pincode text;

-- 2. Update the handle_new_user trigger function to populate these fields from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create/update the profile when the user has verified their email (email_confirmed_at is not null)
  IF new.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.profiles (
      id,
      full_name,
      company_name,
      address,
      city,
      state,
      pincode,
      email,
      mobile,
      role,
      created_at
    )
    VALUES (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      coalesce(new.raw_user_meta_data->>'company_name', ''),
      coalesce(new.raw_user_meta_data->>'address', ''),
      coalesce(new.raw_user_meta_data->>'city', ''),
      coalesce(new.raw_user_meta_data->>'state', ''),
      coalesce(new.raw_user_meta_data->>'pincode', ''),
      new.email,
      coalesce(new.raw_user_meta_data->>'mobile', ''),
      'customer',
      new.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      company_name = EXCLUDED.company_name,
      address = EXCLUDED.address,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      pincode = EXCLUDED.pincode,
      email = EXCLUDED.email,
      mobile = EXCLUDED.mobile;
  END IF;
  RETURN new;
END;
$$;

-- 3. Sync any existing metadata to profiles for confirmed users (in case some were missed)
UPDATE public.profiles p
SET
  company_name = coalesce(u.raw_user_meta_data->>'company_name', p.company_name),
  address = coalesce(u.raw_user_meta_data->>'address', p.address),
  city = coalesce(u.raw_user_meta_data->>'city', p.city),
  state = coalesce(u.raw_user_meta_data->>'state', p.state),
  pincode = coalesce(u.raw_user_meta_data->>'pincode', p.pincode)
FROM auth.users u
WHERE p.id = u.id AND u.email_confirmed_at IS NOT NULL;
