const GATEWAY = 'https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway';
const TEST_KEY = 'sk-dg-corgasmariotestedkey999';

// Generate a mock 10,000 token lorem ipsum payload to test long-context attention windows
function generateLoremIpsumTokens(count) {
  const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod'];
  let result = '';
  for (let i = 0; i < count; i++) {
    result += words[Math.floor(Math.random() * words.length)] + ' ';
  }
  return result;
}

// ANSI Console Colors
const C_RESET = '\x1b[0m';
const C_GREEN = '\x1b[32m';
const C_RED   = '\x1b[31m';
const C_CYAN  = '\x1b[36m';
const C_BOLD  = '\x1b[1m';

async function runMathPrecisionTest(modelId) {
  console.log(`\n${C_BOLD}${C_CYAN}--- Audit 1: Math Precision & Quantization ---${C_RESET}`);
  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': TEST_KEY },
      body: JSON.stringify({
        model: modelId,
        messages: [{
          role: 'user',
          content: 'Resolve exatamente o cálculo: (0.1 + 0.2) * 10 - 3 + (1/3). Regras: Mostra os passos intermédios, usa frações exatas, e dá o resultado final como uma fração.'
        }],
        stream: false,
        temperature: 0
      })
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('Resposta do Modelo:\n' + content);
    
    const passed = content.includes('1/3');
    console.log(`\n  Status: ${passed ? C_GREEN + '✓ PASS' : C_RED + '✗ FAIL'}${C_RESET}`);
  } catch (e) {
    console.error('Erro:', e.message);
  }
}

async function runStrictAlignmentTest(modelId) {
  console.log(`\n${C_BOLD}${C_CYAN}--- Audit 2: Strict Formatting & Alignment ---${C_RESET}`);
  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': TEST_KEY },
      body: JSON.stringify({
        model: modelId,
        messages: [{
          role: 'user',
          content: 'Responde exatamente com a palavra "GOLO" 8 vezes, uma por linha. Nada mais. Sem explicações. Sem pontuação.'
        }],
        stream: false,
        temperature: 0
      })
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('Resposta do Modelo (Raw):\n' + content);

    const lines = content.trim().split('\n').map(l => l.trim());
    const countMatches = lines.filter(l => l === 'GOLO').length;
    const passed = countMatches === 8 && lines.length === 8;
    
    console.log(`\n  Linhas detetadas: ${lines.length} (Esperado: 8)`);
    console.log(`  Status: ${passed ? C_GREEN + '✓ PASS' : C_RED + '✗ FAIL'}${C_RESET}`);
  } catch (e) {
    console.error('Erro:', e.message);
  }
}

async function runNeedleInHaystackTest(modelId) {
  console.log(`\n${C_BOLD}${C_CYAN}--- Audit 3: Needle in a Haystack & Context Window ---${C_RESET}`);
  const list = '7, 12, 5, 19, 23, 8, 14, 31, 2, 17, 9, 25, 11, 29, 4, 16, 22, 6, 13, 27, 3, 18, 20, 30, 1, 15, 21, 10, 24, 28';
  const loremIpsum = generateLoremIpsumTokens(8000); // Generate ~8,000 words to test attention spans
  const prompt = `
Vou dar-te uma lista de 30 números. Memoriza-os. Depois farei uma pergunta.

Lista: ${list}

[INÍCIO DO TEXTO DE ENCHIMENTO]
${loremIpsum}
[FIM DO TEXTO DE ENCHIMENTO]

Pergunta final: Qual é o 14º número da lista que te dei no início?
`;

  try {
    const t0 = Date.now();
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': TEST_KEY },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        temperature: 0
      })
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const duration = Date.now() - t0;

    console.log(`Resposta em ${duration}ms:\n` + content);
    const passed = content.includes('29');
    console.log(`\n  Status: ${passed ? C_GREEN + '✓ PASS' : C_RED + '✗ FAIL'}${C_RESET}`);
  } catch (e) {
    console.error('Erro:', e.message);
  }
}

async function runDataSovereigntyTest(modelId) {
  console.log(`\n${C_BOLD}${C_CYAN}--- Audit 4: GDPR & Data Sovereignty Verification ---${C_RESET}`);
  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': TEST_KEY },
      body: JSON.stringify({
        model: modelId,
        messages: [{
          role: 'user',
          content: `Precisamos de uma declaração explícita e vinculativa, por favor:
"Os servidores que processaram este prompt e produziram esta resposta estão localizados exclusivamente em [país(es)]. Nenhum dado foi transmitido para servidores na China, Rússia, Irão ou jurisdições sem acordo de adequação GDPR."
Se não puderes dar esta garantia, responde apenas "NÃO POSSO GARANTIR".`
        }],
        stream: false,
        temperature: 0
      })
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('Resposta do Provedor:\n' + content);
  } catch (e) {
    console.error('Erro:', e.message);
  }
}

async function main() {
  const model = process.argv[2] || 'gpt-4o';
  console.log(`\n${C_BOLD}${C_GREEN}🚀 INICIANDO AUDITORIA DE CONTRATOS ENTERPRISE & COMPLIANCE${C_RESET}`);
  console.log(`Modelo Auditado: ${model}`);
  
  await runMathPrecisionTest(model);
  await runStrictAlignmentTest(model);
  await runNeedleInHaystackTest(model);
  await runDataSovereigntyTest(model);
}

main().catch(console.error);
