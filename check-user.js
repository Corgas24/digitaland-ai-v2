
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fycqiwfbhqbltsthrpxk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y3Fpd2ZiaHFibHRzdGhycHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTUwMDcsImV4cCI6MjA4NTQ5MTAwN30.HecOV_tntiiL3n8I4x66nhyfjRC0iFW5qxpSU1U9BHM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUser() {
  const apiKeyToFind = 'sk-dg-38fwh2amiws30dkksjdpq';
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .filter('api_keys', 'cs', `[{"key":"${apiKeyToFind}"}]`)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    return;
  }

  if (!profile) {
    console.log('No profile found with that key. Let us look up the first 5 profiles to inspect.');
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    if (pError) console.error(pError);
    else console.log(profiles.map(p => ({ email: p.email, balance: p.balance, api_keys: p.api_keys })));
  } else {
    console.log('Profile found:', JSON.stringify(profile, null, 2));
  }
}

checkUser();
