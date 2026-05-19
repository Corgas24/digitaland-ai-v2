// Debug: test every route on the Supabase gateway
const GATEWAY = 'https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway';

const tests = [
  { name: 'GET /gateway (no body)',     method: 'GET',    path: '' },
  { name: 'POST /gateway (no model)',   method: 'POST',   path: '',    body: { messages: [{ role: 'user', content: 'hi' }] } },
  { name: 'POST /gateway (gpt-4o-mini)',method: 'POST',   path: '',    body: { model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }] } },
  { name: 'GET /gateway/v1/chat',       method: 'GET',    path: '/v1/chat/completions' },
  { name: 'POST /gateway/v1/chat (no auth)', method: 'POST', path: '/v1/chat/completions', body: { model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }] } },
  { name: 'POST /gateway/v1/models',    method: 'GET',    path: '/v1/models' },
  { name: 'OPTIONS /gateway/any',       method: 'OPTIONS',path: '/anything' },
];

async function run() {
  for (const t of tests) {
    const url = GATEWAY + t.path;
    const opts = {
      method: t.method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (t.body) opts.body = JSON.stringify(t.body);

    try {
      const r = await fetch(url, opts);
      const txt = await r.text();
      // Extract error code if any
      const codeMatch = txt.match(/"code"\s*:\s*"([A-Z0-9_]+)"/);
      const msgMatch  = txt.match(/"message"\s*:\s*"([^"]+)"/);
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`TEST: ${t.name}`);
      console.log(`Status: ${r.status}`);
      console.log(`CF-Ray: ${r.headers.get('cf-ray') ?? 'n/a'}`);
      console.log(`SB-Id:   ${r.headers.get('x-sb-request-id') ?? 'n/a'}`);
      if (codeMatch) console.log(`Code:   ${codeMatch[1]}`);
      if (msgMatch)  console.log(`Msg:    ${msgMatch[1]}`);
      console.log(`Body:   ${txt.slice(0, 200)}`);
    } catch (e) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`TEST: ${t.name} → NETWORK ERROR: ${e.message}`);
    }
  }
}
run();
