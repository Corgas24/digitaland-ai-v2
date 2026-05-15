
import fetch from 'node-fetch';

const GATEWAY_URL = 'https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway';

// --- COLOQUE SUA CHAVE SK-DG ABAIXO ---
// Você pode encontrar ou criar uma no seu Dashboard local (API Keys)
const TEST_KEY = 'sk-dg-38fwh2amiws30dkksjdpq'; 

async function runDiagnostic() {
  console.log('\n--- 🧪 DIAGNÓSTICO DIGITALAND AI ---');
  console.log(`🔗 Gateway: ${GATEWAY_URL}`);
  console.log(`🔑 Testando com: ${TEST_KEY}`);
  console.log('------------------------------------\n');

  try {
    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'x-api-key': TEST_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say "System Online" if you can hear me.' }],
        temperature: 0.7
      })
    });
    
    const status = response.status;
    const data = await response.json();

    if (status === 200) {
      console.log('✅ CONEXÃO ESTABELECIDA!');
      console.log(`🤖 Resposta: "${data.choices[0].message.content}"`);
      console.log(`📊 Tokens: ${data.usage.total_tokens}`);
      console.log('\n💰 O Gateway processou o markup e o saldo foi atualizado.');
    } else {
      console.log(`❌ FALHA NO GATEWAY (Status ${status})`);
      console.log(`📝 Erro: ${data.error?.message || JSON.stringify(data)}`);
      
      if (status === 401) console.log('\n💡 Dica: Verifique se essa chave existe no seu banco de dados local.');
      if (status === 500 && data.error?.provider_error) {
        console.log('\n💡 Dica: O erro veio do provedor (Crazyrouter). Verifique sua UPSTREAM_MASTER_KEY.');
      }
    }
  } catch (err) {
    console.error('\n💥 Erro de Conexão:', err.message);
  }
}

runDiagnostic();
