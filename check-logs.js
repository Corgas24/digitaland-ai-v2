
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fycqiwfbhqbltsthrpxk.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y3Fpd2ZiaHFibHRzdGhycHhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTkxNTAwNywiZXhwIjoyMDg1NDkxMDA3fQ.hpHBnGSRmuvuIEBoB9qRd4R7ZabgSqxtmfossrpAYH0';
const supabase = createClient(supabaseUrl, SERVICE_KEY);

async function checkLogs() {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, balance')
    .eq('email', 'corgasmario@gmail.com')
    .single();

  if (!profile) {
    console.error('Profile not found');
    return;
  }

  console.log('Current Profile Balance:', profile.balance);

  const { data: logs, error } = await supabase
    .from('logs')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log('Recent Logs:', JSON.stringify(logs, null, 2));
}

checkLogs();
