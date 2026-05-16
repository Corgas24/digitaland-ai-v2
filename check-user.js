
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fycqiwfbhqbltsthrpxk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y3Fpd2ZiaHFibHRzdGhycHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTUwMDcsImV4cCI6MjA4NTQ5MTAwN30.HecOV_tntiiL3n8I4x66nhyfjRC0iFW5qxpSU1U9BHM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUser() {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'corgasmario@gmail.com')
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return;
  }

  console.log('Profile:', JSON.stringify(profile, null, 2));
}

checkUser();
