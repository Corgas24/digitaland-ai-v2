// fetchAndParseModels.js
const fs = require('fs');
const https = require('https');

https.get('https://crazyrouter.com/pricing', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const match = data.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (match) {
            try {
                const json = JSON.parse(match[1]);
                const pricingModels = json.props?.pageProps?.pricingModels || [];
                
                let out = '// All 240+ CrazyRouter models\nconst R=[\n';
                
                for (const m of pricingModels) {
                    const provider = m.provider || 'Unknown';
                    const name = m.name || m.model || 'Unknown';
                    const offIn = m.offIn || m.prompt_ratio || 0;
                    const offOut = m.offOut || m.completion_ratio || 0;
                    const type = m.type || 'Chat';
                    const badge = m.badge || '';
                    
                    out += `['${provider}','${name}',${offIn},${offOut},'${type}','${badge}'],\n`;
                }
                
                out += '];\nexport default R.map(([provider,name,offIn,offOut,type,badge])=>({provider,name,offIn,offOut,type,badge:badge||"",ctx:"-",vision:type==="Vision",tools:type!=="Image"&&type!=="Audio"&&type!=="Video",reasoning:type==="Reasoning",speed:50,intel:50}));\n';
                
                fs.writeFileSync('src/data/allmodels.js', out);
                console.log('Successfully updated src/data/allmodels.js with ' + pricingModels.length + ' models!');
            } catch (e) {
                console.error('Error parsing JSON:', e);
            }
        } else {
            console.log('No __NEXT_DATA__ found.');
        }
    });
}).on('error', (err) => {
    console.error('Error fetching URL:', err.message);
});
