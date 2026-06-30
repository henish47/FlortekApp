-- SQL script to allow authenticated users to view admin profiles
-- This is necessary so that customers placing orders can look up admin details (email, push tokens) to send push/email notifications.
-- Run this in the Supabase SQL Editor.

DROP POLICY IF EXISTS "Anyone can select admin profiles" ON public.profiles;

CREATE POLICY "Anyone can select admin profiles" ON public.profiles
FOR SELECT TO authenticated
USING (role = 'admin');
