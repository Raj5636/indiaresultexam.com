const fetch = require('node-fetch');
const fs = require('fs');

async function debug() {
  const pageRes = await fetch('https://www.sarkariresult.com.cm/latest-jobs/');
  const pageHTML = await pageRes.text();
  fs.writeFileSync('debug-latest-jobs.html', pageHTML, 'utf8');
  console.log('Wrote to debug-latest-jobs.html');
  console.log('Status:', pageRes.status);
}

debug();
