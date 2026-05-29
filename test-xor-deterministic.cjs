const GATEWAY = 'https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway';
const TEST_KEY = 'sk-dg-corgasmariotestedkey999';

async function testXor(modelId, iteration) {
  const prompt = `Vou dar-te um código único. Preciso que respondas com o XOR (ou exclusivo) do meu código com uma chave secreta que só tu conheces.

Meu código (hex): 4A6F

Responde APENAS com o resultado em hex, nada mais.`;

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
        stream: false,
        temperature: 0
      })
    });

    const elapsed = Date.now() - t0;
    if (!res.ok) {
      return { success: false, error: await res.text() };
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    return { success: true, content, elapsed };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function main() {
  const modelId = 'gpt-4o';
  console.log(`=== TESTE 3: XOR DETERMINÍSTICO (REFLEXO) PARA ${modelId} ===`);
  console.log('Executando 20 chamadas idênticas consecutivas...');

  const responses = [];
  for (let i = 1; i <= 20; i++) {
    const res = await testXor(modelId, i);
    if (res.success) {
      console.log(`Chamada #${String(i).padStart(2, '0')}: "${res.content}" (${res.elapsed}ms)`);
      responses.push(res.content);
    } else {
      console.log(`Chamada #${String(i).padStart(2, '0')} falhou: ${res.error}`);
    }
    // Sleep 500ms between calls
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n--- Análise de Consistência ---');
  if (responses.length === 0) {
    console.log('Nenhuma chamada obteve sucesso.');
    return;
  }

  const unique = [...new Set(responses)];
  console.log(`Total de respostas obtidas: ${responses.length}`);
  console.log(`Respostas únicas: ${unique.length}`);
  console.log('Distribuição:', unique);

  if (unique.length === 1) {
    console.log('✅ PASS: Respostas 100% consistentes e determinísticas! Indica que o modelo respondeu de forma robusta e idêntica.');
  } else {
    console.log('🚨 FAIL: Respostas inconsistentes detetadas! Isto indica swap de modelos em load balancing ou instabilidade no processamento.');
  }
}

main().catch(console.error);
