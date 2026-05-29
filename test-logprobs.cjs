const GATEWAY = 'https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway';
const TEST_KEY = 'sk-dg-corgasmariotestedkey999';

async function testLogprobs() {
  console.log('Solicitando logprobs nativos para GPT-4o...');
  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEST_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'The capital of France is' }],
        logprobs: true,
        top_logprobs: 5,
        max_tokens: 1,
        temperature: 0
      })
    });

    console.log(`Status: ${res.status}`);
    if (!res.ok) {
      const text = await res.text();
      console.log('Erro do Servidor:', text);
      return;
    }
    const data = await res.json();
    const choice = data.choices?.[0];
    
    console.log('\n--- Resposta Bruta do OpenAI GPT-4o ---');
    console.log(`Mensagem: "${choice?.message?.content}"`);
    console.log('Logprobs do Primeiro Token:');
    if (choice?.logprobs) {
      console.log(JSON.stringify(choice.logprobs, null, 2));
    } else {
      console.log('🚨 ALERTA: O objeto "logprobs" não está presente na resposta!');
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testLogprobs();
