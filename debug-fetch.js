const fetch = require('node-fetch');
const fs = require('fs');

async function debugFetch() {
    console.log('Fetching https://www.sarkariresult.com.cm/...');
    const response = await fetch('https://www.sarkariresult.com.cm/');
    const html = await response.text();
    console.log('Writing to debug-home.html...');
    fs.writeFileSync('debug-home.html', html, 'utf8');
    console.log('Done! Check debug-home.html');
}

debugFetch();
