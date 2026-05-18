import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  typeof import.meta.env.VITE_SUPABASE_URL === 'string'
    ? import.meta.env.VITE_SUPABASE_URL.trim()
    : '';

const supabaseAnonKey =
  typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string'
    ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
    : '';

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl)  missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');

  throw new Error(
    `[supabase] Missing required environment variable(s): ${missing.join(', ')}. ` +
    'Add them to your .env file before starting the development server.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
