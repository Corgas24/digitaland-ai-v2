// Compare what Vercel serves at / vs /dashboard
const URLS = ['/', '/dashboard', '/models', '/pricing', '/playground', '/nonexistent-page'];

async function run() {
  for (const path of URLS) {
    try {
      const r = await fetch(`https://digitaland.ai${path}`);
      const h = {};
      [...r.headers].forEach(([k, v]) => {
        if (k.includes('vercel') || k.includes('cf-ray') || k.includes('cache') || k.includes('content-type'))
          h[k] = v;
      });
      const txt = await r.text();
      console.log(`\n${'─'.repeat(55)}`);
      console.log(`GET ${path} → ${r.status}`);
      console.log(`CF-Ray:            ${h['cf-ray'] ?? 'n/a'}`);
      console.log(`X-Vercel-Id:       ${h['x-vercel-id'] ?? 'n/a'}`);
      console.log(`X-Vercel-Cache:    ${h['x-vercel-cache'] ?? 'n/a'}`);
      console.log(`Content-Type:      ${h['content-type'] ?? 'n/a'}`);
      console.log(`Body (first 150):  ${txt.slice(0, 150).replace(/\n/g, ' ')}`);
    } catch (e) {
      console.log(`\n${path} → ERROR: ${e.message}`);
    }
  }
}
run();
