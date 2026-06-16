import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

let db;
let auth;
let quill;
let jobs = [];
let editingJobId = null;

// Toast Notification Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  else if (type === 'error') icon = 'fa-exclamation-circle';
  else if (type === 'warning') icon = 'fa-exclamation-triangle';

  toast.innerHTML = `
    <span class="toast-icon"><i class="fa-solid ${icon}"></i></span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);
  
  // Force layout reflow
  toast.offsetHeight;
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 450);
  }, 4000);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  if (!window.firebaseConfig) {
    showToast('Firebase configuration not found!', 'error');
    return;
  }

  try {
    const app = initializeApp(window.firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Initialize Quill Rich Editor
    initializeQuill();

    // Check Authentication
    checkAuth();
  } catch (error) {
    console.error('Firebase initialization error:', error);
    showToast('Failed to initialize connection to database.', 'error');
  }
}

function initializeQuill() {
  try {
    if (document.getElementById('quillEditor')) {
      quill = new Quill('#quillEditor', {
        theme: 'snow',
        placeholder: 'HTML description override (optional)...',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['link', 'clean']
          ]
        }
      });
    }
  } catch (e) {
    console.warn('Quill initialization error:', e);
  }
}

function checkAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const adminEmails = window.firebaseConfig.adminEmails || [];
      if (adminEmails.includes(user.email)) {
        // Authenticated admin user
        document.getElementById('navEmail').textContent = user.email;
        setupEvents();
        await loadJobs();
        await loadSiteConfig();
        
        // Check URL for edit parameter
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('edit');
        if (editId) {
          editJob(editId);
        }
      } else {
        showToast('Unauthorized account. Redirecting to login...', 'warning');
        setTimeout(() => signOut(auth).then(() => window.location.href = 'login.html'), 1500);
      }
    } else {
      window.location.href = 'login.html';
    }
  });
}

function setupEvents() {
  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      signOut(auth).then(() => {
        window.location.href = 'login.html';
      });
    });
  }

  // Dynamic row buttons
  const addPostRowBtn = document.getElementById('addPostRowBtn');
  const addLinkRowBtn = document.getElementById('addLinkRowBtn');
  const addCategoryRowBtn = document.getElementById('addCategoryRowBtn');
  const addFeeRowBtn = document.getElementById('addFeeRowBtn');
  const addCustomDateBtn = document.getElementById('addCustomDateBtn');
  
  if (addPostRowBtn) addPostRowBtn.addEventListener('click', () => addPostRow());
  if (addLinkRowBtn) addLinkRowBtn.addEventListener('click', () => addLinkRow());
  if (addCategoryRowBtn) addCategoryRowBtn.addEventListener('click', () => addCategoryVacancyRow());
  if (addFeeRowBtn) addFeeRowBtn.addEventListener('click', () => addFeeRow());
  if (addCustomDateBtn) addCustomDateBtn.addEventListener('click', () => addCustomDateRow());

  // 1-Click Import Scraper
  const sarkariImportBtn = document.getElementById('sarkariImportBtn');
  if (sarkariImportBtn) {
    sarkariImportBtn.addEventListener('click', importFromSarkariURL);
  }

  // Form submit & cancel
  const jobForm = document.getElementById('jobForm');
  const resetBtn = document.getElementById('resetBtn');
  if (jobForm) {
    jobForm.addEventListener('submit', handleFormSubmit);
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => clearForm(true));
  }

  // Search & Filters
  const searchJobsInput = document.getElementById('searchInput');
  const filterCategorySelect = document.getElementById('categoryFilter');
  const filterApprovalSelect = document.getElementById('approvalFilter');
  
  if (searchJobsInput) searchJobsInput.addEventListener('input', filterJobsList);
  if (filterCategorySelect) filterCategorySelect.addEventListener('change', filterJobsList);
  if (filterApprovalSelect) filterApprovalSelect.addEventListener('change', filterJobsList);

  // Tab switching logic
  const tabButtons = document.querySelectorAll('.admin-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      
      // Update buttons
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `tab-${tabId}`) {
          content.classList.add('active');
        }
      });
      
      // If switching to Add Post tab while NOT editing, clear form
      if (tabId === 'add-post' && !editingJobId) {
        clearForm(false);
        const formPanelTitle = document.getElementById('formPanelTitle');
        if (formPanelTitle) {
          formPanelTitle.innerHTML = '<i class="fa-solid fa-plus-circle text-primary"></i> Add New Job Post';
        }
      }
    });
  });

  // Initialize drag-and-drop sortable on container lists
  if (document.getElementById('postsContainer')) makeSortable('postsContainer');
  if (document.getElementById('linksContainer')) makeSortable('linksContainer');
  if (document.getElementById('categoryVacancyContainer')) makeSortable('categoryVacancyContainer');

  // Maintenance Toggle Event
  const maintenanceToggle = document.getElementById('maintenanceToggle');
  if (maintenanceToggle) {
    maintenanceToggle.addEventListener('change', async (e) => {
      try {
        const isEnabled = e.target.checked;
        await setDoc(doc(db, 'settings', 'siteConfig'), {
          maintenanceMode: isEnabled,
          updatedAt: serverTimestamp()
        }, { merge: true });
        showToast(`Maintenance Mode ${isEnabled ? 'Activated' : 'Deactivated'}`, isEnabled ? 'warning' : 'success');
      } catch (err) {
        console.error('Error updating maintenance mode:', err);
        showToast('Failed to update maintenance mode.', 'error');
      }
    });
  }

  // Preview Modal Close Events
  const previewModalClose = document.getElementById('previewModalClose');
  const previewModal = document.getElementById('previewModal');
  
  if (previewModalClose) {
    previewModalClose.addEventListener('click', closePreviewModal);
  }
  
  if (previewModal) {
    previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) {
        closePreviewModal();
      }
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePreviewModal();
    }
  });
  
  // Multiple Custom Tables Events
  const addNewTableBtn = document.getElementById('addNewTableBtn');
  if (addNewTableBtn) {
    addNewTableBtn.addEventListener('click', () => addNewCustomTable());
  }
  
  // Initial first table setup
  const firstTableWrapper = document.querySelector('.custom-table-wrapper');
  if (firstTableWrapper) {
    firstTableWrapper.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]').getAttribute('data-action');
        if (action === 'add-column') addCustomColumnToTable(firstTableWrapper);
        if (action === 'remove-column') removeCustomColumnFromTable(firstTableWrapper);
        if (action === 'add-row') addCustomRowToTable(firstTableWrapper);
        if (action === 'remove-table') {
          if (confirm('Are you sure you want to delete this table?')) {
            firstTableWrapper.remove();
          }
        }
      });
    });
  }
  
  // Bulk Action Events
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', toggleSelectAll);
  }
  
  const bulkApproveBtn = document.getElementById('bulkApproveBtn');
  if (bulkApproveBtn) {
    bulkApproveBtn.addEventListener('click', bulkApprove);
  }
  
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', bulkDelete);
  }
}

// Site Config Loader
async function loadSiteConfig() {
  try {
    const configSnap = await getDoc(doc(db, 'settings', 'siteConfig'));
    if (configSnap.exists()) {
      const data = configSnap.data();
      const maintenanceToggle = document.getElementById('maintenanceToggle');
      if (maintenanceToggle) {
        maintenanceToggle.checked = !!data.maintenanceMode;
      }
    }
  } catch (err) {
    console.error('Error loading site config:', err);
  }
}

// ----------------------------------------------------
// DYNAMIC ROW MANAGEMENT
// ----------------------------------------------------

function addPostRow(data = {}) {
  const container = document.getElementById('postsContainer');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'post-row';
  row.setAttribute('draggable', 'false');
  row.innerHTML = `
    <div class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
    <div class="form-group">
      <label class="form-label text-xs">Post Name</label>
      <input type="text" class="form-control text-sm post-name" value="${data.postName || ''}" placeholder="e.g. SI Staff Nurse" required />
    </div>
    <div class="form-group">
      <label class="form-label text-xs">Total Post</label>
      <input type="text" class="form-control text-sm post-total" value="${data.totalPost || ''}" placeholder="e.g. 51" />
    </div>
    <div class="form-group">
      <label class="form-label text-xs">Start Date</label>
      <input type="text" class="form-control text-sm post-start" value="${data.startDate || ''}" placeholder="DD/MM/YYYY" />
    </div>
    <div class="form-group">
      <label class="form-label text-xs">Last Date</label>
      <input type="text" class="form-control text-sm post-last" value="${data.lastDate || ''}" placeholder="DD/MM/YYYY" />
    </div>
    <div class="form-group">
      <label class="form-label text-xs">Notification Link</label>
      <input type="url" class="form-control text-sm post-notif" value="${data.notificationLink || ''}" placeholder="https://..." />
    </div>
    <button type="button" class="btn-row-action btn-remove remove-post-row"><i class="fa-solid fa-trash"></i></button>
  `;

  row.querySelector('.remove-post-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function addLinkRow(data = {}) {
  const container = document.getElementById('linksContainer');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'link-row';
  row.setAttribute('draggable', 'false');
  row.innerHTML = `
    <div class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
    <div class="form-group">
      <label class="form-label text-xs">Link Button Name</label>
      <input type="text" class="form-control text-sm link-name" value="${data.name || ''}" placeholder="e.g. Apply Online" required />
    </div>
    <div class="form-group">
      <label class="form-label text-xs">Destination URL</label>
      <input type="url" class="form-control text-sm link-url" value="${data.url || ''}" placeholder="https://..." required />
    </div>
    <button type="button" class="btn-row-action btn-remove remove-link-row"><i class="fa-solid fa-trash"></i></button>
  `;

  row.querySelector('.remove-link-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function addCategoryVacancyRow(data = {}) {
  const container = document.getElementById('categoryVacancyContainer');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'category-vacancy-row';
  row.setAttribute('draggable', 'false');
  row.innerHTML = `
    <div class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
    <div class="form-group">
      <label class="form-label text-xs">Department Name</label>
      <input type="text" class="form-control text-sm cat-dept" value="${data.deptName || ''}" placeholder="e.g. Directorate of Treasury (Optional)" />
    </div>
    <div class="form-group">
      <label class="form-label text-xs">Post Name *</label>
      <input type="text" class="form-control text-sm cat-post" value="${data.postName || ''}" placeholder="e.g. JTO" required />
    </div>
    <div class="form-group">
      <label class="form-label text-xs">Gen (UR)</label>
      <input type="text" class="form-control text-sm cat-ur" value="${data.ur || ''}" placeholder="0" />
    </div>
    <div class="form-group">
      <label class="form-label text-xs">OBC</label>
      <input type="text" class="form-control text-sm cat-obc" value="${data.obc || ''}" placeholder="0" />
    </div>
    <div class="form-group">
      <label class="form-label text-xs">EWS</label>
      <input type="text" class="form-control text-sm cat-ews" value="${data.ews || ''}" placeholder="0" />
    </div>
    <div class="form-group">
      <label class="form-label text-xs">SC</label>
      <input type="text" class="form-control text-sm cat-sc" value="${data.sc || ''}" placeholder="0" />
    </div>
    <div class="form-group">
      <label class="form-label text-xs">ST</label>
      <input type="text" class="form-control text-sm cat-st" value="${data.st || ''}" placeholder="0" />
    </div>
    <div class="form-group">
      <label class="form-label text-xs">Total Post</label>
      <input type="text" class="form-control text-sm cat-total" value="${data.total || ''}" placeholder="0" />
    </div>
    <button type="button" class="btn-row-action btn-remove remove-category-row"><i class="fa-solid fa-trash"></i></button>
  `;

  row.querySelector('.remove-category-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function addFeeRow(data = {}) {
  const container = document.getElementById('feesContainer');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'fee-row';
  row.setAttribute('draggable', 'false');
  row.style = 'display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;';
  row.innerHTML = `
    <div class="drag-handle" style="margin-top: 25px;"><i class="fa-solid fa-grip-vertical"></i></div>
    <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <div class="form-group" style="margin-bottom: 0;">
        <label class="form-label text-xs">Category Name</label>
        <input type="text" class="form-control text-sm fee-category" value="${data.category || ''}" placeholder="e.g. General / OBC / EWS" required />
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label class="form-label text-xs">Fee Amount</label>
        <input type="text" class="form-control text-sm fee-amount" value="${data.amount || ''}" placeholder="e.g. 100/-" required />
      </div>
    </div>
    <button type="button" class="btn-row-action btn-remove remove-fee-row" style="margin-top: 22px; height: 38px;"><i class="fa-solid fa-trash"></i></button>
  `;

  row.querySelector('.remove-fee-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function addCustomDateRow(data = {}) {
  const container = document.getElementById('customDatesContainer');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'custom-date-row';
  row.setAttribute('draggable', 'false');
  row.style = 'display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;';
  row.innerHTML = `
    <div class="drag-handle" style="margin-top: 25px;"><i class="fa-solid fa-grip-vertical"></i></div>
    <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <div class="form-group" style="margin-bottom: 0;">
        <label class="form-label text-xs">Date Label</label>
        <input type="text" class="form-control text-sm custom-date-label" value="${data.label || ''}" placeholder="e.g. Correction Date / Late Payment Date" required />
      </div>
      <div class="form-group" style="margin-bottom: 0;">
        <label class="form-label text-xs">Date Value</label>
        <input type="text" class="form-control text-sm custom-date-value" value="${data.value || ''}" placeholder="e.g. 25/06/2026" required />
      </div>
    </div>
    <button type="button" class="btn-row-action btn-remove remove-custom-date-row" style="margin-top: 22px; height: 38px;"><i class="fa-solid fa-trash"></i></button>
  `;

  row.querySelector('.remove-custom-date-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Helper to parse scraped Category-Wise vacancy table into structured rows
function parseCategoryTableToRows(scrapedTable) {
  if (!scrapedTable) return [];

  const rows = Array.from(scrapedTable.querySelectorAll('tr'));
  if (rows.length === 0) return [];
  
  const parsedRows = [];
  let headerIndex = -1;
  let colMapping = { dept: -1, post: -1, ur: -1, obc: -1, ews: -1, sc: -1, st: -1, total: -1 };

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const cells = Array.from(rows[rIdx].querySelectorAll('th, td')).map(c => c.textContent.toLowerCase().trim());
    const isHeader = cells.some(c => c === 'ur' || c === 'obc' || c === 'sc' || c === 'st' || c === 'ews' || c === 'general' || c === 'gen' || c.includes('general'));
    if (isHeader) {
      headerIndex = rIdx;
      cells.forEach((cellText, cIdx) => {
        if (cellText.includes('dept') || cellText.includes('department')) colMapping.dept = cIdx;
        else if (cellText.includes('post') || cellText.includes('subject') || cellText.includes('trade') || cellText.includes('discipline') || cellText.includes('name of post')) colMapping.post = cIdx;
        else if (cellText === 'ur' || cellText === 'gen' || cellText === 'general' || cellText.includes('general') || cellText.includes('(ur)')) colMapping.ur = cIdx;
        else if (cellText === 'obc') colMapping.obc = cIdx;
        else if (cellText === 'ews') colMapping.ews = cIdx;
        else if (cellText === 'sc') colMapping.sc = cIdx;
        else if (cellText === 'st') colMapping.st = cIdx;
        else if (cellText.includes('total')) colMapping.total = cIdx;
      });
      break;
    }
  }

  if (headerIndex !== -1) {
    for (let rIdx = headerIndex + 1; rIdx < rows.length; rIdx++) {
      const cells = Array.from(rows[rIdx].querySelectorAll('th, td'));
      if (cells.length === 0) continue;
      
      if (cells.length === 1 && cells[0].colSpan > 3) continue;

      const rowData = {
        deptName: colMapping.dept !== -1 && cells[colMapping.dept] ? cells[colMapping.dept].textContent.trim() : '',
        postName: colMapping.post !== -1 && cells[colMapping.post] ? cells[colMapping.post].textContent.trim() : '',
        ur: colMapping.ur !== -1 && cells[colMapping.ur] ? cells[colMapping.ur].textContent.trim() : '',
        obc: colMapping.obc !== -1 && cells[colMapping.obc] ? cells[colMapping.obc].textContent.trim() : '',
        ews: colMapping.ews !== -1 && cells[colMapping.ews] ? cells[colMapping.ews].textContent.trim() : '',
        sc: colMapping.sc !== -1 && cells[colMapping.sc] ? cells[colMapping.sc].textContent.trim() : '',
        st: colMapping.st !== -1 && cells[colMapping.st] ? cells[colMapping.st].textContent.trim() : '',
        total: colMapping.total !== -1 && cells[colMapping.total] ? cells[colMapping.total].textContent.trim() : ''
      };

      if (rowData.postName || rowData.deptName) {
        parsedRows.push(rowData);
      }
    }
  }

  if (parsedRows.length === 0) {
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const cells = Array.from(rows[rIdx].querySelectorAll('th, td'));
      if (cells.length < 5) continue;
      
      if (cells.length === 1 || (cells[0].colSpan && cells[0].colSpan > 3)) continue;
      
      const isHeader = cells.some(c => {
        const txt = c.textContent.toLowerCase().trim();
        return txt === 'ur' || txt === 'obc' || txt === 'sc' || txt === 'st' || txt === 'ews' || txt === 'post name';
      });
      if (isHeader) continue;

      let deptName = '';
      let postName = '';
      let ur = '', ews = '', obc = '', sc = '', st = '', total = '';

      if (cells.length === 8) {
        deptName = cells[0].textContent.trim();
        postName = cells[1].textContent.trim();
        ur = cells[2].textContent.trim();
        obc = cells[3].textContent.trim();
        ews = cells[4].textContent.trim();
        sc = cells[5].textContent.trim();
        st = cells[6].textContent.trim();
        total = cells[7].textContent.trim();
      } else if (cells.length === 7) {
        postName = cells[0].textContent.trim();
        ur = cells[1].textContent.trim();
        ews = cells[2].textContent.trim();
        obc = cells[3].textContent.trim();
        sc = cells[4].textContent.trim();
        st = cells[5].textContent.trim();
        total = cells[6].textContent.trim();
      }
      
      if (postName || deptName) {
        parsedRows.push({ deptName, postName, ur, obc, ews, sc, st, total });
      }
    }
  }

  return parsedRows;
}

// Helper to generate the exact screenshot-matching Category-Wise vacancy table HTML
function generateCategoryTableHTML(rows, organization) {
  if (!rows || rows.length === 0) return '';

  const hasDept = rows.some(r => r.deptName && r.deptName.trim() !== '');

  let titleText = '';
  if (hasDept) {
    const org = organization || 'UPSSSC';
    const advt = org.toLowerCase().includes('advt') ? '' : ' Advt No : 07-Exam/2026 :';
    titleText = `<span style="color: #008000 !important; font-weight: bold !important; font-size: 20px !important;">${org}${advt} </span><span style="color: #ff00ff !important; font-weight: bold !important; font-size: 20px !important;">Category Wise Vacancy</span>`;
  } else {
    const org = organization || 'BSNL JTO';
    const vac = org.toLowerCase().includes('vacancy') ? '' : ' Vacancy 2026 :';
    titleText = `<span style="color: #ff00ff !important; font-weight: bold !important; font-size: 20px !important;">${org}${vac} </span><span style="color: #008000 !important; font-weight: bold !important; font-size: 20px !important;">Category Wise Vacancy Details</span>`;
  }

  let headers = [];
  let headerTextColor = hasDept ? '#ff0000' : '#000000';
  
  if (hasDept) {
    headers = [
      'Department Name',
      'Post Name',
      'General (UR)',
      'OBC',
      'EWS',
      'SC',
      'ST',
      'Total Post'
    ];
  } else {
    headers = [
      'Post Name',
      'General (UR)',
      'EWS',
      'OBC',
      'SC',
      'ST',
      'Total Post'
    ];
  }

  const colspan = headers.length;

  let html = `<table class="sarkari-category-table" style="width: 100% !important; border-collapse: collapse !important; border: 2px solid #128807 !important; margin: 20px 0 !important; background: #ffffff !important;">`;
  html += `<thead>`;
  html += `<tr><th colspan="${colspan}" class="sarkari-cell-center" style="background-color: #ffffff !important; border: 1px solid #128807 !important; padding: 12px 8px !important; text-align: center !important;">${titleText}</th></tr>`;
  
  html += `<tr>`;
  headers.forEach(h => {
    html += `<th class="sarkari-cell-center" style="background-color: #ffffff !important; color: ${headerTextColor} !important; border: 1px solid #128807 !important; padding: 12px 8px !important; text-align: center !important; font-weight: bold !important; font-size: 15px !important;">${h}</th>`;
  });
  html += `</tr>`;
  html += `</thead>`;

  html += `<tbody>`;
  rows.forEach(r => {
    html += `<tr>`;
    if (hasDept) {
      html += `<td class="sarkari-cell-left" style="font-weight: bold !important; border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: left !important;">${r.deptName || ''}</td>`;
      html += `<td class="sarkari-cell-left" style="font-weight: bold !important; border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: left !important;">${r.postName || ''}</td>`;
      html += `<td class="sarkari-cell-center" style="border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: center !important;">${r.ur || '0'}</td>`;
      html += `<td class="sarkari-cell-center" style="border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: center !important;">${r.obc || '0'}</td>`;
      html += `<td class="sarkari-cell-center" style="border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: center !important;">${r.ews || '0'}</td>`;
      html += `<td class="sarkari-cell-center" style="border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: center !important;">${r.sc || '0'}</td>`;
      html += `<td class="sarkari-cell-center" style="border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: center !important;">${r.st || '0'}</td>`;
      html += `<td class="sarkari-cell-center" style="font-weight: bold !important; border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: center !important;">${r.total || '0'}</td>`;
    } else {
      html += `<td class="sarkari-cell-left" style="font-weight: bold !important; border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: left !important;">${r.postName || ''}</td>`;
      html += `<td class="sarkari-cell-center" style="border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: center !important;">${r.ur || '0'}</td>`;
      html += `<td class="sarkari-cell-center" style="border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: center !important;">${r.ews || '0'}</td>`;
      html += `<td class="sarkari-cell-center" style="border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: center !important;">${r.obc || '0'}</td>`;
      html += `<td class="sarkari-cell-center" style="border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: center !important;">${r.sc || '0'}</td>`;
      html += `<td class="sarkari-cell-center" style="border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: center !important;">${r.st || '0'}</td>`;
      html += `<td class="sarkari-cell-center" style="font-weight: bold !important; border: 1px solid #128807 !important; padding: 10px 8px !important; color: #000000 !important; text-align: center !important;">${r.total || '0'}</td>`;
    }
    html += `</tr>`;
  });
  html += `</tbody>`;
  html += `</table>`;

  return html;
}

// ----------------------------------------------------
// 1-CLICK SCRAPER ENGINE (CORS PROXIES & AUTO FILL)
// ----------------------------------------------------

async function importFromSarkariURL() {
  // First, make sure we're on the Add New Post tab
  document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.querySelector('[data-tab="add-post"]').classList.add('active');
  document.getElementById('tab-add-post').classList.add('active');

  const urlInput = document.getElementById('sarkariImportUrl');
  const importBtn = document.getElementById('sarkariImportBtn');
  const btnText = document.getElementById('importBtnText');

  const url = urlInput.value.trim();
  if (!url) {
    showToast('Please enter a Sarkari Result page URL.', 'warning');
    return;
  }

  if (!url.toLowerCase().includes('sarkariresult.com') && !url.toLowerCase().includes('sarkariresult.com.cm')) {
    showToast('Only sarkariresult.com or sarkariresult.com.cm links are supported.', 'warning');
    return;
  }

  // Set loading state
  importBtn.disabled = true;
  const originalHTML = importBtn.innerHTML;
  importBtn.innerHTML = '<span class="spinner-small"></span> <span>Fetching...</span>';

  try {
    showToast('Attempting connections through multiple secure routes...', 'info');

    let htmlContent = '';
    let fetchSuccess = false;

    // Ordered list of connections (Direct, then CORS proxies)
    const routes = [
      { name: 'Direct Connect (Browser Link)', url: url, parse: async (res) => await res.text() },
      { name: 'Proxy Route 1 (CORSProxy)', url: `https://corsproxy.io/?${encodeURIComponent(url)}`, parse: async (res) => await res.text() },
      { name: 'Proxy Route 2 (AllOrigins Raw)', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, parse: async (res) => await res.text() },
      { name: 'Proxy Route 3 (AllOrigins JSON)', url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&_=${Date.now()}`, parse: async (res) => {
          const json = await res.json();
          return json.contents || '';
        }
      },
      { name: 'Proxy Route 4 (CodeTabs)', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, parse: async (res) => await res.text() },
      { name: 'Proxy Route 5 (Thingproxy)', url: `https://thingproxy.freeboard.io/fetch/${url}`, parse: async (res) => await res.text() },
      { name: 'Proxy Route 6 (GoCors)', url: `https://go-cors.deno.dev/${url}`, parse: async (res) => await res.text() },
      { name: 'Proxy Route 7 (Jina AI)', url: `https://r.jina.ai/${url}`, parse: async (res) => await res.text() },
      { name: 'Proxy Route 8 (AllowOrigin)', url: `https://alloworigin.com/get?url=${encodeURIComponent(url)}`, parse: async (res) => await res.text() },
      { name: 'Proxy Route 9 (CORS-anywhere)', url: `https://cors-anywhere.herokuapp.com/${url}`, parse: async (res) => await res.text() },
      { name: 'Proxy Route 10 (CORS.sh)', url: `https://cors.sh/${url}`, parse: async (res) => await res.text() },
      { name: 'Proxy Route 11 (api.bridged.xyz)', url: `https://api.bridged.xyz/proxy?url=${encodeURIComponent(url)}`, parse: async (res) => await res.text() }
    ];

    for (const route of routes) {
      try {
        console.log(`Connecting via: ${route.name}...`);
        const res = await fetch(route.url);
        if (res.ok) {
          htmlContent = await route.parse(res);
          if (htmlContent && htmlContent.trim().length > 200) {
            fetchSuccess = true;
            console.log(`Connection successful via ${route.name}`);
            showToast(`Connection successful via ${route.name}`, 'success');
            break;
          }
        }
      } catch (err) {
        console.warn(`Connection via ${route.name} failed. Trying next route...`, err);
      }
    }

    if (!fetchSuccess) {
      showToast('⚠️ CORS proxies blocked! Install "Allow CORS: Access-Control-Allow-Origin" Chrome extension for 100% working direct connection!', 'error', 10000);
      throw new Error('All CORS proxy routes are currently blocked by target. Install "Allow CORS" Chrome extension for a 100% direct connection.');
    }

    // Begin HTML parsing
    showToast('Parsing page elements...', 'info');
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Category
    let category = 'Latest Jobs';
    const urlLower = url.toLowerCase();
    if (urlLower.includes('/admitcard') || urlLower.includes('admit')) {
      category = 'Admit Card';
    } else if (urlLower.includes('/result') || urlLower.includes('result')) {
      category = 'Result';
    } else if (urlLower.includes('/admission') || urlLower.includes('admission')) {
      category = 'Admission';
    } else if (urlLower.includes('/answerkey') || urlLower.includes('answer')) {
      category = 'Answer Key';
    }

    // Title
    let title = '';
    const h1 = doc.querySelector('h1');
    if (h1) title = h1.textContent.trim();
    if (!title) {
      const titleTag = doc.querySelector('title');
      if (titleTag) title = titleTag.textContent.replace('Sarkari Result', '').replace('Online Form', '').trim();
    }
    title = (title || 'New Job Post').replace(/\s+/g, ' ').trim();

    // Clean title structure & Extract Organization
    const organization = extractOrg(title);
    console.log('Extracted title:', title);
    console.log('Extracted organization:', organization);

    // Deep parsing table text for Dates, Fees, Age, Selection
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

    // Helper helper helper
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

    // Sibling-line parsing fallback if DOM cell layout failed
    const mainTable = doc.querySelector('table');
    if (mainTable) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = mainTable.innerHTML;
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

        if ((low.includes('general / obc') || low.includes('general/obc') || low.includes('general /ews')) && !feeGeneral) feeGeneral = val;
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
    }

    // Clean up texts
    const cleanStr = (s) => s.replace(/^[:\s\-]+/g, '').replace(/[:\s]+$/g, '').replace(/\s+/g, ' ').trim();
    applicationBegin = cleanStr(applicationBegin);
    lastDate = cleanStr(lastDate);
    examDate = cleanStr(examDate);
    admitCardDate = cleanStr(admitCardDate);
    feeGeneral = cleanStr(feeGeneral);
    feeSCST = cleanStr(feeSCST);
    feeFemale = cleanStr(feeFemale);
    const ageLimit = cleanStr(ageLimitLines.join(' | '));
    const selectionProcess = cleanStr(selectionLines.join(' | '));

    // Detect and clean Category-Wise (Caste-Wise) Vacancy Table
    let parsedCategoryRows = [];
    let categoryTableFound = null;

    doc.querySelectorAll('table').forEach(table => {
      const cells = Array.from(table.querySelectorAll('th, td')).map(el => el.textContent.toLowerCase().trim());
      const isMaster = cells.some(c => c.includes('important dates') || c.includes('application fee'));
      if (isMaster) return;

      const casteKeywords = ['ur', 'obc', 'sc', 'st', 'ews', 'general', 'gen', 'bc', 'sbc'];
      const matchingCasteCount = cells.filter(c => 
        casteKeywords.includes(c) || c === 'gen' || c === 'ur' || c.startsWith('obc') || c.startsWith('ews')
      ).length;

      if (matchingCasteCount >= 2 && !categoryTableFound) {
        categoryTableFound = table;
      }
    });

    if (categoryTableFound) {
      parsedCategoryRows = parseCategoryTableToRows(categoryTableFound);
      console.log('Category vacancy table successfully parsed into rows:', parsedCategoryRows);
    }

    // Scrape dynamic posts table rows
    let recruitmentPosts = [];
    doc.querySelectorAll('table').forEach(table => {
      const cells = Array.from(table.querySelectorAll('th, td')).map(el => el.textContent.toLowerCase().trim());
      const hasPostName = cells.some(c => c.includes('post name') || c.includes('name of post') || c === 'post');
      const hasTotalPost = cells.some(c => c.includes('total post') || c.includes('totalposts') || c.includes('total vacancy') || c === 'total');

      const isMaster = cells.some(c => c.includes('important dates') || c.includes('application fee'));
      
      const casteKeywords = ['ur', 'obc', 'sc', 'st', 'ews', 'general', 'gen', 'bc'];
      const matchingCasteCount = cells.filter(c => 
        casteKeywords.includes(c) || c === 'gen' || c === 'ur' || c.startsWith('obc') || c.startsWith('ews')
      ).length;
      
      const isCategoryTable = matchingCasteCount >= 2;

      // Avoid Dates/Fees master table and Category-wise vacancy details table
      if (hasPostName && hasTotalPost && !isMaster && !isCategoryTable) {
        table.querySelectorAll('tr').forEach(row => {
          const tds = Array.from(row.querySelectorAll('td'));
          if (tds.length >= 2) {
            const pName = tds[0].textContent.trim();
            const pTotal = tds[1].textContent.trim();
            const pEligibility = tds[2] ? tds[2].textContent.trim() : '';

            // Ignore header row
            if (pName.toLowerCase().includes('post name') || pName.toLowerCase().includes('name of post') || pName.toLowerCase() === 'post') return;

            let nLink = '';
            const anchor = row.querySelector('a');
            if (anchor) {
              const rawHref = anchor.getAttribute('href');
              if (rawHref) {
                const baseDomain = url.toLowerCase().includes('sarkariresult.com.cm') ? 'https://www.sarkariresult.com.cm' : 'https://www.sarkariresult.com';
                nLink = rawHref.startsWith('http') ? rawHref : `${baseDomain}/${rawHref.replace(/^\//, '')}`;
              }
            }

            if (pName && pTotal) {
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

    // Scrape link buttons
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
      }

      if (linkName && !links.some(l => l.name === linkName)) {
        links.push({ name: linkName, url: absUrl });
      }
    });

    if (applyLink && !links.some(l => l.name === 'Apply Online')) links.push({ name: 'Apply Online', url: applyLink });
    if (officialLink && !links.some(l => l.name === 'Official Website')) links.push({ name: 'Official Website', url: officialLink });

    // Auto-detect State from Title & URL
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

    // Populate Fields
    console.log('Populating fields with:', { title, category, detectedState, organization });
    document.getElementById('title').value = title;
    document.getElementById('category').value = category;
    document.getElementById('state').value = detectedState;
    document.getElementById('organization').value = organization;
    document.getElementById('officialLink').value = officialLink || '';
    document.getElementById('applyLink').value = applyLink || '';
    document.getElementById('applicationBegin').value = applicationBegin;
    document.getElementById('lastDate').value = lastDate;
    document.getElementById('examDate').value = examDate;
    document.getElementById('admitCardDate').value = admitCardDate;
    
    // Populate Fee rows
    const feesContainer = document.getElementById('feesContainer');
    feesContainer.innerHTML = '';
    if (feeGeneral) addFeeRow({ category: 'General / OBC / EWS', amount: feeGeneral });
    if (feeSCST) addFeeRow({ category: 'SC / ST / PH', amount: feeSCST });
    if (feeFemale) addFeeRow({ category: 'All Category Female', amount: feeFemale });

    document.getElementById('ageLimit').value = ageLimit;
    document.getElementById('selectionProcess').value = selectionProcess;
    console.log('Fields populated!');
    // Populate Category vacancy rows
    const categoryVacancyContainer = document.getElementById('categoryVacancyContainer');
    categoryVacancyContainer.innerHTML = '';
    parsedCategoryRows.forEach(row => addCategoryVacancyRow(row));


    // Populate Sub-tables
    const postsContainer = document.getElementById('postsContainer');
    postsContainer.innerHTML = '';
    recruitmentPosts.forEach(post => addPostRow(post));

    const linksContainer = document.getElementById('linksContainer');
    linksContainer.innerHTML = '';
    links.forEach(link => addLinkRow(link));

    showToast('Import & autofill complete! Click "Save Post" to publish.', 'success');

  } catch (err) {
    console.error('Importer error:', err);
    showToast(err.message || 'Scraping failed. Try a different route or use manual entry.', 'error');
  } finally {
    importBtn.disabled = false;
    importBtn.innerHTML = originalHTML;
  }
}

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

// ----------------------------------------------------
// FORM PROCESSING, AUTO TABLE COMPILE & FIRESTORE CRUD
// ----------------------------------------------------

// Form Submit Handler
async function handleFormSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const category = document.getElementById('category').value;
  const state = document.getElementById('state').value;
  const organization = document.getElementById('organization').value.trim();
  const advtNo = document.getElementById('advtNo').value.trim();
  const officialLink = document.getElementById('officialLink').value.trim();
  const applyLink = document.getElementById('applyLink').value.trim();
  const applicationBegin = document.getElementById('applicationBegin').value.trim();
  const lastDate = document.getElementById('lastDate').value.trim();
  const examDate = document.getElementById('examDate').value.trim();
  const admitCardDate = document.getElementById('admitCardDate').value.trim();
  
  // Compile Fee Rows list
  const feeRows = [];
  document.querySelectorAll('.fee-row').forEach(row => {
    const category = row.querySelector('.fee-category').value.trim();
    const amount = row.querySelector('.fee-amount').value.trim();
    if (category && amount) {
      feeRows.push({ category, amount });
    }
  });

  const ageLimit = document.getElementById('ageLimit').value.trim();
  const selectionProcess = document.getElementById('selectionProcess').value.trim();
  // Compile Category Vacancy Rows list
  const categoryVacancyRows = [];
  document.querySelectorAll('.category-vacancy-row').forEach(row => {
    const deptName = row.querySelector('.cat-dept').value.trim();
    const postName = row.querySelector('.cat-post').value.trim();
    const ur = row.querySelector('.cat-ur').value.trim();
    const obc = row.querySelector('.cat-obc').value.trim();
    const ews = row.querySelector('.cat-ews').value.trim();
    const sc = row.querySelector('.cat-sc').value.trim();
    const st = row.querySelector('.cat-st').value.trim();
    const total = row.querySelector('.cat-total').value.trim();
    if (postName || deptName) {
      categoryVacancyRows.push({ deptName, postName, ur, obc, ews, sc, st, total });
    }
  });
  const categoryVacancyHTML = generateCategoryTableHTML(categoryVacancyRows, organization);

  // Validate basic fields
  if (!title || !category || !applyLink) {
    showToast('Required fields title, category, and apply URL are missing!', 'warning');
    return;
  }

  // Compile Recruitment Posts list
  const recruitmentPosts = [];
  document.querySelectorAll('.post-row').forEach(row => {
    const postName = row.querySelector('.post-name').value.trim();
    const totalPost = row.querySelector('.post-total').value.trim();
    const startDate = row.querySelector('.post-start').value.trim();
    const lastDateVal = row.querySelector('.post-last').value.trim();
    const notificationLink = row.querySelector('.post-notif').value.trim();

    if (postName) {
      recruitmentPosts.push({ postName, totalPost, startDate, lastDate: lastDateVal, notificationLink });
    }
  });

  // Compile Links list
  const links = [];
  document.querySelectorAll('.link-row').forEach(row => {
    const name = row.querySelector('.link-name').value.trim();
    const url = row.querySelector('.link-url').value.trim();
    if (name && url) {
      links.push({ name, url });
    }
  });

  // Date Parsing & Validation
  const parseToDate = (str) => {
    if (!str) return null;
    const clean = String(str).trim();
    const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) {
      return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    }
    const parsed = Date.parse(clean);
    if (!isNaN(parsed)) return new Date(parsed);
    return null;
  };

  if (applicationBegin || lastDate || examDate) {
    const start = parseToDate(applicationBegin);
    const last = parseToDate(lastDate);
    const exam = parseToDate(examDate);

    const unparseable = [];
    if (applicationBegin && !start) unparseable.push(`Application Begin: "${applicationBegin}"`);
    if (lastDate && !last) unparseable.push(`Last Date: "${lastDate}"`);
    if (examDate && !exam) unparseable.push(`Exam Date: "${examDate}"`);

    if (unparseable.length > 0) {
      const confirmSave = confirm(
        `Warning: The following date fields are in a non-standard text format and cannot be parsed for validation:\n` +
        unparseable.map(u => `• ${u}`).join('\n') +
        `\n\nDo you want to save anyway?`
      );
      if (!confirmSave) return;
    } else {
      if (start && last && start > last) {
        const confirmSave = confirm(
          `Warning: Application Begin Date (${applicationBegin}) is after the Last Date (${lastDate}).\n\nDo you want to save anyway?`
        );
        if (!confirmSave) return;
      }
      if (exam && start && exam < start) {
        const confirmSave = confirm(
          `Warning: Exam Date (${examDate}) is before the Application Begin Date (${applicationBegin}).\n\nDo you want to save anyway?`
        );
        if (!confirmSave) return;
      }
    }
  }

  // Validate individual posts dates
  for (const p of recruitmentPosts) {
    if (p.startDate || p.lastDate) {
      const pStart = parseToDate(p.startDate);
      const pLast = parseToDate(p.lastDate);
      if (pStart && pLast && pStart > pLast) {
        const confirmSave = confirm(
          `Warning: In post "${p.postName}", Start Date (${p.startDate}) is after Last Date (${p.lastDate}).\n\nDo you want to save anyway?`
        );
        if (!confirmSave) return;
      }
    }
  }

  // Compile Multiple Custom Tables
  const customTablesData = [];
  let customTablesHTML = '';
  
  const customTablesContainer = document.getElementById('customTablesContainer');
  if (customTablesContainer) {
    const tableWrappers = customTablesContainer.querySelectorAll('.custom-table-wrapper');
    tableWrappers.forEach(tableWrapper => {
      const titleInput = tableWrapper.querySelector('.custom-table-title');
      const headerRow = tableWrapper.querySelector('.custom-grid-header-row');
      const body = tableWrapper.querySelector('.custom-grid-body');
      
      const tableData = {
        title: titleInput ? titleInput.value.trim() : '',
        headers: [],
        rows: [] // Array of strings (cells joined with |||) to avoid nested arrays in Firestore
      };
      
      // Collect headers
      if (headerRow) {
        headerRow.querySelectorAll('.header-input').forEach(input => {
          tableData.headers.push(input.value.trim());
        });
      }
      
      // Collect rows
      if (body) {
        body.querySelectorAll('tr').forEach(row => {
          const cells = [];
          row.querySelectorAll('.cell-input').forEach(input => {
            cells.push(input.value.trim());
          });
          if (cells.length > 0 && cells.some(cell => cell.length > 0)) {
            tableData.rows.push(cells.join('|||')); // Join cells to a string
          }
        });
      }
      
      // Only add if we have headers and at least one row
      if (tableData.headers.length > 0 && tableData.rows.length > 0) {
        customTablesData.push(tableData);
        
        // Render individual table
        let headerColsHTML = tableData.headers.map(h => `<th style="border: 1px solid #128807; font-weight: bold; background-color: #ffffff; padding: 12px; text-align: center;">${h}</th>`).join('');
        let bodyRowsHTML = tableData.rows.map(rowStr => {
          const rowCells = rowStr.split('|||'); // Split back to array
          const cellsHTML = rowCells.map((val, idx) => {
            const alignClass = idx === 0 ? 'sarkari-cell-left' : 'sarkari-cell-center';
            const weightStyle = idx === 0 ? 'font-weight: bold;' : '';
            let processedVal = val.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            if (idx >= 2 && processedVal.includes('|')) {
              const bulletItems = processedVal.split('|').map(item => `<li>${item.trim()}</li>`).join('');
              return `<td style="border: 1px solid #128807; padding: 10px;"><ul class="sarkari-bullet-list" style="margin:0; padding-left:18px;">${bulletItems}</ul></td>`;
            }
            return `<td class="${alignClass}" style="border: 1px solid #128807; padding: 10px; ${weightStyle}">${processedVal}</td>`;
          }).join('');
          return `<tr>${cellsHTML}</tr>`;
        }).join('');
        
        const tableTitleHTML = tableData.title 
          ? `<tr><th colspan="${tableData.headers.length}" class="sarkari-cell-center" style="background-color: #ffffff; padding: 12px;"><span class="sarkari-text-magenta" style="font-size: 16px;">${tableData.title}</span></th></tr>`
          : '';
          
        customTablesHTML += `
          <div style="margin-bottom: 20px;">
            <table class="sarkari-master-table">
              <thead>
                ${tableTitleHTML}
                <tr style="background-color: #ffffff;">
                  ${headerColsHTML}
                </tr>
              </thead>
              <tbody>
                ${bodyRowsHTML}
              </tbody>
            </table>
          </div>
        `;
      }
    });
  }
  
  // Compile Custom Dates
  const customDatesData = [];
  let customDatesHTML = '';
  
  const customDatesContainer = document.getElementById('customDatesContainer');
  if (customDatesContainer) {
    const customDateRows = customDatesContainer.querySelectorAll('.custom-date-row');
    customDateRows.forEach(row => {
      const labelInput = row.querySelector('.custom-date-label');
      const valueInput = row.querySelector('.custom-date-value');
      
      if (labelInput && valueInput) {
        const label = labelInput.value.trim();
        const value = valueInput.value.trim();
        
        if (label && value) {
          customDatesData.push({ label, value });
        }
      }
    });
    
    // Render custom dates HTML
    if (customDatesData.length > 0) {
      customDatesHTML = `
        <div style="margin-bottom: 20px;">
          <table class="sarkari-master-table">
            <tbody>
              ${customDatesData.map(date => `
                <tr>
                  <td style="border: 1px solid #128807; font-weight: bold; padding: 10px; width: 40%;">${date.label}</td>
                  <td style="border: 1px solid #128807; padding: 10px;">${date.value}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  // Check if there is an manual override from Quill editor
  let description = '';
  if (quill && quill.getText().trim().length > 0) {
    description = quill.root.innerHTML;
  } else {
    // Generate beautiful layout automatically
    description = createProfessionalTable({
      title,
      postName: title,
      totalPosts: recruitmentPosts.reduce((acc, curr) => acc + (parseInt(curr.totalPost) || 0), 0) || 'Various',
      qualification: recruitmentPosts[0]?.eligibility || 'Various Posts',
      startDate: applicationBegin,
      lastDate,
      examDate,
      admitCardDate,
      feeGeneral: feeRows[0]?.amount || '',
      feeSCST: feeRows[1]?.amount || '',
      feeFemale: feeRows[2]?.amount || '',
      feeRows,
      ageLimit,
      selectionProcess,
      recruitmentPosts,
      links,
      organization,
      advtNo,
      categoryVacancyHTML,
      customVacancyTableHTML: customTablesHTML,
      customDatesHTML
    });
  }

  // Form compile payload
  const job = jobs.find(j => j.id === editingJobId);
  const payload = {
    title,
    category,
    organization,
    advtNo,
    state,
    officialLink,
    applyLink,
    applicationBegin,
    lastDate,
    examDate,
    admitCardDate,
    feeGeneral: feeRows[0]?.amount || '',
    feeSCST: feeRows[1]?.amount || '',
    feeFemale: feeRows[2]?.amount || '',
    feeRows,
    ageLimit,
    selectionProcess,
    recruitmentPosts,
    links,
    description,
    categoryVacancyHTML,
    categoryVacancyRows,
    customTablesData,
    customTablesHTML,
    customDatesData,
    customDatesHTML,
    department: title, // kompatibility for existing layout
    location: 'India',
    salary: 'As per rules',
    qualification: recruitmentPosts[0]?.eligibility || 'Various Posts',
    priority: 50,
    badge: document.getElementById('badge').value || 'New',
    showOnHome: document.getElementById('showOnHome').checked,
    sourceUrl: document.getElementById('sourceUrl').value || '',
    status: 'active',
    approved: job ? job.approved : false, // Keep existing approval status when editing, default false (pending) for new
    updatedAt: serverTimestamp()
  };

  if (!editingJobId) {
    payload.createdAt = serverTimestamp();
  }

  const saveBtn = document.getElementById('saveJobBtn');
  saveBtn.disabled = true;
  document.getElementById('saveBtnText').textContent = 'Saving...';

  try {
    if (editingJobId) {
      const ref = doc(db, 'latest_jobs', editingJobId);
      await updateDoc(ref, payload);
      showToast('Post updated successfully!', 'success');
    } else {
      const col = collection(db, 'latest_jobs');
      await addDoc(col, payload);
      showToast('Post created successfully!', 'success');
    }

    clearForm();
    await loadJobs();
  } catch (error) {
    console.error('Firestore save error:', error);
    showToast('Failed to save post in database: ' + (error.message || error), 'error');
  } finally {
    saveBtn.disabled = false;
    document.getElementById('saveBtnText').textContent = 'Save Post';
  }
}

// Clear / Reset Form
function clearForm(promptUser = false) {
  if (promptUser && !confirm('Are you sure you want to discard changes?')) return;

  editingJobId = null;
  document.getElementById('formPanelTitle').innerHTML = '<i class="fa-solid fa-plus-circle text-primary"></i> Add New Job Post';
  document.getElementById('saveBtnText').textContent = 'Save Post';
  document.getElementById('jobForm').reset();
  
  // Clear sub-tables
  document.getElementById('postsContainer').innerHTML = '';
  document.getElementById('linksContainer').innerHTML = '';
  document.getElementById('feesContainer').innerHTML = '';

  // Clear category table
  const categoryVacancyContainer = document.getElementById('categoryVacancyContainer');
  if (categoryVacancyContainer) {
    categoryVacancyContainer.innerHTML = '';
  }

  // Clear Custom Tables
  clearAllCustomTables();
  
  // Clear Custom Dates
  const customDatesContainer = document.getElementById('customDatesContainer');
  if (customDatesContainer) customDatesContainer.innerHTML = '';

  // Clear Quill
  if (quill) quill.setText('');

  // Clear import input
  document.getElementById('sarkariImportUrl').value = '';
}

// Fetch all jobs from Firestore
async function loadJobs() {
  const jobsListBody = document.getElementById('jobsListBody');
  if (!jobsListBody) return;

  try {
    console.log('Loading jobs from Firestore...');
    const querySnapshot = await getDocs(collection(db, 'latest_jobs'));
    console.log('Query snapshot size:', querySnapshot.size);
    
    jobs = [];
    querySnapshot.forEach((doc) => {
      const jobData = { id: doc.id, ...doc.data() };
      console.log('Loaded job:', jobData);
      jobs.push(jobData);
    });

    console.log('Total jobs loaded:', jobs.length);

    // Sort by latest of createdAt or updatedAt
    jobs.sort((a, b) => {
      const timeA = Math.max(a.updatedAt?.seconds || 0, a.createdAt?.seconds || 0);
      const timeB = Math.max(b.updatedAt?.seconds || 0, b.createdAt?.seconds || 0);
      return timeB - timeA;
    });

    console.log('Rendering jobs list...');
    renderJobsList(jobs);
    renderRecentActivity(jobs);
  } catch (error) {
    console.error('Load jobs error:', error);
    jobsListBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <i class="fa-solid fa-exclamation-triangle text-danger"></i>
          <span>Failed to connect to database. Make sure Firebase settings are correct.</span>
        </td>
      </tr>
    `;
  }
}

function renderJobsList(jobsToRender) {
  const jobsListBody = document.getElementById('jobsListBody');
  console.log('renderJobsList called with', jobsToRender.length, 'jobs');
  if (!jobsListBody) {
    console.error('jobsListBody not found!');
    return;
  }

  if (jobsToRender.length === 0) {
    jobsListBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <i class="fa-solid fa-folder-open"></i>
          <span>No job posts found. Create one first!</span>
        </td>
      </tr>
    `;
    return;
  }

  jobsListBody.innerHTML = jobsToRender.map(job => {
    let badgeClass = 'badge-job';
    if (job.category === 'Admit Card') badgeClass = 'badge-admit';
    else if (job.category === 'Result') badgeClass = 'badge-result';
    else if (job.category === 'Admission') badgeClass = 'badge-admission';
    else if (job.category === 'Answer Key') badgeClass = 'badge-key';
    else if (job.category === 'Sarkari Yojana') badgeClass = 'badge-yojana';
    else if (job.category === 'Outsourcing') badgeClass = 'badge-outsourcing';

    const isApproved = job.approved === true;
    const approvalBadge = isApproved 
      ? `<span style="background: #10b981; color: white; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">Approved</span>`
      : `<span style="background: #f59e0b; color: white; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">Pending</span>`;

    return `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" class="post-checkbox" data-id="${job.id}">
        </td>
        <td>
          <div style="font-weight: 600; color: #1e293b">${job.title || 'Untitled'}</div>
          ${job.organization ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px">${job.organization}</div>` : ''}
        </td>
        <td><span class="job-badge ${badgeClass}">${job.category || 'Latest Jobs'}</span></td>
        <td>${approvalBadge}</td>
        <td style="white-space: nowrap">${job.lastDate || 'N/A'}</td>
        <td>
          <div class="job-actions">
            <button type="button" class="btn-icon btn-edit preview-job-btn" data-id="${job.id}" title="Preview Post" style="background: #3b82f6;"><i class="fa-solid fa-eye"></i></button>
            <button type="button" class="btn-icon btn-edit edit-job-btn" data-id="${job.id}" title="Edit Post"><i class="fa-solid fa-pen-to-square"></i></button>
            ${!isApproved ? `<button type="button" class="btn-icon btn-edit approve-job-btn" data-id="${job.id}" title="Approve Post" style="background: #10b981;"><i class="fa-solid fa-check"></i></button>` : ''}
            <button type="button" class="btn-icon btn-delete delete-job-btn" data-id="${job.id}" title="Delete Post"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Wire events
  document.querySelectorAll('.edit-job-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const jobId = btn.getAttribute('data-id');
      editJob(jobId);
    });
  });

  document.querySelectorAll('.delete-job-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const jobId = btn.getAttribute('data-id');
      deleteJob(jobId);
    });
  });

  document.querySelectorAll('.approve-job-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const jobId = btn.getAttribute('data-id');
      approveJob(jobId);
    });
  });

  document.querySelectorAll('.preview-job-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const jobId = btn.getAttribute('data-id');
      previewJob(jobId);
    });
  });
}

// Preview Job Post
function previewJob(jobId) {
  const job = jobs.find(j => j.id === jobId);
  if (!job) return;

  const modal = document.getElementById('previewModal');
  const titleEl = document.getElementById('previewModalTitle');
  const bodyEl = document.getElementById('previewModalBody');

  if (!modal || !titleEl || !bodyEl) return;

  titleEl.textContent = job.title || 'Post Preview';
  
  bodyEl.innerHTML = `
    <div class="preview-description">
      ${job.description || '<p>No description available</p>'}
    </div>
  `;

  modal.classList.add('active');
}

// Close Preview Modal
function closePreviewModal() {
  const modal = document.getElementById('previewModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function renderRecentActivity(allJobs) {
  const container = document.getElementById('recentActivitySection');
  const list = document.getElementById('recentActivityList');
  if (!container || !list) return;

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

  const recentPosts = allJobs.filter(job => {
    if (!job.createdAt) return false;
    const createdDate = job.createdAt.toDate ? job.createdAt.toDate() : new Date(job.createdAt.seconds * 1000);
    return createdDate >= twentyFourHoursAgo;
  });

  if (recentPosts.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  list.innerHTML = recentPosts.map(job => {
    const createdDate = job.createdAt.toDate ? job.createdAt.toDate() : new Date(job.createdAt.seconds * 1000);
    const timeStr = createdDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = createdDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    
    let icon = 'fa-file-lines';
    let color = '#4f46e5';
    if (job.category === 'Admit Card') { icon = 'fa-id-card'; color = '#f59e0b'; }
    else if (job.category === 'Result') { icon = 'fa-chart-line'; color = '#10b981'; }

    return `
      <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: #f8fafc; border-radius: 10px; border-left: 3px solid ${color};">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; color: ${color}; border: 1px solid #e2e8f0;">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 13px; font-weight: 600; color: #1e293b;">${job.title}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            <i class="fa-regular fa-clock"></i> ${dateStr}, ${timeStr} • <span style="color: ${color}; font-weight: 600;">${job.category}</span>
          </div>
        </div>
        <button type="button" class="btn-icon btn-edit edit-job-btn" data-id="${job.id}" style="width: 28px; height: 28px; font-size: 12px;">
          <i class="fa-solid fa-pen"></i>
        </button>
      </div>
    `;
  }).join('');

  // Re-wire edit events for recent activity list
  list.querySelectorAll('.edit-job-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const jobId = btn.getAttribute('data-id');
      editJob(jobId);
    });
  });
}

// Edit Job: load values into fields
function editJob(jobId) {
  const job = jobs.find(j => j.id === jobId);
  if (!job) return;

  editingJobId = jobId;

  // Switch to Add Post tab
  const addPostTabBtn = document.querySelector('.admin-tab[data-tab="add-post"]');
  if (addPostTabBtn) addPostTabBtn.click();

  document.getElementById('formPanelTitle').innerHTML = `<i class="fa-solid fa-pen-to-square text-primary"></i> Editing: ${job.title}`;
  document.getElementById('saveBtnText').textContent = 'Update Post';

  // Fill standard fields
  document.getElementById('title').value = job.title || '';
  document.getElementById('category').value = job.category || 'Latest Jobs';
  document.getElementById('state').value = job.state || 'ALL';
  document.getElementById('organization').value = job.organization || '';
  document.getElementById('advtNo').value = job.advtNo || '';
  document.getElementById('officialLink').value = job.officialLink || job.officialWebsite || '';
  document.getElementById('applyLink').value = job.applyLink || '';
  document.getElementById('applicationBegin').value = job.applicationBegin || '';
  document.getElementById('lastDate').value = job.lastDate || '';
  document.getElementById('examDate').value = job.examDate || '';
  document.getElementById('admitCardDate').value = job.admitCardDate || '';
  
  // Repopulate Fee rows
  const feesContainer = document.getElementById('feesContainer');
  feesContainer.innerHTML = '';
  if (job.feeRows && Array.isArray(job.feeRows) && job.feeRows.length > 0) {
    job.feeRows.forEach(f => addFeeRow(f));
  } else {
    // Legacy support
    if (job.feeGeneral) addFeeRow({ category: 'General / OBC / EWS', amount: job.feeGeneral });
    if (job.feeSCST) addFeeRow({ category: 'SC / ST / PH', amount: job.feeSCST });
    if (job.feeFemale) addFeeRow({ category: 'All Category Female', amount: job.feeFemale });
  }

  document.getElementById('ageLimit').value = job.ageLimit || '';
  document.getElementById('selectionProcess').value = job.selectionProcess || '';
  
  // Fill smart toggles
  document.getElementById('showOnHome').checked = job.showOnHome !== false;
  document.getElementById('badge').value = job.badge || 'New';
  document.getElementById('sourceUrl').value = job.sourceUrl || '';
  
  // Repopulate category vacancy rows
  const categoryVacancyContainer = document.getElementById('categoryVacancyContainer');
  categoryVacancyContainer.innerHTML = '';
  if (job.categoryVacancyRows && Array.isArray(job.categoryVacancyRows) && job.categoryVacancyRows.length > 0) {
    job.categoryVacancyRows.forEach(r => addCategoryVacancyRow(r));
  } else if (job.categoryVacancyHTML) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(job.categoryVacancyHTML, 'text/html');
      const table = doc.querySelector('table');
      if (table) {
        const rows = parseCategoryTableToRows(table);
        if (rows && rows.length > 0) {
          rows.forEach(r => addCategoryVacancyRow(r));
        }
      }
    } catch (e) {
      console.error('Failed to parse legacy categoryVacancyHTML:', e);
    }
  }

  // Repopulate posts
  const postsContainer = document.getElementById('postsContainer');
  postsContainer.innerHTML = '';
  if (job.recruitmentPosts && Array.isArray(job.recruitmentPosts)) {
    job.recruitmentPosts.forEach(p => addPostRow(p));
  }

  // Repopulate links
  const linksContainer = document.getElementById('linksContainer');
  linksContainer.innerHTML = '';
  if (job.links && Array.isArray(job.links)) {
    job.links.forEach(l => addLinkRow(l));
  }

  // Repopulate Multiple Custom Tables
  clearAllCustomTables();
  if (job.customTablesData && Array.isArray(job.customTablesData) && job.customTablesData.length > 0) {
    const container = document.getElementById('customTablesContainer');
    if (container) {
      container.innerHTML = ''; // Clear default table
      job.customTablesData.forEach((tableData, index) => {
        addNewCustomTable(tableData);
      });
    }
  } else if (job.customTableHeaders && Array.isArray(job.customTableHeaders) && job.customTableHeaders.length > 0) {
    // Legacy support for single table
    let rowsData = [];
    if (job.customTableRows) {
      if (typeof job.customTableRows === 'string') {
        try {
          rowsData = JSON.parse(job.customTableRows);
        } catch (e) {
          console.error('Failed to parse customTableRows:', e);
        }
      } else if (Array.isArray(job.customTableRows)) {
        rowsData = job.customTableRows;
      }
    }
    
    const legacyTableData = {
      title: '',
      headers: job.customTableHeaders,
      rows: rowsData
    };
    
    const container = document.getElementById('customTablesContainer');
    if (container) {
      container.innerHTML = ''; // Clear default table
      addNewCustomTable(legacyTableData);
    }
  }
  
  // Repopulate Custom Dates
  const customDatesContainer = document.getElementById('customDatesContainer');
  if (customDatesContainer) {
    customDatesContainer.innerHTML = '';
    if (job.customDatesData && Array.isArray(job.customDatesData) && job.customDatesData.length > 0) {
      job.customDatesData.forEach(d => addCustomDateRow(d));
    }
  }

  // Paste description if overrides exist
  if (quill) {
    if (job.description && !job.description.includes('professional-table')) {
      quill.root.innerHTML = job.description;
    } else {
      quill.setText('');
    }
  }

  showToast('Job values loaded in editor form.', 'info');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete Job from Firestore
async function deleteJob(jobId) {
  const job = jobs.find(j => j.id === jobId);
  if (!job) return;

  if (!confirm(`Are you sure you want to permanently delete: "${job.title}"? This cannot be undone.`)) {
    return;
  }

  try {
    await deleteDoc(doc(db, 'latest_jobs', jobId));
    showToast('Post deleted successfully.', 'success');
    await loadJobs();
    if (editingJobId === jobId) clearForm();
  } catch (error) {
    console.error('Delete error:', error);
    showToast('Failed to delete job post.', 'error');
  }
}

// Search Filter Handler
function filterJobsList() {
  const queryInput = document.getElementById('searchInput');
  const categorySelect = document.getElementById('categoryFilter');
  const approvalSelect = document.getElementById('approvalFilter');
  
  if (!queryInput || !categorySelect) return;

  const query = queryInput.value.toLowerCase().trim();
  const category = categorySelect.value;
  const approval = approvalSelect ? approvalSelect.value : '';

  const filtered = jobs.filter(job => {
    const matchesQuery = !query || 
      (job.title && job.title.toLowerCase().includes(query)) || 
      (job.organization && job.organization.toLowerCase().includes(query));
    
    const jobCategory = String(job.category || 'Latest Jobs');
    const matchesCat = !category || jobCategory === category;
    
    const isApproved = job.approved === true;
    let matchesApproval = true;
    if (approval === 'pending') matchesApproval = !isApproved;
    if (approval === 'approved') matchesApproval = isApproved;
    
    return matchesQuery && matchesCat && matchesApproval;
  });

  renderJobsList(filtered);
}

// Approve Job Post
async function approveJob(jobId) {
  try {
    await updateDoc(doc(db, 'latest_jobs', jobId), {
      approved: true,
      updatedAt: serverTimestamp()
    });
    showToast('Post approved successfully!', 'success');
    await loadJobs();
  } catch (error) {
    console.error('Approve error:', error);
    showToast('Failed to approve post.', 'error');
  }
}

// Get selected post IDs
function getSelectedPostIds() {
  const checkboxes = document.querySelectorAll('.post-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
}

// Bulk approve selected posts
async function bulkApprove() {
  const selectedIds = getSelectedPostIds();
  if (selectedIds.length === 0) {
    showToast('Please select at least one post to approve!', 'warning');
    return;
  }
  
  if (!confirm(`Are you sure you want to approve ${selectedIds.length} posts?`)) {
    return;
  }
  
  try {
    let successCount = 0;
    for (const id of selectedIds) {
      await updateDoc(doc(db, 'latest_jobs', id), {
        approved: true,
        updatedAt: serverTimestamp()
      });
      successCount++;
    }
    
    showToast(`Successfully approved ${successCount} posts!`, 'success');
    await loadJobs();
  } catch (error) {
    console.error('Bulk approve error:', error);
    showToast('Failed to approve some posts.', 'error');
  }
}

// Bulk delete selected posts
async function bulkDelete() {
  const selectedIds = getSelectedPostIds();
  if (selectedIds.length === 0) {
    showToast('Please select at least one post to delete!', 'warning');
    return;
  }
  
  if (!confirm(`Are you sure you want to DELETE ${selectedIds.length} posts? This cannot be undone!`)) {
    return;
  }
  
  try {
    let successCount = 0;
    for (const id of selectedIds) {
      await deleteDoc(doc(db, 'latest_jobs', id));
      successCount++;
    }
    
    showToast(`Successfully deleted ${successCount} posts!`, 'success');
    await loadJobs();
  } catch (error) {
    console.error('Bulk delete error:', error);
    showToast('Failed to delete some posts.', 'error');
  }
}

// Toggle select all checkboxes
function toggleSelectAll() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const postCheckboxes = document.querySelectorAll('.post-checkbox');
  
  postCheckboxes.forEach(cb => {
    cb.checked = selectAllCheckbox.checked;
  });
}

// ----------------------------------------------------
// RED-HEADER BLUE-BORDERS TABLE COMPILE HELPER
// ----------------------------------------------------
function createProfessionalTable(data) {
  const {
    title = data.title || '',
    postName = data.postName || data.title || '[Post Name]',
    totalPosts = data.totalPosts || data.total_posts || '[Total Posts]',
    qualification = data.qualification || data.eligibility || 'Various Posts',
    lastDate = data.lastDate || '[Last Date]',
    startDate = data.startDate || data.applicationBegin || '[Start Date]',
    examDate = data.examDate || '[Exam Date]',
    admitCardDate = data.admitCardDate || '',
    feeGeneral = data.feeGeneral || '',
    feeSCST = data.feeSCST || '',
    feeFemale = data.feeFemale || '',
    ageLimit = data.ageLimit || '',
    selectionProcess = data.selectionProcess || '',
    recruitmentPosts = [],
    links = [],
    organization = data.organization || '',
    advtNo = data.advtNo || '',
    categoryVacancyHTML = data.categoryVacancyHTML || '',
    customVacancyTableHTML = data.customVacancyTableHTML || '',
    customDatesHTML = data.customDatesHTML || ''
  } = data;

  // 1. Post Name Title Block (Screenshot 1)
  const currentDateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const currentTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const postDateFormatted = `${currentDateStr} | ${currentTimeStr}`;
  
  const titleBlockHTML = `
    <div class="sarkari-title-block">
      <div class="sarkari-title-row">
        <div class="sarkari-title-label">Post Date / Update :</div>
        <div class="sarkari-title-value">${postDateFormatted}</div>
      </div>
      <div class="sarkari-title-row">
        <div class="sarkari-title-label">Short Information :</div>
        <div class="sarkari-title-value">${organization ? organization : 'Recruitment Board'} has released the notification for the recruitment of ${postName}. Interested candidates can check the dates, eligibility, and apply online details below.</div>
      </div>
    </div>
  `;

  // 2. Master Info Table (Screenshot 2)
  const commissionText = organization || 'Combined Recruitment Board';
  const advtNoValue = advtNo || '07-Exam/2026';
  const headerAdvtText = `${commissionText} Advt No. ${advtNoValue} : Short Details of Notification`;
  
  const datesList = [];
  if (startDate) datesList.push(`<li>Application Begin : <strong>${startDate}</strong></li>`);
  if (lastDate) datesList.push(`<li>Last Date for Apply Online : <span class="sarkari-bold-red-val">${lastDate}</span></li>`);
  if (data.feeLastDate || lastDate) datesList.push(`<li>Last Date Pay Exam Fee : <strong>${data.feeLastDate || lastDate}</strong></li>`);
  if (data.correctionLastDate) datesList.push(`<li>Correction Last Date : <strong>${data.correctionLastDate}</strong></li>`);
  if (examDate) datesList.push(`<li>Exam Date : <strong>${examDate}</strong></li>`);
  if (admitCardDate) datesList.push(`<li>Admit Card Available : <strong>${admitCardDate}</strong></li>`);
  const datesHTML = datesList.length > 0 
    ? `<ul class="sarkari-bullet-list">${datesList.join('')}</ul>` 
    : '';

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
  const feesHTML = feesList.length > 0
    ? `<ul class="sarkari-bullet-list">${feesList.join('')}</ul>`
    : '';

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
            ${feesHTML}
            <div style="font-size: 13px; margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 8px; color: #333;">
              <strong>Pay the Examination Fee Through:</strong> Cash at E Challan or Debit Card, Credit Card, Net Banking.
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  `;

  // 3. Age Limit Table (Screenshot 3)
  const ageLimitTextHTML = ageLimit 
    ? `
      <table class="sarkari-master-table">
        <thead>
          <tr>
            <th class="sarkari-cell-center" style="background-color: #ffffff; padding: 12px;">
              <span class="sarkari-text-green" style="font-size: 16px;">${commissionText} Notification 2026 : </span>
              <span class="sarkari-text-magenta" style="font-size: 16px;">Age Limit as on 01/07/2026</span>
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

  // 4. Vacancy Details Table (Screenshot 4)
  let vacancyHTML = '';
  if (customVacancyTableHTML) {
    vacancyHTML = customVacancyTableHTML;
  } else if (recruitmentPosts && recruitmentPosts.length > 0) {
    const postRows = recruitmentPosts.map(post => {
      const eligibilityCleaned = post.eligibility ? post.eligibility.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : '';
      const eligibilityList = eligibilityCleaned 
        ? eligibilityCleaned.split('|').map(e => `<li>${e.trim()}</li>`).join('')
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

  // 5. How to Fill Section (Screenshot 6)
  const defaultSteps = [
    `Candidate Can Apply Between <strong>${startDate || 'As per Dates'} to ${lastDate || 'As per Dates'}</strong>`,
    `Candidate Read the Notification Before Apply the Recruitment Application Form.`,
    `Kindly Check and Collect the All Document – Eligibility, ID Proof, Address Details, Basic Details.`,
    `Kindly Ready Scan Document Related to Recruitment Form – Photo, Sign, ID Proof, Etc.`,
    `Before Submit the Application Form Must Check the Preview and All Column Carefully.`,
    `If Candidate Required to Paying the Application Fee Must Submit. If You have Not Required the Application Fees Your Form is Not Completed.`,
    `Take A Print Out of Final Submitted Form.`
  ];
  
  const fillFormHTML = `
    <table class="sarkari-master-table">
      <thead>
        <tr>
          <th class="sarkari-cell-center" style="background-color: #ffffff; padding: 12px;">
            <span class="sarkari-text-green" style="font-size: 16px;">India Result Exam® : How to Fill ${postName} Online Form 2026</span>
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

  // 6. Important Links Box Grid & Action Buttons (Screenshot 1)
  const appsLinksList = [];
  
  // App row hardcoded style (Screenshot 3 style)
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
            <span class="sarkari-text-magenta" style="font-size: 15px;">Interested Candidates Can Read the Full Notification Before Apply Online</span>
          </th>
        </tr>
      </thead>
      <tbody>
        ${appsLinksList.join('')}
      </tbody>
    </table>
  `;

  // Generate colorful Action Buttons (Screenshot 1 style)
  let buttonsHTML = '<div class="link-buttons-container">';
  
  // Helper to normalize urls and clean sarkariresult pages
  const normalizeUrl = (u) => {
    if (!u) return '#';
    let s = String(u).trim();
    if (s.toLowerCase().includes('sarkariresult.com')) {
      const isMedia = /\.(pdf|png|jpe?g|gif|zip|docx?|xlsx?)$/i.test(s);
      if (!isMedia) {
        return 'https://indiaresultexam.com';
      }
    }
    if (/^https?:\/\//i.test(s)) return s;
    if (/^[\w.-]+\.[a-z]{2,}/i.test(s)) return `https://${s}`;
    return s;
  };

  // Map dynamic links
  links.forEach(l => {
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
    }
    
    buttonsHTML += `
      <a href="${urlStr}" target="_blank" rel="noopener noreferrer" class="professional-button ${buttonClass}">
        <i class="fa-solid ${icon}"></i> ${label}
      </a>
    `;
  });

  // Fallback if links are empty
  if (links.length === 0) {
    const applyLink = data.applyLink || '';
    const officialLink = data.officialLink || '';
    if (applyLink) {
      buttonsHTML += `
        <a href="${normalizeUrl(applyLink)}" target="_blank" rel="noopener noreferrer" class="professional-button btn-apply">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Apply Online
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
      ${customDatesHTML}
      ${ageLimitTextHTML}
      ${vacancyHTML}
      ${categoryVacancyHTML ? `<div class="sarkari-category-table-wrapper">${categoryVacancyHTML}</div><div style="height:12px"></div>` : ''}
      ${fillFormHTML}
      ${linksSectionHTML}
    </div>
    <span class="professional-table" style="display:none;"></span>
  `;
}

// Dynamic Drag & Drop Sortable Reordering Helper (Native HTML5 Drag & Drop)
function makeSortable(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let dragEl = null;

  // Dynamically enable draggable="true" only when mouse is over drag-handle
  container.addEventListener('mouseover', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (handle) {
      const row = handle.closest('.post-row, .link-row, .category-vacancy-row');
      if (row) {
        row.setAttribute('draggable', 'true');
      }
    }
  });

  // Disable draggable when mouse leaves drag-handle
  container.addEventListener('mouseout', (e) => {
    if (dragEl) return; // Ignore while drag is in progress
    const handle = e.target.closest('.drag-handle');
    if (handle) {
      const row = handle.closest('.post-row, .link-row, .category-vacancy-row');
      if (row) {
        row.setAttribute('draggable', 'false');
      }
    }
  });

  // Reset draggable on mouseup/mouseleave to allow input text selection
  const resetDraggable = () => {
    const rows = container.querySelectorAll('.post-row, .link-row, .category-vacancy-row');
    rows.forEach(r => r.setAttribute('draggable', 'false'));
  };

  container.addEventListener('mouseup', resetDraggable);
  container.addEventListener('mouseleave', resetDraggable);

  container.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.post-row, .link-row, .category-vacancy-row');
    if (!row) {
      e.preventDefault();
      return;
    }
    dragEl = row;
    e.dataTransfer.effectAllowed = 'move';
    row.classList.add('dragging');
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const target = e.target.closest('.post-row, .link-row, .category-vacancy-row');
    if (target && target !== dragEl && target.parentNode === container) {
      const rect = target.getBoundingClientRect();
      const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
      container.insertBefore(dragEl, next ? target.nextSibling : target);
    }
  });

  container.addEventListener('dragend', (e) => {
    if (dragEl) {
      dragEl.classList.remove('dragging');
      dragEl = null;
    }
    resetDraggable();
  });
}

// ----------------------------------------------------
// MULTIPLE CUSTOM TABLES BUILDER ENGINE
// ----------------------------------------------------

let nextTableId = 1;

function recalculateMultiTableWidths(tableWrapper) {
  const headerRow = tableWrapper.querySelector('.custom-grid-header-row');
  if (!headerRow) return;
  const ths = headerRow.querySelectorAll('th');
  const numCols = ths.length;
  if (numCols === 0) return;

  if (numCols === 3) {
    ths[0].style.width = '30%';
    ths[1].style.width = '20%';
    ths[2].style.width = '50%';
  } else if (numCols <= 2) {
    const equalWidth = `${100 / numCols}%`;
    ths.forEach(th => th.style.width = equalWidth);
  } else {
    // 4 or more columns
    ths[0].style.width = '30%';
    ths[1].style.width = '15%';
    const remainingWidth = 55 / (numCols - 2);
    for (let i = 2; i < numCols; i++) {
      ths[i].style.width = `${remainingWidth}%`;
    }
  }
}

function addCustomColumnToTable(tableWrapper, headerVal = 'New Column') {
  const headerRow = tableWrapper.querySelector('.custom-grid-header-row');
  const bodyRows = tableWrapper.querySelectorAll('.custom-grid-body tr');
  if (!headerRow) return;

  const th = document.createElement('th');
  th.style.padding = '8px';
  th.style.border = '1px solid #cbd5e1';
  th.innerHTML = `<input type="text" class="form-control text-sm header-input" value="${headerVal}" style="font-weight: bold; background: #f1f5f9; text-align: center; width: 90%; margin: 0 auto; display: block;" />`;
  headerRow.appendChild(th);

  bodyRows.forEach(row => {
    const td = document.createElement('td');
    td.style.padding = '8px';
    td.style.border = '1px solid #cbd5e1';
    td.innerHTML = `<input type="text" class="form-control text-sm cell-input" placeholder="Value..." style="width: 90%; margin: 0 auto; display: block;" />`;
    row.insertBefore(td, row.lastElementChild);
    
    const input = td.querySelector('.cell-input');
    setupMultiTableCellInputEvents(input);
  });

  recalculateMultiTableWidths(tableWrapper);
}

function removeCustomColumnFromTable(tableWrapper) {
  const headerRow = tableWrapper.querySelector('.custom-grid-header-row');
  const bodyRows = tableWrapper.querySelectorAll('.custom-grid-body tr');
  if (!headerRow) return;

  const ths = headerRow.querySelectorAll('th');
  if (ths.length <= 2) {
    showToast('Cannot remove more columns. You must have at least "Post Name" and "Total Post".', 'warning');
    return;
  }

  headerRow.removeChild(ths[ths.length - 1]);

  bodyRows.forEach(row => {
    const tds = row.querySelectorAll('td');
    if (tds.length > 1) {
      row.removeChild(tds[tds.length - 2]);
    }
  });

  recalculateMultiTableWidths(tableWrapper);
}

function addCustomRowToTable(tableWrapper, rowData = []) {
  const body = tableWrapper.querySelector('.custom-grid-body');
  const headerRow = tableWrapper.querySelector('.custom-grid-header-row');
  if (!body || !headerRow) return;

  // If rowData is a string (from saved data), split it
  let processedRowData = rowData;
  if (typeof processedRowData === 'string') {
    processedRowData = processedRowData.split('|||');
  }

  const colCount = headerRow.querySelectorAll('th').length;
  const tr = document.createElement('tr');

  let cellsHTML = '';
  for (let i = 0; i < colCount; i++) {
    const placeholderText = i === 0 ? 'e.g. SI Staff Nurse' : i === 1 ? 'e.g. 51' : 'e.g. Bachelor Degree | Age: 18-27';
    const cellValue = processedRowData[i] || '';
    cellsHTML += `
      <td style="padding: 8px; border: 1px solid #cbd5e1;">
        <input type="text" class="form-control text-sm cell-input" value="${cellValue}" placeholder="${placeholderText}" style="width: 90%; margin: 0 auto; display: block;" />
      </td>
    `;
  }

  tr.innerHTML = `
    ${cellsHTML}
    <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; width: 40px;">
      <button type="button" class="btn-row-action btn-remove remove-custom-row" style="padding: 6px 10px; margin: 0 auto;"><i class="fa-solid fa-trash"></i></button>
    </td>
  `;

  tr.querySelector('.remove-custom-row').addEventListener('click', () => tr.remove());
  
  tr.querySelectorAll('.cell-input').forEach(input => {
    setupMultiTableCellInputEvents(input);
  });

  body.appendChild(tr);
  tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function addNewCustomTable(tableData = null) {
  const container = document.getElementById('customTablesContainer');
  if (!container) return;

  const tableId = nextTableId++;
  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'custom-table-wrapper';
  tableWrapper.setAttribute('data-table-id', tableId);
  tableWrapper.style.cssText = 'margin-bottom: 24px; padding: 16px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;';
  
  const titleVal = tableData?.title || '';
  
  tableWrapper.innerHTML = `
    <div class="sub-section-header" style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
      <input type="text" class="form-control custom-table-title" placeholder="Table Title (e.g. Category-Wise Vacancy)" value="${titleVal}" style="flex: 1; max-width: 300px; font-weight: 600;" />
      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button type="button" class="btn-row-action" style="background: #e2e8f0; color: #334155;" data-action="add-column"><i class="fa-solid fa-columns"></i> Add Column</button>
        <button type="button" class="btn-row-action" style="background: #e2e8f0; color: #334155;" data-action="remove-column"><i class="fa-solid fa-minus"></i> Remove Column</button>
        <button type="button" class="btn-row-action btn-add" data-action="add-row"><i class="fa-solid fa-plus"></i> Add Row</button>
        <button type="button" class="btn-row-action btn-remove remove-table-btn" data-action="remove-table" style="background: #fee2e2;"><i class="fa-solid fa-trash"></i> Delete Table</button>
      </div>
    </div>
    <div style="overflow-x: auto; background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
      <table class="custom-grid-table" style="width: 100%; border-collapse: collapse; min-width: 600px;">
        <thead>
          <tr class="custom-grid-header-row">
            <th style="padding: 8px; border: 1px solid #cbd5e1; width: 30%;"><input type="text" class="form-control text-sm header-input" value="Post Name" style="font-weight: bold; background: #f1f5f9; text-align: center; width: 90%; margin: 0 auto; display: block;" /></th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; width: 20%;"><input type="text" class="form-control text-sm header-input" value="Total Post" style="font-weight: bold; background: #f1f5f9; text-align: center; width: 90%; margin: 0 auto; display: block;" /></th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; width: 50%;"><input type="text" class="form-control text-sm header-input" value="Eligibility" style="font-weight: bold; background: #f1f5f9; text-align: center; width: 90%; margin: 0 auto; display: block;" /></th>
          </tr>
        </thead>
        <tbody class="custom-grid-body">
          <!-- Custom rows will be added here -->
        </tbody>
      </table>
    </div>
  `;

  // Setup button event listeners
  tableWrapper.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]').getAttribute('data-action');
      if (action === 'add-column') addCustomColumnToTable(tableWrapper);
      if (action === 'remove-column') removeCustomColumnFromTable(tableWrapper);
      if (action === 'add-row') addCustomRowToTable(tableWrapper);
      if (action === 'remove-table') {
        if (confirm('Are you sure you want to delete this table?')) {
          tableWrapper.remove();
        }
      }
    });
  });

  container.appendChild(tableWrapper);
  
  // Initialize with rows if we have data
  if (tableData?.rows && Array.isArray(tableData.rows)) {
    // First set headers
    if (tableData.headers && Array.isArray(tableData.headers) && tableData.headers.length > 0) {
      const headerRow = tableWrapper.querySelector('.custom-grid-header-row');
      if (headerRow) {
        headerRow.innerHTML = '';
        tableData.headers.forEach(header => {
          const th = document.createElement('th');
          th.style.padding = '8px';
          th.style.border = '1px solid #cbd5e1';
          th.innerHTML = `<input type="text" class="form-control text-sm header-input" value="${header}" style="font-weight: bold; background: #f1f5f9; text-align: center; width: 90%; margin: 0 auto; display: block;" />`;
          headerRow.appendChild(th);
        });
      }
    }
    // Then add rows
    tableData.rows.forEach(rowData => {
      addCustomRowToTable(tableWrapper, rowData);
    });
    recalculateMultiTableWidths(tableWrapper);
  }

  recalculateMultiTableWidths(tableWrapper);
  tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearAllCustomTables() {
  const container = document.getElementById('customTablesContainer');
  if (container) {
    container.innerHTML = `
      <div class="custom-table-wrapper" data-table-id="0" style="margin-bottom: 24px; padding: 16px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
        <div class="sub-section-header" style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <input type="text" class="form-control custom-table-title" placeholder="Table Title (e.g. Category-Wise Vacancy)" style="flex: 1; max-width: 300px; font-weight: 600;" />
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button type="button" class="btn-row-action" style="background: #e2e8f0; color: #334155;" data-action="add-column"><i class="fa-solid fa-columns"></i> Add Column</button>
            <button type="button" class="btn-row-action" style="background: #e2e8f0; color: #334155;" data-action="remove-column"><i class="fa-solid fa-minus"></i> Remove Column</button>
            <button type="button" class="btn-row-action btn-add" data-action="add-row"><i class="fa-solid fa-plus"></i> Add Row</button>
            <button type="button" class="btn-row-action btn-remove remove-table-btn" data-action="remove-table" style="background: #fee2e2;"><i class="fa-solid fa-trash"></i> Delete Table</button>
          </div>
        </div>
        <div style="overflow-x: auto; background: #ffffff; border: 1px solid var(--border); border-radius: 8px; padding: 12px;">
          <table class="custom-grid-table" style="width: 100%; border-collapse: collapse; min-width: 600px;">
            <thead>
              <tr class="custom-grid-header-row">
                <th style="padding: 8px; border: 1px solid #cbd5e1; width: 30%;"><input type="text" class="form-control text-sm header-input" value="Post Name" style="font-weight: bold; background: #f1f5f9; text-align: center; width: 90%; margin: 0 auto; display: block;" /></th>
                <th style="padding: 8px; border: 1px solid #cbd5e1; width: 20%;"><input type="text" class="form-control text-sm header-input" value="Total Post" style="font-weight: bold; background: #f1f5f9; text-align: center; width: 90%; margin: 0 auto; display: block;" /></th>
                <th style="padding: 8px; border: 1px solid #cbd5e1; width: 50%;"><input type="text" class="form-control text-sm header-input" value="Eligibility" style="font-weight: bold; background: #f1f5f9; text-align: center; width: 90%; margin: 0 auto; display: block;" /></th>
              </tr>
            </thead>
            <tbody class="custom-grid-body">
              <!-- Custom rows will be added here -->
            </tbody>
          </table>
        </div>
      </div>
    `;
    // Re-setup first table's listeners
    const firstTable = container.querySelector('.custom-table-wrapper');
    if (firstTable) {
      firstTable.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const action = e.target.closest('[data-action]').getAttribute('data-action');
          if (action === 'add-column') addCustomColumnToTable(firstTable);
          if (action === 'remove-column') removeCustomColumnFromTable(firstTable);
          if (action === 'add-row') addCustomRowToTable(firstTable);
          if (action === 'remove-table') {
            if (confirm('Are you sure you want to delete this table?')) {
              firstTable.remove();
            }
          }
        });
      });
    }
    nextTableId = 1;
  }
}

function setupMultiTableCellInputEvents(input) {
  if (!input) return;
  input.addEventListener('paste', (e) => {
    const pastedData = (e.clipboardData || window.clipboardData).getData('text');
    if (pastedData.includes('\n')) {
      e.preventDefault();
      const cleaned = pastedData
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join(' | ');
      
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const text = e.target.value;
      e.target.value = text.slice(0, start) + cleaned + text.slice(end);
      e.target.selectionStart = e.target.selectionEnd = start + cleaned.length;
      
      e.target.dispatchEvent(new Event('input'));
    }
  });
}
