const fs = require('fs');

async function testDownload() {
  const urls = [
    'https://www.sarkariresult.com/telecom/bsnl-jto-2026/',
    'https://www.sarkariresult.com/2026/bsnl-jto-2026/'
  ];

  for (const url of urls) {
    try {
      console.log(`Fetching: ${url}`);
      const res = await fetch(url);
      if (res.ok) {
        const html = await res.text();
        console.log(`Success! Length: ${html.length}`);
        
        const filename = url.includes('telecom') ? 'bsnl_jto_telecom.html' : 'bsnl_jto_2026.html';
        fs.writeFileSync(filename, html, 'utf8');
        console.log(`Saved to ${filename}`);
      } else {
        console.log(`Failed with status: ${res.status}`);
      }
    } catch (e) {
      console.log(`Error fetching ${url}: ${e.message}`);
    }
  }
}

testDownload();
