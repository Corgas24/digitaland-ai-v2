const GATEWAY = 'https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway';
const TEST_KEY = 'sk-dg-corgasmariotestedkey999';

async function testSingleLatency() {
  console.log('Sending single high-speed latency test query...');
  try {
    const t0 = Date.now();
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEST_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Diga apenas: OK' }],
        max_tokens: 2,
        temperature: 0
      })
    });
    
    const ms = Date.now() - t0;
    console.log(`HTTP Status: ${res.status}`);
    
    if (res.ok) {
      const data = await res.json();
      console.log(`Resposta: "${(data.choices?.[0]?.message?.content || '').trim()}"`);
    } else {
      const text = await res.text();
      console.log(`Erro: ${text}`);
    }
    
    console.log(`\n⏱️ TEMPO DE EXECUÇÃO TOTAL (REAL LATENCY): ${ms}ms`);
  } catch (e) {
    console.error('Erro:', e.message);
  }
}

testSingleLatency();
