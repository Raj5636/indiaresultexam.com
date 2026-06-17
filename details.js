import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const qs = (s, r = document) => r.querySelector(s);

function sanitize(html) {
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  const scripts = template.content.querySelectorAll('script');
  scripts.forEach((n) => n.remove());
  return template.innerHTML;
}

async function injectShellFromIndex() {
  try {
    const res = await fetch('/index.html', { credentials: 'same-origin' });
    const text = await res.text();
    const docFrag = document.implementation.createHTMLDocument('index');
    docFrag.documentElement.innerHTML = text;
    const sidebar = docFrag.querySelector('.sidebar');
    const header = docFrag.querySelector('.header');
    if (sidebar) {
      const targetSidebar = qs('#injectedSidebar');
      targetSidebar.innerHTML = sidebar.innerHTML;
      targetSidebar.hidden = false;
    }
    if (header) {
      const targetHeader = qs('#injectedHeader');
      targetHeader.innerHTML = header.innerHTML;
    }
    
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

    // Enable hamburger toggle logic minimally if present
    const hamburger = qs('.hamburger');
    const app = qs('.app');
    if (hamburger && app) {
      hamburger.addEventListener('click', (e) => {
        e.preventDefault();
        app.classList.toggle('sidebar-open');
      });
    }
    // Sidebar nav redirect to index with hash so categories work from details page
    const navBtns = Array.from(document.querySelectorAll('.sidebar .nav__item'));
    navBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = btn.getAttribute('data-tab-target') || 'home';
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
        let hash = '#home';
        if (target === 'results') hash = '#results';
        else if (target === 'admit-cards') hash = '#admit-cards';
        else if (target === 'latest-jobs') hash = '#latest-jobs';
        else if (target === 'answer-key') hash = '#answer-key';
        else if (target === 'admission') hash = '#admission';
        else if (target === 'otr') hash = '#otr';
        else if (target === 'services') hash = '#services';
        else if (target === 'sarkari-yojana') hash = '#sarkari-yojana';
        else if (target === 'outsourcing-jobs') hash = '#outsourcing-jobs';
        location.href = `/${hash}`;
      });
    });
  } catch (e) {
    console.warn('Failed to inject shell from index.html', e);
  }
}

function buildAutoDetailsTable(data) {
  // Handle JSON strings for importantDates, fees, vacancyDetails
  const datesHtml = data.importantDates || data.important_dates || (() => {
    const parts = [];
    if (data.startDate || data.start_date) parts.push(`<li><strong>Start Date:</strong> ${data.startDate || data.start_date}</li>`);
    if (data.lastDate || data.last_date) parts.push(`<li><strong>Last Date:</strong> ${data.lastDate || data.last_date}</li>`);
    if (data.examDate) parts.push(`<li><strong>Exam Date:</strong> ${data.examDate}</li>`);
    return parts.length ? `<ul>${parts.join('')}</ul>` : '';
  })();

  const feeHtml = data.fees || data.application_fee || (() => {
    const parts = [];
    if (data.feeRows && Array.isArray(data.feeRows) && data.feeRows.length > 0) {
      data.feeRows.forEach(f => {
        parts.push(`<p><strong>${f.category}:</strong> ${f.amount}</p>`);
      });
    } else {
      if (data.feeGeneral || data.fee_gen) parts.push(`<p><strong>General/OBC:</strong> ${data.feeGeneral || data.fee_gen}</p>`);
      if (data.feeSCST) parts.push(`<p><strong>SC/ST:</strong> ${data.feeSCST}</p>`);
      if (data.feePH) parts.push(`<p><strong>PH:</strong> ${data.feePH}</p>`);
    }
    return parts.length ? parts.join('') : '';
  })();

  const ageHtml = (() => {
    if (data.ageLimit) {
      const ageLimitStr = String(data.ageLimit);
      if (ageLimitStr.includes('|')) {
        return `
          <ul style="list-style-type: none; padding: 0; margin: 0;">
            ${ageLimitStr.split('|').map(s => s.trim()).filter(s => s.length > 0).map(item => {
              if (item.includes(':')) {
                const label = item.split(':')[0].trim();
                const value = item.split(':').slice(1).join(':').trim();
                return `<li style="padding: 4px 0; color: #000;"><strong style="color: #721c24;">${label} :</strong> ${value}</li>`;
              }
              return `<li style="padding: 4px 0; color: #000;">${item}</li>`;
            }).join('')}
          </ul>
        `;
      }
      return `<p>${data.ageLimit}</p>`;
    }
    if (data.min_age || data.max_age) {
      return `<p><strong>Minimum:</strong> ${data.min_age || '-'} &nbsp; <strong>Maximum:</strong> ${data.max_age || '-'}</p>`;
    }
    return '';
  })();

  const vacancyHtml = data.vacancyDetails || data.vacancy_html || (() => {
    if (data.totalPosts || data.total_posts) return `<p><strong>Total Posts:</strong> ${data.totalPosts || data.total_posts}</p>`;
    return '';
  })();

  const eligibilityHtml = data.qualification || data.eligibility || (() => {
    if (data.qualification) return `<p>${data.qualification}</p>`;
    return '';
  })();

  const selectionHtml = (() => {
    if (data.selectionProcess) {
      const selectionStr = String(data.selectionProcess);
      if (selectionStr.includes('|')) {
        return `
          <ul style="list-style-type: none; padding: 0; margin: 0;">
            ${selectionStr.split('|').map(s => s.trim()).filter(s => s.length > 0).map(item => {
              if (item.includes(':')) {
                const label = item.split(':')[0].trim();
                const value = item.split(':').slice(1).join(':').trim();
                return `<li style="padding: 4px 0; color: #000;"><strong style="color: #155724;">${label} :</strong> ${value}</li>`;
              }
              return `<li style="padding: 4px 0; color: #000;">${item}</li>`;
            }).join('')}
          </ul>
        `;
      }
      return `<p>${data.selectionProcess}</p>`;
    }
    return '';
  })();

  const rows = [
    { title: 'Important Dates', html: datesHtml, headerClass: 'thead-saffron' },
    { title: 'Application Fee', html: feeHtml, headerClass: 'thead-green' },
    { title: 'Age Limit', html: ageHtml, headerClass: 'thead-saffron' },
    { title: 'Vacancy Details', html: vacancyHtml, headerClass: 'thead-green' },
    { title: 'Eligibility', html: eligibilityHtml, headerClass: 'thead-saffron' },
    { title: 'Selection Process', html: selectionHtml, headerClass: 'thead-green' },
  ].filter(r => r.html && String(r.html).trim().length > 0);

  if (!rows.length) return '<p class="muted">Details will be available soon.</p>';

  // Build table with alternating tricolor headers
  return rows.map((r) => `
    <table class="details-table" aria-label="${r.title}">
      <thead class="${r.headerClass}"><tr><th colspan="2">${r.title}</th></tr></thead>
      <tbody>
        <tr>
          <td colspan="2" class="rich">${r.noSanitize ? r.html : sanitize(r.html)}</td>
        </tr>
      </tbody>
    </table>
    <div style="height:12px"></div>
  `).join('');
}

function normalizeUrl(u) {
  if (!u) return '#';
  const s = String(u).trim();
  if (!s) return '#';
  if (/^https?:\/\//i.test(s)) return s;
  // If starts with 'www.' or other domain-like, prefix https://
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return `https://${s}`;
  return s;
}

async function loadDetails() {
  try {
    await injectShellFromIndex();
    const params = new URLSearchParams(location.search || '');
    const id = params.get('id');
    console.log("DEBUG: loadDetails running. ID =", id);
    if (!id) { 
      document.title = 'Not Found | India Result Exam'; 
      const titleEl = qs('#jobTitle');
      if (titleEl) titleEl.textContent = 'Job Not Found';
      return; 
    }
    document.title = 'Loading… | India Result Exam';
    if (!window.firebaseConfig || !window.firebaseConfig.projectId) {
      const container = qs('#detailsContainer');
      if (container) {
        container.innerHTML = '<div class="error-msg" style="color:red; padding:20px; font-weight:bold;">Firebase configuration is missing on the client side!</div>';
      }
      return;
    }
    const app = initializeApp(window.firebaseConfig);
    const db = getFirestore(app);
    const ref = doc(db, 'latest_jobs', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const titleEl = qs('#jobTitle');
      if (titleEl) titleEl.textContent = 'Not Found';
      document.title = 'Not Found | India Result Exam';
      return;
    }
    const data = { id, ...snap.data() };
    if (data.deleted) {
      const titleEl = qs('#jobTitle');
      if (titleEl) titleEl.textContent = 'Not Found';
      document.title = 'Not Found | India Result Exam';
      return;
    }
    console.log("DEBUG: Document data retrieved:", data);

    // Check if it is a Sarkari-style page description to hide generic card header
    const isSarkariLayout = (data.description && (
      data.description.includes('sarkari-container') || 
      data.description.includes('professional-table') || 
      data.description.includes('sarkari-master-table')
    ));
    const cardHeader = qs('.card__header');
    if (cardHeader) {
      if (isSarkariLayout) {
        cardHeader.style.setProperty('display', 'none', 'important');
      } else {
        cardHeader.style.setProperty('display', 'flex', 'important');
      }
    }

    // Title and badge and edit button
        const rawTitle = data.title || 'Untitled';
        const titleEl = qs('#jobTitle');
        if (titleEl) titleEl.textContent = rawTitle;
        
        // Show edit button and set href with post ID
        const editBtn = qs('#editPostBtn');
        if (editBtn) {
          editBtn.style.display = 'flex';
          editBtn.style.alignItems = 'center';
          editBtn.style.gap = '6px';
          editBtn.href = `/admin.html?edit=${id}`;
        }
    // Strip any HTML tags before using in document.title
    const tmp = document.createElement('div');
    tmp.innerHTML = String(rawTitle);
    const plainTitle = tmp.textContent || tmp.innerText || 'Untitled';
    document.title = `${plainTitle} Online Form - Dates, Eligibility | India Result Exam`;

    // Inject dynamic SEO Meta Tags
    const dept = data.department || data.organization || '';
    const state = data.state || '';
    let seoDesc = `Apply Online for ${plainTitle}. `;
    if (dept) seoDesc += `${dept} `;
    seoDesc += `Recruitment details including important dates, application fee, age limit, qualifications, vacancy details, and direct links to apply are available.`;

    setMetaTag('description', seoDesc);

    let keywords = `${plainTitle}, `;
    if (dept) keywords += `${dept} recruitment, ${dept} vacancy, `;
    if (state) keywords += `${state} jobs, `;
    keywords += `Sarkari Result, Sarkari Exam, Government Jobs 2026, Online Form, Job Alert`;
    setMetaTag('keywords', keywords);

    // Open Graph / Facebook Meta Tags
    setPropertyMetaTag('og:title', `${plainTitle} Online Form | India Result Exam`);
    setPropertyMetaTag('og:description', seoDesc);
    setPropertyMetaTag('og:url', window.location.href);
    setPropertyMetaTag('og:type', 'website');
    setPropertyMetaTag('og:image', `${window.location.origin}/INDIAL.PNG`);

    // Twitter Card Meta Tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', `${plainTitle} Online Form | India Result Exam`);
    setMetaTag('twitter:description', seoDesc);
    setMetaTag('twitter:image', `${window.location.origin}/INDIAL.PNG`);

    // Inject JobPosting Schema (Structured Data)
    injectJobPostingSchema(data, plainTitle);
    const badgeEl = qs('#jobBadge');
    if (badgeEl) badgeEl.textContent = data.badge ? String(data.badge) : 'Open';
    // Meta
    const metaEl = qs('#jobMeta');
    if (metaEl) {
      metaEl.innerHTML = `
        ${data.department ? `<p class="muted"><strong>Department:</strong> ${data.department}</p>` : ''}
        ${data.state ? `<p class="muted"><strong>State:</strong> ${data.state}</p>` : ''}
        ${data.start_date ? `<p class="muted"><strong>Start Date:</strong> ${data.start_date}</p>` : ''}
        ${data.last_date || data.lastDate ? `<p class="muted"><strong>Last Date:</strong> ${data.last_date || data.lastDate}</p>` : ''}
      `;
    }

    // Check for logical date warnings
    const startStr = data.start_date || data.startDate || data.applicationBegin || '';
    const lastStr = data.last_date || data.lastDate || '';
    
    if (startStr && lastStr) {
      const parseToDate = (str) => {
        const clean = String(str).trim();
        const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dmy) {
          return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
        }
        const parsed = Date.parse(clean);
        if (!isNaN(parsed)) return new Date(parsed);
        return null;
      };
      const start = parseToDate(startStr);
      const last = parseToDate(lastStr);
      console.log("DEBUG DATE COMPARISON:", { startStr, lastStr, start, last, isStartAfterLast: (start && last && start > last) });
      if (start && last && start > last) {
        const alertPanel = document.createElement('div');
        alertPanel.className = 'date-alert-panel';
        alertPanel.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span><strong>चेतावनी (Warning):</strong> आवेदन शुरू होने की तिथि (${startStr}) अंतिम तिथि (${lastStr}) के बाद की है। कृपया आधिकारिक अधिसूचना से तिथियों की पुष्टि अवश्य करें।</span>
        `;
        const detailsContainer = qs('#detailsContainer');
        if (detailsContainer) {
          detailsContainer.before(alertPanel);
        }
      }
    }

    // Render WhatsApp Apply Banner
    const waBannerContainer = qs('#whatsappBannerContainer');
    if (waBannerContainer) {
      const category = (data.category || '').toLowerCase();
      const whatsappNumber = (window.firebaseConfig && window.firebaseConfig.whatsappNumber) || '919548816799';
      
      let bannerTitle = 'क्या आप घर बैठे यह फॉर्म भरवाना चाहते हैं?';
      let bannerSub = 'हमारे एक्सपर्ट्स द्वारा बहुत ही कम शुल्क में अपना फॉर्म सुरक्षित भरवाएं।';
      let btnLabel = 'व्हाट्सएप से घर बैठे फॉर्म भरवाएं';
      let msgText = `प्रणाम India Result Exam! मुझे "${plainTitle}" का फॉर्म भरवाना है। कृपया इस फॉर्म को भरने का शुल्क (Charge) और जरूरी दस्तावेजों (Documents) की लिस्ट भेजें।`;
      
      if (category.includes('admit')) {
        bannerTitle = 'क्या आप घर बैठे अपना एडमिट कार्ड डाउनलोड करवाना चाहते हैं?';
        bannerSub = 'हमारे एक्सपर्ट्स से सीधे व्हाट्सएप पर अपना एडमिट कार्ड प्राप्त करें।';
        btnLabel = 'व्हाट्सएप से घर बैठे फ्री में एडमिट कार्ड मंगवाएं';
        msgText = `प्रणाम India Result Exam! मुझे "${plainTitle}" का एडमिट कार्ड (Admit Card) डाउनलोड करवाना है। कृपया मदद करें।`;
      } else if (category.includes('result')) {
        bannerTitle = 'क्या आप घर बैठे अपना रिजल्ट चेक / डाउनलोड करवाना चाहते हैं?';
        bannerSub = 'हमारे एक्सपर्ट्स से सीधे व्हाट्सएप पर अपना रिजल्ट प्राप्त करें।';
        btnLabel = 'व्हाट्सएप से घर बैठे फ्री में Result देखें';
        msgText = `प्रणाम India Result Exam! मुझे "${plainTitle}" का रिजल्ट (Result) चेक / डाउनलोड करवाना है। कृपया मदद करें।`;
      }
      
      const encodedText = encodeURIComponent(msgText);
      const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodedText}`;
      
      waBannerContainer.innerHTML = `
        <div class="sarkari-whatsapp-banner">
          <div class="whatsapp-banner-content">
            <div class="whatsapp-banner-text">
              <strong>${bannerTitle}</strong>
              <span>${bannerSub}</span>
            </div>
            <a href="${whatsappLink}" target="_blank" rel="noopener noreferrer" class="whatsapp-banner-btn">
              <i class="fa-brands fa-whatsapp"></i> ${btnLabel}
            </a>
          </div>
        </div>
      `;
    }

    // Auto table with professional styling - Enhanced JSON Support with Sarkari Result Style
    const container = qs('#detailsContainer');
    if (container) {
      // Check if description contains professional table HTML from admin
      if (data.description && data.description.includes('professional-table')) {
        // Use the professional table directly from admin
        container.innerHTML = `
          <div class="responsive-container">
            <div class="professional-table ql-editor">
              ${sanitize(data.description)}
            </div>
          </div>
        `;
      } else {
        // Try to use Sarkari Result style generator if available
        try {
          if (typeof SarkariDetailsGenerator !== 'undefined') {
            const generator = new SarkariDetailsGenerator();
            const sarkariHTML = generator.generateCompletePage(data);
            container.innerHTML = sarkariHTML;
          } else if (typeof jsonToDetailsTable === 'function') {
            const jsonTable = jsonToDetailsTable(data);
            container.innerHTML = `
              <div class="responsive-container">
                <div class="professional-table ql-editor">
                  ${jsonTable}
                </div>
              </div>
            `;
          } else {
            // Build auto table from JSON fields (fallback)
            container.innerHTML = `
              <div class="responsive-container">
                <div class="professional-table ql-editor">
                  ${buildAutoDetailsTable(data)}
                </div>
              </div>
            `;
          }
        } catch (e) {
          console.warn('Sarkari Details conversion failed, using fallback:', e);
          // Build auto table from JSON fields (fallback)
          container.innerHTML = `
            <div class="responsive-container">
              <div class="professional-table ql-editor">
                ${buildAutoDetailsTable(data)}
              </div>
            </div>
          `;
        }
      }
    }

    // Render professional buttons
    const linksContainer = qs('#links-table-container');
    if (linksContainer && container) {
      const hasLinksAlready = container.innerHTML.toLowerCase().includes('important links') || 
                              container.innerHTML.toLowerCase().includes('important link') ||
                              container.innerHTML.includes('link-buttons-container');
      if (!hasLinksAlready && data.links && Array.isArray(data.links) && data.links.length > 0) {
        let buttonsHtml = '<div class="link-buttons-container">';
        
        const linkPriority = {
          'apply online': 1,
          'download admit card': 2,
          'download syllabus': 3,
          'download notification': 4,
          'official website': 5
        };
        const sortedLinks = [...data.links].sort((a, b) => {
          const nameA = String(a.name || '').toLowerCase();
          const nameB = String(b.name || '').toLowerCase();
          return (linkPriority[nameA] || 99) - (linkPriority[nameB] || 99);
        });

        sortedLinks.forEach(link => {
          if (link.name && link.url) {
            const linkName = String(link.name).toLowerCase();
            let buttonClass = 'btn-apply'; // default
            let icon = 'fa-external-link-alt';
            
            // Determine button class and icon based on link name
            if (linkName.includes('apply')) {
              buttonClass = 'btn-apply';
              icon = 'fa-external-link-alt';
            } else if (linkName.includes('notification')) {
              buttonClass = 'btn-notification';
              icon = 'fa-download';
            } else if (linkName.includes('official')) {
              buttonClass = 'btn-official';
              icon = 'fa-globe';
            } else if (linkName.includes('syllabus')) {
              buttonClass = 'btn-syllabus';
              icon = 'fa-book';
            } else if (linkName.includes('admit')) {
              buttonClass = 'btn-admit';
              icon = 'fa-id-card';
            } else if (linkName.includes('result')) {
              buttonClass = 'btn-result';
              icon = 'fa-poll';
            }
            
            buttonsHtml += `
              <a href="${normalizeUrl(link.url)}" target="_blank" rel="noopener noreferrer" class="professional-button ${buttonClass}">
                <i class="fas ${icon}"></i>
                ${sanitize(String(link.name || 'Click Here'))}
              </a>
            `;
          }
        });
        
        buttonsHtml += '</div>';
        linksContainer.innerHTML = buttonsHtml;
      } else {
        linksContainer.innerHTML = '';
      }
    }
    
    // Render WhatsApp Share Actions
    const shareActionContainer = qs('#shareActionContainer');
    if (shareActionContainer) {
      const shareText = `*${plainTitle}*\n\nइस सरकारी नौकरी/सेवा की पूरी जानकारी (महत्वपूर्ण तिथियां, आयु सीमा, आवेदन शुल्क, योग्यता) देखने और ऑनलाइन आवेदन करने के लिए नीचे दिए गए लिंक पर क्लिक करें:\n\n${window.location.href}\n\nरोजाना सरकारी नौकरी अपडेट के लिए हमारे व्हाट्सएप चैनल से जुड़ें!`;
      const encodedShareText = encodeURIComponent(shareText);
      const shareUrl = `https://wa.me/?text=${encodedShareText}`;
      
      shareActionContainer.innerHTML = `
        <a href="${shareUrl}" target="_blank" rel="noopener noreferrer" class="btn-share-whatsapp">
          <i class="fa-brands fa-whatsapp"></i> दोस्तों के साथ व्हाट्सएप पर शेयर करें
        </a>
      `;
    }

    // Init sticky widget on load
    initWhatsAppWidget();
  } catch (error) {
    console.error('Fatal details loading error:', error);
    const container = qs('#detailsContainer');
    if (container) {
      container.innerHTML = `
        <div class="error-msg" style="color:red; padding:20px; font-weight:bold; background:#fee2e2; border:1px solid #fca5a5; border-radius:8px;">
          <h3>Failed to load job details.</h3>
          <p>${error.message}</p>
          <p style="font-size:12px; color:#555;">Please check your browser console for full stacktrace.</p>
        </div>
      `;
    }
  }
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

function setMetaTag(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function setPropertyMetaTag(property, content) {
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function injectJobPostingSchema(data, plainTitle) {
  const existingSchema = document.getElementById('jobSchemaLd');
  if (existingSchema) {
    existingSchema.remove();
  }

  const dept = data.department || data.organization || 'Government Department';
  const state = data.state || 'All India';
  const startDateStr = data.startDate || data.start_date || data.applicationBegin || '';
  const lastDateStr = data.lastDate || data.last_date || '';
  const qualification = data.qualification || data.eligibility || 'Check notification for details';
  const totalPosts = data.totalPosts || data.total_posts || '';

  const formatISODate = (dateStr) => {
    if (!dateStr) return null;
    const cleanStr = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) return cleanStr;
    const matchDMY = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (matchDMY) {
      const day = matchDMY[1].padStart(2, '0');
      const month = matchDMY[2].padStart(2, '0');
      const year = matchDMY[3];
      return `${year}-${month}-${day}`;
    }
    return null;
  };

  const isoDatePosted = formatISODate(startDateStr) || new Date().toISOString().split('T')[0];
  const isoValidThrough = formatISODate(lastDateStr) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let descriptionText = `Apply Online for ${plainTitle}. `;
  if (qualification) descriptionText += `Eligibility Criteria: ${qualification}. `;
  if (totalPosts) descriptionText += `Total Vacancies: ${totalPosts} posts. `;
  descriptionText += `For complete details regarding dates, application fee, exam scheme and direct registration links, visit our official job portal.`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": plainTitle,
    "description": descriptionText,
    "datePosted": isoDatePosted,
    "validThrough": isoValidThrough,
    "hiringOrganization": {
      "@type": "Organization",
      "name": dept,
      "sameAs": window.location.origin
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressRegion": state,
        "addressCountry": "IN"
      }
    },
    "employmentType": "FULL_TIME",
    "directApply": true
  };

  const script = document.createElement('script');
  script.id = 'jobSchemaLd';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema, null, 2);
  document.head.appendChild(script);
}

loadDetails().catch((e) => console.error('Failed to load details', e));
