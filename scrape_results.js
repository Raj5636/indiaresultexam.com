const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const socialShare = require('./social_share');

const REFRESH_TOKEN = "1//0gYEx5PhcLkaiCgYIARAAGBASNwF-L9IrS1NxUmL3wSfkSP4xl_yGl9J6hh9eb5p7owD9Oq8IkQy40O5yTHIteQq7TE0ogjRmoTA";
const CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const PROJECT_ID = "india-result-exam";

// Helper to obtain fresh Access Token from OAuth refresh token
async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN
    })
  });
  
  const json = await res.json();
  if (json.access_token) {
    return json.access_token;
  }
  throw new Error('Failed to refresh access token: ' + JSON.stringify(json));
}

// Global Branding Cleaner: Replaces Sarkari Result with India Result Exam
function cleanBranding(text) {
  if (!text) return '';
  let cleaned = String(text);
  cleaned = cleaned.replace(/sarkari\s*result/gi, 'India Result Exam');
  cleaned = cleaned.replace(/sarkariresult\.com\.cm/gi, 'indiaresultexam.com');
  cleaned = cleaned.replace(/sarkariresult\.com/gi, 'indiaresultexam.com');
  cleaned = cleaned.replace(/sarkariresult/gi, 'indiaresultexam');
  cleaned = cleaned.replace(/©\s*IndiaResultExam\.Com/gi, '© IndiaResultExam.Com');
  cleaned = cleaned.replace(/India Result Exam©\s*:/gi, 'India Result Exam© :');
  return cleaned;
}

// Check if job exists by Source URL or Title and return its data
async function findExistingJob(title, sourceUrl, accessToken) {
  try {
    // Clean title for better matching (ignore case and extra spaces)
    const cleanTitle = title.trim();

    // 1. Try finding by sourceUrl first (most reliable)
    if (sourceUrl) {
      const urlRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'latest_jobs' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'sourceUrl' },
                op: 'EQUAL',
                value: { stringValue: sourceUrl }
              }
            },
            limit: 1
          }
        })
      });
      const urlResults = await urlRes.json();
      const urlMatch = urlResults.find(r => r.document);
      if (urlMatch) {
        return {
          path: urlMatch.document.name,
          data: urlMatch.document.fields
        };
      }
    }

    // 2. Fallback to title search (EQUAL check)
    const titleRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'latest_jobs' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'title' },
              op: 'EQUAL',
              value: { stringValue: cleanTitle }
            }
          },
          limit: 1
        }
      })
    });
    const titleResults = await titleRes.json();
    const titleMatch = titleResults.find(r => r.document);
    if (titleMatch) {
      return {
        path: titleMatch.document.name,
        data: titleMatch.document.fields
      };
    }
    return null;
  } catch (err) {
    console.error('Error finding existing job:', err);
    return null;
  }
}

// Check if job with title already exists in database using runQuery REST API (Legacy)
async function checkJobExists(title, accessToken) {
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'latest_jobs' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'title' },
            op: 'EQUAL',
            value: { stringValue: title }
          }
        },
        limit: 1
      }
    })
  });
  
  if (!res.ok) {
    throw new Error('Query failed: ' + res.statusText);
  }
  
  const results = await res.json();
  const match = results.find(r => r.document);
  return match ? match.document.name : null;
}

// Delete job document from Firestore by path
async function deleteFromFirestore(docPath, accessToken) {
  const res = await fetch(`https://firestore.googleapis.com/v1/${docPath}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return res.ok;
}

// Convert JSON data to Firestore REST fields schema
function toFirestoreValue(val) {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    return { mapValue: { fields: toFirestoreFields(val) } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      fields[key] = toFirestoreValue(obj[key]);
    }
  }
  return fields;
}

// Parse textual postDate or startDate to Date object
function parsePostDate(postDateStr) {
  if (!postDateStr) return new Date();
  try {
    let clean = String(postDateStr).replace(/post\s+date\s*\/|post\s+date\s*:/i, '').replace(/\s+/g, ' ').trim();
    
    let datePart = clean;
    let timePart = '';
    
    if (clean.includes('|')) {
      const parts = clean.split('|');
      datePart = parts[0].trim();
      timePart = parts[1] ? parts[1].trim() : '';
    }
    
    const dateWords = datePart.split(/[\s,\-/]+/);
    if (dateWords.length >= 3) {
      let day = parseInt(dateWords[0]);
      let monthStr = dateWords[1].toLowerCase();
      let year = parseInt(dateWords[2]);
      
      if (dateWords[0].length === 4) {
        year = parseInt(dateWords[0]);
        monthStr = dateWords[1].toLowerCase();
        day = parseInt(dateWords[2]);
      }
      
      const months = {
        jan: 0, january: 0,
        feb: 1, february: 1,
        mar: 2, march: 2,
        apr: 3, april: 3,
        may: 4,
        jun: 5, june: 5,
        jul: 6, july: 6,
        aug: 7, august: 7,
        sep: 8, september: 8,
        oct: 9, october: 9,
        nov: 10, november: 10,
        dec: 11, december: 11
      };
      
      let month = 0;
      if (months[monthStr.substring(0, 3)] !== undefined) {
        month = months[monthStr.substring(0, 3)];
      } else {
        const numMonth = parseInt(monthStr);
        if (!isNaN(numMonth) && numMonth >= 1 && numMonth <= 12) {
          month = numMonth - 1;
        }
      }
      
      let hours = 12;
      let minutes = 0;
      
      if (timePart) {
        const timeMatch = timePart.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeMatch) {
          hours = parseInt(timeMatch[1]);
          minutes = parseInt(timeMatch[2]);
          const ampm = timeMatch[3];
          if (ampm) {
            if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
          }
        }
      }
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 2000 && year < 2100) {
        return new Date(year, month, day, hours, minutes);
      }
    }
  } catch (e) {
    console.error('Failed to parse postDate:', postDateStr, e);
  }
  return new Date();
}

// Helper to check if a date is older than today
function isDateBeforeToday(date) {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const postDate = new Date(date);
  postDate.setHours(0, 0, 0, 0);
  return postDate < today;
}

// Helper to check if a date is older than N days (kept for backward compatibility)
function isTooOld(date, maxDays = 30) {
  if (!date) return false;
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > maxDays;
}

// Save job data to Firestore via POST (create) or PATCH (update) request
async function saveToFirestore(data, accessToken, existingDocId = null, existingData = null) {
  let createdAtDate = new Date();
  if (data.postDate) {
    createdAtDate = parsePostDate(data.postDate);
  } else if (data.applicationBegin) {
    createdAtDate = parsePostDate(data.applicationBegin);
  }

  // Determine approval status
  let approvedStatus = false;
  if (existingData) {
    // If we have existing data, preserve its approval status
    approvedStatus = existingData.approved?.booleanValue ?? false;
  }

  // If post is already approved, skip updating to preserve manual edits
  if (existingDocId && approvedStatus) {
    console.log(`  [SKIP] Post is already approved. Skipping update to preserve manual edits.`);
    return existingDocId;
  }

  const fields = toFirestoreFields({
    ...data,
    createdAt: createdAtDate,
    updatedAt: new Date(),
    approved: approvedStatus
  });

  let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/latest_jobs`;
  let method = 'POST';

  if (existingDocId) {
    url += `/${existingDocId}`;
    method = 'PATCH';
  }

  const res = await fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ fields })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Write failed: ${res.statusText} - ${errText}`);
  }
  const result = await res.json();
  return result.name.split('/').pop();
}

// Extract organization name from title
function extractOrg(title) {
  let org = title
    .replace(/Online Form.*/i, '')
    .replace(/Recruitment.*/i, '')
    .replace(/Apply Online.*/i, '')
    .replace(/Vacancy.*/i, '')
    .replace(/Latest Jobs.*/i, '')
    .replace(/Constable.*/i, 'Constable')
    .replace(/Admission.*/i, '')
    .replace(/Admit Card.*/i, '')
    .replace(/Result.*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return org.replace(/(\s+Various\s+Posts.*|\s+Post.*)$/i, '').trim() || title;
}

// Generate the beautiful HTML table layout
function createProfessionalTable(data) {
  const {
    title = '',
    postName = '',
    totalPosts = 'Various',
    qualification = 'Various Posts',
    startDate = '[Start Date]',
    lastDate = '[Last Date]',
    examDate = '',
    admitCardDate = '',
    feeGeneral = '',
    feeSCST = '',
    feeFemale = '',
    ageLimit = '',
    selectionProcess = '',
    recruitmentPosts = [],
    links = [],
    organization = '',
    categoryVacancyHTML = '',
    postDate = ''
  } = data;

  let postDateFormatted = postDate;
  if (!postDateFormatted) {
    const currentDateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const currentTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    postDateFormatted = `${currentDateStr} | ${currentTimeStr}`;
  }
  
  const titleBlockHTML = `
    <div class="sarkari-title-block">
      <div class="sarkari-title-row">
        <div class="sarkari-title-label">Post Date / Update :</div>
        <div class="sarkari-title-value">${postDateFormatted}</div>
      </div>
      <div class="sarkari-title-row">
        <div class="sarkari-title-label">Short Information :</div>
        <div class="sarkari-title-value">${organization ? organization : 'Recruitment Board'} has released the notification / results for the ${postName}. Candidates who appeared in the exam or are registered can download their result and check status below.</div>
      </div>
    </div>
  `;

  const commissionText = organization || 'Combined Recruitment Board';
  const advtNoValue = data.advtNo || '07-Exam/2026';
  const headerAdvtText = `${commissionText} Advt No. ${advtNoValue} : Short Details of Notification`;
  
  const datesList = [];
  if (startDate) datesList.push(`<li>Application Begin : <strong>${startDate}</strong></li>`);
  if (lastDate) datesList.push(`<li>Last Date for Apply Online : <span class="sarkari-bold-red-val">${lastDate}</span></li>`);
  if (examDate) datesList.push(`<li>Exam Date : <strong>${examDate}</strong></li>`);
  if (admitCardDate) datesList.push(`<li>Admit Card Available : <strong>${admitCardDate}</strong></li>`);
  const datesHTML = datesList.length > 0 ? `<ul class="sarkari-bullet-list">${datesList.join('')}</ul>` : '';

  const feesList = [];
  if (data.feeRows && Array.isArray(data.feeRows) && data.feeRows.length > 0) {
    data.feeRows.forEach(f => {
      feesList.push(`<li>${f.category} : <strong>${f.amount}</strong></li>`);
    });
  } else {
    if (feeGeneral) feesList.push(`<li>General / OBC / EWS : <strong>${feeGeneral}</strong></li>`);
    if (feeSCST) feesList.push(`<li>SC / ST : <strong>${feeSCST}</strong></li>`);
    if (feeFemale) feesList.push(`<li>All Category Female : <strong>${feeFemale}</strong></li>`);
  }
  const feesHTML = feesList.length > 0 ? `<ul class="sarkari-bullet-list">${feesList.join('')}</ul>` : '';

  const masterTableHTML = `
    <table class="sarkari-master-table">
      <thead>
        <tr>
          <th colspan="2" class="sarkari-cell-center" style="border: 1px solid #128807; padding: 12px; background-color: #ffffff;">
            <div class="sarkari-text-magenta" style="font-size: 18px; margin-bottom: 6px;">${commissionText}</div>
            <div class="sarkari-text-green" style="font-size: 20px; margin-bottom: 6px;">${postName}</div>
            <div class="sarkari-text-magenta" style="font-size: 15px; margin-bottom: 8px;">${headerAdvtText}</div>
            <div><a href="https://indiaresultexam.com" target="_blank" class="sarkari-text-red" style="text-decoration: underline; font-size: 15px;">India Result Exam© : IndiaResultExam.Com Official</a></div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="width: 50%;">
            <div class="sarkari-text-green sarkari-cell-center" style="font-size: 17px; margin-bottom: 8px;">Important Dates</div>
            ${datesHTML}
          </td>
          <td style="width: 50%;">
            <div class="sarkari-text-green sarkari-cell-center" style="font-size: 17px; margin-bottom: 8px;">Application Fee</div>
            ${feesHTML || '<ul class="sarkari-bullet-list"><li>Result Announced Successfully</li></ul>'}
            <div style="font-size: 13px; margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 8px; color: #333;">
              <strong>No Application Fee:</strong> Check and download your Exam Results, Marks, Cutoff, and Score Card completely free of charge.
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  `;

  const ageLimitTextHTML = ageLimit 
    ? `
      <table class="sarkari-master-table">
        <thead>
          <tr>
            <th class="sarkari-cell-center" style="background-color: #ffffff; padding: 12px;">
              <span class="sarkari-text-green" style="font-size: 16px;">${commissionText} Notification 2026 : </span>
              <span class="sarkari-text-magenta" style="font-size: 16px;">Age Limit Criteria</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <ul class="sarkari-bullet-list">
                ${ageLimit.split('|').map(s => s.trim()).filter(s => s.length > 0).map(item => {
                  if (item.toLowerCase().includes('minimum age')) {
                    const val = item.toLowerCase().split('minimum age')[1].replace(/^[:\s\-]+/g, '').trim();
                    return `<li>Minimum Age : <strong>${val}</strong></li>`;
                  } else if (item.toLowerCase().includes('maximum age')) {
                    const val = item.toLowerCase().split('maximum age')[1].replace(/^[:\s\-]+/g, '').trim();
                    return `<li>Maximum Age : <strong>${val}</strong></li>`;
                  } else if (item.includes(':')) {
                    const parts = item.split(':');
                    return `<li>${parts[0].trim()} : <strong>${parts[1].trim()}</strong></li>`;
                  }
                  return `<li>${item}</li>`;
                }).join('')}
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    `
    : '';

  let vacancyHTML = '';
  if (recruitmentPosts && recruitmentPosts.length > 0) {
    const postRows = recruitmentPosts.map(post => {
      const eligibilityList = post.eligibility 
        ? post.eligibility.split('|').map(e => `<li>${e.trim()}</li>`).join('')
        : '<li>Bachelor Degree in Any Stream from Any Recognized University.</li>';
        
      return `
        <tr>
          <td class="sarkari-cell-center" style="font-weight: bold;">${post.postName}</td>
          <td class="sarkari-cell-center" style="font-weight: bold; color: #28a745;">${post.totalPost}</td>
          <td>
            <ul class="sarkari-bullet-list" style="margin: 0; padding-left: 18px;">
              ${eligibilityList}
            </ul>
          </td>
        </tr>
      `;
    }).join('');

    vacancyHTML = `
      <table class="sarkari-master-table">
        <thead>
          <tr>
            <th colspan="3" class="sarkari-cell-center" style="background-color: #ffffff; padding: 12px;">
              <span class="sarkari-text-magenta" style="font-size: 16px;">${commissionText} Recruitment 2026 : </span>
              <span class="sarkari-text-green" style="font-size: 16px;">Vacancy Details Total : ${totalPosts} Post</span>
            </th>
          </tr>
          <tr style="background-color: #ffffff;">
            <th style="width: 30%; border: 1px solid #128807; font-weight: bold;" class="sarkari-cell-center">Post Name</th>
            <th style="width: 20%; border: 1px solid #128807; font-weight: bold;" class="sarkari-cell-center">Total Post</th>
            <th style="width: 50%; border: 1px solid #128807; font-weight: bold;" class="sarkari-cell-center">${commissionText} Eligibility</th>
          </tr>
        </thead>
        <tbody>
          ${postRows}
        </tbody>
      </table>
    `;
  }

  const defaultSteps = [
    `Click on the Download Result Link given below in the important links section.`,
    `Enter Your Credentials like Roll Number, Date of Birth, Registration Number, and password/captcha.`,
    `Submit details to display the exam results or selection list.`,
    `Save a digital copy or take a clear print out of the final score card for documentation and future reference.`
  ];
  
  const fillFormHTML = `
    <table class="sarkari-master-table">
      <thead>
        <tr>
          <th class="sarkari-cell-center" style="background-color: #ffffff; padding: 12px;">
            <span class="sarkari-text-green" style="font-size: 16px;">India Result Exam® : How to Check & Download ${postName} Result 2026</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <ul class="sarkari-bullet-list">
              ${defaultSteps.map(step => `<li>${step}</li>`).join('')}
            </ul>
          </td>
        </tr>
      </tbody>
    </table>
  `;

  const appsLinksList = [];
  appsLinksList.push(`
    <tr>
      <td class="sarkari-cell-center" colspan="2" style="border: 1px solid #128807; padding: 8px;">
        <span class="sarkari-text-green" style="font-size: 14px;">Download Mobile Apps for Latest Updates</span>
      </td>
    </tr>
    <tr>
      <td class="sarkari-cell-center" style="width: 50%; border: 1px solid #128807; padding: 8px;">
        <a href="https://play.google.com" target="_blank" class="sarkari-text-blue" style="text-decoration: underline;">Android Apps</a>
      </td>
      <td class="sarkari-cell-center" style="width: 50%; border: 1px solid #128807; padding: 8px;">
        <a href="https://apple.com" target="_blank" class="sarkari-text-blue" style="text-decoration: underline;">Apple IOS Apps</a>
      </td>
    </tr>
  `);

  const appsTableHTML = `
    <table class="sarkari-master-table">
      <thead>
        <tr>
          <th colspan="2" class="sarkari-cell-center" style="background-color: #ffffff; padding: 12px; border: 1px solid #128807;">
            <span class="sarkari-text-magenta" style="font-size: 15px;">Interested Candidates Can Check the Full Result and Shortlist Info Online</span>
          </th>
        </tr>
      </thead>
      <tbody>
        ${appsLinksList.join('')}
      </tbody>
    </table>
  `;

  let buttonsHTML = '<div class="link-buttons-container">';
  
  const normalizeUrl = (u) => {
    if (!u) return '#';
    const s = String(u).trim();
    if (/^https?:\/\//i.test(s)) return s;
    if (/^[\w.-]+\.[a-z]{2,}/i.test(s)) return `https://${s}`;
    return s;
  };

  const linkPriority = {
    'apply online': 1,
    'download admit card': 2,
    'download syllabus': 3,
    'download notification': 4,
    'official website': 5
  };
  const sortedLinks = [...links].sort((a, b) => {
    const nameA = String(a.name || '').toLowerCase();
    const nameB = String(b.name || '').toLowerCase();
    return (linkPriority[nameA] || 99) - (linkPriority[nameB] || 99);
  });

  sortedLinks.forEach(l => {
    if (!l) return;
    const nameStr = String(l.name || '');
    const urlStr = normalizeUrl(l.url);
    const nameStrLower = nameStr.toLowerCase();
    
    let buttonClass = 'btn-apply';
    let icon = 'fa-arrow-up-right-from-square';
    let label = nameStr;
    
    if (nameStrLower.includes('apply')) {
      buttonClass = 'btn-apply';
      icon = 'fa-arrow-up-right-from-square';
      label = 'Apply Online';
    } else if (nameStrLower.includes('notification')) {
      buttonClass = 'btn-notification';
      icon = 'fa-download';
      label = 'Download Notification';
    } else if (nameStrLower.includes('official')) {
      buttonClass = 'btn-official';
      icon = 'fa-globe';
      label = 'Official Website';
    } else if (nameStrLower.includes('syllabus')) {
      buttonClass = 'btn-syllabus';
      icon = 'fa-file-pdf';
      label = 'Download Syllabus';
    } else if (nameStrLower.includes('admit')) {
      buttonClass = 'btn-admit';
      icon = 'fa-id-card';
      label = 'Download Admit Card';
    } else if (nameStrLower.includes('result')) {
      buttonClass = 'btn-result';
      icon = 'fa-poll';
      label = 'Download Result';
    }
    
    buttonsHTML += `
      <a href="${urlStr}" target="_blank" rel="noopener noreferrer" class="professional-button ${buttonClass}">
        <i class="fa-solid ${icon}"></i> ${label}
      </a>
    `;
  });

  if (links.length === 0) {
    const applyLink = data.applyLink || '';
    const officialLink = data.officialLink || '';
    if (applyLink) {
      buttonsHTML += `
        <a href="${normalizeUrl(applyLink)}" target="_blank" rel="noopener noreferrer" class="professional-button btn-apply">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Check Result / Apply
        </a>
      `;
    }
    if (officialLink) {
      buttonsHTML += `
        <a href="${normalizeUrl(officialLink)}" target="_blank" rel="noopener noreferrer" class="professional-button btn-official">
          <i class="fa-solid fa-globe"></i> Official Website
        </a>
      `;
    }
  }
  
  buttonsHTML += '</div>';

  const linksSectionHTML = `
    ${appsTableHTML}
    <div style="height:15px"></div>
    ${buttonsHTML}
  `;

  return `
    <div class="sarkari-container">
      ${titleBlockHTML}
      ${masterTableHTML}
      ${ageLimitTextHTML}
      ${vacancyHTML}
      ${categoryVacancyHTML ? `<div class="sarkari-category-table-wrapper">${categoryVacancyHTML}</div><div style="height:12px"></div>` : ''}
      ${fillFormHTML}
      ${linksSectionHTML}
    </div>
  `.trim();
}

// Clean category-wise caste tables
function cleanCategoryTable(scrapedTable, commissionText) {
  if (!scrapedTable) return '';
  const rows = Array.from(scrapedTable.querySelectorAll('tr'));
  if (rows.length === 0) return '';
  
  let headerRowsHTML = '';
  let bodyRowsHTML = '';
  const firstRowCells = Array.from(rows[0].querySelectorAll('th, td'));
  const isTitleRow = firstRowCells.length === 1 || firstRowCells.some(c => {
    const txt = c.textContent.toLowerCase();
    return txt.includes('category') || txt.includes('caste') || txt.includes('caste wise') || txt.includes('category wise');
  });

  let startIndex = 0;
  if (isTitleRow) {
    const titleText = firstRowCells[0].textContent.trim();
    headerRowsHTML += `<tr><th colspan="${firstRowCells[0].colSpan || 7}" class="sarkari-cell-center">${titleText}</th></tr>`;
    startIndex = 1;
  } else {
    const nextRowCells = rows[startIndex] ? Array.from(rows[startIndex].querySelectorAll('th, td')) : [];
    const colCount = nextRowCells.length || 7;
    headerRowsHTML += `<tr><th colspan="${colCount}" class="sarkari-cell-center">${commissionText ? commissionText + ' ' : ''}Category Wise Details</th></tr>`;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const cells = Array.from(row.querySelectorAll('th, td'));
    if (cells.length === 0) continue;

    const isHeaderRow = cells.some(c => {
      const txt = c.textContent.toLowerCase().trim();
      return txt === 'ur' || txt === 'obc' || txt === 'sc' || txt === 'st' || txt === 'ews' || txt === 'general' || txt === 'gen';
    });

    if (isHeaderRow) {
      const headerCellsHTML = cells.map(cell => {
        const txt = cell.textContent.trim();
        const colSpanAttr = cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : '';
        const rowSpanAttr = cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : '';
        return `<th class="sarkari-cell-center"${colSpanAttr}${rowSpanAttr}>${txt}</th>`;
      }).join('');
      headerRowsHTML += `<tr>${headerCellsHTML}</tr>`;
    } else {
      const cellsHTML = cells.map((cell, idx) => {
        const txt = cell.textContent.trim();
        const alignClass = idx === 0 ? 'sarkari-cell-left' : 'sarkari-cell-center';
        const weightStyle = idx === 0 ? 'font-weight: bold;' : '';
        const colSpanAttr = cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : '';
        const rowSpanAttr = cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : '';
        return `<td class="${alignClass}" style="${weightStyle}"${colSpanAttr}${rowSpanAttr}>${txt}</td>`;
      }).join('');
      bodyRowsHTML += `<tr>${cellsHTML}</tr>`;
    }
  }

  return `<table class="sarkari-table"><thead>${headerRowsHTML}</thead><tbody>${bodyRowsHTML}</tbody></table>`.trim();
}

// Scrape details from a single page URL
async function scrapeJobDetails(url, category) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Title
    let title = '';
    const h1 = doc.querySelector('h1');
    if (h1) title = h1.textContent.trim();
    if (!title) {
      const titleTag = doc.querySelector('title');
      if (titleTag) title = titleTag.textContent.replace('Sarkari Result', '').replace('Online Form', '').trim();
    }
    title = (title || 'New Result Post').replace(/\s+/g, ' ').trim();
    const organization = extractOrg(title);

    // Parse actual Post Date from page
    let postDate = '';
    doc.querySelectorAll('td, th, p, div, span, b, strong').forEach(el => {
      const text = el.textContent.trim();
      if (/post\s+date\s*\/|post\s+date\s*:/i.test(text)) {
        const parts = text.split(/[:]/);
        if (parts.length > 1) {
          const val = parts.slice(1).join(':').trim().replace(/\s+/g, ' ');
          if (val.length > 5 && val.length < 50 && !postDate) {
            postDate = val;
          }
        }
      }
    });

    // Dynamic state parsing
    let detectedState = 'ALL';
    const titleAndUrl = `${title} ${url}`.toLowerCase();
    if (titleAndUrl.includes('upsssc') || titleAndUrl.includes('uttar pradesh') || titleAndUrl.includes('up police') || titleAndUrl.includes('allahabad high court') || titleAndUrl.includes('uppbpb')) {
      detectedState = 'UP';
    } else if (titleAndUrl.includes('bihar') || titleAndUrl.includes('bssc') || titleAndUrl.includes('bpsc')) {
      detectedState = 'Bihar';
    } else if (titleAndUrl.includes('madhya pradesh') || titleAndUrl.includes('mppsc') || titleAndUrl.includes('mp police')) {
      detectedState = 'MP';
    } else if (titleAndUrl.includes('delhi') || titleAndUrl.includes('dsssb') || titleAndUrl.includes('dssb')) {
      detectedState = 'Delhi';
    } else if (titleAndUrl.includes('rajasthan') || titleAndUrl.includes('rpsc') || titleAndUrl.includes('rsmssb')) {
      detectedState = 'Rajasthan';
    } else if (titleAndUrl.includes('uttarakhand') || titleAndUrl.includes('uttrakhand') || titleAndUrl.includes('ukpsc')) {
      detectedState = 'Uttrakhand';
    } else if (titleAndUrl.includes('haryana') || titleAndUrl.includes('hariyana') || titleAndUrl.includes('hssc')) {
      detectedState = 'Hariyana';
    } else if (titleAndUrl.includes('gujarat') || titleAndUrl.includes('gujrat') || titleAndUrl.includes('gpsc')) {
      detectedState = 'Gujrat';
    } else if (titleAndUrl.includes('army') || titleAndUrl.includes('navy') || titleAndUrl.includes('air force') || titleAndUrl.includes('coast guard') || titleAndUrl.includes('armed forces') || titleAndUrl.includes('nda') || titleAndUrl.includes('cds') || titleAndUrl.includes('agniveer') || titleAndUrl.includes('ssb ') || titleAndUrl.includes('bsf') || titleAndUrl.includes('crpf') || titleAndUrl.includes('itbp') || titleAndUrl.includes('cisf')) {
      detectedState = 'Armed Forces';
    } else if (titleAndUrl.includes('railway') || titleAndUrl.includes('rrb') || titleAndUrl.includes('metro') || titleAndUrl.includes('loco pilot') || titleAndUrl.includes('ntpc')) {
      detectedState = 'Railway';
    } else if (titleAndUrl.includes('ssc') || titleAndUrl.includes('cgl') || titleAndUrl.includes('chsl') || titleAndUrl.includes('mts') || titleAndUrl.includes('cpo')) {
      detectedState = 'SSC';
    } else if (titleAndUrl.includes('ibps') || titleAndUrl.includes('sbi') || titleAndUrl.includes('bank') || titleAndUrl.includes('rbi') || titleAndUrl.includes('lic')) {
      detectedState = 'Banking';
    }

    let applicationBegin = '';
    let lastDate = '';
    let examDate = '';
    let admitCardDate = '';
    let feeGeneral = '';
    let feeSCST = '';
    let feeFemale = '';
    let ageLimitLines = [];
    let selectionLines = [];

    const cellsText = Array.from(doc.querySelectorAll('td, th')).find(el => {
      const text = el.textContent.toLowerCase();
      return text.includes('important dates') && el.querySelector('ul, ol');
    });

    const feeText = Array.from(doc.querySelectorAll('td, th')).find(el => {
      const text = el.textContent.toLowerCase();
      return text.includes('application fee') && el.querySelector('ul, ol');
    });

    const ageText = Array.from(doc.querySelectorAll('td, th')).find(el => {
      const text = el.textContent.toLowerCase();
      return text.includes('age limit') && (text.includes('minimum') || text.includes('maximum') || el.querySelector('ul, ol'));
    });

    const parseKeyValue = (str) => {
      const sep = str.includes(':') ? ':' : '-';
      if (str.includes(sep)) {
        return str.split(sep).slice(1).join(sep).trim();
      }
      return str.trim();
    };

    if (cellsText) {
      Array.from(cellsText.querySelectorAll('li')).forEach(li => {
        const txt = li.textContent.trim();
        const low = txt.toLowerCase();
        const val = parseKeyValue(txt);
        if (low.includes('begin') || low.includes('start')) applicationBegin = val;
        else if (low.includes('last date')) lastDate = val;
        else if (low.includes('exam date')) examDate = val;
        else if (low.includes('admit card')) admitCardDate = val;
      });
    }

    if (feeText) {
      Array.from(feeText.querySelectorAll('li')).forEach(li => {
        const txt = li.textContent.trim();
        const low = txt.toLowerCase();
        const val = parseKeyValue(txt);
        if (low.includes('general') || low.includes('obc') || low.includes('ews')) feeGeneral = val;
        else if (low.includes('sc') || low.includes('st') || low.includes('ph')) feeSCST = val;
        else if (low.includes('female')) feeFemale = val;
      });
    }

    if (ageText) {
      Array.from(ageText.querySelectorAll('li')).forEach(li => {
        const low = li.textContent.toLowerCase();
        if (low.includes('minimum') || low.includes('maximum') || low.includes('age limit') || low.includes('relaxation')) {
          ageLimitLines.push(li.textContent.trim());
        }
      });
    }

    const mainTable = doc.querySelector('table');
    doc.querySelectorAll('table').forEach(table => {
      const tempDiv = doc.createElement('div');
      tempDiv.innerHTML = table.innerHTML;
      tempDiv.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      tempDiv.querySelectorAll('tr').forEach(tr => tr.before('\n'));
      tempDiv.querySelectorAll('li').forEach(li => { li.before('\n'); li.after('\n'); });
      tempDiv.querySelectorAll('p').forEach(p => { p.before('\n'); p.after('\n'); });
      
      const lines = tempDiv.textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lines.forEach(line => {
        const low = line.toLowerCase();
        const val = parseKeyValue(line);
        if ((low.includes('application begin') || low.includes('apply online begin')) && !applicationBegin) applicationBegin = val;
        if ((low.includes('last date for apply online') || low.includes('last date for registration') || low.includes('last date for apply')) && !lastDate) lastDate = val;
        if (low.includes('exam date') && !low.includes('admit') && !examDate) examDate = val;
        if ((low.includes('admit card available') || low.includes('admit card date')) && !admitCardDate) admitCardDate = val;

        if ((low.includes('general / obc') || low.includes('general/obc') || low.includes('general /ews') || low.includes('general/obc/ews')) && !feeGeneral) feeGeneral = val;
        if ((low.includes('sc / st') || low.includes('sc/st')) && !feeSCST) feeSCST = val;
        if (low.includes('female') && (low.includes('all category') || low.includes('candidate')) && !feeFemale) feeFemale = val;

        if ((low.includes('minimum age') || low.includes('maximum age') || low.includes('age relaxation') || low.includes('age limit as on')) && ageLimitLines.length < 4) {
          if (!ageLimitLines.some(old => old.toLowerCase().includes(low.substring(0, 15)))) {
            ageLimitLines.push(line);
          }
        }
        if ((low.includes('selection process') || low.includes('mode of selection') || low.includes('selection procedure')) && line.length < 80) {
          if (!selectionLines.includes(line)) selectionLines.push(line);
        }
      });
    });

    const cleanStr = (s) => s.replace(/^[:\s\-]+/g, '').replace(/[:\s]+$/g, '').replace(/\s+/g, ' ').trim();
    applicationBegin = cleanStr(applicationBegin);
    lastDate = cleanStr(lastDate);
    examDate = cleanStr(examDate);
    const ageLimit = cleanStr(ageLimitLines.join(' | '));
    const selectionProcess = cleanStr(selectionLines.join(' | '));
    
    // Force fee values to be free for Results
    feeGeneral = '0/- (Free)';
    feeSCST = '0/- (Free)';
    feeFemale = '0/- (Free)';

    // Scrape category vacancy table and recruitment posts
    let categoryVacancyHTML = '';
    let recruitmentPosts = [];

    // Scan all tables for vacancy and category details
    doc.querySelectorAll('table').forEach(table => {
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
            
            // Title row header
            const titleText = cells[0].textContent.trim();
            categoryHeaderHTML += `<tr><th colspan="12" class="sarkari-cell-center">${titleText}</th></tr>`;
            continue;
          }
          if (text.includes('vacancy details') || text.includes('post details') || (text.includes('vacancy') && text.includes('total'))) {
            inVacancySection = true;
            vacancyHeaderParsed = false;
            inCategorySection = false;
            continue;
          }
          // Any other single cell row breaks the sections
          inVacancySection = false;
          inCategorySection = false;
        }

        // Process Vacancy section rows
        if (inVacancySection) {
          if (cells.length >= 2) {
            const cellTexts = cells.map(c => c.textContent.trim().replace(/\s+/g, ' '));
            const isHeaderRow = cellTexts.some(c => c.toLowerCase() === 'post name' || c.toLowerCase() === 'total post' || c.toLowerCase() === 'name of post');
            if (isHeaderRow && !vacancyHeaderParsed) {
              vacancyHeaderParsed = true;
            } else if (vacancyHeaderParsed) {
              if (!recruitmentPosts.some(p => p.postName === cellTexts[0])) {
                let nLink = '';
                const anchor = row.querySelector('a');
                if (anchor) {
                  const rawHref = anchor.getAttribute('href');
                  if (rawHref) {
                    nLink = rawHref.startsWith('http') ? rawHref : `https://www.sarkariresult.com/${rawHref.replace(/^\//, '')}`;
                  }
                }
                recruitmentPosts.push({
                  postName: cellTexts[0] || '',
                  totalPost: cellTexts[1] || '',
                  eligibility: cellTexts[2] || 'See notification details.',
                  startDate: applicationBegin,
                  lastDate: lastDate,
                  notificationLink: nLink
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
                return `<th class="sarkari-cell-center"${colSpanAttr}${rowSpanAttr}>${txt}</th>`;
              }).join('');
              categoryHeaderHTML += `<tr>${headerCellsHTML}</tr>`;
            } else {
              const cellsHTML = cells.map((cell, idx) => {
                const txt = cell.textContent.trim();
                const alignClass = idx === 0 ? 'sarkari-cell-left' : 'sarkari-cell-center';
                const weightStyle = idx === 0 ? 'font-weight: bold;' : '';
                const colSpanAttr = cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : '';
                const rowSpanAttr = cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : '';
                return `<td class="${alignClass}" style="${weightStyle}"${colSpanAttr}${rowSpanAttr}>${txt}</td>`;
              }).join('');
              categoryBodyHTML += `<tr>${cellsHTML}</tr>`;
            }
          }
        }
      }

      if (categoryHeaderHTML || categoryBodyHTML) {
        categoryVacancyHTML = `<table class="sarkari-table"><thead>${categoryHeaderHTML}</thead><tbody>${categoryBodyHTML}</tbody></table>`.trim();
      }
    });

    // Fallbacks if row-based parsing failed (separate/independent tables)
    if (recruitmentPosts.length === 0) {
      doc.querySelectorAll('table').forEach(table => {
        const cells = Array.from(table.querySelectorAll('th, td')).map(el => el.textContent.toLowerCase().trim());
        const hasPostName = cells.some(c => c.includes('post name') || c.includes('name of post') || c === 'post');
        const hasTotalPost = cells.some(c => c.includes('total post') || c.includes('totalposts') || c.includes('total vacancy') || c === 'total');
        
        const casteKeywords = ['ur', 'obc', 'sc', 'st', 'ews', 'general', 'gen', 'bc'];
        const matchingCasteCount = cells.filter(c => 
          casteKeywords.includes(c) || c === 'gen' || c === 'ur' || c.startsWith('obc') || c.startsWith('ews')
        ).length;
        
        const isCategoryTable = matchingCasteCount >= 2;

        if (hasPostName && hasTotalPost && !isCategoryTable) {
          table.querySelectorAll('tr').forEach(row => {
            const tds = Array.from(row.querySelectorAll('td'));
            if (tds.length >= 2) {
              const pName = tds[0].textContent.trim();
              const pTotal = tds[1].textContent.trim();
              const pEligibility = tds[2] ? tds[2].textContent.trim() : '';

              if (pName.toLowerCase().includes('post name') || pName.toLowerCase().includes('name of post') || pName.toLowerCase() === 'post' || pName.toLowerCase().includes('important dates')) return;

              let nLink = '';
              const anchor = row.querySelector('a');
              if (anchor) {
                const rawHref = anchor.getAttribute('href');
                if (rawHref) {
                  nLink = rawHref.startsWith('http') ? rawHref : `https://www.sarkariresult.com/${rawHref.replace(/^\//, '')}`;
                }
              }

              if (pName && pTotal && !recruitmentPosts.some(p => p.postName === pName)) {
                recruitmentPosts.push({
                  postName: pName.replace(/\s+/g, ' '),
                  totalPost: pTotal.replace(/\s+/g, ' '),
                  eligibility: pEligibility.replace(/\s+/g, ' '),
                  startDate: applicationBegin,
                  lastDate: lastDate,
                  notificationLink: nLink
                });
              }
            }
          });
        }
      });
    }

    if (!categoryVacancyHTML) {
      let categoryTableFound = null;
      doc.querySelectorAll('table').forEach(table => {
        const cells = Array.from(table.querySelectorAll('th, td')).map(el => el.textContent.toLowerCase().trim());
        const isMaster = cells.some(c => c.includes('important dates') || c.includes('application fee'));
        
        const casteKeywords = ['ur', 'obc', 'sc', 'st', 'ews', 'general', 'gen', 'bc', 'sbc'];
        const matchingCasteCount = cells.filter(c => 
          casteKeywords.includes(c) || c === 'gen' || c === 'ur' || c.startsWith('obc') || c.startsWith('ews')
        ).length;

        if (matchingCasteCount >= 2 && !isMaster && !categoryTableFound) {
          categoryTableFound = table;
        }
      });

      if (categoryTableFound) {
        categoryVacancyHTML = cleanCategoryTable(categoryTableFound, organization);
      }
    }

    let links = [];
    let applyLink = '';
    let officialLink = '';

    doc.querySelectorAll('a').forEach(anchor => {
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      const baseDomain = url.toLowerCase().includes('sarkariresult.com.cm') ? 'https://www.sarkariresult.com.cm' : 'https://www.sarkariresult.com';
      const absUrl = href.startsWith('http') ? href : `${baseDomain}/${href.replace(/^\//, '')}`;
      const text = anchor.textContent.trim().replace(/\s+/g, ' ');
      const lowText = text.toLowerCase();
      const parent = anchor.parentElement ? anchor.parentElement.textContent.toLowerCase() : '';
      const row = anchor.closest('tr');
      const rowText = row ? row.textContent.toLowerCase() : '';

      let linkName = '';
      if (rowText.includes('apply online') || lowText.includes('apply online') || parent.includes('apply online')) {
        linkName = 'Apply Online';
        if (!applyLink) applyLink = absUrl;
      } else if (rowText.includes('download notification') || lowText.includes('notification') || parent.includes('notification')) {
        linkName = 'Download Notification';
      } else if (rowText.includes('official website') || lowText.includes('official website') || parent.includes('official website')) {
        linkName = 'Official Website';
        if (!officialLink) officialLink = absUrl;
      } else if (rowText.includes('download syllabus') || lowText.includes('syllabus') || parent.includes('syllabus')) {
        linkName = 'Download Syllabus';
      } else if (rowText.includes('download admit card') || lowText.includes('admit card') || parent.includes('admit card')) {
        linkName = 'Download Admit Card';
      } else if (rowText.includes('download result') || lowText.includes('download result') || lowText.includes('check result') || parent.includes('download result') || lowText.includes('result')) {
        linkName = 'Download Result';
      }

      if (linkName && !links.some(l => l.name === linkName)) {
        links.push({ name: linkName, url: absUrl });
      }
    });

    if (applyLink && !links.some(l => l.name === 'Apply Online')) links.push({ name: 'Apply Online', url: applyLink });
    if (officialLink && !links.some(l => l.name === 'Official Website')) links.push({ name: 'Official Website', url: officialLink });

    links = links.filter((value, index, self) =>
      self.findIndex(t => t.name === value.name) === index
    );

    const totalPostsNum = recruitmentPosts.reduce((acc, curr) => acc + (parseInt(curr.totalPost) || 0), 0) || 'Various';
    
    const feeRows = [];
    if (feeGeneral) feeRows.push({ category: 'General / OBC / EWS', amount: feeGeneral });
    if (feeSCST) feeRows.push({ category: 'SC / ST / PH', amount: feeSCST });
    if (feeFemale) feeRows.push({ category: 'All Category Female', amount: feeFemale });

    const description = createProfessionalTable({
      title,
      postName: title,
      totalPosts: totalPostsNum,
      qualification: recruitmentPosts[0]?.eligibility || 'Various Posts',
      startDate: applicationBegin,
      lastDate,
      examDate,
      admitCardDate,
      feeGeneral,
      feeSCST,
      feeFemale,
      feeRows,
      ageLimit,
      selectionProcess,
      recruitmentPosts,
      links,
      organization,
      categoryVacancyHTML,
      postDate
    });

    return {
      title,
      category,
      organization,
      state: detectedState,
      officialLink: officialLink || '',
      applyLink: applyLink || url,
      applicationBegin,
      lastDate,
      examDate,
      admitCardDate,
      feeGeneral,
      feeSCST,
      feeFemale,
      feeRows,
      ageLimit,
      selectionProcess,
      recruitmentPosts,
      links,
      description,
      categoryVacancyHTML,
      categoryVacancyRows: [],
      postDate,
      department: title,
      location: 'India',
      salary: 'As per rules',
      qualification: recruitmentPosts[0]?.eligibility || 'Various Posts',
      priority: 50,
      badge: 'Result',
      status: 'active',
      sourceUrl: url
    };

  } catch (err) {
    console.error(`Error scraping detail page ${url}:`, err);
    return null;
  }
}

// Parse command-line arguments
function parseArgs() {
  let maxItems = 100; // Default: 100 items
  
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--limit=')) {
      const limit = parseInt(arg.split('=')[1]);
      if (!isNaN(limit) && limit > 0) {
        maxItems = limit;
      }
    }
  }
  
  return { maxItems };
}

// Main crawling loop
async function main() {
  const args = parseArgs();
  const maxItems = args.maxItems;
  
  try {
    console.log('Retrieving fresh Firebase Access Token...');
    const accessToken = await getAccessToken();
    console.log('Access token successfully retrieved.');

    console.log('Fetching Sarkari Result Result page to discover active cards...');
    const pageRes = await fetch('https://www.sarkariresult.com.cm/result/');
    const pageHTML = await pageRes.text();
    const dom = new JSDOM(pageHTML);
    const doc = dom.window.document;

    const entryContent = doc.querySelector('.entry-content');
    const anchors = entryContent ? Array.from(entryContent.querySelectorAll('a')) : Array.from(doc.querySelectorAll('a'));
    
    const tasks = [];
    let discoveredSortIndex = 0;
    
    // Skip general links and media
    const skipWords = ['latest-jobs', 'admitcard', 'admit-card', 'result', 'syllabus', 'answerkey', 'contact', 'disclaimer', 'privacy', 'homepage', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'view more', 'view-more'];
    
    anchors.forEach(a => {
      let href = a.getAttribute('href') || '';
      const text = a.textContent.trim().replace(/\s+/g, ' ');
      
      if (!href || text.length <= 5) return;
      
      // Make href absolute if it's relative
      if (href.startsWith('/')) {
        href = 'https://www.sarkariresult.com.cm' + href;
      }
      
      const lowHref = href.toLowerCase();
      const lowText = text.toLowerCase();
      
      const isSelf = skipWords.some(w => lowHref.includes(`/${w}/`) || lowHref.endsWith(`/${w}`) || lowHref.endsWith(`/${w}/`) || lowText.includes(w));
      if (isSelf) return;
      
      // Skip media files
      if (lowHref.includes('.pdf') || lowHref.includes('.jpg') || lowHref.includes('.png')) return;

      // Only match result details URLs from Sarkari Result directories (like /2026/, /result/, etc.)
      const isResultUrl = (lowHref.includes('sarkariresult.com') || lowHref.includes('sarkariresult.com.cm')) && 
        !lowHref.includes('/index') &&
        !tasks.some(t => t.url === href);

      if (isResultUrl && !tasks.some(t => t.url === href)) {
        tasks.push({
          url: href,
          category: 'Result',
          label: text,
          sortIndex: discoveredSortIndex++
        });
      }
    });

    // Limit to top N items
    const finalTasks = tasks.slice(0, maxItems);
    console.log(`Discovered ${tasks.length} potential results. Selected top ${finalTasks.length} for import.`);

    let importedCount = 0;

    for (let i = 0; i < finalTasks.length; i++) {
      const task = finalTasks[i];
      console.log(`\n[${i + 1}/${finalTasks.length}] Processing: "${task.label}"`);
      
      // 1. Scrape Detail Page
      const scrapedData = await scrapeJobDetails(task.url, task.category);
      if (!scrapedData) {
        console.log(`  [FAIL] Could not scrape/parse page details.`);
        continue;
      }

      // --- FRESHNESS CHECK ---
      const postDateObj = parsePostDate(scrapedData.postDate);
      if (isDateBeforeToday(postDateObj)) {
        console.log(`  [SKIP] Result is older than today (${scrapedData.postDate}). Skipping...`);
        continue;
      }
      scrapedData.showOnHome = true;
      scrapedData.sortIndex = task.sortIndex;
      // -----------------------

      // Apply Branding Cleaner
      scrapedData.title = cleanBranding(scrapedData.title);
      scrapedData.organization = cleanBranding(scrapedData.organization);
      scrapedData.postName = cleanBranding(scrapedData.postName);
      scrapedData.description = cleanBranding(scrapedData.description);
      if (scrapedData.recruitmentPosts) {
        scrapedData.recruitmentPosts = scrapedData.recruitmentPosts.map(p => ({
          ...p,
          postName: cleanBranding(p.postName),
          eligibility: cleanBranding(p.eligibility)
        }));
      }

      // Rewrite any internal sarkariresult links in description/apply fields to indiaresultexam
      const cleanUrl = (u) => {
        if (!u) return '#';
        let s = String(u).trim();
        if (s.toLowerCase().includes('sarkariresult.com') || s.toLowerCase().includes('sarkariresult.com.cm')) {
          const isMedia = /\.(pdf|png|jpe?g|gif|zip|docx?|xlsx?)$/i.test(s);
          if (!isMedia) {
            return 'https://indiaresultexam.com';
          }
        }
        return s;
      };

      if (scrapedData.applyLink) scrapedData.applyLink = cleanUrl(scrapedData.applyLink);
      if (scrapedData.officialLink) scrapedData.officialLink = cleanUrl(scrapedData.officialLink);
      
      if (scrapedData.links && Array.isArray(scrapedData.links)) {
        scrapedData.links = scrapedData.links.map(l => ({
          name: cleanBranding(l.name),
          url: cleanUrl(l.url)
        }));
      }

      // 2. Check if already exists in Firestore (sync data while preserving ID)
      const existingJob = await findExistingJob(scrapedData.title, scrapedData.sourceUrl, accessToken);
      let existingDocId = null;
      let existingData = null;
      if (existingJob) {
        existingDocId = existingJob.path.split('/').pop();
        existingData = existingJob.data;
        console.log(`  [SYNC] Result "${scrapedData.title}" already exists (ID: ${existingDocId}). Updating to sync latest changes...`);
      }

      // 3. Save to Firestore (Update if exists, Create if new)
      const docId = await saveToFirestore(scrapedData, accessToken, existingDocId, existingData);
      console.log(`  [SUCCESS] ${existingDocId ? 'Updated' : 'Imported'} successfully! ID: ${docId}`);
      importedCount++;

      // 4. Share to Social Media (if it is a new post, i.e., not an update)
      if (!existingDocId) {
        await socialShare.shareNewPost(scrapedData, docId);
      }
    }

    console.log(`\n========================================`);
    console.log(`Import Session Completed.`);
    console.log(`Total Scraped Links: ${finalTasks.length}`);
    console.log(`Successfully Imported: ${importedCount}`);
    console.log(`========================================`);

  } catch (err) {
    console.error('Fatal crawler execution error:', err);
  } finally {
    process.exit(0);
  }
}

main();
