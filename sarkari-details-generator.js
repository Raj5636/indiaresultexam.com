// Sarkari Result Style Details Generator
// Generate exact Sarkari Result style pages from JSON

class SarkariDetailsGenerator {
    constructor() {
        this.styles = {
            table: 'sarkari-table',
            recruitmentTable: 'sarkari-recruitment-table',
            sectionHeader: 'sarkari-section-header',
            datesSection: 'sarkari-dates-section',
            feeSection: 'sarkari-fee-section',
            howToApply: 'sarkari-how-to-apply',
            linksSection: 'sarkari-links-section',
            linkButton: 'sarkari-link-button',
            linksGrid: 'sarkari-links-grid',
            container: 'sarkari-container',
            title: 'sarkari-title'
        };
    }

    // Generate complete Sarkari Result style page
    generateCompletePage(data) {
        const title = data.title || data.postName || 'Recruitment 2026';
        const postName = data.postName || data.title || '[Post Name]';
        const totalPosts = data.totalPosts || data.total_posts || '[Total Posts]';
        const qualification = data.qualification || data.eligibility || 'Various Posts';
        const lastDate = data.lastDate || data.last_date || '[Last Date]';
        const startDate = data.startDate || data.start_date || data.applicationBegin || '[Start Date]';
        const examDate = data.examDate || data.exam_date || '[Exam Date]';
        const admitCardDate = data.admitCardDate || data.admit_card_date || '';
        const category = data.category || '';
        const titleStr = String(data.title || data.postName || '').toLowerCase();
        const isAdmitCard = category === 'Admit Card' || titleStr.includes('admit card');
        const isResult = category === 'Result' || titleStr.includes('result');
        const isFreeCategory = isAdmitCard || isResult;

        let feeGeneral = data.feeGeneral || data.feeOBC || '';
        let feeSCST = data.feeSCST || '';
        let feeFemale = data.feeFemale || '';

        if (isFreeCategory) {
            feeGeneral = '0/- (Free)';
            feeSCST = '0/- (Free)';
            feeFemale = '0/- (Free)';
        }
        const feeRows = data.feeRows || [];
        const ageLimit = data.ageLimit || data.age_limit || '';
        const selectionProcess = data.selectionProcess || data.selection_process || '';
        const recruitmentPosts = data.recruitmentPosts || [];
        const links = data.links || [];
        const organization = data.organization || '';
        const categoryVacancyHTML = data.categoryVacancyHTML || '';
        const customDatesHTML = data.customDatesHTML || '';

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
        const advtNoValue = data.advtNo || '07-Exam/2026';
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
        if (feeRows && feeRows.length > 0) {
            feeRows.forEach(f => {
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
                                ${isAdmitCard 
                                    ? '<strong>No Application Fee:</strong> Download and print your Admit Card / Exam Hall Ticket completely free of charge.' 
                                    : isResult 
                                        ? '<strong>No Application Fee:</strong> Check and download your Exam Results, Marks, Cutoff, and Score Card completely free of charge.' 
                                        : '<strong>Pay the Examination Fee Through:</strong> Cash at E Challan or Debit Card, Credit Card, Net Banking.'}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        `;

        // 3. Age Limit Table (Screenshot 3)
        const ageLimitStr = String(ageLimit || '');
        const ageLimitTextHTML = ageLimitStr 
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
                                    ${ageLimitStr.split('|').map(s => s.trim()).filter(s => s.length > 0).map(item => {
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
        if (recruitmentPosts && recruitmentPosts.length > 0) {
            const postRows = recruitmentPosts.map(post => {
                const eligibilityStr = String(post.eligibility || '');
                const eligibilityList = eligibilityStr 
                    ? eligibilityStr.split('|').map(e => `<li>${e.trim()}</li>`).join('')
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

        // 6. Important Links Box Grid (Screenshot 7) & Action Buttons (Screenshot 1)
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

        // Map dynamic links to professional buttons
        sortedLinks.forEach(l => {
            if (!l) return;
            const nameStr = String(l.name || '');
            const urlStr = normalizeUrl(l.url);
            const nameStrLower = nameStr.toLowerCase();
            
            let buttonClass = 'btn-apply'; // default
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
        `;
    }

    generateTitle(data) { return ''; }
    generateImportantDates(data) { return ''; }
    generateApplicationFee(data) { return ''; }
    generateAgeLimitAndSelection(data) { return ''; }
    generateRecruitmentTable(data) { return ''; }
    generateDescriptionSection(data) { return ''; }
    generateHowToApply(data) { return ''; }
    generateImportantLinks(data) { return ''; }
    generateOfficialWebsite(data) { return ''; }
    generateSSBStyleJSON() { return {}; }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SarkariDetailsGenerator;
} else {
    window.SarkariDetailsGenerator = SarkariDetailsGenerator;
}
