-- SQL Queries to update the database for Flortek FRP Order Management App
-- Run this in the Supabase SQL Editor

-- 1. Add column lr_number to orders table if it does not exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lr_number text;

-- 2. Add column admin_remark (singular) to orders table if it does not exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_remark text;

-- 3. Row-Level Security (RLS) Policy for Administrators
-- If the save action fails, it might be due to RLS blocking updates from admin accounts on the 'orders' table.
-- Execute this to grant authenticated admins permission to update orders.
CREATE POLICY "Admins can update orders" ON orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 4. Create sequence for order_number auto-generation starting at 1
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1;

-- 5. Add order_number column to orders table if it does not exist (and set its default to sequential format)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text UNIQUE DEFAULT ('FLT-' || to_char(nextval('order_number_seq'), 'FM0000'));

-- If the column already exists, set its default constraint to use the sequence
ALTER TABLE orders ALTER COLUMN order_number SET DEFAULT ('FLT-' || to_char(nextval('order_number_seq'), 'FM0000'));

-- Update any existing orders that might have NULL order_numbers
UPDATE orders SET order_number = 'FLT-' || to_char(nextval('order_number_seq'), 'FM0000') WHERE order_number IS NULL;

