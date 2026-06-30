-- 1. Add email column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Update existing auth.users to fill required nullable columns with empty string (Fixes: Scan Error querying schema)
UPDATE auth.users
SET 
  confirmation_token = coalesce(confirmation_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  recovery_token = coalesce(recovery_token, '')
WHERE confirmation_token IS NULL 
   OR email_change IS NULL 
   OR email_change_token_new IS NULL 
   OR recovery_token IS NULL;

-- 3. Set user_id to NULL on orders of other users so we don't violate foreign keys when deleting them
UPDATE public.orders 
SET user_id = NULL 
WHERE user_id NOT IN (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 2
);

-- 4. Delete all OTHER users except the first 2 oldest users in your database
DELETE FROM auth.identities 
WHERE user_id NOT IN (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 2
);

DELETE FROM public.profiles 
WHERE id NOT IN (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 2
);

DELETE FROM auth.users 
WHERE id NOT IN (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 2
);

-- 5. Sync the profiles for the remaining 2 users
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

-- 6. Set the 1st user to 'admin'
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
);

-- 7. Set the 2nd user to 'customer'
UPDATE public.profiles
SET role = 'customer'
WHERE id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1 OFFSET 1
);

-- 8. Verify the remaining users
SELECT email, role, full_name FROM public.profiles;
