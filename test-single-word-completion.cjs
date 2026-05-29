const GATEWAY = 'https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway';
const TEST_KEY = 'sk-dg-corgasmariotestedkey999';

const PROMPT = 'I\'m going to give you the beginning of a sentence. You must complete it with exactly ONE word. Not a phrase. Not punctuation. Just one word. Sentence: "The capital of France is" Respond with ONLY the single word. No explanation.';

async function testSingleWord(modelId) {
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
        messages: [{ role: 'user', content: PROMPT }],
        stream: false,
        temperature: 0
      })
    });
    
    const ms = Date.now() - t0;
    if (!res.ok) {
      console.log(`${modelId}: Falhou com Status ${res.status}`);
      return;
    }
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    
    // We display it with brackets so we can audit if there are trailing spaces or newlines or punctuation
    console.log(`${modelId}: Raw Output = [${rawContent}] in ${ms}ms`);
  } catch (e) {
    console.error(`Erro no modelo ${modelId}:`, e.message);
  }
}

async function main() {
  console.log('Iniciando o Teste de Completamento de Palavra Única (Auditando Punctuation & Explanation Constraints)...\n');
  await testSingleWord('gpt-4o');
  await testSingleWord('gemini-2.5-pro');
  await testSingleWord('claude-3-5-sonnet');
}

main();
