const GATEWAY = 'https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway';
const TEST_KEY = 'sk-dg-corgasmariotestedkey999';

async function runConsistencyTest(i) {
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
        messages: [{ role: 'user', content: 'Responda apenas com o número: 42' }],
        temperature: 0
      })
    });
    
    const ms = Date.now() - t0;
    if (!res.ok) {
      console.log(`Chamada #${i} falhou com Status: ${res.status}`);
      return;
    }

    const data = await res.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();
    console.log(`Chamada #${i}: Resposta = "${content}" (${ms}ms)`);
  } catch (e) {
    console.error(`Chamada #${i} erro:`, e.message);
  }
}

async function main() {
  console.log('Iniciando o teste de consistência de 10 chamadas consecutivas...\n');
  for (let i = 1; i <= 10; i++) {
    await runConsistencyTest(i);
    await new Promise(resolve => setTimeout(resolve, 1000)); // sleep 1s
  }
  console.log('\nTeste concluído com sucesso!');
}

main();
