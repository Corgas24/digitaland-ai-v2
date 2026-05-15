/**
 * DIGITALANDAI - Gateway Test Script
 * 
 * This script tests your Supabase Edge Function Gateway.
 * It sends a chat completion request using a Digitaland API Key.
 */

// CONFIGURATION - Replace with your actual data
const GATEWAY_URL = "https://fycqiwfbhqbltsthrpxk.supabase.co/functions/v1/gateway";
const API_KEY = "sk-dg-x2fu1wxtzeuf8bihj9rh"; // Get this from your Dashboard

async function testGateway() {
  console.log("🚀 Initializing Digitaland Gateway Test...");
  console.log(`🔗 Endpoint: ${GATEWAY_URL}`);
  
  if (API_KEY === "sk-dg-SUA-CHAVE-AQUI") {
    console.error("❌ ERROR: You must replace 'sk-dg-SUA-CHAVE-AQUI' with a real key from your dashboard!");
    return;
  }

  const payload = {
    model: "gpt-4o-mini", // Or any model supported by your upstream
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Say 'Digitaland is live!' if you can hear me." }
    ],
    stream: false
  };

  try {
    const startTime = Date.now();
    const response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    if (response.ok) {
      console.log("\n✅ SUCCESS!");
      console.log(`⏱️ Latency: ${duration}ms`);
      console.log(`🤖 Response: "${data.choices[0].message.content}"`);
      console.log(`📊 Usage: ${data.usage.total_tokens} tokens`);
      console.log("\n💰 Check your dashboard: your balance should have been deducted (1.4x markup).");
    } else {
      console.error("\n❌ GATEWAY ERROR:");
      console.error(`Status: ${response.status}`);
      console.error(`Message: ${data.error?.message || JSON.stringify(data)}`);
    }
  } catch (error) {
    console.error("\n❌ NETWORK ERROR:");
    console.error(error.message);
  }
}

testGateway();
