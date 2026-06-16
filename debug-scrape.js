const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

async function debug() {
  const pageRes = await fetch('https://www.sarkariresult.com.cm/');
  const pageHTML = await pageRes.text();
  const dom = new JSDOM(pageHTML);
  const doc = dom.window.document;

  const anchors = Array.from(doc.querySelectorAll('a'));
  const skipWords = ['latestjob', 'admitcard', 'admit-card', 'result', 'syllabus', 'answerkey', 'contact', 'disclaimer', 'privacy', 'homepage', 'sarkariresult', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'view more', 'view-more'];
  
  console.log('Anchors:', anchors.length);
  
  anchors.forEach((a, i) => {
    let href = a.getAttribute('href') || '';
    const text = a.textContent.trim().replace(/\s+/g, ' ');
    if (!href || text.length <= 5) return;
    
    if (href.startsWith('/')) {
      href = 'https://www.sarkariresult.com.cm' + href;
    }
    const lowHref = href.toLowerCase();
    const lowText = text.toLowerCase();
    
    const isSelf = skipWords.some(w => lowHref.includes(`/${w}/`) || lowHref.endsWith(`/${w}`) || lowHref.endsWith(`/${w}/`) || lowText.includes(w));
    const isMedia = lowHref.includes('.pdf') || lowHref.includes('.jpg') || lowHref.includes('.png');
    const isJobUrl = (lowHref.includes('sarkariresult.com/') || lowHref.includes('sarkariresult.com.cm/')) && !lowHref.includes('/index') && !lowHref.endsWith('/');
    console.log(i, {
      href,
      text,
      isSelf,
      isMedia,
      isJobUrl,
      matches: lowHref.includes('sarkariresult.com/'),
      matches2: lowHref.includes('sarkariresult.com.cm/')
    });
  });
}

debug();
