// Deep Vercel diagnostics — is vercel.json being served?
async function main() {
  // 1. Is vercel.json accessible?
  console.log('=== vercel.json on CDN ===');
  try {
    const r = await fetch('https://digitaland.ai/vercel.json');
    console.log('Status:', r.status);
    console.log('Body:', await r.text());
  } catch (e) {
    console.log('Error:', e.message);
  }

  // 2. Is _redirects accessible?
  console.log('\n=== _redirects on CDN ===');
  try {
    const r = await fetch('https://digitaland.ai/_redirects');
    console.log('Status:', r.status);
    console.log('Body:', await r.text());
  } catch (e) {
    console.log('Error:', e.message);
  }

  // 3. favicon.svg?
  console.log('\n=== favicon.svg ===');
  try {
    const r = await fetch('https://digitaland.ai/favicon.svg');
    console.log('Status:', r.status);
    console.log('CT:', r.headers.get('content-type'));
  } catch (e) {
    console.log('Error:', e.message);
  }

  // 4. What does /index.html look like on CDN?
  console.log('\n=== index.html on CDN ===');
  try {
    const r = await fetch('https://digitaland.ai/index.html');
    console.log('Status:', r.status);
    console.log('CT:', r.headers.get('content-type'));
    const body = await r.text();
    console.log('Has <div id="root">:', body.includes('id="root"'));
  } catch (e) {
    console.log('Error:', e.message);
  }

  // 5. Try without www
  console.log('\n=== www.digitaland.ai/dashboard ===');
  try {
    const r = await fetch('https://www.digitaland.ai/dashboard');
    console.log('Status:', r.status);
    console.log('CT:', r.headers.get('content-type'));
    console.log('Body:', (await r.text()).slice(0, 200));
  } catch (e) {
    console.log('Error:', e.message);
  }
}
main();
