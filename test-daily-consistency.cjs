const fs = require('fs');
const path = require('path');

const GATEWAY = 'https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway';
const TEST_KEY = 'sk-dg-corgasmariotestedkey999';
const LOG_DIR = path.join(__dirname, 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

async function runSingleCheck() {
  try {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEST_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Responde apenas com o número: 42' }],
        temperature: 0
      })
    });

    if (!res.ok) {
      return { success: false, content: `HTTP Status ${res.status}: ${await res.text()}` };
    }
    const data = await res.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();
    return { success: true, content };
  } catch (e) {
    return { success: false, content: `Error: ${e.message}` };
  }
}

async function main() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const logFile = path.join(LOG_DIR, `consistency_${dateStr}.log`);
  
  console.log(`[Daily Audit] Running 10 consistency checks to ${logFile}...`);
  fs.appendFileSync(logFile, `=== Audit Run: ${new Date().toISOString()} ===\n`);

  for (let i = 1; i <= 10; i++) {
    const start = Date.now();
    const result = await runSingleCheck();
    const elapsed = Date.now() - start;
    const logLine = `[Call #${String(i).padStart(2, '0')}] Content: "${result.content}" | Latency: ${elapsed}ms | Success: ${result.success}\n`;
    fs.appendFileSync(logFile, logLine);
    console.log(`  Call #${i}: "${result.content}" (${elapsed}ms)`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  fs.appendFileSync(logFile, `=== Audit Completed ===\n\n`);
  console.log('[Daily Audit] Finished.');
}

main().catch(console.error);
