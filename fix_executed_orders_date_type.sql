-- Execute this in the Supabase SQL Editor to fix the "date/time field value out of range" error.
-- This changes the date columns to TEXT, allowing any format (like DD/MM/YYYY) to be imported.

ALTER TABLE IF EXISTS public.executed_orders 
ALTER COLUMN data TYPE TEXT,
ALTER COLUMN data_hora TYPE TEXT;

-- Success: You can now import the CSV without date format errors.
