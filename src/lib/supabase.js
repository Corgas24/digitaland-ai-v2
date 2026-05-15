import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fycqiwfbhqbltsthrpxk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y3Fpd2ZiaHFibHRzdGhycHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTUwMDcsImV4cCI6MjA4NTQ5MTAwN30.HecOV_tntiiL3n8I4x66nhyfjRC0iFW5qxpSU1U9BHM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
