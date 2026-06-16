// JSON to Details Converter - Direct JSON Fill System
// This file provides functions to convert JSON data to details page format

// Convert JSON to Professional Details Table
function jsonToDetailsTable(jsonData) {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    // Important Dates Section
    const importantDates = data.importantDates || (() => {
        const dates = [];
        if (data.startDate) dates.push(`<li><strong>Start Date:</strong> ${data.startDate}</li>`);
        if (data.lastDate) dates.push(`<li><strong>Last Date:</strong> ${data.lastDate}</li>`);
        if (data.examDate) dates.push(`<li><strong>Exam Date:</strong> ${data.examDate}</li>`);
        if (data.admitCardDate) dates.push(`<li><strong>Admit Card Date:</strong> ${data.admitCardDate}</li>`);
        return dates.length ? `<ul>${dates.join('')}</ul>` : '';
    })();

    // Application Fee Section
    const fees = data.fees || (() => {
        const feeList = [];
        if (data.feeGeneral) feeList.push(`<li><strong>General/OBC:</strong> ${data.feeGeneral}</li>`);
        if (data.feeSCST) feeList.push(`<li><strong>SC/ST:</strong> ${data.feeSCST}</li>`);
        if (data.feePH) feeList.push(`<li><strong>PH:</strong> ${data.feePH}</li>`);
        if (data.feeFemale) feeList.push(`<li><strong>Female:</strong> ${data.feeFemale}</li>`);
        return feeList.length ? `<ul>${feeList.join('')}</ul>` : '';
    })();

    // Age Limit Section
    const ageLimit = (() => {
        const rawAge = data.ageLimit;
        if (rawAge) {
            if (rawAge.includes('|')) {
                return `
                    <ul style="list-style-type: none; padding: 0; margin: 0;">
                        ${rawAge.split('|').map(s => s.trim()).filter(s => s.length > 0).map(item => {
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
            return `<p style="margin: 0; color: #000;">${rawAge}</p>`;
        }
        if (data.minAge || data.maxAge) {
            return `<p style="margin: 0; color: #000;"><strong>Minimum Age:</strong> ${data.minAge || 'N/A'} years<br><strong>Maximum Age:</strong> ${data.maxAge || 'N/A'} years</p>`;
        }
        return '';
    })();

    // Vacancy Details Section
    const vacancyDetails = data.vacancyDetails || (() => {
        if (data.totalPosts) return `<p><strong>Total Posts:</strong> ${data.totalPosts}</p>`;
        if (data.vacancy) return `<p>${data.vacancy}</p>`;
        return '';
    })();

    // Qualification Section
    const qualification = data.qualification || (() => {
        if (data.eligibility) return `<p>${data.eligibility}</p>`;
        return '';
    })();

    // Selection Process Section
    const selectionProcess = (() => {
        const rawSelection = data.selectionProcess;
        if (rawSelection) {
            if (rawSelection.includes('|')) {
                return `
                    <ul style="list-style-type: none; padding: 0; margin: 0;">
                        ${rawSelection.split('|').map(s => s.trim()).filter(s => s.length > 0).map(item => {
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
            return `<p style="margin: 0; color: #000;">${rawSelection}</p>`;
        }
        if (data.selection) return `<p style="margin: 0; color: #000;">${data.selection}</p>`;
        return '';
    })();

    // Build Professional Table HTML
    let tableHTML = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; margin: 15px 0;">
            <h3 style="color: white; margin: 0 0 15px 0; text-align: center; font-size: 24px;">
                <i class="fas fa-briefcase"></i> ${data.postName || data.title || 'Job Details'}
            </h3>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif; border: 2px solid #0000ff;">
    `;

    // Add sections if they exist
    if (importantDates) {
        tableHTML += `
            <tr>
                <td colspan="4" style="background-color: #ff0000; color: #ffffff; padding: 12px; border: 1px solid #0000ff; text-align: center; font-weight: bold; font-size: 16px;">
                    Important Dates
                </td>
            </tr>
            <tr>
                <td colspan="4" style="border: 1px solid #0000ff; padding: 10px; color: #000; background-color: #ffffff;">
                    ${importantDates}
                </td>
            </tr>
        `;
    }

    if (vacancyDetails) {
        tableHTML += `
            <tr>
                <td colspan="4" style="background-color: #ff0000; color: #ffffff; padding: 12px; border: 1px solid #0000ff; text-align: center; font-weight: bold; font-size: 16px;">
                    Vacancy Details
                </td>
            </tr>
            <tr>
                <td colspan="4" style="border: 1px solid #0000ff; padding: 10px; color: #000; background-color: #ffffff;">
                    ${vacancyDetails}
                </td>
            </tr>
        `;
    }

    if (qualification) {
        tableHTML += `
            <tr>
                <td colspan="4" style="background-color: #ff0000; color: #ffffff; padding: 12px; border: 1px solid #0000ff; text-align: center; font-weight: bold; font-size: 16px;">
                    Qualification
                </td>
            </tr>
            <tr>
                <td colspan="4" style="border: 1px solid #0000ff; padding: 10px; color: #000; background-color: #ffffff;">
                    ${qualification}
                </td>
            </tr>
        `;
    }

    if (ageLimit) {
        tableHTML += `
            <tr>
                <td colspan="4" style="background-color: #ff0000; color: #ffffff; padding: 12px; border: 1px solid #0000ff; text-align: center; font-weight: bold; font-size: 16px;">
                    Age Limit
                </td>
            </tr>
            <tr>
                <td colspan="4" style="border: 1px solid #0000ff; padding: 10px; color: #000; background-color: #ffffff;">
                    ${ageLimit}
                </td>
            </tr>
        `;
    }

    if (fees) {
        tableHTML += `
            <tr>
                <td colspan="4" style="background-color: #ff0000; color: #ffffff; padding: 12px; border: 1px solid #0000ff; text-align: center; font-weight: bold; font-size: 16px;">
                    Application Fee
                </td>
            </tr>
            <tr>
                <td colspan="4" style="border: 1px solid #0000ff; padding: 10px; color: #000; background-color: #ffffff;">
                    ${fees}
                </td>
            </tr>
        `;
    }

    if (selectionProcess) {
        tableHTML += `
            <tr>
                <td colspan="4" style="background-color: #ff0000; color: #ffffff; padding: 12px; border: 1px solid #0000ff; text-align: center; font-weight: bold; font-size: 16px;">
                    Selection Process
                </td>
            </tr>
            <tr>
                <td colspan="4" style="border: 1px solid #0000ff; padding: 10px; color: #000; background-color: #ffffff;">
                    ${selectionProcess}
                </td>
            </tr>
        `;
    }

    tableHTML += `
        </table>
    `;

    // Add Important Links Section
    if (data.links && Array.isArray(data.links) && data.links.length > 0) {
        tableHTML += `
            <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 12px; padding: 20px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #007bff;">
                <h3 style="color: #495057; margin: 0 0 15px 0; text-align: center; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <i class="fas fa-link"></i> Important Links
                </h3>
                <div style="text-align: center; flex-wrap: wrap; display: flex; justify-content: center; align-items: center; gap: 10px;">
        `;

        data.links.forEach((link, index) => {
            if (link.name && link.url) {
                const bgColor = index === 0 ? '#007bff' : '#dc3545';
                const icon = index === 0 ? 'fa-external-link-alt' : 'fa-globe';
                
                tableHTML += `
                    <div style="display: inline-block; margin: 8px; padding: 4px;">
                        <a href="${link.url}" target="_blank" style="
                            display: inline-block;
                            padding: 15px 25px;
                            background: linear-gradient(135deg, ${bgColor}, ${bgColor}dd);
                            color: white;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: bold;
                            font-size: 14px;
                            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                            border: 2px solid ${bgColor};
                            transition: all 0.3s;
                            min-width: 150px;
                            text-align: center;
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(0,0,0,0.3)'" 
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'">
                            <i class="fas ${icon}" style="margin-right: 8px;"></i> ${link.name}
                        </a>
                    </div>
                `;
            }
        });

        tableHTML += `
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

    return tableHTML;
}

// Function to fill details page with JSON data
function fillDetailsFromJSON(jsonData) {
    const tableHTML = jsonToDetailsTable(jsonData);
    const container = document.getElementById('detailsContainer');
    if (container) {
        container.innerHTML = `
            <div class="responsive-container">
                <div class="professional-table ql-editor">
                    ${tableHTML}
                </div>
            </div>
        `;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { jsonToDetailsTable, fillDetailsFromJSON };
}
