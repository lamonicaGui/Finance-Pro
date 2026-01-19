-- Execute this in the Supabase SQL Editor to create a routine that clears open positions.
-- This function can be called via RPC from the frontend.

CREATE OR REPLACE FUNCTION public.truncate_open_positions()
RETURNS void AS $$
BEGIN
    TRUNCATE TABLE public.open_positions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the anon/authenticated users (so the app can call it)
GRANT EXECUTE ON FUNCTION public.truncate_open_positions() TO anon;
GRANT EXECUTE ON FUNCTION public.truncate_open_positions() TO authenticated;

-- Ensure RLS doesn't block the function if needed (though SECURITY DEFINER handles it)
COMMENT ON FUNCTION public.truncate_open_positions() IS 'Clears all records from open_positions table for a fresh import.';
