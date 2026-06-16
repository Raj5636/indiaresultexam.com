const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('C:\\Users\\sudhe\\.gemini\\antigravity\\brain\\69065ea4-e4bd-45fa-bb9e-779dd28f3fd5\\scratch\\sarkari_cgl.html', 'utf8');
const dom = new JSDOM(html);
const doc = dom.window.document;

function getValueAfterSeparator(line) {
    let separator = ':';
    if (!line.includes(':') && line.includes('-')) {
        separator = '-';
    }
    if (line.includes(separator)) {
        const parts = line.split(separator);
        return parts.slice(1).join(separator).trim();
    }
    return line.trim();
}

function parseSarkariResult(doc) {
    // 1. Scrape Title
    let title = '';
    const h1Element = doc.querySelector('h1');
    if (h1Element) title = h1Element.textContent.trim();
    title = title.replace(/\s+/g, ' ').trim();

    // Let's get the text of the main content table
    const mainTable = doc.querySelector('table');
    if (!mainTable) {
        console.log('No table found');
        return;
    }

    // We want to replace <br> with \n and get text content so we preserve lines
    const tempDiv = doc.createElement('div');
    tempDiv.innerHTML = mainTable.innerHTML;
    
    // Replace all <br> and <p> and <tr> and <li> with newlines or markers
    tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    tempDiv.querySelectorAll('tr').forEach(tr => tr.before('\n'));
    tempDiv.querySelectorAll('li').forEach(li => {
        li.before('\n');
        li.after('\n');
    });
    tempDiv.querySelectorAll('p').forEach(p => {
        p.before('\n');
        p.after('\n');
    });
    tempDiv.querySelectorAll('h1, h2, h3, h4').forEach(h => {
        h.before('\n');
        h.after('\n');
    });

    const rawText = tempDiv.textContent;
    const lines = rawText.split('\n')
        .map(l => l.replace(/\xa0/g, ' ').trim()) // replace non-breaking spaces
        .filter(l => l.length > 0);

    let applicationBegin = '';
    let lastDate = '';
    let examDate = '';
    let admitCardDate = '';
    
    let feeGeneral = '';
    let feeSCST = '';
    let feeFemale = '';
    
    let ageLimitLines = [];
    let selectionLines = [];

    // Let's also parse specifically from within the Important Dates / Application Fee UL elements for max accuracy!
    const datesUl = Array.from(doc.querySelectorAll('td, th')).find(el => {
        const text = el.textContent.toLowerCase();
        return text.includes('important dates') && el.querySelector('ul, ol');
    });
    const feeUl = Array.from(doc.querySelectorAll('td, th')).find(el => {
        const text = el.textContent.toLowerCase();
        return text.includes('application fee') && el.querySelector('ul, ol');
    });
    const ageTd = Array.from(doc.querySelectorAll('td, th')).find(el => {
        const text = el.textContent.toLowerCase();
        return text.includes('age limit') && (text.includes('minimum') || text.includes('maximum') || el.querySelector('ul, ol'));
    });

    // Strategy 1: Parse from specific table cells if found
    if (datesUl) {
        const items = Array.from(datesUl.querySelectorAll('li')).map(li => li.textContent.trim());
        items.forEach(item => {
            const itemLower = item.toLowerCase();
            const val = getValueAfterSeparator(item);
            if (itemLower.includes('application begin') || itemLower.includes('apply online begin')) {
                applicationBegin = val;
            } else if (itemLower.includes('last date for apply online') || itemLower.includes('last date for apply') || itemLower.includes('last date for registration')) {
                lastDate = val;
            } else if (itemLower.includes('exam date') && !itemLower.includes('admit') && !itemLower.includes('syllabus')) {
                examDate += (examDate ? ' | ' : '') + item;
            } else if (itemLower.includes('admit card available') || itemLower.includes('admit card date')) {
                admitCardDate = val;
            }
        });
    }

    if (feeUl) {
        const items = Array.from(feeUl.querySelectorAll('li')).map(li => li.textContent.trim());
        items.forEach(item => {
            const itemLower = item.toLowerCase();
            const val = getValueAfterSeparator(item);
            if (itemLower.includes('general / obc') || itemLower.includes('general/obc') || itemLower.includes('general/ obc') || itemLower.includes('general /obc') || (itemLower.includes('general') && itemLower.includes('ews'))) {
                feeGeneral = val;
            } else if (itemLower.includes('sc / st') || itemLower.includes('sc/st') || itemLower.includes('sc/ st') || itemLower.includes('sc /st')) {
                feeSCST = val;
            } else if (itemLower.includes('female') && (itemLower.includes('all category') || itemLower.includes('candidate'))) {
                feeFemale = val;
            }
        });
    }

    if (ageTd) {
        const items = Array.from(ageTd.querySelectorAll('li')).map(li => li.textContent.trim());
        items.forEach(item => {
            const itemLower = item.toLowerCase();
            if (itemLower.includes('minimum age') || itemLower.includes('maximum age') || itemLower.includes('age relaxation') || itemLower.includes('age limit')) {
                ageLimitLines.push(item);
            }
        });
        if (ageLimitLines.length === 0) {
            // Try raw text split by lines
            const ageLines = ageTd.textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            ageLines.forEach(line => {
                const lineLower = line.toLowerCase();
                if (lineLower.includes('minimum age') || lineLower.includes('maximum age') || lineLower.includes('age relaxation') || lineLower.includes('age limit')) {
                    ageLimitLines.push(line);
                }
            });
        }
    }

    // Strategy 2: Fallback to line-by-line parsing if specific elements were not found
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineLower = line.toLowerCase();
        const val = getValueAfterSeparator(line);

        if ((lineLower.includes('application begin') || lineLower.includes('apply online begin')) && !applicationBegin) {
            applicationBegin = val;
        } else if ((lineLower.includes('last date for apply online') || lineLower.includes('last date for apply') || lineLower.includes('last date for registration')) && !lastDate) {
            lastDate = val;
        } else if (lineLower.includes('exam date') && !lineLower.includes('admit') && !lineLower.includes('syllabus') && !examDate) {
            examDate = line;
        } else if ((lineLower.includes('admit card available') || lineLower.includes('admit card date')) && !admitCardDate) {
            admitCardDate = val;
        }

        if ((lineLower.includes('general / obc') || lineLower.includes('general/obc') || lineLower.includes('general /ews')) && !feeGeneral) {
            feeGeneral = val;
        } else if ((lineLower.includes('sc / st') || lineLower.includes('sc/st')) && !feeSCST) {
            feeSCST = val;
        } else if (lineLower.includes('female') && (lineLower.includes('all category') || lineLower.includes('candidate')) && !feeFemale) {
            feeFemale = val;
        }

        // Age Limit
        if ((lineLower.includes('minimum age') || lineLower.includes('maximum age') || lineLower.includes('age relaxation') || lineLower.includes('age limit as on')) && ageLimitLines.length < 4) {
            if (!ageLimitLines.some(l => l.toLowerCase().includes(lineLower.substring(0, 15)))) {
                ageLimitLines.push(line);
            }
        }

        // Selection Process (only if very short and specific)
        if ((lineLower.includes('selection process') || lineLower.includes('mode of selection') || lineLower.includes('selection procedure')) && line.length < 80) {
            if (!selectionLines.includes(line)) {
                selectionLines.push(line);
            }
        }
    }

    const ageLimit = ageLimitLines.join(' | ');
    const selectionProcess = selectionLines.join(' | ');

    console.log('\n--- PARSED RESULTS ---');
    console.log('Title:', title);
    console.log('Application Begin:', applicationBegin);
    console.log('Last Date:', lastDate);
    console.log('Exam Date:', examDate);
    console.log('Admit Card Date:', admitCardDate);
    console.log('Fee General:', feeGeneral);
    console.log('Fee SC/ST:', feeSCST);
    console.log('Fee Female:', feeFemale);
    console.log('Age Limit:', ageLimit);
    console.log('Selection Process:', selectionProcess);
}

parseSarkariResult(doc);
