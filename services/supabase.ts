import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials missing!');
  console.info('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING');
  console.info('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'MISSING');
}

// Ensure createClient is not called with undefined or empty strings that might throw early
const clientUrl = supabaseUrl || 'https://placeholder-url.supabase.co';
const clientKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(clientUrl, clientKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase client initialized with placeholders. App will likely fail on data requests.');
}
