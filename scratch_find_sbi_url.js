const jsdom = require('jsdom');
const { JSDOM } = jsdom;

async function run() {
  const url = "https://www.sarkariresult.com/latestjob/";
  console.log('Scanning page:', url);
  try {
    const res = await fetch(url);
    const html = await res.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const anchors = Array.from(doc.querySelectorAll('a'));
    console.log(`Found ${anchors.length} links.`);
    
    anchors.forEach(a => {
      const text = a.textContent.toLowerCase();
      const href = a.getAttribute('href') || '';
      if (text.includes('sbi') || text.includes('apprentice')) {
        console.log(`Match: "${a.textContent.trim()}" -> ${href}`);
      }
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
}

run();
