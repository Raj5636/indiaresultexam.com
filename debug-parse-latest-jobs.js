const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('debug-latest-jobs.html', 'utf8');
const dom = new JSDOM(html);
const doc = dom.window.document;

console.log('Checking for .entry-content:', !!doc.querySelector('.entry-content'));
console.log('All a tags:', doc.querySelectorAll('a').length);
doc.querySelectorAll('a').forEach((a, i) => {
  const href = a.getAttribute('href');
  const text = a.textContent.trim();
  if (href) {
    console.log(i, href, text);
  }
});
