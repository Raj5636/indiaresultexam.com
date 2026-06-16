const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const url = "https://www.sarkariresult.com/bank/sbi-apprentices-2026/";

async function run() {
  console.log('Fetching:', url);
  try {
    const res = await fetch(url);
    const html = await res.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    let categoryVacancyHTML = '';
    let recruitmentPosts = [];
    
    const applicationBegin = "19/05/2026";
    const lastDate = "15/06/2026";

    // Search all tables on the page for Vacancy Details and Category Wise details
    doc.querySelectorAll('table').forEach((table, idx) => {
      const rows = Array.from(table.querySelectorAll('tr'));
      let inVacancySection = false;
      let vacancyHeaderParsed = false;
      
      let inCategorySection = false;
      let categoryHeaderHTML = '';
      let categoryBodyHTML = '';
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = Array.from(row.querySelectorAll('th, td'));
        if (cells.length === 0) continue;
        
        const text = row.textContent.toLowerCase().trim();
        
        // Check section markers
        if (cells.length === 1) {
          if (text.includes('category wise') || text.includes('caste wise') || text.includes('caste-wise') || text.includes('category-wise')) {
            inCategorySection = true;
            inVacancySection = false;
            categoryHeaderHTML = '';
            categoryBodyHTML = '';
            
            const titleText = cells[0].textContent.trim();
            categoryHeaderHTML += `<tr><th colspan="12" class="sarkari-cell-center" style="text-align: center; border: 1px solid #128807;">${titleText}</th></tr>`;
            continue;
          }
          if (text.includes('vacancy details') || text.includes('post details') || (text.includes('vacancy') && text.includes('total'))) {
            inVacancySection = true;
            vacancyHeaderParsed = false;
            inCategorySection = false;
            continue;
          }
          inVacancySection = false;
          inCategorySection = false;
        }

        // Process Vacancy section rows
        if (inVacancySection) {
          if (cells.length >= 2) {
            const cellTexts = cells.map(c => c.textContent.trim().replace(/\s+/g, ' '));
            const isHeaderRow = cellTexts.some(c => c.toLowerCase() === 'post name' || c.toLowerCase() === 'total post');
            if (isHeaderRow && !vacancyHeaderParsed) {
              vacancyHeaderParsed = true;
            } else if (vacancyHeaderParsed) {
              if (!recruitmentPosts.some(p => p.postName === cellTexts[0])) {
                recruitmentPosts.push({
                  postName: cellTexts[0] || '',
                  totalPost: cellTexts[1] || '',
                  eligibility: cellTexts[2] || 'See notification details.',
                  startDate: applicationBegin,
                  lastDate: lastDate
                });
              }
            }
          }
        }
        
        // Process Category section rows
        if (inCategorySection) {
          if (cells.length >= 2) {
            const isHeaderRow = cells.some(c => {
              const txt = c.textContent.toLowerCase().trim();
              return txt === 'ur' || txt === 'obc' || txt === 'sc' || txt === 'st' || txt === 'ews' || txt === 'general' || txt === 'gen';
            });
            
            if (isHeaderRow) {
              const headerCellsHTML = cells.map(cell => {
                const txt = cell.textContent.trim();
                const colSpanAttr = cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : '';
                const rowSpanAttr = cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : '';
                return `<th class="sarkari-cell-center"${colSpanAttr}${rowSpanAttr} style="text-align: center; border: 1px solid #128807; font-weight: bold;">${txt}</th>`;
              }).join('');
              categoryHeaderHTML += `<tr>${headerCellsHTML}</tr>`;
            } else {
              const cellsHTML = cells.map((cell, idx) => {
                const txt = cell.textContent.trim();
                const alignClass = idx === 0 ? 'sarkari-cell-left' : 'sarkari-cell-center';
                const weightStyle = idx === 0 ? 'font-weight: bold;' : '';
                const colSpanAttr = cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : '';
                const rowSpanAttr = cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : '';
                return `<td class="${alignClass}" style="${weightStyle} border: 1px solid #128807;"${colSpanAttr}${rowSpanAttr}>${txt}</td>`;
              }).join('');
              categoryBodyHTML += `<tr>${cellsHTML}</tr>`;
            }
          }
        }
      }
      
      if (categoryHeaderHTML || categoryBodyHTML) {
        categoryVacancyHTML = `<table class="sarkari-category-table" style="width: 100% !important; border-collapse: collapse !important; border: 2px solid #128807 !important; margin: 20px 0 !important; background: #ffffff !important;"><thead>${categoryHeaderHTML}</thead><tbody>${categoryBodyHTML}</tbody></table>`;
      }
    });

    console.log('\n--- Extraction Results ---');
    console.log('recruitmentPosts count:', recruitmentPosts.length);
    console.log('recruitmentPosts:', JSON.stringify(recruitmentPosts, null, 2));
    console.log('\ncategoryVacancyHTML exists:', !!categoryVacancyHTML);
    if (categoryVacancyHTML) {
      console.log('categoryVacancyHTML (first 300 chars):', categoryVacancyHTML.substring(0, 300));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

run();
