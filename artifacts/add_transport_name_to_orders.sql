-- SQL Migration: Add transport_name column to public.orders table
-- Run this script in the Supabase SQL Editor.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transport_name text;
