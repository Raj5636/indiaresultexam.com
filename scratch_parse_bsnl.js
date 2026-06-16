const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

function parseBSNL() {
  const html = fs.readFileSync('bsnl_jto_2026.html', 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  console.log('--- Tables Scrape Test on Real BSNL JTO HTML ---');

  const tables = doc.querySelectorAll('table');
  console.log(`Found ${tables.length} tables`);

  tables.forEach((table, tableIdx) => {
    const cells = Array.from(table.querySelectorAll('th, td')).map(el => el.textContent.toLowerCase().trim());
    console.log(`\nTable ${tableIdx + 1}:`);
    console.log(`  Cells count: ${cells.length}`);
    console.log(`  Preview (first 10 cells):`, cells.slice(0, 10));

    const isMaster = cells.some(c => c.includes('important dates') || c.includes('application fee'));
    console.log(`  isMaster: ${isMaster}`);

    const casteKeywords = ['ur', 'obc', 'sc', 'st', 'ews', 'general', 'gen', 'bc', 'sbc'];
    const matchingCasteCount = cells.filter(c => 
      casteKeywords.includes(c) || c === 'gen' || c === 'ur' || c.startsWith('obc') || c.startsWith('ews')
    ).length;
    console.log(`  Caste keywords match: ${matchingCasteCount}`);

    const hasPostName = cells.some(c => c.includes('post name') || c.includes('name of post') || c === 'post');
    const hasTotalPost = cells.some(c => c.includes('total post') || c.includes('totalposts') || c.includes('total vacancy') || c === 'total');
    console.log(`  hasPostName: ${hasPostName}, hasTotalPost: ${hasTotalPost}`);
  });
}

parseBSNL();
