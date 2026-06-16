// Sarkari Admin Panel Enhancer
// Add native, beautiful Sarkari Result style form fields to admin panel

class SarkariAdminEnhancer {
    constructor() {
        this.generator = new SarkariDetailsGenerator();
        this.init();
    }

    init() {
        this.addSarkariFormFields();
        this.addEventListeners();
        console.log('Sarkari Admin Enhancer Initialized.');
    }

    // Add Sarkari Result style form fields to admin panel natively
    addSarkariFormFields() {
        const jobForm = document.getElementById('jobForm');
        if (!jobForm) {
            console.error('Job form not found in DOM!');
            return;
        }

        const sarkariFormHTML = `
            <div id="sarkariAdminSection" class="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-blue-200/50 shadow-sm space-y-4 mt-6">
                <div class="flex items-center space-x-2 border-b border-blue-100 pb-3 mb-4">
                    <i class="fas fa-file-invoice-dollar text-blue-600 text-xl"></i>
                    <h3 class="text-lg font-bold text-gray-800">
                        Sarkari Result Style Details
                    </h3>
                </div>
                
                <!-- Basic Information -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Organization Name:</label>
                        <input type="text" id="sarkariOrganization" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="e.g., Sashastra Seema Bal SSB">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Website Name:</label>
                        <input type="text" id="sarkariWebsiteName" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="e.g., Sarkari Result" value="Sarkari Result">
                    </div>
                </div>

                <!-- Important Dates -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Application Begin:</label>
                        <input type="text" id="sarkariApplicationBegin" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="e.g., 21/03/2026">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Last Date for Apply:</label>
                        <input type="text" id="sarkariLastDate" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="e.g., 20/04/2026 or Post Wise">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Exam Date:</label>
                        <input type="text" id="sarkariExamDate" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="e.g., As per Schedule">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Admit Card Date:</label>
                        <input type="text" id="sarkariAdmitCardDate" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="e.g., Available Soon">
                    </div>
                </div>

                <!-- Application Fee -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">General/OBC/EWS Fee:</label>
                        <input type="text" id="sarkariFeeGeneral" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="e.g., 100/-">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">SC/ST/PH Fee:</label>
                        <input type="text" id="sarkariFeeSCST" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="e.g., 0/-">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">All Category Female Fee:</label>
                        <input type="text" id="sarkariFeeFemale" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="e.g., 0/-">
                    </div>
                </div>

                <!-- Age Limit & Selection Process -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Age Limit Details:</label>
                        <textarea id="sarkariAgeLimit" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="e.g., Min: 18 Years & Max: 27 Years. Age Relaxation Extra as per Rules."></textarea>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Selection Process:</label>
                        <textarea id="sarkariSelectionProcess" rows="2" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="e.g., Written Exam, PET/PST (where applicable), Medical and DV."></textarea>
                    </div>
                </div>

                <!-- Official Website -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Official Website Link:</label>
                    <input type="url" id="sarkariOfficialWebsite" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" placeholder="e.g., https://recruitment.ssb.gov.in/">
                </div>

                <!-- Multiple Posts Section -->
                <div class="border-t border-gray-200 pt-4 mt-2">
                    <label class="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <i class="fas fa-table text-green-600"></i> Multiple Recruitment Posts (Sarkari Style Table Rows)
                    </label>
                    <div id="sarkariPostsContainer" class="space-y-3">
                        <!-- Dynamic rows injected here -->
                    </div>
                    <button type="button" id="addSarkariPost" class="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
                        <i class="fas fa-plus"></i> Add Recruitment Post Row
                    </button>
                </div>

                <!-- Important Links Grid -->
                <div class="border-t border-gray-200 pt-4 mt-2">
                    <label class="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <i class="fas fa-link text-blue-600"></i> Important Links (Apply, Notification, Website etc.)
                    </label>
                    <div id="sarkariLinksContainer" class="space-y-3">
                        <!-- Dynamic rows injected here -->
                    </div>
                    <button type="button" id="addSarkariLink" class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
                        <i class="fas fa-plus"></i> Add Custom Link Row
                    </button>
                </div>

                <!-- Action Tools -->
                <div class="border-t border-gray-200 pt-4 mt-2 flex flex-wrap gap-2 justify-center">
                    <button type="button" id="generateSarkariJSON" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2">
                        <i class="fas fa-code"></i> Generate JSON
                    </button>
                    <button type="button" id="fillSarkariForm" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2">
                        <i class="fas fa-magic"></i> Sync to Quill & AI Box
                    </button>
                    <button type="button" id="loadSSBSample" class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2">
                        <i class="fas fa-file-import"></i> Load SSB Sample
                    </button>
                    <button type="button" id="clearSarkariForm" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2">
                        <i class="fas fa-trash"></i> Clear Sub-form
                    </button>
                </div>

                <!-- JSON Output (Collapsible) -->
                <div class="border-t border-gray-200 pt-3">
                    <details class="group">
                        <summary class="text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700 select-none flex items-center justify-between">
                            <span><i class="fas fa-json-file mr-1"></i> View Generated Sub-Form JSON</span>
                            <span class="transition group-open:rotate-180">
                                <i class="fas fa-chevron-down"></i>
                            </span>
                        </summary>
                        <div class="mt-2">
                            <textarea id="sarkariJSONOutput" rows="8" readonly class="w-full p-3 bg-gray-900 text-green-400 font-mono text-xs rounded-lg border border-gray-800 focus:outline-none resize-y" placeholder="JSON structure will output here..."></textarea>
                        </div>
                    </details>
                </div>
            </div>
        `;

        // Insert natively inside the #jobForm right before the submit buttons
        const btnContainer = jobForm.querySelector('.flex.items-center.space-x-3') || jobForm.lastElementChild;
        btnContainer.insertAdjacentHTML('beforebegin', sarkariFormHTML);
    }

    // Add event listeners
    addEventListeners() {
        // Add post button
        const addPostBtn = document.getElementById('addSarkariPost');
        if (addPostBtn) {
            addPostBtn.addEventListener('click', () => this.addPostRow());
        }

        // Add link button
        const addLinkBtn = document.getElementById('addSarkariLink');
        if (addLinkBtn) {
            addLinkBtn.addEventListener('click', () => this.addLinkRow());
        }

        // Generate JSON button
        const generateJSONBtn = document.getElementById('generateSarkariJSON');
        if (generateJSONBtn) {
            generateJSONBtn.addEventListener('click', () => {
                this.generateJSON();
                if (typeof showToast === 'function') {
                    showToast('Sub-form JSON generated successfully!', 'success');
                }
            });
        }

        // Fill form button (Syncs subform data into main fields & Quill description)
        const fillFormBtn = document.getElementById('fillSarkariForm');
        if (fillFormBtn) {
            fillFormBtn.addEventListener('click', () => this.fillMainForm());
        }

        // Load SSB sample button
        const loadSSBSampleBtn = document.getElementById('loadSSBSample');
        if (loadSSBSampleBtn) {
            loadSSBSampleBtn.addEventListener('click', () => this.loadSSBSample());
        }

        // Clear form button
        const clearFormBtn = document.getElementById('clearSarkariForm');
        if (clearFormBtn) {
            clearFormBtn.addEventListener('click', () => this.clearForm(true));
        }
    }

    // Add new post row with elegant Tailwind styling
    addPostRow() {
        const container = document.getElementById('sarkariPostsContainer');
        if (!container) return;

        const newRow = document.createElement('div');
        newRow.className = 'sarkari-post-row grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg relative';
        newRow.innerHTML = `
            <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Post Name</label>
                <input type="text" placeholder="e.g. SI Staff Nurse" class="sarkari-post-name w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm bg-white">
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Total Post</label>
                <input type="text" placeholder="e.g. 51" class="sarkari-post-total w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm bg-white">
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
                <input type="text" placeholder="e.g. 21/03/2026" class="sarkari-post-start w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm bg-white">
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1">Last Date</label>
                <input type="text" placeholder="e.g. 20/04/2026" class="sarkari-post-last w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm bg-white">
            </div>
            <div class="flex items-end gap-2">
                <div class="flex-grow">
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Notification Link</label>
                    <input type="url" placeholder="https://..." class="sarkari-post-notification w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm bg-white">
                </div>
                <button type="button" onclick="this.closest('.sarkari-post-row').remove(); if (typeof window.sarkariEnhancer !== 'undefined') window.sarkariEnhancer.generateJSON();" class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition h-[34px] flex items-center justify-center">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(newRow);
        
        // Auto-scroll new row into view smoothly
        newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Add new link row with elegant Tailwind styling
    addLinkRow() {
        const container = document.getElementById('sarkariLinksContainer');
        if (!container) return;

        const newRow = document.createElement('div');
        newRow.className = 'sarkari-link-row grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg relative';
        newRow.innerHTML = `
            <div class="md:col-span-1">
                <label class="block text-xs font-semibold text-gray-500 mb-1">Link Name</label>
                <input type="text" placeholder="e.g. Apply Online" class="sarkari-link-name w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm bg-white">
            </div>
            <div class="md:col-span-2 flex items-end gap-2">
                <div class="flex-grow">
                    <label class="block text-xs font-semibold text-gray-500 mb-1">Link URL</label>
                    <input type="url" placeholder="https://..." class="sarkari-link-url w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm bg-white">
                </div>
                <button type="button" onclick="this.closest('.sarkari-link-row').remove(); if (typeof window.sarkariEnhancer !== 'undefined') window.sarkariEnhancer.generateJSON();" class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition h-[34px] flex items-center justify-center">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(newRow);
        
        // Auto-scroll new row into view smoothly
        newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Generate JSON from form fields
    generateJSON() {
        const org = document.getElementById('sarkariOrganization')?.value.trim() || '';
        const titleVal = document.getElementById('title')?.value.trim() || '';
        const webName = document.getElementById('sarkariWebsiteName')?.value.trim() || 'Sarkari Result';
        const officialWeb = document.getElementById('sarkariOfficialWebsite')?.value.trim() || '';

        const jsonData = {
            title: titleVal || (org ? org + ' Recruitment 2026' : 'Latest Job Recruitment 2026'),
            organization: org,
            websiteName: webName,
            websiteUrl: webName === 'Sarkari Result' ? 'https://www.sarkariresult.com' : '',
            officialWebsite: officialWeb,
            
            // Important Dates
            applicationBegin: document.getElementById('sarkariApplicationBegin')?.value.trim() || '',
            lastDate: document.getElementById('sarkariLastDate')?.value.trim() || '',
            examDate: document.getElementById('sarkariExamDate')?.value.trim() || '',
            admitCardDate: document.getElementById('sarkariAdmitCardDate')?.value.trim() || '',
            
            // Application Fee
            feeGeneral: document.getElementById('sarkariFeeGeneral')?.value.trim() || '',
            feeSCST: document.getElementById('sarkariFeeSCST')?.value.trim() || '',
            feeFemale: document.getElementById('sarkariFeeFemale')?.value.trim() || '',
            paymentMethod: 'Debit Card, Credit Card, Net Banking, E Challan',
            
            // Age & Selection Process
            ageLimit: document.getElementById('sarkariAgeLimit')?.value.trim() || '',
            selectionProcess: document.getElementById('sarkariSelectionProcess')?.value.trim() || '',

            // Recruitment Posts
            recruitmentTitle: org ? `${org} Latest & Upcoming Recruitment 2026` : 'Latest & Upcoming Recruitment 2026',
            recruitmentPosts: this.getRecruitmentPosts(),
            
            // Important Links
            links: this.getImportantLinks()
        };

        const jsonOutput = document.getElementById('sarkariJSONOutput');
        if (jsonOutput) {
            jsonOutput.value = JSON.stringify(jsonData, null, 2);
        }

        return jsonData;
    }

    // Get recruitment posts from form rows
    getRecruitmentPosts() {
        const posts = [];
        const postRows = document.querySelectorAll('.sarkari-post-row');
        
        postRows.forEach(row => {
            const postName = row.querySelector('.sarkari-post-name')?.value.trim();
            const totalPost = row.querySelector('.sarkari-post-total')?.value.trim();
            const startDate = row.querySelector('.sarkari-post-start')?.value.trim();
            const lastDate = row.querySelector('.sarkari-post-last')?.value.trim();
            const notificationLink = row.querySelector('.sarkari-post-notification')?.value.trim();
            
            if (postName || totalPost || startDate || lastDate || notificationLink) {
                posts.push({
                    postName: postName || '',
                    totalPost: totalPost || '',
                    startDate: startDate || '',
                    lastDate: lastDate || '',
                    notificationLink: notificationLink || ''
                });
            }
        });
        
        return posts;
    }

    // Get important links from form rows
    getImportantLinks() {
        const links = [];
        const linkRows = document.querySelectorAll('.sarkari-link-row');
        
        linkRows.forEach(row => {
            const name = row.querySelector('.sarkari-link-name')?.value.trim();
            const url = row.querySelector('.sarkari-link-url')?.value.trim();
            
            if (name && url) {
                links.push({ 
                    name: name, 
                    url: url 
                });
            }
        });
        
        return links;
    }

    // Sync sub-form details directly into main fields & compile Quill table
    fillMainForm() {
        const jsonData = this.generateJSON();
        
        // 1. Fill title if empty
        const titleField = document.getElementById('title');
        if (titleField && !titleField.value) {
            titleField.value = jsonData.title;
        }

        // 2. Fill last date if empty/valid
        const lastDateField = document.getElementById('lastDate');
        if (lastDateField && jsonData.lastDate) {
            // If it's a valid date string (YYYY-MM-DD), sync it
            if (/^\d{4}-\d{2}-\d{2}$/.test(jsonData.lastDate)) {
                lastDateField.value = jsonData.lastDate;
            } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(jsonData.lastDate)) {
                // Convert DD/MM/YYYY to YYYY-MM-DD
                const parts = jsonData.lastDate.split('/');
                lastDateField.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }

        // 3. Fill direct links if available
        if (jsonData.links && jsonData.links.length > 0) {
            jsonData.links.forEach(l => {
                const name = l.name.toLowerCase();
                if (name.includes('apply') && l.url) {
                    const applyField = document.getElementById('applyLink');
                    if (applyField) applyField.value = l.url;
                    const autoApply = document.getElementById('f_apply_link');
                    if (autoApply) autoApply.value = l.url;
                }
                if ((name.includes('official') || name.includes('website')) && l.url) {
                    const officialField = document.getElementById('officialLink');
                    if (officialField) officialField.value = l.url;
                    const autoOfficial = document.getElementById('f_official_link');
                    if (autoOfficial) autoOfficial.value = l.url;
                }
            });
        }
        
        // 4. Fill main AI Data input text box
        const aiDataInput = document.getElementById('aiDataInput');
        if (aiDataInput) {
            aiDataInput.value = JSON.stringify(jsonData, null, 2);
        }

        // 5. Generate high fidelity Red-Header Blue-Border table & paste into Quill
        if (typeof quill !== 'undefined' && typeof createProfessionalTable === 'function') {
            const tableHTML = createProfessionalTable(jsonData);
            
            try {
                quill.setText('');
                quill.clipboard.dangerouslyPasteHTML(tableHTML);
                document.getElementById('description').value = tableHTML;
            } catch (err) {
                console.warn('Direct paste failed, using fallback root innerHTML', err);
                quill.root.innerHTML = tableHTML;
                document.getElementById('description').value = tableHTML;
            }

            if (typeof updateLivePreview === 'function') {
                updateLivePreview();
            }

            if (typeof showToast === 'function') {
                showToast('Synced structured data to Quill Editor successfully!', 'success');
            }
        } else {
            if (typeof showToast === 'function') {
                showToast('Form data synced to fields. (Quill Editor not loaded)', 'warning');
            }
        }
    }

    // Load SSB Sample data
    loadSSBSample() {
        const ssbData = this.generator.generateSSBStyleJSON();
        this.populateFromJSON(ssbData);

        if (typeof showToast === 'function') {
            showToast('SSB Sample data loaded into sub-form!', 'success');
        }
    }

    // Clear all sub-form fields
    clearForm(showNotification = false) {
        const fields = [
            'sarkariOrganization', 'sarkariApplicationBegin', 
            'sarkariLastDate', 'sarkariExamDate', 'sarkariAdmitCardDate', 
            'sarkariFeeGeneral', 'sarkariFeeSCST', 'sarkariFeeFemale', 
            'sarkariAgeLimit', 'sarkariSelectionProcess', 'sarkariOfficialWebsite'
        ];
        
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const webName = document.getElementById('sarkariWebsiteName');
        if (webName) webName.value = 'Sarkari Result';

        // Clear containers
        const postsContainer = document.getElementById('sarkariPostsContainer');
        if (postsContainer) postsContainer.innerHTML = '';

        const linksContainer = document.getElementById('sarkariLinksContainer');
        if (linksContainer) linksContainer.innerHTML = '';

        const jsonOutput = document.getElementById('sarkariJSONOutput');
        if (jsonOutput) jsonOutput.value = '';

        if (showNotification && typeof showToast === 'function') {
            showToast('Sarkari sub-form cleared!', 'info');
        }
    }

    // Populate the sub-form dynamically from JSON or existing Firebase data
    populateFromJSON(data) {
        if (!data) return;
        
        console.log('Populating Sarkari Enhancer sub-form from data:', data);
        
        // Helper to set field value safely
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        // 1. Basic Fields
        const org = data.organization || data.department || data.dept || '';
        setVal('sarkariOrganization', org);
        setVal('sarkariWebsiteName', data.websiteName || 'Sarkari Result');
        
        const official = data.officialWebsite || data.official_website || data.officialLink || data.officialLink || '';
        setVal('sarkariOfficialWebsite', official);

        // Dates
        const begin = data.applicationBegin || data.startDate || data.start_date || '';
        setVal('sarkariApplicationBegin', begin);

        const last = data.lastDate || data.last_date || '';
        setVal('sarkariLastDate', last);

        const exam = data.examDate || data.exam_date || '';
        setVal('sarkariExamDate', exam);

        const admit = data.admitCardDate || data.admit_card_date || '';
        setVal('sarkariAdmitCardDate', admit);

        // Fees
        const gen = data.feeGeneral || data.fee_general || data.feeOBC || data.fee_gen || '';
        setVal('sarkariFeeGeneral', gen);

        const scst = data.feeSCST || data.fee_scst || data.fee_sc_st || '';
        setVal('sarkariFeeSCST', scst);

        const female = data.feeFemale || data.feeFemale || '';
        setVal('sarkariFeeFemale', female);

        // Age Limit & Selection
        const age = data.ageLimit || data.age_limit || '';
        setVal('sarkariAgeLimit', age);

        const selection = data.selectionProcess || data.selection_process || '';
        setVal('sarkariSelectionProcess', selection);

        // 2. Dynamic Posts
        const postsContainer = document.getElementById('sarkariPostsContainer');
        if (postsContainer) {
            postsContainer.innerHTML = '';
            
            if (data.recruitmentPosts && Array.isArray(data.recruitmentPosts) && data.recruitmentPosts.length > 0) {
                data.recruitmentPosts.forEach(post => {
                    this.addPostRow();
                    const lastRow = postsContainer.lastElementChild;
                    if (lastRow) {
                        lastRow.querySelector('.sarkari-post-name').value = post.postName || '';
                        lastRow.querySelector('.sarkari-post-total').value = post.totalPost || post.totalPosts || '';
                        lastRow.querySelector('.sarkari-post-start').value = post.startDate || '';
                        lastRow.querySelector('.sarkari-post-last').value = post.lastDate || '';
                        lastRow.querySelector('.sarkari-post-notification').value = post.notificationLink || post.notification_link || '';
                    }
                });
            } else {
                // Generate a default row if organization exists but no posts list
                if (org || data.title) {
                    this.addPostRow();
                    const row = postsContainer.lastElementChild;
                    if (row) {
                        row.querySelector('.sarkari-post-name').value = data.postName || data.title || '';
                        row.querySelector('.sarkari-post-total').value = data.totalPosts || data.total_posts || '';
                        row.querySelector('.sarkari-post-start').value = begin;
                        row.querySelector('.sarkari-post-last').value = last;
                        row.querySelector('.sarkari-post-notification').value = data.notificationLink || '';
                    }
                }
            }
        }

        // 3. Dynamic Links
        const linksContainer = document.getElementById('sarkariLinksContainer');
        if (linksContainer) {
            linksContainer.innerHTML = '';
            
            if (data.links && Array.isArray(data.links) && data.links.length > 0) {
                data.links.forEach(link => {
                    this.addLinkRow();
                    const lastRow = linksContainer.lastElementChild;
                    if (lastRow) {
                        lastRow.querySelector('.sarkari-link-name').value = link.name || '';
                        lastRow.querySelector('.sarkari-link-url').value = link.url || '';
                    }
                });
            } else {
                // Add default rows from direct links
                if (data.applyLink) {
                    this.addLinkRow();
                    const row = linksContainer.lastElementChild;
                    if (row) {
                        row.querySelector('.sarkari-link-name').value = 'Apply Online';
                        row.querySelector('.sarkari-link-url').value = data.applyLink;
                    }
                }
                if (data.officialLink || official) {
                    this.addLinkRow();
                    const row = linksContainer.lastElementChild;
                    if (row) {
                        row.querySelector('.sarkari-link-name').value = 'Official Website';
                        row.querySelector('.sarkari-link-url').value = data.officialLink || official;
                    }
                }
            }
        }
        
        // Auto-compile JSON box output
        this.generateJSON();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait for other scripts to initialize
    setTimeout(() => {
        if (typeof SarkariDetailsGenerator !== 'undefined') {
            window.sarkariEnhancer = new SarkariAdminEnhancer();
        }
    }, 800);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SarkariAdminEnhancer;
}
