const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('debug-home.html', 'utf8');
const dom = new JSDOM(html);
const doc = dom.window.document;

const links = Array.from(doc.querySelectorAll('a')).map(a => ({
    text: a.textContent.trim(),
    href: a.href
}));

console.log('All links:');
console.log(links.filter(l => l.href).slice(0, 100));
