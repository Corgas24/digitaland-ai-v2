const fs = require('fs');

async function scrape() {
    try {
        const res = await fetch('https://crazyrouter.com/pricing');
        const text = await res.text();
        
        // Find __NEXT_DATA__
        const match = text.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (match) {
            const data = JSON.parse(match[1]);
            fs.writeFileSync('cr_next_data.json', JSON.stringify(data, null, 2));
            console.log('Successfully saved to cr_next_data.json!');
        } else {
            console.log('No __NEXT_DATA__ found. It might be client-rendered or Vite.');
        }
    } catch (e) {
        console.error(e);
    }
}
scrape();
