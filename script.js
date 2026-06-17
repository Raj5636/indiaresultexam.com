// ES Module: UI interactions + Firestore data binding
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, getDocs, query, orderBy, where, addDoc, doc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getMessaging, getToken, onMessage, isSupported } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js';

// Utility functions for rendering states
function renderSkeleton(count, targetEl) {
  if (!targetEl) return;
  const skeletons = Array(count).fill('').map(() => `
    <div class="job-card skeleton">
      <div class="skeleton-header">
        <div class="skeleton-badge"></div>
        <div class="skeleton-date"></div>
      </div>
      <div class="skeleton-title"></div>
      <div class="skeleton-meta">
        <div class="skeleton-dept"></div>
        <div class="skeleton-location"></div>
      </div>
      <div class="skeleton-footer">
        <div class="skeleton-button"></div>
        <div class="skeleton-date"></div>
      </div>
    </div>
  `).join('');
  targetEl.innerHTML = skeletons;
}

function renderEmptyState(message, targetEl) {
  if (!targetEl) return;
  targetEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">
        <i class="fas fa-inbox"></i>
      </div>
      <h3>${message}</h3>
      <p>No data available at the moment. Please check back later.</p>
    </div>
  `;
}

// Add CSS for skeleton and empty states
const skeletonCSS = `
  <style>
    .skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .skeleton-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .skeleton-badge { width: 80px; height: 24px; border-radius: 12px; }
    .skeleton-date { width: 60px; height: 16px; border-radius: 4px; }
    .skeleton-title { width: 100%; height: 20px; border-radius: 4px; margin-bottom: 8px; }
    .skeleton-meta { display: flex; gap: 12px; margin-bottom: 12px; }
    .skeleton-dept { width: 120px; height: 16px; border-radius: 4px; }
    .skeleton-location { width: 80px; height: 16px; border-radius: 4px; }
    .skeleton-footer { display: flex; justify-content: space-between; align-items: center; }
    .skeleton-button { width: 100px; height: 32px; border-radius: 16px; }
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #666;
    }
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      color: #333;
    }
    .empty-state p {
      margin: 0;
      font-size: 14px;
    }
  </style>
`;

// Inject CSS once
if (!document.getElementById('skeleton-styles')) {
  const styleEl = document.createElement('div');
  styleEl.id = 'skeleton-styles';
  styleEl.innerHTML = skeletonCSS;
  document.head.appendChild(styleEl.firstElementChild);
}

const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

const sidebar = qs('aside.sidebar');
const hamburger = qs('.hamburger');
const backdrop = qs('[data-backdrop]');
const navItems = qsa('.sidebar__nav .nav__item');
const tabs = qsa('.tab');
const chips = qsa('.chip');
const jobsGrid = qs('#jobsGrid');
const tickerContent = qs('.live-ticker__content');
const resultsGridHome = qs('#resultsGridHome');
const admitGridHome = qs('#admitGridHome');
const yojanaGrid = qs('#yojanaGrid');
const outsourcingGrid = qs('#outsourcingGrid');
const jobDetailContainer = qs('#jobDetailContainer');

// Live listeners (unsub handlers)
let unsubJobsList = null;
let unsubResults = null;
let unsubAdmit = null;
let unsubJobDetail = null;

// Simple local data source (used when Firebase config is absent)
const JOBS = [];

// Mobile sidebar toggle
function openSidebar() {
  sidebar.classList.add('is-open');
  hamburger.setAttribute('aria-expanded', 'true');
  if (backdrop) backdrop.hidden = false;
}

// Firebase Cloud Messaging setup
async function initMessaging() {
  if (!window.firebaseConfig || !window.firebaseConfig.projectId) return;
  const supported = await isSupported().catch(() => false);
  if (!supported) return;
  const app = initializeApp(window.firebaseConfig);
  // Register service worker for push handling
  let reg;
  try {
    reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  } catch (e) {
    console.warn('Service worker registration failed', e);
    return;
  }
  const messaging = getMessaging(app);
  // Ask for permission
  let permission = Notification.permission;
  if (permission !== 'granted') {
    try {
      permission = await Notification.requestPermission();
    } catch (e) {
      console.warn('Notification permission request failed', e);
    }
  }
  if (permission !== 'granted') return;
  // Get token with VAPID key if provided
  const vapidKey = (window.firebaseConfig && window.firebaseConfig.vapidKey) || undefined;
  try {
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
    if (token) {
      localStorage.setItem('fcm_web_token', token);
      console.log('FCM token:', token);
      // TODO: send token to server/Firestore if needed
    }
  } catch (e) {
    console.warn('Failed to get FCM token', e);
  }
  // Foreground messages
  onMessage(messaging, (payload) => {
    console.log('FCM foreground message:', payload);
    try {
      const title = payload?.notification?.title || 'Notification';
      const options = {
        body: payload?.notification?.body || '',
        icon: payload?.notification?.icon || '/INDIAL.PNG',
        data: payload?.data || {}
      };
      if (Notification.permission === 'granted') {
        new Notification(title, options);
      }
    } catch (err) {
      // noop
    }
  });
}

// Router: Detect jobId in URL and render detail view
async function handleRoute() {
  const params = new URLSearchParams(location.search || '');
  const jobId = params.get('jobId');
  if (jobId) {
    await openJobDetail(jobId);
  }
  window.addEventListener('popstate', async () => {
    const p = new URLSearchParams(location.search || '');
    const id = p.get('jobId');
    if (id) await openJobDetail(id); else activateTab('home');
  });
  // Delegate clicks on card links to SPA navigation
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('a.card__link');
    if (!a) return;
    // If the link is meant to open in a new tab, do not intercept
    if (a.getAttribute('target') === '_blank') return;
    if (a.origin === location.origin) {
      e.preventDefault();
      const url = new URL(a.href);
      const id = url.searchParams.get('jobId');
      if (id) {
        history.pushState({}, '', `?jobId=${encodeURIComponent(id)}`);
        await openJobDetail(id);
      }
    }
  });
}

async function openJobDetail(id) {
  try {
    if (!window.firebaseConfig || !window.firebaseConfig.projectId) return;
    const app = initializeApp(window.firebaseConfig);
    const db = getFirestore(app);
    if (unsubJobDetail) { unsubJobDetail(); unsubJobDetail = null; }
    const docRef = doc(db, 'latest_jobs', id);
    unsubJobDetail = onSnapshot(docRef, (snap) => {
      let job = null;
      if (snap.exists()) {
        job = { id, ...snap.data() };
      } else {
        job = JOBS.find(j => j.id === id) || null;
      }
      if (!job) { activateTab('home'); return; }
      renderJobDetail(job);
      activateTab('job-detail');
    }, (e) => {
      console.error('Job detail listener error', e);
    });
  } catch (e) {
    console.error('Open job detail failed', e);
    const job = JOBS.find(j => j.id === id);
    if (job) { renderJobDetail(job); activateTab('job-detail'); }
  }
}

function renderTicker(items) {
  if (!tickerContent) return;
  if (!items || items.length === 0) {
    tickerContent.innerHTML = '<span class="ticker-item">No updates available</span>';
    return;
  }
  // Show only top 10 latest items in ticker
  const latestItems = items.slice(0, 10);
  tickerContent.innerHTML = latestItems.map(item => {
    const detailsHref = `details.html?id=${encodeURIComponent(item.id)}`;
    return `
      <a href="${detailsHref}" class="ticker-item">
        <span class="ticker-dot"></span>${item.title}
      </a>
    `;
  }).join('');
}

function renderJobDetail(job) {
  if (!jobDetailContainer) return;
  const {
    title = 'Untitled',
    department = '',
    lastDate = '',
    state = '',
    applyLink = '#',
    badge = ''
  } = job;
  jobDetailContainer.innerHTML = `
    <article class="card" style="padding:24px">
      <header class="card__header">
        <h2 class="section__title">${title}</h2>
        <span class="${badgeClass(badge)}">${badge || 'Open'}</span>
      </header>
      <div class="card__body">
        ${department ? `<p class="muted"><strong>Department:</strong> ${department}</p>` : ''}
        ${state ? `<p class="muted"><strong>State:</strong> ${state}</p>` : ''}
        ${lastDate ? `<p class="muted"><strong>Last Date:</strong> ${lastDate}</p>` : ''}
      </div>
      <footer class="card__footer" style="gap:10px; justify-content:flex-start">
        <a class="btn btn--primary" href="${applyLink || '#'}" target="_blank" rel="noopener noreferrer">Apply Online</a>
        <a class="link" href="/" onclick="history.back(); return false;">Back</a>
      </footer>
    </article>
  `;
}

// Generic loader into a specific grid by category
async function loadByCategoryToGrid(category, targetEl) {
  console.log(`Loading ${category} to grid...`);
  console.log('Target element:', targetEl);
  
  if (!window.firebaseConfig || !window.firebaseConfig.projectId) {
    console.log('Firebase config missing, using local fallback');
    // Local fallback: filter JOBS by category prefix
    const prefix = (category || '').toLowerCase();
    const items = JOBS.filter(j => (j.category||'').toLowerCase().startsWith(prefix))
      .sort((a,b) => (b.priority||0) - (a.priority||0));
    console.log(`Local fallback found ${items.length} items for ${category}`);
    if (!items.length) { renderEmptyState('Coming Soon', targetEl); return; }
    targetEl.innerHTML = items.map(jobCardTemplate).join('');
    return;
  }
  
  console.log('Initializing Firebase for category loading...');
  const app = initializeApp(window.firebaseConfig);
  const db = getFirestore(app);
  const jobsRef = collection(db, 'latest_jobs');
  // Real-time category listener
  const prefix = (category || '').toLowerCase();
  const q1 = query(jobsRef, orderBy('createdAt', 'desc'));
  const handler = (snap) => {
    console.log(`Category ${category} snapshot:`, snap.docs.length, 'documents');
    try {
      // Sort in JS to handle jobs updated today coming to the top
      const allCategoryDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          // Priority 1: Use sortIndex if available (Sarkari Result order)
          if (a.sortIndex !== undefined && b.sortIndex !== undefined) {
            return a.sortIndex - b.sortIndex;
          }
          // Priority 2: Use updatedAt/createdAt
          const timeA = (a.updatedAt?.seconds || a.createdAt?.seconds || 0);
          const timeB = (b.updatedAt?.seconds || b.createdAt?.seconds || 0);
          return timeB - timeA;
        });
          
        // Save globally for autocomplete
      if (!window.allJobsList) window.allJobsList = [];
      allCategoryDocs.forEach(item => {
        if (!window.allJobsList.find(x => x.id === item.id) && !item.deleted) {
          window.allJobsList.push(item);
        }
      });
      
      // DYNAMIC FILTER BASED ON CATEGORY PARAMETER
      console.log(`Filtering for category: "${category}"`);
      const items = allCategoryDocs
        .filter(j => j.approved === true) // Only show approved posts
        .filter(j => j.showOnHome !== false) // Only show if not explicitly hidden
        .filter(j => !j.deleted) // Don't show deleted posts
        .filter(j => {
          const jobCategory = String(j.category || '').toLowerCase();
          const targetCategory = String(category || '').toLowerCase();
          console.log(`Checking job: "${j.category}" -> matches "${category}":`, jobCategory.includes(targetCategory));
          
          // Special handling for Results/Result spelling
          if (targetCategory === 'results' || targetCategory === 'result') {
            return jobCategory.includes('result') || jobCategory.includes('results');
          }
          
          // Special handling for Admit Card/Admit spelling  
          if (targetCategory === 'admit card' || targetCategory === 'admit') {
            return jobCategory.includes('admit');
          }
          
          // Special handling for Latest Jobs/Job spelling
          if (targetCategory === 'latest jobs' || targetCategory === 'jobs' || targetCategory === 'job') {
            return jobCategory.includes('job') || jobCategory.includes('latest');
          }
          
          return jobCategory.includes(targetCategory);
        });
      console.log(`${category} section:`, items.length, 'items');
      console.log('Filtered items:', items.map(j => ({ id: j.id, category: j.category })));
      if (!items.length) { 
        console.log(`No items found for category "${category}", showing Coming Soon`);
        renderEmptyState('Coming Soon', targetEl); 
        return; 
      }
      targetEl.innerHTML = items.map(jobCardTemplate).join('');
      console.log(`Successfully rendered ${items.length} items for ${category}`);
    } catch (e) {
      console.error(`Category ${category} listener error:`, e);
    }
  };
  const unsub = onSnapshot(q1, handler);
  // Store unsubscribe for cleanup if needed
  if (!window.categoryUnsubs) window.categoryUnsubs = {};
  window.categoryUnsubs[category] = unsub;
}

function closeSidebar() {
  sidebar.classList.remove('is-open');
  hamburger.setAttribute('aria-expanded', 'false');
  if (backdrop) backdrop.hidden = true;
}

if (hamburger) {
  hamburger.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('is-open');
    isOpen ? closeSidebar() : openSidebar();
  });
}
if (backdrop) backdrop.addEventListener('click', closeSidebar);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSidebar();
});

// Tabs handling via sidebar nav
function activateTab(id) {
  tabs.forEach((t) => {
    const isTarget = t.id === id;
    t.toggleAttribute('hidden', !isTarget);
    t.classList.toggle('is-active', isTarget);
  });
  navItems.forEach((b) => {
    const match = b.getAttribute('data-tab-target') === id;
    b.classList.toggle('is-active', match);
    if (match) {
      b.setAttribute('aria-current', 'page');
    } else {
      b.removeAttribute('aria-current');
    }
  });
  // Close sidebar on mobile after navigation
  closeSidebar();
  // Re-apply scoped chip filter for the activated tab
  const activeTab = qs(`#${id}`);
  if (activeTab) {
    const selectedChip = qs('.chip.is-selected', activeTab) || qs('#home .chip.is-selected');
    if (selectedChip) {
      const s = selectedChip.getAttribute('data-state') || 'all';
      filterClassicInScope(activeTab, s);
    }
  }
}

// Explicitly set a nav button as active (overrides default Home highlight)
function setActiveNav(btn) {
  navItems.forEach((b) => {
    const active = b === btn;
    b.classList.toggle('is-active', active);
    if (active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
}

navItems.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab-target');
    if (target === 'education-dept') {
      location.href = '/education.html';
      return;
    }
    if (target === 'csc-services') {
      location.href = '/csc-services.html';
      return;
    }
    if (target === 'important-services') {
      location.href = '/important-services.html';
      return;
    }
    // If user clicks category items, open Home and filter classic panels
    if (target === 'latest-jobs') {
      activateTab('home');
      filterClassicCategory('jobs');
      setActiveNav(btn);
      return;
    }
    if (target === 'results') {
      activateTab('home');
      filterClassicCategory('results');
      setActiveNav(btn);
      return;
    }
    if (target === 'admit-cards') {
      activateTab('home');
      filterClassicCategory('admit');
      setActiveNav(btn);
      return;
    }
    if (target === 'home') {
      activateTab('home');
      showAllClassicPanels();
      setActiveNav(btn);
      return;
    }
    if (target) activateTab(target);
  });
});

// Connect classic trio headers to sidebar categories
qsa('.clickable-category').forEach((header) => {
  header.addEventListener('click', () => {
    const cat = header.getAttribute('data-category');
    let targetTab = '';
    
    if (cat === 'jobs') targetTab = 'latest-jobs';
    else if (cat === 'results') targetTab = 'results';
    else if (cat === 'admit') targetTab = 'admit-cards';
    
    if (targetTab) {
      const navBtn = qs(`.sidebar__nav .nav__item[data-tab-target="${targetTab}"]`);
      if (navBtn) {
        // Trigger the same logic as sidebar click
        activateTab('home');
        filterClassicCategory(cat);
        setActiveNav(navBtn);
      }
    }
  });
});

// Render helpers
function badgeClass(badge) {
  switch ((badge || '').toLowerCase()) {
    case 'new': return 'badge badge--new';
    case 'ending':
    case 'ending soon': return 'badge badge--ending';
    case 'success':
    case 'open': return 'badge badge--success';
    case 'result':
    case 'result out': return 'badge badge--result';
    default: return 'badge';
  }
}

function inferStateFromTitle(title, department) {
  const text = `${title} ${department || ''}`.toLowerCase();
  if (text.includes('upsssc') || text.includes('uttar pradesh') || text.includes('up police') || text.includes('allahabad high court') || text.includes('up higher') || text.includes('uppbpb')) return 'UP';
  if (text.includes('bssc') || text.includes('bihar') || text.includes('bpsc')) return 'Bihar';
  if (text.includes('mppsc') || text.includes('madhya pradesh') || text.includes('mp police')) return 'MP';
  if (text.includes('delhi') || text.includes('dsssb') || text.includes('dssb')) return 'Delhi';
  if (text.includes('rpsc') || text.includes('rajasthan') || text.includes('rsmssb')) return 'Rajasthan';
  if (text.includes('ukpsc') || text.includes('uttarakhand') || text.includes('uttrakhand')) return 'Uttrakhand';
  if (text.includes('hssc') || text.includes('haryana') || text.includes('hariyana')) return 'Hariyana';
  if (text.includes('gpsc') || text.includes('gujarat') || text.includes('gujrat')) return 'Gujrat';
  if (text.includes('army') || text.includes('navy') || text.includes('air force') || text.includes('coast guard') || text.includes('armed forces') || text.includes('nda') || text.includes('cds') || text.includes('agniveer') || text.includes('ssb ') || text.includes('bsf') || text.includes('crpf') || text.includes('itbp') || text.includes('cisf')) return 'Armed Forces';
  if (text.includes('railway') || text.includes('rrb') || text.includes('metro') || text.includes('loco pilot') || text.includes('ntpc')) return 'Railway';
  if (text.includes('ssc') || text.includes('cgl') || text.includes('chsl') || text.includes('mts') || text.includes('cpo')) return 'SSC';
  if (text.includes('ibps') || text.includes('sbi') || text.includes('bank') || text.includes('rbi') || text.includes('lic') || text.includes('clerk') || text.includes('probationary officer')) return 'Banking';
  return 'ALL';
}

function jobCardTemplate(job) {
  const {
    title = 'Untitled',
    department = '',
    lastDate = '',
    badge = '',
    applyLink = '#', // Changed from applyUrl to applyLink to match admin panel
    category = 'Job'
  } = job;
  const state = job.state || inferStateFromTitle(title, department);
  const detailsHref = job.id ? `details.html?id=${encodeURIComponent(job.id)}` : '#';
  
  // Choose button labels and icons based on category
  let primaryLabel = 'Apply Now';
  let primaryIcon = 'fa-paper-plane';
  
  if ((category || '').toLowerCase().startsWith('result')) {
    primaryLabel = 'Download';
    primaryIcon = 'fa-download';
  } else if ((category || '').toLowerCase().startsWith('admit')) {
    primaryLabel = 'Download';
    primaryIcon = 'fa-id-card';
  } else if ((category || '').toLowerCase().includes('yojana') || (category || '').toLowerCase().includes('scheme')) {
    primaryLabel = 'Details / Apply';
    primaryIcon = 'fa-up-right-from-square';
  }
  
  // Apply Now uses applyLink from admin panel; if empty, disable or show Coming Soon
  const applyTarget = applyLink || null;
  const isApplyDisabled = !applyTarget || applyTarget === '#';
  const applyButtonHtml = isApplyDisabled
    ? `<button class="btn-disabled-soon" disabled><i class="fa-solid fa-hourglass-start"></i> Coming Soon</button>`
    : `<a class="btn-apply-now" href="${applyTarget}" target="_blank" rel="noopener noreferrer"><i class="fa-solid ${primaryIcon}"></i> ${primaryLabel}</a>`;
    
  const catLower = (category || '').toLowerCase();
  const whatsappNumber = (window.firebaseConfig && window.firebaseConfig.whatsappNumber) || '919548816799';
  const tmpDiv = document.createElement('div');
  tmpDiv.innerHTML = String(title);
  const plainTitle = tmpDiv.textContent || tmpDiv.innerText || 'Job';
  
  let btnLabel = 'व्हाट्सएप से घर बैठे फॉर्म भरवाएं';
  let msgText = `प्रणाम India Result Exam! मुझे "${plainTitle}" का फॉर्म भरवाना है। वेबसाइट लॉन्च ऑफर के तहत मात्र ₹49 में फॉर्म भरें। कृपया जरूरी दस्तावेजों (Documents) की लिस्ट भेजें।`;
  
  if (catLower.includes('admit')) {
    btnLabel = 'व्हाट्सएप से घर बैठे फ्री में एडमिट कार्ड मंगवाएं';
    msgText = `प्रणाम India Result Exam! मुझे "${plainTitle}" का एडमिट कार्ड (Admit Card) डाउनलोड करवाना है। कृपया मदद करें।`;
  } else if (catLower.includes('result')) {
    btnLabel = 'व्हाट्सएप से घर बैठे फ्री में Result देखें';
    msgText = `प्रणाम India Result Exam! मुझे "${plainTitle}" का रिजल्ट (Result) चेक / डाउनलोड करवाना है। कृपया मदद करें।`;
  }
  
  const encodedText = encodeURIComponent(msgText);
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodedText}`;
  
  // Only show ₹49 offer for Jobs, not for Admit Card or Result
  let offerBadge = '';
  if (!catLower.includes('admit') && !catLower.includes('result')) {
    offerBadge = ` <span class="badge badge--new" style="background: white; color: #138808; font-size: 10px; margin-left: 5px;">₹49 Offer</span>`;
  }
  
  const whatsappButtonHtml = `<a class="btn-whatsapp" href="${whatsappLink}" target="_blank" rel="noopener noreferrer" title="${btnLabel}"><i class="fa-brands fa-whatsapp"></i> ${btnLabel}${offerBadge}</a>`;
    
  return `
    <article class="card" data-state="${state}">
      <a href="${detailsHref}" style="text-decoration: none; display: block; color: inherit;">
        <header class="card__header">
          <h4 class="card__title">${title}</h4>
          <span class="${badgeClass(badge)}">${badge ? (badge[0].toUpperCase()+badge.slice(1)) : 'Open'}</span>
        </header>
        <div class="card__body">
          ${department ? `<p class="muted">Department: ${department}</p>` : ''}
          ${lastDate ? `<p class="muted">Last Date: ${lastDate}</p>` : ''}
        </div>
        <footer class="card__footer">
          ${applyButtonHtml}
          <a class="btn-more-details" href="${detailsHref}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-circle-info"></i> More Detail</a>
          ${whatsappButtonHtml}
        </footer>
      </a>
    </article>
  `;
}

function getActiveSearchQuery() {
  const searchInput = qs('.header__search input');
  return searchInput ? searchInput.value.trim().toLowerCase() : '';
}

function applySearchAndFilter() {
  const activeTab = qs('.tab.is-active') || qs('#home');
  const selectedChip = qs('.filters .chips .chip.is-selected', activeTab) || qs('#home .chip.is-selected');
  const state = selectedChip ? (selectedChip.getAttribute('data-state') || 'all') : 'all';
  
  filterClassicInScope(activeTab, state);
  if (activeTab.id === 'home') {
    filterJobs(state);
  }
}

// State chips filtering (grids)
function filterJobs(state) {
  if (!jobsGrid) return;
  const mainQueryText = getActiveSearchQuery();
  const listId = jobsGrid.id;
  const localQueryText = (window.localSearchQueries && window.localSearchQueries[listId]) || '';
  
  const cards = qsa('.card', jobsGrid);
  cards.forEach((card) => {
    const s = card.getAttribute('data-state') || 'ALL';
    const matchesState = state === 'all' ? true : (s === state);
    const text = card.textContent.toLowerCase();
    
    const matchesMainSearch = !mainQueryText || text.includes(mainQueryText);
    const matchesLocalSearch = !localQueryText || text.includes(localQueryText);
    
    const visible = matchesState && matchesMainSearch && matchesLocalSearch;
    card.style.display = visible ? '' : 'none';
  });
}

// State filtering for classic trio (Results / Admit / Latest Jobs)
function filterClassicTrio(state) {
  // Backward compatibility: filter items in the Home classic trio
  const scope = qs('#home');
  if (scope) filterClassicInScope(scope, state);
}

// New: filter only within a given tab/scope
function filterClassicInScope(scopeEl, state) {
  if (!scopeEl) return;
  const mainQueryText = getActiveSearchQuery();
  const lists = qsa('.classic-list', scopeEl);
  
  lists.forEach((list) => {
    const listId = list.id;
    const localQueryText = (window.localSearchQueries && window.localSearchQueries[listId]) || '';
    
    const items = qsa('.classic-item:not(.local-empty-state), .card:not(.local-empty-state)', list);
    let visibleCount = 0;
    
    items.forEach((el) => {
      const s = el.getAttribute('data-state') || 'ALL';
      const matchesState = state === 'all' ? true : (s === state);
      const text = el.textContent.toLowerCase();
      
      const matchesMainSearch = !mainQueryText || text.includes(mainQueryText);
      const matchesLocalSearch = !localQueryText || text.includes(localQueryText);
      
      const visible = matchesState && matchesMainSearch && matchesLocalSearch;
      el.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });
    
    let localEmpty = list.querySelector('.local-empty-state');
    
    if (visibleCount === 0 && items.length > 0) {
      if (!localEmpty) {
        localEmpty = document.createElement('div');
        localEmpty.className = 'local-empty-state empty-state';
        localEmpty.innerHTML = `
          <div class="empty-icon"><i class="fas fa-search"></i></div>
          <h3>कोई परिणाम नहीं मिला</h3>
          <p>इस राज्य या फ़िल्टर के लिए कोई जानकारी उपलब्ध नहीं है।</p>
        `;
        list.appendChild(localEmpty);
      } else {
        localEmpty.style.display = '';
      }
    } else {
      if (localEmpty) {
        localEmpty.style.display = 'none';
      }
    }
  });
}

// Sidebar category filtering for Home classic panels
function showAllClassicPanels() {
  qsa('.classic-panel').forEach(p => { p.style.display = ''; });
  const trio = qs('.classic-trio');
  if (trio) trio.classList.remove('classic-trio--single');
}

function filterClassicCategory(category) {
  const panels = {
    jobs: qs('.classic-panel--jobs'),
    results: qs('.classic-panel--results'),
    admit: qs('.classic-panel--admit')
  };
  // Hide all first
  qsa('.classic-panel').forEach(p => { if (p) p.style.display = 'none'; });
  // Show selected
  const key = (category || '').toLowerCase();
  const target = panels[key];
  if (target) target.style.display = '';
  const trio = qs('.classic-trio');
  if (trio) {
    trio.classList.add('classic-trio--single');
    // Removed auto-scroll
  }
}

// Scoped chip handling: each tab manages its own selection and filtering
qsa('.filters .chips').forEach((container) => {
  qsa('.chip', container).forEach((chip) => {
    chip.addEventListener('click', () => {
      const scopeTab = container.closest('.tab') || document;
      const selectedState = chip.getAttribute('data-state') || 'all';
      // Toggle selection only within this container
      qsa('.chip', container).forEach((c) => {
        const active = c === chip;
        c.classList.toggle('is-selected', active);
        c.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      // Apply filtering within this tab/scope
      filterClassicInScope(scopeTab, selectedState);
      // Apply grid filtering on jobs grid only when we are on home
      if (scopeTab && scopeTab.id === 'home') {
        filterJobs(selectedState);
      }
    });
  });
});
async function loadJobsFromFirestore() {
  console.log('Loading jobs from Firestore...');
  console.log('Firebase config:', window.firebaseConfig);
  
  if (!window.firebaseConfig || !window.firebaseConfig.projectId) {
    console.log('Firebase config missing, using local fallback');
    // Local fallback render from JOBS into cards
    if (jobsGrid) {
      const items = [...JOBS].filter(j => (j.category||'').toLowerCase().startsWith('job'))
        .sort((a,b) => (b.priority||0) - (a.priority||0));
      if (!items.length) { renderEmptyState('No Jobs Found', jobsGrid); return; }
      jobsGrid.innerHTML = items.map(jobCardTemplate).join('');
      renderTicker(items);
    }
    if (resultsGridHome) {
      const items = JOBS.filter(j => (j.category||'').toLowerCase().startsWith('result'))
        .sort((a,b) => (b.priority||0) - (a.priority||0));
      if (!items.length) renderEmptyState('Coming Soon', resultsGridHome); else resultsGridHome.innerHTML = items.map(jobCardTemplate).join('');
    }
    if (admitGridHome) {
      const items = JOBS.filter(j => (j.category||'').toLowerCase().startsWith('admit'))
        .sort((a,b) => (b.priority||0) - (a.priority||0));
      if (!items.length) renderEmptyState('Coming Soon', admitGridHome); else admitGridHome.innerHTML = items.map(jobCardTemplate).join('');
    }
    return;
  }
  
  console.log('Initializing Firebase app...');
  try {
    const app = initializeApp(window.firebaseConfig);
    const db = getFirestore(app);
    const jobsRef = collection(db, 'latest_jobs');
    
    console.log('Firebase app initialized successfully');
    console.log('Collection path:', jobsRef.path);
  
    // Real-time main jobs list
    if (unsubJobsList) { unsubJobsList(); unsubJobsList = null; }
    // Sort by createdAt as base, but we will re-sort in JS for updatedAt
    const qMain = query(jobsRef, orderBy('createdAt', 'desc'));
  
    console.log('Setting up Firestore listener...');
    unsubJobsList = onSnapshot(qMain, (snap) => {
      console.log('Firestore snapshot received:', snap.docs.length, 'documents');
      try {
        // Sort in JS to handle jobs updated today coming to the top
        const allMainDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            // Priority 1: Use sortIndex if available (Sarkari Result order)
            if (a.sortIndex !== undefined && b.sortIndex !== undefined) {
              return a.sortIndex - b.sortIndex;
            }
            // Priority 2: Use updatedAt/createdAt
            const timeA = (a.updatedAt?.seconds || a.createdAt?.seconds || 0);
            const timeB = (b.updatedAt?.seconds || b.createdAt?.seconds || 0);
            return timeB - timeA;
          });
        
        // Render Ticker with latest items
        renderTicker(allMainDocs);
        
        // Save globally for autocomplete
        if (!window.allJobsList) window.allJobsList = [];
        allMainDocs.forEach(item => {
          if (!window.allJobsList.find(x => x.id === item.id) && !item.deleted) {
            window.allJobsList.push(item);
          }
        });
        
        // FILTER FOR LATEST JOBS SECTION ONLY
        const jobs = allMainDocs
          .filter(j => j.approved === true) // Only show approved posts
          .filter(j => (String(j.category || '').toLowerCase().includes('job') || 
                     String(j.category || '').toLowerCase().includes('latest')))
          .filter(j => j.showOnHome !== false) // Only show if not explicitly hidden
          .filter(j => !j.deleted); // Don't show deleted posts
        console.log('Latest Jobs section:', jobs.length, 'items');
        console.log('Jobs data sample:', jobs.slice(0, 2));
        console.log('Category check:', jobs.map(j => ({ id: j.id, category: j.category })));
        
        if (jobsGrid) {
          if (!jobs || jobs.length === 0) {
            console.log('No jobs found, using local fallback');
            const items = [...JOBS].filter(j => (j.category||'').toLowerCase().startsWith('job'))
              .sort((a,b) => (b.priority||0) - (a.priority||0));
            if (!items.length) { renderEmptyState('No Jobs Found', jobsGrid); return; }
            jobsGrid.innerHTML = items.map(jobCardTemplate).join('');
          } else {
            console.log('Rendering jobs to grid');
            console.log('Jobs grid element:', jobsGrid);
            jobsGrid.innerHTML = jobs.map(jobCardTemplate).join('');
            console.log('Jobs grid HTML set successfully');
          }
          const selectedChip = qs('.chip.is-selected');
          if (selectedChip) filterJobs(selectedChip.getAttribute('data-state'));
        }
      } catch (e) {
        console.error('Jobs list listener error:', e);
      }
    }, (err) => {
      console.error('onSnapshot main list error', err);
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Initialize defaults
(async function init() {
  console.log('=== PAGE INITIALIZATION START ===');
  
  // Check Firebase configuration first
  if (!window.firebaseConfig || !window.firebaseConfig.projectId) {
    console.error('Firebase configuration missing or incomplete');
    console.log('Firebase config:', window.firebaseConfig);
    return;
  }
  
  console.log('Firebase config available:', window.firebaseConfig.projectId);
  
  // Ensure only the active tab is visible on load
  const active = qs('.sidebar__nav .nav__item.is-active');
  if (active) {
    const target = active.getAttribute('data-tab-target');
    if (target) activateTab(target);
  }
  // Handle incoming hash routes (e.g., from details page redirects)
  const hash = (location.hash || '').toLowerCase();
  if (hash) {
    if (hash === '#results') {
      activateTab('home');
      filterClassicCategory('results');
    } else if (hash === '#admit-cards') {
      activateTab('home');
      filterClassicCategory('admit');
    } else if (hash === '#latest-jobs') {
      activateTab('home');
      filterClassicCategory('jobs');
    } else if (hash === '#home') {
      activateTab('home');
      showAllClassicPanels();
    } else if (hash === '#answer-key') {
      activateTab('answer-key');
    } else if (hash === '#admission') {
      activateTab('admission');
    } else if (hash === '#otr') {
      activateTab('otr');
    } else if (hash === '#education-dept') {
      activateTab('education-dept');
    } else if (hash === '#csc-services') {
      activateTab('csc-services');
    } else if (hash === '#sarkari-yojana') {
      activateTab('sarkari-yojana');
    } else if (hash === '#outsourcing-jobs') {
      activateTab('outsourcing-jobs');
    }
  }
  await handleRoute();

  // Load Maintenance Mode Status
  try {
    const app = initializeApp(window.firebaseConfig);
    const db = getFirestore(app);
    onSnapshot(doc(db, 'settings', 'siteConfig'), (snap) => {
      const maintenanceBar = document.querySelector('.maintenance-notice');
      if (maintenanceBar) {
        if (snap.exists() && snap.data().maintenanceMode) {
          maintenanceBar.style.display = 'block';
        } else {
          maintenanceBar.style.display = 'none';
        }
      }
    });
  } catch (err) {
    console.error('Error listening to maintenance mode:', err);
  }
  
  // Load jobs with better error handling
  console.log('=== STARTING DATA LOADING ===');
  try {
    // Show skeleton loaders
    if (jobsGrid) {
      console.log('Showing skeleton for jobs grid');
      renderSkeleton(6, jobsGrid);
    }
    
    // Load from Firestore
    console.log('Loading jobs from Firestore...');
    await loadJobsFromFirestore();
    
    // Load Results & Admit Cards sections
    if (resultsGridHome) {
      console.log('Loading results...');
      renderSkeleton(6, resultsGridHome);
      await loadByCategoryToGrid('Results', resultsGridHome);
    }
    if (admitGridHome) {
      console.log('Loading admit cards...');
      renderSkeleton(6, admitGridHome);
      await loadByCategoryToGrid('Admit Card', admitGridHome);
    }
    if (yojanaGrid) {
      console.log('Loading yojana...');
      renderSkeleton(6, yojanaGrid);
      await loadByCategoryToGrid('Sarkari Yojana', yojanaGrid);
    }
    if (outsourcingGrid) {
      console.log('Loading outsourcing jobs...');
      renderSkeleton(6, outsourcingGrid);
      await loadByCategoryToGrid('Outsourcing', outsourcingGrid);
    }
    
    console.log('=== DATA LOADING COMPLETED SUCCESSFULLY ===');
  } catch (e) {
    console.error('=== DATA LOADING FAILED ===', e);
    console.error('Error details:', e.message, e.stack);
    
    // Show empty states as fallback
    if (jobsGrid) {
      console.log('Showing empty state for jobs grid');
      renderEmptyState('No Jobs Found', jobsGrid);
    }
    if (resultsGridHome) {
      console.log('Showing empty state for results grid');
      renderEmptyState('Coming Soon', resultsGridHome);
    }
    if (admitGridHome) {
      console.log('Showing empty state for admit grid');
      renderEmptyState('Coming Soon', admitGridHome);
    }
    if (yojanaGrid) {
      console.log('Showing empty state for yojana grid');
      renderEmptyState('Coming Soon', yojanaGrid);
    }
  }
  
  // Initialize FCM (non-blocking)
  try {
    await initMessaging();
  } catch (e) {
    console.warn('FCM initialization failed:', e);
  }
})();

// Keyboard '/' Shortcut for Search & Ticker SPA navigation clicks
(function initInteractivity() {
  // Trio Expansion Toggle
  const trioExpandBtn = document.getElementById('trioExpandBtn');
  const classicTrio = document.getElementById('classicTrio');
  const combinedGrid = document.getElementById('combinedGrid');
  const combinedList = document.getElementById('combinedList');
  
  function isMobile() {
    return window.innerWidth <= 768;
  }
  
  function updateCombinedGrid() {
    if (!combinedList) return;
    
    // Get all cards from all three grids and only keep approved ones
    const allCards = [];
    
    // Add approved cards from jobs grid
    const jobCards = document.querySelectorAll('#jobsGrid .card');
    jobCards.forEach(card => {
      // Check if the original job data was approved (we'll need to find the job in allJobsList)
      const title = card.querySelector('.card__title')?.textContent?.trim();
      const job = (window.allJobsList || []).find(j => j.title?.trim() === title);
      if (job && job.approved !== false) {
        allCards.push(card.outerHTML);
      }
    });
    
    // Add approved cards from admit grid
    const admitCards = document.querySelectorAll('#admitGridHome .card');
    admitCards.forEach(card => {
      const title = card.querySelector('.card__title')?.textContent?.trim();
      const job = (window.allJobsList || []).find(j => j.title?.trim() === title);
      if (job && job.approved !== false) {
        allCards.push(card.outerHTML);
      }
    });
    
    // Add approved cards from results grid
    const resultCards = document.querySelectorAll('#resultsGridHome .card');
    resultCards.forEach(card => {
      const title = card.querySelector('.card__title')?.textContent?.trim();
      const job = (window.allJobsList || []).find(j => j.title?.trim() === title);
      if (job && job.approved !== false) {
        allCards.push(card.outerHTML);
      }
    });
    
    combinedList.innerHTML = allCards.join('');
    
    // Also copy over the filter visibility
    const activeStateChip = document.querySelector('.chips .chip.is-selected');
    if (activeStateChip) {
      const state = activeStateChip.getAttribute('data-state') || 'all';
      filterCombinedGrid(state);
    }
  }
  
  function filterCombinedGrid(state) {
    if (!combinedList) return;
    const cards = combinedList.querySelectorAll('.card');
    const mainQueryText = getActiveSearchQuery();
    
    cards.forEach(card => {
      const s = card.getAttribute('data-state') || 'ALL';
      const matchesState = state === 'all' ? true : (s === state);
      const text = card.textContent.toLowerCase();
      const matchesMainSearch = !mainQueryText || text.includes(mainQueryText);
      
      card.style.display = (matchesState && matchesMainSearch) ? '' : 'none';
    });
  }
  
  if (trioExpandBtn && classicTrio) {
    trioExpandBtn.addEventListener('click', () => {
      const isExpanded = classicTrio.classList.toggle('is-expanded');
      trioExpandBtn.classList.toggle('is-active', isExpanded);
      
      if (isMobile()) {
        if (isExpanded) {
          // Show combined grid, hide trio
          updateCombinedGrid();
          classicTrio.hidden = true;
          if (combinedGrid) combinedGrid.hidden = false;
        } else {
          // Show trio, hide combined grid
          classicTrio.hidden = false;
          if (combinedGrid) combinedGrid.hidden = true;
        }
      }
    });
    
    // Also update combined grid when state chips are clicked
    const stateChips = document.querySelectorAll('.chips .chip');
    stateChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const state = chip.getAttribute('data-state') || 'all';
        filterCombinedGrid(state);
      });
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      if (!isMobile()) {
        // On desktop, always show trio, hide combined grid
        classicTrio.hidden = false;
        if (combinedGrid) combinedGrid.hidden = true;
      }
    });
  }

  // Theme toggle button logic
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    const updateIcon = (theme) => {
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        if (theme === 'dark') {
          icon.className = 'fa-solid fa-sun';
        } else {
          icon.className = 'fa-solid fa-moon';
        }
      }
    };
    
    // Set initial icon
    const currentTheme = localStorage.getItem('theme') || 'light';
    updateIcon(currentTheme);
    
    toggleBtn.addEventListener('click', () => {
      const isDark = document.body.getAttribute('data-theme') === 'dark';
      const nextTheme = isDark ? 'light' : 'dark';
      
      if (nextTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      }
      updateIcon(nextTheme);
    });
  }

  // Real-time dynamic search input listener
  const searchInput = qs('.header__search input');
  const suggestionsDiv = document.getElementById('searchSuggestions');
  
  // Initialize local search queries storage
  window.localSearchQueries = {};

  // Panel-specific search inputs (Latest Jobs, Admit Cards, Results)
  const panelSearchInputs = qsa('.panel-search__input');
  panelSearchInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const queryText = e.target.value.toLowerCase().trim();
      const targetId = e.target.getAttribute('data-target');
      
      // Store the local query
      window.localSearchQueries[targetId] = queryText;
      
      // Re-apply all filters
      applySearchAndFilter();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applySearchAndFilter();
      
      // Autocomplete list
      const val = searchInput.value.trim().toLowerCase();
      if (!val || !window.allJobsList || window.allJobsList.length === 0 || !suggestionsDiv) {
        if (suggestionsDiv) {
          suggestionsDiv.hidden = true;
          suggestionsDiv.innerHTML = '';
        }
        return;
      }
      
      const matches = window.allJobsList.filter(job => !job.deleted).filter(job => {
        const title = String(job.title || '').toLowerCase();
        const dept = String(job.department || '').toLowerCase();
        return title.includes(val) || dept.includes(val);
      }).slice(0, 8);
      
      if (matches.length === 0) {
        suggestionsDiv.hidden = true;
        suggestionsDiv.innerHTML = '';
        return;
      }
      
      suggestionsDiv.innerHTML = matches.map(job => {
        const category = String(job.category || 'Job').toLowerCase();
        let catClass = 'category-job';
        if (category.includes('result')) catClass = 'category-result';
        else if (category.includes('admit')) catClass = 'category-admit';
        else if (category.includes('yojana') || category.includes('scheme')) catClass = 'category-yojana';
        
        const displayCat = job.category || 'Job';
        return `
          <a href="/details.html?id=${encodeURIComponent(job.id)}" class="search-suggestion-item">
            <span>${job.title}</span>
            <span class="suggestion-category ${catClass}">${displayCat}</span>
          </a>
        `;
      }).join('');
      suggestionsDiv.hidden = false;
    });
  }

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (searchInput && suggestionsDiv && !searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
      suggestionsDiv.hidden = true;
    }
  });

  // Prevent form submission on enter key press
  const searchForm = qs('.header__search');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
    });
  }

  document.addEventListener('keydown', (e) => {
    // Focus search input when '/' is pressed, unless an input/textarea is already focused
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      const searchInput = qs('.header__search input');
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select(); // Highlight text if any
      }
    }
  });

  document.addEventListener('click', (e) => {
    const tickerLink = e.target.closest('.ticker-item');
    if (tickerLink) {
      e.preventDefault();
      const href = tickerLink.getAttribute('href');
      if (href === '#latest-jobs') {
        activateTab('home');
        filterClassicCategory('jobs');
        setActiveNav(qs('[data-tab-target="latest-jobs"]'));
      } else if (href === '#results') {
        activateTab('home');
        filterClassicCategory('results');
        setActiveNav(qs('[data-tab-target="results"]'));
      } else if (href === '#admit-cards') {
        activateTab('home');
        filterClassicCategory('admit');
        setActiveNav(qs('[data-tab-target="admit-cards"]'));
      }
      return;
    }

    const viewAllBtn = e.target.closest('.btn-view-all');
    if (viewAllBtn) {
      const target = viewAllBtn.getAttribute('data-tab-target');
      if (target) {
        const navBtn = qs(`.sidebar__nav .nav__item[data-tab-target="${target}"]`);
        if (navBtn) {
          navBtn.click();
        } else {
          activateTab(target);
        }
      }
    }
  });
})();

// Seed helper (runs only when URL has ?seed=up-pc-2026)
async function seedUPPoliceJob() {
  try {
    const params = new URLSearchParams(location.search || '');
    if (params.get('seed') !== 'up-pc-2026') return;
    if (!window.firebaseConfig || !window.firebaseConfig.projectId) return;
    if (localStorage.getItem('seeded-up-pc-2026')) return;
    const app = initializeApp(window.firebaseConfig);
    const db = getFirestore(app);
    const jobsRef = collection(db, 'latest_jobs');
    const payload = {
      title: 'UP Police Constable Recruitment 2026 {32679 Post} Apply Online',
      department: 'Uttar Pradesh Police Recruitment & Promotion Board (UPPRPB)',
      lastDate: '30 Jan 2026',
      applyLink: 'https://sarkariresult.com.im/up-police-constable-recruitment-2026/',
      category: 'Job',
      state: 'UP',
      priority: 100,
      badge: 'New'
    };
    await addDoc(jobsRef, payload);
    localStorage.setItem('seeded-up-pc-2026', '1');
    console.log('Seeded: UP Police Constable 2026');
  } catch (e) {
    console.error('Seeding failed', e);
  }
}

// --- Phase 6: Image Resizer & WhatsApp Sticky Widget ---

function compressImage(img, targetWidth, targetHeight, maxKb, format, callback) {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const type = format === 'png' ? 'image/png' : 'image/jpeg';
  
  if (format === 'png') {
    canvas.toBlob((blob) => {
      callback(blob);
    }, type);
    return;
  }
  
  let minQuality = 0.01;
  let maxQuality = 0.99;
  let bestQuality = 0.8;
  let bestBlob = null;
  let iterations = 0;
  
  function checkQuality() {
    if (iterations >= 10) {
      callback(bestBlob || new Blob());
      return;
    }
    iterations++;
    const q = (minQuality + maxQuality) / 2;
    canvas.toBlob((blob) => {
      if (!blob) {
        callback(new Blob());
        return;
      }
      const sizeKb = blob.size / 1024;
      if (sizeKb <= maxKb) {
        bestBlob = blob;
        bestQuality = q;
        minQuality = q;
      } else {
        maxQuality = q;
        if (!bestBlob) bestBlob = blob;
      }
      checkQuality();
    }, type, q);
  }
  
  checkQuality();
}

function initImageResizer() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const imageSettings = document.getElementById('imageSettings');
  const processBtn = document.getElementById('processBtn');
  const resetBtn = document.getElementById('resetBtn');
  const previewPlaceholder = document.getElementById('previewPlaceholder');
  const previewContent = document.getElementById('previewContent');
  const imgPreview = document.getElementById('imgPreview');
  const origSize = document.getElementById('origSize');
  const newSize = document.getElementById('newSize');
  const newDimensions = document.getElementById('newDimensions');
  const imgWidth = document.getElementById('imgWidth');
  const imgHeight = document.getElementById('imgHeight');
  const maxKb = document.getElementById('maxKb');
  const imgFormat = document.getElementById('imgFormat');
  
  if (!dropzone || !fileInput) return;
  
  let loadedImage = null;
  let originalFile = null;
  
  dropzone.addEventListener('click', () => fileInput.click());
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });
  
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });
  
  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, JPEG, PNG).');
      return;
    }
    originalFile = file;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        loadedImage = img;
        imgWidth.value = img.naturalWidth;
        imgHeight.value = img.naturalHeight;
        
        imageSettings.style.display = 'block';
        previewPlaceholder.style.display = 'none';
        previewContent.style.display = 'flex';
        imgPreview.src = event.target.result;
        origSize.textContent = formatBytes(file.size);
        
        newSize.textContent = '-';
        newDimensions.textContent = `${img.naturalWidth} x ${img.naturalHeight} px`;
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  const presetBtns = document.querySelectorAll('.preset-btn');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const w = btn.getAttribute('data-w');
      const h = btn.getAttribute('data-h');
      const kb = btn.getAttribute('data-kb');
      if (w) imgWidth.value = w;
      if (h) imgHeight.value = h;
      if (kb) maxKb.value = kb;
      imgFormat.value = 'jpeg';
    });
  });
  
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  resetBtn.addEventListener('click', () => {
    fileInput.value = '';
    loadedImage = null;
    originalFile = null;
    imageSettings.style.display = 'none';
    previewPlaceholder.style.display = 'flex';
    previewContent.style.display = 'none';
    imgPreview.src = '';
  });
  
  processBtn.addEventListener('click', () => {
    if (!loadedImage) return;
    
    const w = parseInt(imgWidth.value, 10);
    const h = parseInt(imgHeight.value, 10);
    const kb = parseInt(maxKb.value, 10);
    const format = imgFormat.value;
    
    if (isNaN(w) || w <= 0 || isNaN(h) || h <= 0 || isNaN(kb) || kb <= 0) {
      alert('Please enter valid width, height, and file size values.');
      return;
    }
    
    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    
    compressImage(loadedImage, w, h, kb, format, (blob) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        imgPreview.src = event.target.result;
        newSize.textContent = formatBytes(blob.size);
        newDimensions.textContent = `${w} x ${h} px`;
        
        const link = document.createElement('a');
        link.href = event.target.result;
        const nameParts = originalFile.name.split('.');
        const ext = format === 'png' ? 'png' : 'jpg';
        link.download = `${nameParts.slice(0, -1).join('.')}_resized.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fa-solid fa-gears"></i> Compress &amp; Download';
      };
      reader.readAsDataURL(blob);
    });
  });
}

function initWhatsAppWidget() {
  if (document.getElementById('whatsappStickyWidget')) return;
  if (sessionStorage.getItem('waWidgetDismissed') === 'true') return;
  
  const groupLink = (window.firebaseConfig && window.firebaseConfig.whatsappGroupLink) || 'https://chat.whatsapp.com/invite/placeholder';
  
  const widget = document.createElement('div');
  widget.id = 'whatsappStickyWidget';
  widget.className = 'whatsapp-sticky-widget';
  
  widget.innerHTML = `
    <a href="${groupLink}" target="_blank" rel="noopener noreferrer" class="widget-link">
      <i class="fa-brands fa-whatsapp"></i>
      <span class="widget-text">व्हाट्सएप चैनल पर instant सरकारी नौकरी अलर्ट पाएं (Join Channel)</span>
    </a>
    <button type="button" class="widget-close" aria-label="Close widget">&times;</button>
  `;
  
  document.body.appendChild(widget);
  
  setTimeout(() => {
    widget.classList.add('is-visible');
  }, 2000);
  
  const closeBtn = widget.querySelector('.widget-close');
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    widget.classList.remove('is-visible');
    sessionStorage.setItem('waWidgetDismissed', 'true');
  });
}



function initWhatsAppPromoBanner() {
  const promoBtn = document.getElementById('homepageWhatsappPromoBtn');
  if (promoBtn) {
    const whatsappNumber = (window.firebaseConfig && window.firebaseConfig.whatsappNumber) || '919548816799';
    const msgText = 'प्रणाम India Result Exam! मुझे व्हाट्सएप सेवाओं (एडमिट कार्ड, रिजल्ट, फॉर्म) के बारे में जानकारी चाहिए।';
    promoBtn.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msgText)}`;
  }
}

// Initialise on load
if (typeof document !== 'undefined') {
  initWhatsAppWidget();
  initImageResizer();
  initWhatsAppPromoBanner();
}
