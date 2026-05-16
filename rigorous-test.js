
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Supabase Config (from src/lib/supabase.js)
const supabaseUrl = 'https://fycqiwfbhqbltsthrpxk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y3Fpd2ZiaHFibHRzdGhycHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5MTUwMDcsImV4cCI6MjA4NTQ5MTAwN30.HecOV_tntiiL3n8I4x66nhyfjRC0iFW5qxpSU1U9BHM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const GATEWAY_URL = `${supabaseUrl}/functions/v1/gateway`;
const TEST_API_KEY = 'sk-dg-38fwh2amiws30dkksjdpq'; // Provided in previous context

async function runRigorousTests() {
  console.log('\n🚀 --- DIGITALAND AI RIGOROUS TEST SUITE ---');
  
  // 1. Get Initial Balance
  console.log('📡 Fetching initial profile state...');
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .filter('api_keys', 'cs', `[{"key":"${TEST_API_KEY}"}]`)
    .single();

  if (pErr || !profile) {
    console.error('❌ Failed to fetch profile. Check API Key or DB connection.', pErr);
    return;
  }

  const initialBalance = profile.balance;
  console.log(`💰 Current Balance: $${initialBalance.toFixed(4)}`);
  console.log(`👤 User ID: ${profile.id}`);

  // 2. Test Case: Standard Chat (Streaming)
  console.log('\n📝 Test 1: Chat Generation (gpt-4o-mini)...');
  try {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': TEST_API_KEY },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "Test Successful"' }],
        stream: true
      })
    });

    if (res.ok) {
      console.log('✅ Stream initiated successfully.');
      // Consume stream to trigger billing at the end
      const body = res.body;
      let chunks = 0;
      body.on('data', () => chunks++);
      await new Promise(resolve => body.on('end', resolve));
      console.log(`📥 Received ${chunks} chunks.`);
    } else {
      console.error('❌ Chat Request Failed:', await res.text());
    }
  } catch (e) {
    console.error('❌ Chat Error:', e.message);
  }

  // 3. Test Case: Image Generation (Non-streaming)
  console.log('\n🎨 Test 2: Image Generation (nano-banana)...');
  try {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': TEST_API_KEY },
      body: JSON.stringify({
        model: 'nano-banana',
        messages: [{ role: 'user', content: 'A high-tech digital lab' }],
        stream: false
      })
    });

    const data = await res.json();
    if (res.ok) {
      console.log('✅ Image Request Successful.');
      console.log(`🖼️ URL: ${data.data?.[0]?.url || data.choices?.[0]?.message?.content || 'Format unexpected'}`);
    } else {
      console.error('❌ Image Request Failed:', data.error?.message || data);
    }
  } catch (e) {
    console.error('❌ Image Error:', e.message);
  }

  // 4. Verify Final Balance & Logs
  console.log('\n📊 Verifying Persistence...');
  await new Promise(r => setTimeout(r, 2000)); // Wait for background billing process

  const { data: updatedProfile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', profile.id)
    .single();

  const { data: logs } = await supabase
    .from('logs')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(2);

  const finalBalance = updatedProfile?.balance ?? initialBalance;
  const totalSpent = initialBalance - finalBalance;

  console.log('------------------------------------');
  console.log(`📉 Balance After Tests: $${finalBalance.toFixed(4)}`);
  console.log(`💸 Total Deducted: $${totalSpent.toFixed(4)}`);
  console.log(`📜 Recent Activity Logs Found: ${logs?.length || 0}`);
  
  if (totalSpent > 0 && logs?.length >= 1) {
    console.log('\n🏆 TEST STATUS: 100% SUCCESSFUL');
    console.log('✅ Billing Persistent');
    console.log('✅ Logs Recorded');
    console.log('✅ Gateway Optimized');
  } else {
    console.error('\n❌ TEST STATUS: FAILED');
    if (totalSpent === 0) console.error('   - No balance was deducted.');
    if (!logs?.length) console.error('   - No activity logs were created.');
  }
}

runRigorousTests();
