// Initialize Firebase
let db;
let auth;
let jobs = [];
let editingJobId = null;
let quill; // Quill editor instance

// Initialize on page load - Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing components...');
    
    // Wait a bit more for all scripts to load
    setTimeout(() => {
        initializeFirebase();
        initializeQuill();
        setupEventListeners();
        checkAuthStatus();
    }, 500);
});

function initializeFirebase() {
    try {
        if (!window.firebaseConfig) {
            showToast('Firebase configuration not found', 'error');
            return;
        }
        
        firebase.initializeApp(window.firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        
        updateConnectionStatus(true);
    } catch (error) {
        console.error('Firebase initialization error:', error);
        showToast('Firebase initialization failed', 'error');
        updateConnectionStatus(false);
    }
}

function initializeQuill() {
    try {
        // Wait for DOM to be ready
        if (document.getElementById('quillEditor')) {
            // Initialize Quill editor
            quill = new Quill('#quillEditor', {
                theme: 'snow',
                placeholder: 'Enter job description (supports HTML tables, formatting)...',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'script': 'sub'}, { 'script': 'super' }],
                        [{ 'indent': '-1'}, { 'indent': '+1' }],
                        [{ 'direction': 'rtl' }],
                        [{ 'size': ['small', false, 'large', 'huge'] }],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'font': [] }],
                        [{ 'align': [] }],
                        ['link', 'image'],
                        ['clean']
                    ]
                }
            });

            // Update hidden description field when Quill content changes
            quill.on('text-change', function() {
                document.getElementById('description').value = quill.root.innerHTML;
                updateLivePreview();
            });

            console.log('Quill initialized successfully');
        } else {
            console.error('Quill editor element not found!');
            // Retry after 1 second
            setTimeout(initializeQuill, 1000);
        }
    } catch (error) {
        console.error('Error initializing Quill:', error);
        // Retry after 2 seconds
        setTimeout(initializeQuill, 2000);
    }
}

function setupEventListeners() {
    // Form submission
    document.getElementById('jobForm').addEventListener('submit', handleFormSubmit);
    
    // Live preview updates (excluding description as it's handled by Quill)
    const formInputs = ['title', 'category', 'lastDate', 'postDate', 'applyLink', 'officialLink'];
    formInputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.addEventListener('input', updateLivePreview);
        }
    });
    
    // Search and filter
    document.getElementById('searchInput').addEventListener('input', filterJobs);
    document.getElementById('categoryFilter').addEventListener('change', filterJobs);
}

async function checkAuthStatus() {
    try {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // User is authenticated
                showToast('Welcome back, ' + user.email + '!', 'success');
                await loadJobs();
                setupSessionManagement();
            } else {
                // User is not authenticated, redirect to login
                showToast('Access denied. Please login first.', 'warning');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        showToast('Authentication check failed', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
}

// AI Smart Box Functions - FULL AUTOMATION with Error Handling
function processAIData() {
    try {
        const aiInput = document.getElementById('aiDataInput').value.trim();
        
        if (!aiInput) {
            showToast('Please paste JSON data in AI Smart Box', 'warning');
            return;
        }
        
        console.log('Starting AI Data Processing...');
        
        const data = JSON.parse(aiInput);
        console.log('JSON parsed successfully:', data);
        
        // Robust key mapping for main form fields
        const title = data.title || data.postName || data.post_name || '';
        const category = data.category || 'Latest Jobs';
        const lastDate = data.lastDate || data.last_date || '';
        const postDate = data.postDate || data.post_date || new Date().toISOString().split('T')[0];
        const applyLink = data.applyLink || data.apply_link || '';
        const officialLink = data.officialLink || data.official_link || data.officialWebsite || data.official_website || '';
        
        if (title) document.getElementById('title').value = title;
        if (category) document.getElementById('category').value = category;
        if (lastDate) document.getElementById('lastDate').value = lastDate;
        if (postDate) document.getElementById('postDate').value = postDate;
        
        // Auto fill links from arrays or direct keys
        if (data.links && Array.isArray(data.links)) {
            data.links.forEach(link => {
                if (link.name && link.url) {
                    const name = link.name.toLowerCase();
                    if (name.includes('apply')) {
                        document.getElementById('applyLink').value = link.url;
                        document.getElementById('f_apply_link').value = link.url;
                    }
                    if (name.includes('official') || name.includes('website')) {
                        document.getElementById('officialLink').value = link.url;
                        document.getElementById('f_official_link').value = link.url;
                    }
                }
            });
        }
        
        if (applyLink) {
            document.getElementById('applyLink').value = applyLink;
            document.getElementById('f_apply_link').value = applyLink;
        }
        if (officialLink) {
            document.getElementById('officialLink').value = officialLink;
            document.getElementById('f_official_link').value = officialLink;
        }

        // Synchronize with Sarkari Result Admin Enhancer fields if available
        if (window.sarkariEnhancer && typeof window.sarkariEnhancer.populateFromJSON === 'function') {
            window.sarkariEnhancer.populateFromJSON(data);
            console.log('Sarkari Admin Enhancer form populated successfully');
        }
        
        if (!quill) {
            console.error('Quill not initialized! Retrying...');
            showToast('Quill editor not ready. Retrying...', 'warning');
            setTimeout(() => {
                initializeQuill();
                setTimeout(() => processAIData(), 1000);
            }, 1000);
            return;
        }
        
        // Generate the professional Quill description HTML
        const professionalContent = generateCompleteContent(data);
        console.log('Generated content length:', professionalContent.length);
        
        try {
            quill.setText('');
            quill.clipboard.dangerouslyPasteHTML(professionalContent);
            document.getElementById('description').value = professionalContent;
            showToast('Complete automation successful! Professional content generated.', 'success');
        } catch (pasteError) {
            console.error('Error pasting content into Quill:', pasteError);
            quill.root.innerHTML = professionalContent;
            document.getElementById('description').value = professionalContent;
            showToast('Content inserted using fallback method.', 'success');
        }
        
        updateLivePreview();
        
        setTimeout(() => {
            clearAIBox();
        }, 2000);
        
    } catch (error) {
        console.error('Error in processAIData:', error);
        showToast('Error processing JSON data. Please check format.', 'error');
    }
}

// ==========================================
// 1-CLICK SARKARI RESULT LINK IMPORTER SCRAPER
// ==========================================

async function importFromSarkariURL() {
    const importUrlInput = document.getElementById('sarkariImportUrl');
    const importBtn = document.getElementById('sarkariImportBtn');
    
    if (!importUrlInput || !importUrlInput.value.trim()) {
        showToast('Please enter a valid Sarkari Result page URL', 'warning');
        return;
    }
    
    const url = importUrlInput.value.trim();
    if (!url.toLowerCase().includes('sarkariresult.com')) {
        showToast('Only sarkariresult.com URLs are supported!', 'warning');
        return;
    }
    
    // UI Loading state
    const originalBtnHTML = importBtn.innerHTML;
    importBtn.disabled = true;
    importBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Fetching...</span>';
    
    try {
        showToast('Fetching page content via secure proxy...', 'info');
        
        let htmlContent = '';
        let fetchSuccess = false;
        let lastError = null;
        
        // List of reliable public proxies
        const proxies = [
            {
                name: 'Direct Connection (Bypasses Cloudflare - Requires CORS Extension)',
                getUrl: (u) => u,
                parseResponse: async (res) => await res.text()
            },
            {
                name: 'CORSProxy.io',
                getUrl: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
                parseResponse: async (res) => await res.text()
            },
            {
                name: 'AllOrigins Raw',
                getUrl: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
                parseResponse: async (res) => await res.text()
            },
            {
                name: 'AllOrigins JSON',
                getUrl: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}&_=${Date.now()}`,
                parseResponse: async (res) => {
                    const data = await res.json();
                    return data.contents || '';
                }
            },
            {
                name: 'CodeTabs',
                getUrl: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
                parseResponse: async (res) => await res.text()
            }
        ];
        
        for (const proxy of proxies) {
            try {
                console.log(`Trying proxy: ${proxy.name}...`);
                showToast(`Connecting via ${proxy.name}...`, 'info');
                
                const proxyUrl = proxy.getUrl(url);
                const response = await fetch(proxyUrl);
                
                if (response.ok) {
                    htmlContent = await proxy.parseResponse(response);
                    if (htmlContent && htmlContent.trim().length > 100) {
                        fetchSuccess = true;
                        console.log(`Successfully fetched using ${proxy.name}!`);
                        showToast(`Successfully connected via ${proxy.name}!`, 'success');
                        break;
                    }
                }
            } catch (err) {
                console.warn(`Proxy ${proxy.name} failed:`, err);
                lastError = err;
            }
        }
        
        if (!fetchSuccess) {
            throw new Error('SarkariResult is blocking automated proxy requests (Cloudflare WAF). Chrome Web Store se free \"Allow CORS\" extension install karke ON karein for 100% successful direct fetch!');
        }
        
        showToast('Parsing page elements...', 'info');
        const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
        
        // Extract Category based on URL or title
        let category = 'Latest Jobs';
        const urlLower = url.toLowerCase();
        if (urlLower.includes('/admitcard') || urlLower.includes('/admit-card') || urlLower.includes('admit')) {
            category = 'Admit Card';
        } else if (urlLower.includes('/result') || urlLower.includes('result')) {
            category = 'Result';
        } else if (urlLower.includes('/admission') || urlLower.includes('admission')) {
            category = 'Admission';
        } else if (urlLower.includes('/answerkey') || urlLower.includes('answer-key') || urlLower.includes('answer')) {
            category = 'Answer Key';
        }
        
        // 1. Scrape Title
        let title = '';
        const h1Element = doc.querySelector('h1');
        if (h1Element) {
            title = h1Element.textContent.trim();
        }
        if (!title) {
            const titleTag = doc.querySelector('title');
            if (titleTag) {
                title = titleTag.textContent.replace('Sarkari Result', '').replace('Online Form', '').trim();
            }
        }
        if (!title) {
            const h2Element = doc.querySelector('h2');
            if (h2Element) {
                title = h2Element.textContent.trim();
            }
        }
        
        // Fallback for title
        title = title || 'New Recruitment Post';
        
        // Clean title if it contains double spaces or unwanted symbols
        title = title.replace(/\s+/g, ' ').trim();
        
        // Extract Organization
        const organization = extractOrgFromScrapedTitle(title);
        
        // Helper function to extract value after separator cleanly
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

        // Helper variables for date extraction
        let applicationBegin = '';
        let lastDate = '';
        let examDate = '';
        let admitCardDate = '';
        
        // Helper variables for fee extraction
        let feeGeneral = '';
        let feeSCST = '';
        let feeFemale = '';
        
        // Age limit and selection
        let ageLimitLines = [];
        let selectionLines = [];

        // 1. Dual-Strategy Parsing - Strategy A: DOM Cell Matching
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
                    examDate = val;
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
                const ageLines = ageTd.textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                ageLines.forEach(line => {
                    const lineLower = line.toLowerCase();
                    if (lineLower.includes('minimum age') || lineLower.includes('maximum age') || lineLower.includes('age relaxation') || lineLower.includes('age limit')) {
                        ageLimitLines.push(line);
                    }
                });
            }
        }

        // 2. Dual-Strategy Parsing - Strategy B: Newline splitting fallback
        const mainTable = doc.querySelector('table');
        if (mainTable) {
            const tempDiv = doc.createElement('div');
            tempDiv.innerHTML = mainTable.innerHTML;
            
            // Replace tags to preserve newlines
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
                .map(l => l.replace(/\xa0/g, ' ').trim())
                .filter(l => l.length > 0);

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineLower = line.toLowerCase();
                const val = getValueAfterSeparator(line);

                if ((lineLower.includes('application begin') || lineLower.includes('apply online begin')) && !applicationBegin) {
                    applicationBegin = val;
                } else if ((lineLower.includes('last date for apply online') || lineLower.includes('last date for apply') || lineLower.includes('last date for registration')) && !lastDate) {
                    lastDate = val;
                } else if (lineLower.includes('exam date') && !lineLower.includes('admit') && !lineLower.includes('syllabus') && !examDate) {
                    examDate = val;
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

                // Selection Process
                if ((lineLower.includes('selection process') || lineLower.includes('mode of selection') || lineLower.includes('selection procedure')) && line.length < 80) {
                    if (!selectionLines.includes(line)) {
                        selectionLines.push(line);
                    }
                }
            }
        }

        // Clean extracted values
        applicationBegin = cleanScrapedText(applicationBegin);
        lastDate = cleanScrapedText(lastDate);
        examDate = cleanScrapedText(examDate);
        admitCardDate = cleanScrapedText(admitCardDate);
        feeGeneral = cleanScrapedText(feeGeneral);
        feeSCST = cleanScrapedText(feeSCST);
        feeFemale = cleanScrapedText(feeFemale);
        
        const ageLimit = cleanScrapedText(ageLimitLines.join(' | '));
        const selectionProcess = cleanScrapedText(selectionLines.join(' | '));
        
        // 2. Scrape Vacancy Details Table
        let recruitmentPosts = [];
        doc.querySelectorAll('table').forEach(table => {
            const cells = Array.from(table.querySelectorAll('th, td')).map(el => el.textContent.toLowerCase().trim());
            const hasPostName = cells.some(c => c.includes('post name') || c.includes('postname') || c.includes('name of post'));
            const hasTotalPost = cells.some(c => c.includes('total post') || c.includes('total posts') || c.includes('totalpost'));
            
            if (hasPostName && hasTotalPost) {
                // Parse rows of this table
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const tds = Array.from(row.querySelectorAll('td'));
                    if (tds.length >= 2) {
                        const postNameVal = tds[0].textContent.trim();
                        const totalPostVal = tds[1].textContent.trim();
                        let eligibilityVal = tds[2] ? tds[2].textContent.trim() : '';
                        
                        // Ignore header row
                        if (postNameVal.toLowerCase().includes('post name') || postNameVal.toLowerCase().includes('name of post')) {
                            return;
                        }
                        
                        // Extract any notification PDF links if present in this row
                        let notifLink = '';
                        const notifAnchor = row.querySelector('a');
                        if (notifAnchor) {
                            notifLink = resolveSarkariAbsoluteUrl(notifAnchor.getAttribute('href'));
                        }
                        
                        if (postNameVal && totalPostVal) {
                            recruitmentPosts.push({
                                postName: postNameVal.replace(/\s+/g, ' '),
                                totalPost: totalPostVal.replace(/\s+/g, ' '),
                                eligibility: eligibilityVal.replace(/\s+/g, ' '),
                                startDate: applicationBegin || '',
                                lastDate: lastDate || '',
                                notificationLink: notifLink
                            });
                        }
                    }
                });
            }
        });
        
        // 3. Scrape Action Links
        let links = [];
        let applyLink = '';
        let officialLink = '';
        
        doc.querySelectorAll('a').forEach(anchor => {
            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
            
            const absoluteUrl = resolveSarkariAbsoluteUrl(href);
            const text = anchor.textContent.trim().replace(/\s+/g, ' ');
            const textLower = text.toLowerCase();
            const parentText = anchor.parentElement ? anchor.parentElement.textContent.toLowerCase() : '';
            const row = anchor.closest('tr');
            const rowText = row ? row.textContent.toLowerCase() : '';
            
            let linkName = '';
            
            if (rowText.includes('apply online') || textLower.includes('apply online') || parentText.includes('apply online')) {
                linkName = 'Apply Online';
                if (!applyLink) applyLink = absoluteUrl;
            } else if (rowText.includes('download notification') || textLower.includes('notification') || parentText.includes('download notification')) {
                linkName = 'Download Notification';
            } else if (rowText.includes('official website') || textLower.includes('official website') || parentText.includes('official website')) {
                linkName = 'Official Website';
                if (!officialLink) officialLink = absoluteUrl;
            } else if (rowText.includes('download syllabus') || textLower.includes('syllabus') || parentText.includes('download syllabus')) {
                linkName = 'Download Syllabus';
            } else if (rowText.includes('download admit card') || textLower.includes('admit card') || parentText.includes('download admit card')) {
                linkName = 'Download Admit Card';
            } else if (rowText.includes('download result') || textLower.includes('result') || parentText.includes('download result')) {
                linkName = 'Download Result';
            } else if (text.length > 2 && text.length < 50 && (textLower.includes('click here') || textLower.includes('link') || absoluteUrl.includes('apply') || absoluteUrl.includes('notification'))) {
                // Resolve from row's first column
                if (row) {
                    const firstTd = row.querySelector('td');
                    if (firstTd) {
                        const headerText = firstTd.textContent.replace('Click Here', '').replace(/:\s*$/, '').trim();
                        if (headerText && headerText.length < 50) {
                            linkName = headerText.replace(/\s+/g, ' ');
                        }
                    }
                }
            }
            
            if (linkName && !links.some(l => l.name === linkName)) {
                links.push({
                    name: linkName,
                    url: absoluteUrl
                });
            }
        });
        
        // If links list is empty, add some defaults
        if (applyLink && !links.some(l => l.name === 'Apply Online')) {
            links.push({ name: 'Apply Online', url: applyLink });
        }
        if (officialLink && !links.some(l => l.name === 'Official Website')) {
            links.push({ name: 'Official Website', url: officialLink });
        }
        
        // Build final JSON payload
        const scrapedJSON = {
            title: title,
            category: category,
            organization: organization,
            websiteName: "Sarkari Result",
            websiteUrl: "https://www.sarkariresult.com",
            officialWebsite: officialLink || '',
            officialLink: officialLink || '',
            applyLink: applyLink || '',
            applicationBegin: applicationBegin || '',
            lastDate: lastDate || '',
            examDate: examDate || '',
            admitCardDate: admitCardDate || '',
            feeGeneral: feeGeneral || '',
            feeSCST: feeSCST || '',
            feeFemale: feeFemale || '',
            paymentMethod: "Debit Card, Credit Card, Net Banking, E Challan",
            ageLimit: ageLimit || '',
            selectionProcess: selectionProcess || '',
            recruitmentTitle: organization ? `${organization} Latest & Upcoming Recruitment 2026` : 'Latest & Upcoming Recruitment 2026',
            recruitmentPosts: recruitmentPosts || [],
            links: links || []
        };
        
        console.log('Successfully scraped data JSON:', scrapedJSON);
        
        // Write the scraped JSON directly to the AI Box
        document.getElementById('aiDataInput').value = JSON.stringify(scrapedJSON, null, 2);
        
        // Trigger the form autofill natively using processAIData()!
        processAIData();
        
        showToast('1-Click Import Successful! Form and Quill Editor populated.', 'success');
        
    } catch (error) {
        console.error('Error in importFromSarkariURL:', error);
        showToast(`Import failed: ${error.message || 'Check URL and try again'}`, 'error');
    } finally {
        importBtn.disabled = false;
        importBtn.innerHTML = originalBtnHTML;
    }
}

// Scraper Helper: Clean and format scraped text
function cleanScrapedText(val) {
    if (!val) return '';
    return val
        .replace(/^[:\s\-]+/g, '') // remove leading colons/hyphens/spaces
        .replace(/[:\s]+$/g, '')    // remove trailing colons/spaces
        .replace(/\s+/g, ' ')       // single spacing
        .trim();
}

// Scraper Helper: Resolve relative SarkariResult URLs
function resolveSarkariAbsoluteUrl(href) {
    if (!href) return '';
    if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
    }
    if (href.startsWith('/')) {
        return 'https://www.sarkariresult.com' + href;
    }
    return 'https://www.sarkariresult.com/' + href;
}

// Scraper Helper: Extract Organization name from Title
function extractOrgFromScrapedTitle(title) {
    if (!title) return '';
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
        
    // Standard cleanup of common tailing words
    org = org.replace(/(\s+Various\s+Posts.*|\s+Post.*)$/i, '').trim();
    return org || title;
}

// Scraper Helper: Sibling or Table Cell textual extraction
function extractSiblingOrTdText(el) {
    if (el.nextElementSibling) {
        return el.nextElementSibling.textContent.trim();
    }
    const tr = el.closest('tr');
    if (tr) {
        const cells = Array.from(tr.querySelectorAll('td, th'));
        const index = cells.indexOf(el);
        if (index !== -1 && index + 1 < cells.length) {
            return cells[index + 1].textContent.trim();
        }
    }
    return '';
}

// PROFESSIONAL TABLE GENERATOR - Red Header, Blue Borders
function createProfessionalTable(data) {
    const {
        postName = data.postName || data.title || '[Post Name]',
        totalPosts = data.totalPosts || data.total_posts || data.totalPostsCount || '[Total Posts]',
        qualification = data.qualification || data.eligibility || '[Qualification]',
        lastDate = data.lastDate || data.last_date || '[Last Date]',
        startDate = data.startDate || data.start_date || data.applicationBegin || '[Start Date]',
        examDate = data.examDate || data.exam_date || '[Exam Date]',
        feeGeneral = data.feeGeneral || data.fee_general || data.feeOBC || data.fee_gen || '[Fee Amount]',
        feeSCST = data.feeSCST || data.fee_scst || data.fee_sc_st || '[Fee Amount]',
        ageLimit = data.ageLimit || data.age_limit || '[Age Limit]',
        selectionProcess = data.selectionProcess || data.selection_process || '[Selection Process]',
        importantDates = data.importantDates || '',
        fees = data.fees || '',
        vacancyDetails = data.vacancyDetails || ''
    } = data;

    let datesHTML = '';
    if (importantDates) {
        datesHTML = `
            <tr>
                <td colspan="4" style="background-color: #ff0000; color: #ffffff; padding: 12px; border: 1px solid #0000ff; text-align: center; font-weight: bold; text-transform: uppercase;">
                    Important Dates
                </td>
            </tr>
            <tr>
                <td colspan="4" style="border: 1px solid #0000ff; padding: 10px; color: #000;">
                    ${importantDates}
                </td>
            </tr>
        `;
    } else if (startDate || lastDate || examDate) {
        const dateItems = [];
        if (startDate) dateItems.push(`<li><strong>Application Begin:</strong> ${startDate}</li>`);
        if (lastDate) dateItems.push(`<li><strong>Last Date for Apply Online:</strong> ${lastDate}</li>`);
        if (examDate) dateItems.push(`<li><strong>Exam Date:</strong> ${examDate}</li>`);
        if (data.admitCardDate) dateItems.push(`<li><strong>Admit Card Date:</strong> ${data.admitCardDate}</li>`);
        
        if (dateItems.length > 0) {
            datesHTML = `
                <tr>
                    <td colspan="4" style="background-color: #ff0000; color: #ffffff; padding: 12px; border: 1px solid #0000ff; text-align: center; font-weight: bold; text-transform: uppercase;">
                        Important Dates
                    </td>
                </tr>
                <tr>
                    <td colspan="4" style="border: 1px solid #0000ff; padding: 10px; color: #000;">
                        <ul style="list-style-type: none; padding: 0; margin: 0;">
                            ${dateItems.map(item => `<li style="padding: 4px 0;">${item}</li>`).join('')}
                        </ul>
                    </td>
                </tr>
            `;
        }
    }

    let feesHTML = '';
    if (fees) {
        feesHTML = `
            <tr>
                <td colspan="4" style="background-color: #ff0000; color: #ffffff; padding: 12px; border: 1px solid #0000ff; text-align: center; font-weight: bold; text-transform: uppercase;">
                    Application Fee
                </td>
            </tr>
            <tr>
                <td colspan="4" style="border: 1px solid #0000ff; padding: 10px; color: #000;">
                    ${fees}
                </td>
            </tr>
        `;
    } else if (feeGeneral || feeSCST || data.feeFemale) {
        const feeItems = [];
        if (feeGeneral) feeItems.push(`<li><strong>General / OBC / EWS:</strong> ${feeGeneral}</li>`);
        if (feeSCST) feeItems.push(`<li><strong>SC / ST / PH:</strong> ${feeSCST}</li>`);
        if (data.feeFemale) feeItems.push(`<li><strong>All Category Female:</strong> ${data.feeFemale}</li>`);
        
        if (feeItems.length > 0) {
            feesHTML = `
                <tr>
                    <td colspan="4" style="background-color: #ff0000; color: #ffffff; padding: 12px; border: 1px solid #0000ff; text-align: center; font-weight: bold; text-transform: uppercase;">
                        Application Fee
                    </td>
                </tr>
                <tr>
                    <td colspan="4" style="border: 1px solid #0000ff; padding: 10px; color: #000;">
                        <ul style="list-style-type: none; padding: 0; margin: 0; margin-bottom: 8px;">
                            ${feeItems.map(item => `<li style="padding: 4px 0;">${item}</li>`).join('')}
                        </ul>
                        <p style="margin: 0; font-size: 12px; color: #666;"><strong>Pay Exam Fee Through:</strong> Debit Card, Credit Card, Net Banking or E-Challan Offline Mode Only.</p>
                    </td>
                </tr>
            `;
        }
    }

    let vacancyHTML = '';
    if (vacancyDetails) {
        vacancyHTML = `
            <tr>
                <td colspan="4" style="background-color: #ff0000; color: #ffffff; padding: 12px; border: 1px solid #0000ff; text-align: center; font-weight: bold; text-transform: uppercase;">
                    Vacancy Details
                </td>
            </tr>
            <tr>
                <td colspan="4" style="border: 1px solid #0000ff; padding: 10px; color: #000;">
                    ${vacancyDetails}
                </td>
            </tr>
        `;
    } else if (data.recruitmentPosts && Array.isArray(data.recruitmentPosts) && data.recruitmentPosts.length > 0) {
        const rows = data.recruitmentPosts.map(post => `
            <tr style="background-color: #fff;">
                <td style="border: 1px solid #0000ff; padding: 8px; text-align: left; font-weight: bold; color: #000;">${post.postName || ''}</td>
                <td style="border: 1px solid #0000ff; padding: 8px; text-align: center; color: green; font-weight: bold;">${post.totalPost || ''}</td>
                <td style="border: 1px solid #0000ff; padding: 8px; text-align: center; color: #000;">${post.startDate || ''} to ${post.lastDate || ''}</td>
                <td style="border: 1px solid #0000ff; padding: 8px; text-align: center;">
                    ${post.notificationLink ? `<a href="${post.notificationLink}" target="_blank" style="color: #007bff; text-decoration: none; font-weight: bold;">Download</a>` : 'N/A'}
                </td>
            </tr>
        `).join('');

        vacancyHTML = `
            <tr>
                <td colspan="4" style="background-color: #ff0000; color: #ffffff; padding: 12px; border: 1px solid #0000ff; text-align: center; font-weight: bold; text-transform: uppercase;">
                    Vacancy Details (Post Wise)
                </td>
            </tr>
            <tr>
                <td colspan="4" style="padding: 0; border: 1px solid #0000ff;">
                    <table style="width: 100%; border-collapse: collapse; border: none; margin: 0; font-size: 13px;">
                        <thead>
                            <tr style="background-color: #f2f2f2; color: #000;">
                                <th style="border: 1px solid #0000ff; padding: 8px; text-align: left;">Post Name</th>
                                <th style="border: 1px solid #0000ff; padding: 8px; text-align: center;">Total Post</th>
                                <th style="border: 1px solid #0000ff; padding: 8px; text-align: center;">Dates</th>
                                <th style="border: 1px solid #0000ff; padding: 8px; text-align: center;">Notification</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </td>
            </tr>
        `;
    }

    return `
        <div class="professional-table" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin: 15px 0;">
            <h3 style="color: white; margin: 0 0 15px 0; text-align: center; font-size: 24px;">
                <i class="fas fa-briefcase"></i> ${postName}
            </h3>
        </div>
        
        <table class="professional-table" style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 3px solid #0000ff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
            <thead>
                <tr style="background: #ff0000; color: white; font-weight: bold;">
                    <th style="border: 2px solid #0000ff; padding: 15px; text-align: left; text-transform: uppercase;">Post Name</th>
                    <th style="border: 2px solid #0000ff; padding: 15px; text-align: left; text-transform: uppercase;">Total Posts</th>
                    <th style="border: 2px solid #0000ff; padding: 15px; text-align: left; text-transform: uppercase;">Qualification</th>
                    <th style="border: 2px solid #0000ff; padding: 15px; text-align: left; text-transform: uppercase;">Last Date</th>
                </tr>
            </thead>
            <tbody>
                <tr style="background-color: #f8f9fa;">
                    <td style="border: 2px solid #0000ff; padding: 12px; font-weight: 600; color: #000;">${postName}</td>
                    <td style="border: 2px solid #0000ff; padding: 12px; text-align: center; font-weight: bold; color: #28a745;">${totalPosts}</td>
                    <td style="border: 2px solid #0000ff; padding: 12px; color: #000;">${qualification}</td>
                    <td style="border: 2px solid #0000ff; padding: 12px; text-align: center; font-weight: bold; color: #dc3545;">${lastDate}</td>
                </tr>
                
                ${datesHTML}
                ${feesHTML}
                ${vacancyHTML}
                
                ${ageLimit ? `
                <tr>
                    <td colspan="4" style="padding: 15px; background: #f8d7da; border: 2px solid #0000ff;">
                        <h4 style="color: #721c24; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px; font-weight: bold; text-transform: uppercase;">
                            <i class="fas fa-user-clock"></i> Age Limit
                        </h4>
                        <ul style="list-style-type: none; padding: 0; margin: 0;">
                            ${ageLimit.split('|').map(s => s.trim()).filter(s => s.length > 0).map(item => {
                                if (item.includes(':')) {
                                    const label = item.split(':')[0].trim();
                                    const value = item.split(':').slice(1).join(':').trim();
                                    return `<li style="padding: 4px 0; color: #000;"><strong style="color: #721c24;">${label} :</strong> ${value}</li>`;
                                }
                                return `<li style="padding: 4px 0; color: #000;">${item}</li>`;
                            }).join('')}
                        </ul>
                    </td>
                </tr>
                ` : ''}
                
                ${selectionProcess ? `
                <tr>
                    <td colspan="4" style="padding: 15px; background: #d4edda; border: 2px solid #0000ff;">
                        <h4 style="color: #155724; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px; font-weight: bold; text-transform: uppercase;">
                            <i class="fas fa-tasks"></i> Selection Process
                        </h4>
                        <ul style="list-style-type: none; padding: 0; margin: 0;">
                            ${selectionProcess.split('|').map(s => s.trim()).filter(s => s.length > 0).map(item => {
                                if (item.includes(':')) {
                                    const label = item.split(':')[0].trim();
                                    const value = item.split(':').slice(1).join(':').trim();
                                    return `<li style="padding: 4px 0; color: #000;"><strong style="color: #155724;">${label} :</strong> ${value}</li>`;
                                }
                                return `<li style="padding: 4px 0; color: #000;">${item}</li>`;
                            }).join('')}
                        </ul>
                    </td>
                </tr>
                ` : ''}
            </tbody>
        </table>
        <span class="professional-table" style="display:none;"></span>
    `;
}

// BUTTON GENERATOR - Simple Direct Links
function createBoxButtons(links) {
    if (!Array.isArray(links) || links.length === 0) return '';
    
    let buttonsHTML = '';
    
    // Direct link creation - No loops
    if (links[0]) {
        buttonsHTML += `
            <div style="display: inline-block; margin: 8px; padding: 4px;">
                <a href="${links[0].url}" target="_blank" style="
                    display: inline-block;
                    padding: 15px 25px;
                    background: linear-gradient(135deg, #007bff, #0056b3);
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 14px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    border: 2px solid #0056b3;
                    transition: all 0.3s;
                    min-width: 150px;
                    text-align: center;
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(0,0,0,0.3)'" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'">
                    <i class="fas fa-external-link-alt" style="margin-right: 8px;"></i> ${links[0].name}
                </a>
            </div>
        `;
    }
    
    if (links[1]) {
        buttonsHTML += `
            <div style="display: inline-block; margin: 8px; padding: 4px;">
                <a href="${links[1].url}" target="_blank" style="
                    display: inline-block;
                    padding: 15px 25px;
                    background: linear-gradient(135deg, #dc3545, #c82333);
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 14px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                    border: 2px solid #c82333;
                    transition: all 0.3s;
                    min-width: 150px;
                    text-align: center;
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(0,0,0,0.3)'" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'">
                    <i class="fas fa-globe" style="margin-right: 8px;"></i> ${links[1].name}
                </a>
            </div>
        `;
    }

    return `
        <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 12px; padding: 20px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #007bff;">
            <h3 style="color: #495057; margin: 0 0 15px 0; text-align: center; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <i class="fas fa-link"></i> Important Links
            </h3>
            <div style="text-align: center; flex-wrap: wrap; display: flex; justify-content: center; align-items: center; gap: 10px;">
                ${buttonsHTML}
            </div>
            <div style="background: #fff3cd; border: 2px solid #007bff; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <p style="margin: 0; color: #856404; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>⚠️ Important Note:</strong> Please read the official notification carefully before applying. Verify all details from the official website.
                </p>
            </div>
        </div>
    `;
}

// SMART MERGE - Generate Complete Content
function generateCompleteContent(data) {
    let completeContent = '';
    
    // Add professional table
    if (data.postName || data.title || data.totalPosts || data.importantDates || data.fees || data.vacancyDetails) {
        completeContent += createProfessionalTable(data);
    }
    
    // Add how to apply section
    completeContent += `
        <div style="background: linear-gradient(135deg, #e3f2fd, #bbdefb); border-radius: 8px; padding: 20px; margin: 20px 0; border: 2px solid #007bff;">
            <h4 style="color: #1565c0; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-info-circle"></i> How to Apply
            </h4>
            <p style="margin: 0; color: #1565c0; line-height: 1.6;">
                Interested candidates can apply online through the official website. Please read the official notification carefully before applying. 
                Make sure to fill all required details and upload necessary documents.
            </p>
        </div>
    `;
    
    // Add box buttons
    if (data.links && Array.isArray(data.links)) {
        completeContent += createBoxButtons(data.links);
    }
    
    return completeContent;
}

function clearAIBox() {
    document.getElementById('aiDataInput').value = '';
}

// Live Preview Functions
function updateLivePreview() {
    const title = document.getElementById('title').value || 'Job Title';
    const category = document.getElementById('category').value || 'Category';
    const lastDate = document.getElementById('lastDate').value || 'N/A';
    const applyLink = document.getElementById('applyLink').value || '#';
    
    // Get description from Quill editor or fallback to hidden field
    let description = 'No description available';
    if (quill) {
        description = quill.getText().trim() || 'No description available';
        // If description is too long for preview, truncate it
        if (description.length > 150) {
            description = description.substring(0, 150) + '...';
        }
    }
    
    const previewHTML = `
        <div class="border-l-4 border-blue-500 pl-4">
            <div class="flex items-start justify-between mb-2">
                <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    ${category}
                </span>
                <span class="text-xs text-gray-500">
                    <i class="fas fa-calendar-alt"></i> ${formatDate(lastDate)}
                </span>
            </div>
            <h4 class="text-lg font-semibold text-gray-800 mb-2">${title}</h4>
            <p class="text-sm text-gray-600 mb-3">${description}</p>
            <div class="flex items-center space-x-3">
                <a href="${applyLink}" target="_blank" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                    <i class="fas fa-external-link-alt"></i> Apply Now
                </a>
                <button class="text-gray-500 hover:text-gray-700 text-sm">
                    <i class="fas fa-share-alt"></i> Share
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('previewContent').innerHTML = previewHTML;
}

// Form Handling
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Get structured data from sub-form if available
    let sarkariData = {};
    if (window.sarkariEnhancer && typeof window.sarkariEnhancer.generateJSON === 'function') {
        sarkariData = window.sarkariEnhancer.generateJSON();
    }
    
    const formData = {
        title: document.getElementById('title').value,
        category: document.getElementById('category').value,
        lastDate: document.getElementById('lastDate').value,
        postDate: document.getElementById('postDate').value || new Date().toISOString().split('T')[0],
        applyLink: document.getElementById('applyLink').value,
        officialLink: document.getElementById('officialLink').value || '',
        description: quill.root.innerHTML || '', // Get HTML content from Quill editor
        department: document.getElementById('title').value, // Using title as department for homepage compatibility
        location: 'India', // Default location
        salary: 'As per government norms', // Default salary
        qualification: 'Various Posts', // Default qualification
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Match homepage field name
        priority: 50, // Default priority
        badge: 'New', // Default badge
        status: 'active',
        
        // Add structured fields for Sarkari Result layouts
        organization: sarkariData.organization || '',
        websiteName: sarkariData.websiteName || 'Sarkari Result',
        websiteUrl: sarkariData.websiteUrl || 'https://www.sarkariresult.com',
        officialWebsite: sarkariData.officialWebsite || '',
        applicationBegin: sarkariData.applicationBegin || '',
        examDate: sarkariData.examDate || '',
        admitCardDate: sarkariData.admitCardDate || '',
        feeGeneral: sarkariData.feeGeneral || '',
        feeSCST: sarkariData.feeSCST || '',
        feeFemale: sarkariData.feeFemale || '',
        paymentMethod: sarkariData.paymentMethod || 'Debit Card, Credit Card, Net Banking, E Challan',
        recruitmentTitle: sarkariData.recruitmentTitle || 'Latest & Upcoming Recruitment 2026',
        recruitmentPosts: sarkariData.recruitmentPosts || [],
        links: sarkariData.links || [],
        ageLimit: sarkariData.ageLimit || '',
        selectionProcess: sarkariData.selectionProcess || ''
    };
    
    try {
        if (editingJobId) {
            // Update existing job
            await db.collection('latest_jobs').doc(editingJobId).update(formData);
            showToast('Job updated successfully!', 'success');
            editingJobId = null;
            document.getElementById('submitBtnText').textContent = 'Add Job';
        } else {
            // Add new job
            await db.collection('latest_jobs').add(formData);
            showToast('Job added successfully!', 'success');
        }
        
        resetForm();
        await loadJobs();
        
        // Data is automatically synced since we're writing directly to latest_jobs collection
        console.log('Job saved successfully - homepage will update automatically');
        
    } catch (error) {
        console.error('Form submission error:', error);
        showToast('Failed to save job. Please try again.', 'error');
    }
}

function resetForm() {
    document.getElementById('jobForm').reset();
    document.getElementById('jobId').value = '';
    editingJobId = null;
    document.getElementById('submitBtnText').textContent = 'Add Job';
    
    // Clear Quill editor
    if (quill) {
        quill.setText('');
    }
    
    // Clear Sarkari Result sub-form if enhancer exists
    if (window.sarkariEnhancer && typeof window.sarkariEnhancer.clearForm === 'function') {
        window.sarkariEnhancer.clearForm(false);
    }
    
    updateLivePreview();
}

// Insert Job Table Template
function insertJobTable() {
    if (!quill) {
        showToast('Quill editor not initialized', 'error');
        return;
    }
    
    const jobTableTemplate = `
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Post Name</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Total Posts</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Qualification</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Last Date</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">[Post Name]</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">[Total Posts]</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">[Qualification]</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">[Last Date]</td>
                </tr>
            </tbody>
        </table>
        <p><strong>Important Dates:</strong></p>
        <ul>
            <li>Start Date: [Start Date]</li>
            <li>Last Date: [Last Date]</li>
            <li>Exam Date: [Exam Date]</li>
        </ul>
        <p><strong>Application Fee:</strong></p>
        <ul>
            <li>General/OBC: [Fee Amount]</li>
            <li>SC/ST: [Fee Amount]</li>
        </ul>
        <p><strong>How to Apply:</strong></p>
        <p>Interested candidates can apply online through the official website. Read the official notification carefully before applying.</p>
    `;
    
    quill.root.innerHTML = jobTableTemplate;
    document.getElementById('description').value = jobTableTemplate;
    updateLivePreview();
    showToast('Job table template inserted', 'success');
}

// Insert Apply Buttons
function insertApplyButtons() {
    if (!quill) {
        showToast('Quill editor not initialized', 'error');
        return;
    }
    
    const applyButtonsTemplate = `
        <div style="margin: 15px 0; padding: 10px; background-color: #f9f9f9; border-left: 4px solid #007bff;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">Important Links:</p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <a href="[Apply Link]" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    <i class="fas fa-external-link-alt"></i> Apply Online
                </a>
                <a href="[Notification Link]" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    <i class="fas fa-download"></i> Download Notification
                </a>
                <a href="[Official Link]" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    <i class="fas fa-globe"></i> Official Website
                </a>
            </div>
        </div>
        <p style="margin-top: 15px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px;">
            <strong style="color: #856404;">⚠️ Note:</strong> Please read the official notification carefully before applying. Verify all details from the official website.
        </p>
    `;
    
    quill.root.innerHTML = applyButtonsTemplate;
    document.getElementById('description').value = applyButtonsTemplate;
    updateLivePreview();
    showToast('Apply buttons template inserted', 'success');
}

// Clear Quill Editor
function clearQuillEditor() {
    if (!quill) {
        showToast('Quill editor not initialized', 'error');
        return;
    }
    
    quill.setText('');
    document.getElementById('description').value = '';
    updateLivePreview();
    showToast('Editor cleared', 'info');
}

// Generate Professional Sarkari Table
function generateSarkariTable(data) {
    const {
        postName = '[Post Name]',
        totalPosts = '[Total Posts]',
        qualification = '[Qualification]',
        lastDate = '[Last Date]',
        startDate = '[Start Date]',
        examDate = '[Exam Date]',
        feeGeneral = '[Fee Amount]',
        feeSCST = '[Fee Amount]',
        ageLimit = '[Age Limit]',
        selectionProcess = '[Selection Process]'
    } = data || {};

    return `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin: 15px 0;">
            <h3 style="color: white; margin: 0 0 15px 0; text-align: center; font-size: 24px;">
                <i class="fas fa-briefcase"></i> ${postName}
            </h3>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
            <thead>
                <tr style="background: linear-gradient(135deg, #28a745, #20c997); color: white;">
                    <th style="border: none; padding: 15px; text-align: left; font-weight: bold;">Post Name</th>
                    <th style="border: none; padding: 15px; text-align: left; font-weight: bold;">Total Posts</th>
                    <th style="border: none; padding: 15px; text-align: left; font-weight: bold;">Qualification</th>
                    <th style="border: none; padding: 15px; text-align: left; font-weight: bold;">Last Date</th>
                </tr>
            </thead>
            <tbody>
                <tr style="background-color: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <td style="padding: 12px; font-weight: 600; color: #495057;">${postName}</td>
                    <td style="padding: 12px; text-align: center; font-weight: bold; color: #28a745;">${totalPosts}</td>
                    <td style="padding: 12px; color: #6c757d;">${qualification}</td>
                    <td style="padding: 12px; text-align: center; font-weight: bold; color: #dc3545;">${lastDate}</td>
                </tr>
            </tbody>
        </table>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px;">
                <h4 style="color: #856404; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-calendar-alt"></i> Important Dates
                </h4>
                <ul style="margin: 0; padding-left: 20px; color: #856404;">
                    <li><strong>Start Date:</strong> ${startDate}</li>
                    <li><strong>Last Date:</strong> ${lastDate}</li>
                    <li><strong>Exam Date:</strong> ${examDate}</li>
                </ul>
            </div>

            <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 15px;">
                <h4 style="color: #0c5460; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-rupee-sign"></i> Application Fee
                </h4>
                <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
                    <li><strong>General/OBC:</strong> ${feeGeneral}</li>
                    <li><strong>SC/ST:</strong> ${feeSCST}</li>
                </ul>
            </div>

            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 15px;">
                <h4 style="color: #721c24; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-user-clock"></i> Age Limit
                </h4>
                <p style="margin: 0; color: #721c24;">${ageLimit}</p>
            </div>

            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px;">
                <h4 style="color: #155724; margin: 0 0 10px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-tasks"></i> Selection Process
                </h4>
                <p style="margin: 0; color: #155724;">${selectionProcess}</p>
            </div>
        </div>

        <div style="background: linear-gradient(135deg, #e3f2fd, #bbdefb); border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="color: #1565c0; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-info-circle"></i> How to Apply
            </h4>
            <p style="margin: 0; color: #1565c0; line-height: 1.6;">
                Interested candidates can apply online through the official website. Please read the official notification carefully before applying. 
                Make sure to fill all required details and upload necessary documents.
            </p>
        </div>
    `;
}

// Generate Dynamic Apply Buttons
function generateApplyButtons(links) {
    const {
        applyLink = '#',
        notificationLink = '#',
        officialLink = '#',
        syllabusLink = '#',
        answerKeyLink = '#'
    } = links || {};

    const buttons = [];
    
    if (applyLink && applyLink !== '#') {
        buttons.push(`
            <a href="${applyLink}" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #007bff, #0056b3); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 5px; transition: all 0.3s; box-shadow: 0 4px 6px rgba(0,123,255,0.3);">
                <i class="fas fa-external-link-alt"></i> Apply Online
            </a>
        `);
    }
    
    if (notificationLink && notificationLink !== '#') {
        buttons.push(`
            <a href="${notificationLink}" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #28a745, #1e7e34); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 5px; transition: all 0.3s; box-shadow: 0 4px 6px rgba(40,167,69,0.3);">
                <i class="fas fa-download"></i> Download Notification
            </a>
        `);
    }
    
    if (officialLink && officialLink !== '#') {
        buttons.push(`
            <a href="${officialLink}" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #dc3545, #c82333); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 5px; transition: all 0.3s; box-shadow: 0 4px 6px rgba(220,53,69,0.3);">
                <i class="fas fa-globe"></i> Official Website
            </a>
        `);
    }
    
    if (syllabusLink && syllabusLink !== '#') {
        buttons.push(`
            <a href="${syllabusLink}" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6f42c1, #5a32a3); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 5px; transition: all 0.3s; box-shadow: 0 4px 6px rgba(111,66,193,0.3);">
                <i class="fas fa-book"></i> Download Syllabus
            </a>
        `);
    }
    
    if (answerKeyLink && answerKeyLink !== '#') {
        buttons.push(`
            <a href="${answerKeyLink}" target="_blank" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #fd7e14, #e8590c); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 5px; transition: all 0.3s; box-shadow: 0 4px 6px rgba(253,126,20,0.3);">
                <i class="fas fa-key"></i> Answer Key
            </a>
        `);
    }

    return `
        <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 12px; padding: 20px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="color: #495057; margin: 0 0 15px 0; text-align: center; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <i class="fas fa-link"></i> Important Links
            </h3>
            <div style="text-align: center; flex-wrap: wrap; display: flex; justify-content: center; align-items: center; gap: 10px;">
                ${buttons.join('')}
            </div>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <p style="margin: 0; color: #856404; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>⚠️ Important Note:</strong> Please read the official notification carefully before applying. Verify all details from the official website.
                </p>
            </div>
        </div>
    `;
}

// Jobs Management
async function loadJobs() {
    try {
        const snapshot = await db.collection('latest_jobs').orderBy('createdAt', 'desc').get();
        jobs = [];
        
        snapshot.forEach(doc => {
            jobs.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderJobsTable();
        
    } catch (error) {
        console.error('Error loading jobs:', error);
        showToast('Failed to load jobs', 'error');
        renderJobsTableError();
    }
}

function renderJobsTable() {
    const tbody = document.getElementById('jobsTableBody');
    
    if (jobs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-3"></i>
                    <p>No jobs found. Add your first job above!</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = jobs.map(job => `
        <tr class="table-row border-b border-gray-200">
            <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900">${job.title}</div>
                <div class="text-xs text-gray-500">${formatDate(job.postDate)}</div>
            </td>
            <td class="px-4 py-3">
                <span class="bg-${getCategoryColor(job.category)}-100 text-${getCategoryColor(job.category)}-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    ${job.category}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                ${formatDate(job.lastDate)}
            </td>
            <td class="px-4 py-3">
                <span class="bg-${job.status === 'active' ? 'green' : 'gray'}-100 text-${job.status === 'active' ? 'green' : 'gray'}-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    ${job.status}
                </span>
            </td>
            <td class="px-4 py-3 text-sm">
                <button onclick="editJob('${job.id}')" class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="deleteJob('${job.id}')" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function renderJobsTableError() {
    const tbody = document.getElementById('jobsTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="px-4 py-8 text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-3"></i>
                <p>Failed to load jobs. Please refresh the page.</p>
            </td>
        </tr>
    `;
}

async function editJob(jobId) {
    try {
        const job = jobs.find(j => j.id === jobId);
        if (!job) return;
        
        // Fill form with job data
        document.getElementById('jobId').value = jobId;
        document.getElementById('title').value = job.title;
        document.getElementById('category').value = job.category;
        document.getElementById('lastDate').value = job.lastDate;
        document.getElementById('postDate').value = job.postDate;
        document.getElementById('applyLink').value = job.applyLink;
        document.getElementById('officialLink').value = job.officialLink || '';
        
        // Set Quill editor content
        if (quill && job.description) {
            quill.root.innerHTML = job.description;
        }
        
        // Populate the Sarkari Sub-form from the job's saved structured data
        if (window.sarkariEnhancer && typeof window.sarkariEnhancer.populateFromJSON === 'function') {
            window.sarkariEnhancer.populateFromJSON(job);
        }
        
        editingJobId = jobId;
        document.getElementById('submitBtnText').textContent = 'Update Job';
        
        updateLivePreview();
        
        // Scroll to form
        document.getElementById('jobForm').scrollIntoView({ behavior: 'smooth' });
        
        showToast('Job loaded for editing', 'info');
        
    } catch (error) {
        console.error('Error editing job:', error);
        showToast('Failed to load job for editing', 'error');
    }
}

async function deleteJob(jobId) {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
        return;
    }
    
    try {
        await db.collection('latest_jobs').doc(jobId).delete();
        showToast('Job deleted successfully', 'success');
        await loadJobs();
        
    } catch (error) {
        console.error('Error deleting job:', error);
        showToast('Failed to delete job', 'error');
    }
}

// Filter Functions
function filterJobs() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchTerm) || 
                             job.description.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || job.category === categoryFilter;
        
        return matchesSearch && matchesCategory;
    });
    
    renderFilteredJobs(filteredJobs);
}

function renderFilteredJobs(filteredJobs) {
    const tbody = document.getElementById('jobsTableBody');
    
    if (filteredJobs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-search text-4xl mb-3"></i>
                    <p>No jobs found matching your criteria</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredJobs.map(job => `
        <tr class="table-row border-b border-gray-200">
            <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900">${job.title}</div>
                <div class="text-xs text-gray-500">${formatDate(job.postDate)}</div>
            </td>
            <td class="px-4 py-3">
                <span class="bg-${getCategoryColor(job.category)}-100 text-${getCategoryColor(job.category)}-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    ${job.category}
                </span>
            </td>
            <td class="px-4 py-3 text-sm text-gray-900">
                ${formatDate(job.lastDate)}
            </td>
            <td class="px-4 py-3">
                <span class="bg-${job.status === 'active' ? 'green' : 'gray'}-100 text-${job.status === 'active' ? 'green' : 'gray'}-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    ${job.status}
                </span>
            </td>
            <td class="px-4 py-3 text-sm">
                <button onclick="editJob('${job.id}')" class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="deleteJob('${job.id}')" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// Utility Functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
}

function getCategoryColor(category) {
    const colors = {
        'Latest Jobs': 'blue',
        'Admit Card': 'green',
        'Result': 'purple',
        'Admission': 'yellow',
        'Answer Key': 'red',
        'OTR': 'indigo',
        'Other': 'gray'
    };
    return colors[category] || 'gray';
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (connected) {
        statusElement.innerHTML = '<i class="fas fa-circle text-green-400"></i> Connected';
    } else {
        statusElement.innerHTML = '<i class="fas fa-circle text-red-400"></i> Disconnected';
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    // Set message
    toastMessage.textContent = message;
    
    // Set icon based on type
    const icons = {
        success: '<i class="fas fa-check-circle text-green-500 text-xl"></i>',
        error: '<i class="fas fa-exclamation-circle text-red-500 text-xl"></i>',
        warning: '<i class="fas fa-exclamation-triangle text-yellow-500 text-xl"></i>',
        info: '<i class="fas fa-info-circle text-blue-500 text-xl"></i>'
    };
    toastIcon.innerHTML = icons[type] || icons.info;
    
    // Show toast
    toast.classList.remove('translate-x-full');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full');
    }, 3000);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut().then(() => {
            // Clear session storage
            sessionStorage.removeItem('adminLoginTime');
            localStorage.removeItem('adminEmail');
            
            showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        }).catch(error => {
            console.error('Logout error:', error);
            showToast('Logout failed', 'error');
        });
    }
}

// Session Management
function setupSessionManagement() {
    // Set up activity listeners for auto-logout
    let inactivityTimer;
    
    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            auth.signOut().then(() => {
                showToast('Session expired due to inactivity', 'info');
                window.location.href = 'login.html';
            });
        }, 30 * 60 * 1000); // 30 minutes
    }
    
    // Activity listeners
    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('scroll', resetInactivityTimer);
    
    // Start timer
    resetInactivityTimer();
    
    // Prevent back button after logout
    window.addEventListener('popstate', function(event) {
        auth.onAuthStateChanged((user) => {
            if (!user) {
                history.pushState(null, null, location.href);
            }
        });
    });
}

// Check session validity
function checkSessionValidity() {
    const loginTime = sessionStorage.getItem('adminLoginTime');
    if (loginTime) {
        const loginDate = new Date(loginTime);
        const now = new Date();
        const diffInHours = (now - loginDate) / (1000 * 60 * 60);
        
        // Auto-logout after 8 hours
        if (diffInHours > 8) {
            auth.signOut().then(() => {
                showToast('Session expired. Please login again.', 'info');
                window.location.href = 'login.html';
            });
        }
    }
}

// Global Sync Function - This ensures data syncs with homepage
async function syncWithHomepage() {
    try {
        // This function would be called to update the homepage
        // In a real implementation, this might trigger a webhook
        // or update a shared collection that the homepage reads from
        
        const jobsSnapshot = await db.collection('latest_jobs').where('status', '==', 'active').get();
        const activeJobs = [];
        
        jobsSnapshot.forEach(doc => {
            activeJobs.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update the main collection directly (homepage reads from latest_jobs)
        // No need for separate sync as homepage reads directly from latest_jobs
        console.log('Data saved to latest_jobs collection - homepage will update automatically');
        
        showToast('Data synced with homepage successfully', 'success');
        
    } catch (error) {
        console.error('Sync error:', error);
        showToast('Failed to sync with homepage', 'error');
    }
}

// Auto-sync removed - data syncs automatically since both admin and homepage use same collection

// Call simple success message after job operations
const originalHandleFormSubmit = handleFormSubmit;
handleFormSubmit = async function(event) {
    await originalHandleFormSubmit.call(this, event);
    showToast('Job saved successfully! Homepage will update automatically.', 'success');
};

const originalDeleteJob = deleteJob;
deleteJob = async function(jobId) {
    await originalDeleteJob.call(this, jobId);
    showToast('Job deleted successfully! Homepage will update automatically.', 'success');
};
