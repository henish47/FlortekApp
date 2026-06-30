-- Enable the pgcrypto extension for crypt and gen_salt functions if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create security definer function to allow admins to create users
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_mobile TEXT,
  p_role TEXT
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
  v_caller_role TEXT;
  v_response JSONB;
BEGIN
  -- 1. Security Check: verify if caller is an admin
  SELECT role INTO v_caller_role 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only administrators can create users.';
  END IF;

  -- 2. Check if email already exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'A user with this email already exists.';
  END IF;

  -- 3. Hash the password using Blowfish (bf) crypt algorithm
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  -- 4. Insert user into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin,
    phone,
    phone_confirmed_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_password,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    FALSE,
    NULL,
    NULL,
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- 5. Insert linking record into auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email),
    'email',
    p_email,
    NULL,
    now(),
    now()
  );

  -- 6. Insert record into public.profiles
  INSERT INTO public.profiles (
    id,
    full_name,
    mobile,
    email,
    role,
    created_at
  ) VALUES (
    v_user_id,
    p_full_name,
    p_mobile,
    p_email,
    p_role,
    now()
  );

  v_response := jsonb_build_object(
    'success', TRUE,
    'user_id', v_user_id,
    'message', 'User created successfully.'
  );

  RETURN v_response;
EXCEPTION
  WHEN OTHERS THEN
    v_response := jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
    RETURN v_response;
END;
$$ LANGUAGE plpgsql;

-- Create security definer function to allow admins to update users
CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id UUID,
  p_full_name TEXT,
  p_mobile TEXT,
  p_role TEXT
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_response JSONB;
BEGIN
  -- 1. Security Check: verify if caller is an admin
  SELECT role INTO v_caller_role 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only administrators can update profiles.';
  END IF;

  -- 2. Update auth.users metadata to prevent sync trigger from overwriting it back to older/empty values
  UPDATE auth.users
  SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'full_name', p_full_name,
    'mobile', p_mobile
  )
  WHERE id = p_user_id;

  -- 3. Update public.profiles
  UPDATE public.profiles
  SET
    full_name = p_full_name,
    mobile = p_mobile,
    role = p_role
  WHERE id = p_user_id;

  v_response := jsonb_build_object(
    'success', TRUE,
    'message', 'User updated successfully.'
  );

  RETURN v_response;
EXCEPTION
  WHEN OTHERS THEN
    v_response := jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
    RETURN v_response;
END;
$$ LANGUAGE plpgsql;

-- Create security definer function to allow admins to delete users
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role TEXT;
  v_response JSONB;
BEGIN
  -- 1. Security Check: verify if caller is an admin (case-insensitive)
  SELECT lower(role) INTO v_caller_role 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Access denied: Only administrators can delete users.';
  END IF;

  -- 2. Clear user references in orders (to preserve order history)
  UPDATE public.orders SET user_id = NULL WHERE user_id = p_user_id;

  -- 3. Clear user references in activity logs (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_logs') THEN
    UPDATE public.activity_logs SET user_id = NULL WHERE user_id = p_user_id;
  END IF;

  -- 4. Delete user's notifications (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    DELETE FROM public.notifications WHERE user_id = p_user_id;
  END IF;

  -- 5. Clear user references in storage.objects (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    UPDATE storage.objects SET owner = NULL WHERE owner = p_user_id;
    -- Also try text comparison since owner column type historically changed in Supabase versions
    UPDATE storage.objects SET owner = NULL WHERE owner::text = p_user_id::text;
  END IF;

  -- 6. Clean up Supabase Auth internal tables to prevent foreign key errors
  DELETE FROM auth.refresh_tokens WHERE session_id IN (SELECT id FROM auth.sessions WHERE user_id = p_user_id);
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
  DELETE FROM auth.mfa_factors WHERE user_id = p_user_id;
  DELETE FROM auth.identities WHERE user_id = p_user_id;

  -- 7. Delete from public.profiles
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- 8. Delete from auth.users
  DELETE FROM auth.users WHERE id = p_user_id;

  v_response := jsonb_build_object(
    'success', TRUE,
    'message', 'User deleted successfully.'
  );

  RETURN v_response;
EXCEPTION
  WHEN OTHERS THEN
    v_response := jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
    RETURN v_response;
END;
$$ LANGUAGE plpgsql;
