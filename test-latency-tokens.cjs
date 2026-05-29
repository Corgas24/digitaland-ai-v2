const GATEWAY = 'https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway';
const TEST_KEY = 'sk-dg-corgasmariotestedkey999';

async function testLatencyByTokens(modelId, maxTokens) {
  const prompt = 'Escreve um texto sobre tecnologia de forma detalhada.';
  
  try {
    const t0 = Date.now();
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEST_KEY
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0
      })
    });

    const elapsed = (Date.now() - t0) / 1000; // in seconds
    if (!res.ok) {
      return { success: false, error: await res.text() };
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokens = data.usage?.completion_tokens || content.split(/\s+/).filter(Boolean).length;
    return { success: true, elapsed, tokens, content };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function main() {
  const modelId = 'gpt-4o';
  console.log(`=== TESTE 5: LATÊNCIA VS TOKENS GERADOS PARA ${modelId} ===`);
  
  console.log('Medindo latência para gerar 1 token...');
  const t1Res = await testLatencyByTokens(modelId, 1);
  if (!t1Res.success) {
    console.error('Falha no teste com 1 token:', t1Res.error);
    return;
  }
  console.log(`  Tempo para 1 token: ${t1Res.elapsed.toFixed(3)}s (Tokens gerados: ${t1Res.tokens})`);

  // Sleep 2 seconds
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Medindo latência para gerar 100 tokens...');
  const t100Res = await testLatencyByTokens(modelId, 100);
  if (!t100Res.success) {
    console.error('Falha no teste com 100 tokens:', t100Res.error);
    return;
  }
  console.log(`  Tempo para 100 tokens: ${t100Res.elapsed.toFixed(3)}s (Tokens gerados: ${t100Res.tokens})`);

  const t1 = t1Res.elapsed;
  const t100 = t100Res.elapsed;
  const diffTokens = t100Res.tokens - t1Res.tokens;
  
  console.log('\n--- Resultados da Latência ---');
  console.log(`t1: ${t1.toFixed(3)}s`);
  console.log(`t100: ${t100.toFixed(3)}s`);
  
  if (diffTokens <= 0) {
    console.log('🚨 ERRO: Não foi gerado nenhum token adicional no segundo teste.');
    return;
  }
  
  const timePerToken = (t100 - t1) / diffTokens;
  console.log(`Tempo por token adicional: ${timePerToken.toFixed(4)}s`);

  if (t100 - t1 < 0.2) {
    console.log('🚨 CRITÉRIO DE FALHA DETETADO: A diferença de latência entre 1 e 100 tokens é nula ou suspeitosamente baixa!');
    console.log('🚨 Isso sugere fortíssima possibilidade de cache agressivo, pré-geração ou simulação artificial de velocidade!');
  } else if (timePerToken < 0.005) {
    console.log('🚨 SUSPEITA DE QUANTIZAÇÃO OU PROXY CACHE: O tempo por token é extremamente rápido (< 0.005s per token).');
  } else {
    console.log('✅ PASS: A progressão de latência é linear e condizente com a geração nativa na GPU (~0.015-0.10s por token adicional).');
  }
}

main().catch(console.error);
