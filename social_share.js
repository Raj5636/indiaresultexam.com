const fs = require('fs');
const path = require('path');

// Load configurations safely
function loadConfig() {
  const configPath = path.join(__dirname, 'social_config.json');
  if (!fs.existsSync(configPath)) {
    return { telegramEnabled: false, whatsAppEnabled: false };
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse social_config.json:', err);
    return { telegramEnabled: false, whatsAppEnabled: false };
  }
}

// Generate the rich formatted message based on post category
function formatMessage(data, docId) {
  const {
    title = 'New Notification',
    category = 'Job',
    organization = '',
    totalPosts = '',
    qualification = '',
    applicationBegin = '',
    lastDate = ''
  } = data;

  const websiteUrl = `https://indiaresultexam.com/details.html?id=${docId}`;
  
  if (category.toLowerCase().includes('admit')) {
    return `🚨 *ADMIT CARD RELEASED* 🚨

*Post Name:* ${title}
*Organization:* ${organization || 'Recruitment Board'}
*Category:* Admit Card / Exam City
*Status:* Available to Download Now

🔗 *Direct Link to Details & Download:*
${websiteUrl}

━━━━━━━━━━━━━━━━━━━━━━━━
🇮🇳 *India Result Exam*
Join our channel for instant alerts:
👉 @IndiaResultExam
━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
  }

  if (category.toLowerCase().includes('result')) {
    return `📢 *EXAM RESULT OUT* 📢

*Post Name:* ${title}
*Organization:* ${organization || 'Recruitment Board'}
*Category:* Exam Result / Score Card
*Status:* Declared / Merit List Available

🔗 *Direct Link to Check Result:*
${websiteUrl}

━━━━━━━━━━━━━━━━━━━━━━━━
🇮🇳 *India Result Exam*
Join our channel for instant alerts:
👉 @IndiaResultExam
━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
  }

  // Default Jobs formatting
  const totalPostsText = totalPosts && totalPosts !== 'Various' ? `*Total Posts:* ${totalPosts}\n` : '';
  const eligText = qualification && qualification !== 'Various Posts' ? `*Eligibility:* ${qualification}\n` : '';
  const lastDateText = lastDate ? `*Last Date:* ${lastDate}\n` : '';
  const startDateText = applicationBegin ? `*Start Date:* ${applicationBegin}\n` : '';

  return `🔥 *NEW GOVERNMENT JOB VACANCY* 🔥

*Post Name:* ${title}
*Organization:* ${organization || 'Recruitment Board'}
${totalPostsText}${eligText}${startDateText}${lastDateText}
🔗 *Direct Link to Details & Apply:*
${websiteUrl}

━━━━━━━━━━━━━━━━━━━━━━━━
🇮🇳 *India Result Exam*
Join our channel for instant alerts:
👉 @IndiaResultExam
━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
}

// Share via Telegram Bot API
async function shareToTelegram(message, config) {
  if (!config.telegramEnabled || !config.telegramBotToken || !config.telegramChatId) {
    return { success: false, reason: 'Telegram sharing not enabled or missing credentials.' };
  }

  try {
    const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      })
    });

    const json = await res.json();
    if (res.ok && json.ok) {
      return { success: true, messageId: json.result.message_id };
    }
    return { success: false, reason: json.description || 'Unknown Telegram API Error' };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// Share via WhatsApp Webhook or Green API
async function shareToWhatsApp(message, data, docId, config) {
  if (!config.whatsAppEnabled) {
    return { success: false, reason: 'WhatsApp sharing not enabled.' };
  }

  // 1. Webhook Provider
  if (config.whatsAppProvider === 'webhook' && config.whatsAppWebhookUrl) {
    try {
      const res = await fetch(config.whatsAppWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          docId: docId,
          title: data.title,
          category: data.category,
          organization: data.organization,
          link: `https://indiaresultexam.com/details.html?id=${docId}`
        })
      });
      if (res.ok) {
        return { success: true };
      }
      return { success: false, reason: `Webhook returned status ${res.status}` };
    } catch (err) {
      return { success: false, reason: err.message };
    }
  }

  // 2. Green API Provider
  if (config.whatsAppProvider === 'greenapi' && config.whatsAppGreenApiIdInstance && config.whatsAppGreenApiApiTokenInstance && config.whatsAppChatId) {
    try {
      const idInstance = config.whatsAppGreenApiIdInstance;
      const apiToken = config.whatsAppGreenApiApiTokenInstance;
      const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiToken}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: config.whatsAppChatId,
          message: message
        })
      });

      const json = await res.json();
      if (res.ok && json.idMessage) {
        return { success: true, messageId: json.idMessage };
      }
      return { success: false, reason: JSON.stringify(json) };
    } catch (err) {
      return { success: false, reason: err.message };
    }
  }

  return { success: false, reason: 'WhatsApp provider settings missing or invalid.' };
}

// Unified call to share a newly imported post
async function shareNewPost(data, docId) {
  const config = loadConfig();
  
  if (!config.telegramEnabled && !config.whatsAppEnabled) {
    // Silent skip if none are enabled (default state)
    return;
  }

  console.log(`[SOCIAL SHARE] Initiating shares for new post: "${data.title}" (Doc ID: ${docId})`);
  const message = formatMessage(data, docId);

  if (config.telegramEnabled) {
    const telResult = await shareToTelegram(message, config);
    if (telResult.success) {
      console.log(`  [TELEGRAM] Successfully posted! Msg ID: ${telResult.messageId}`);
    } else {
      console.warn(`  [TELEGRAM] Posting failed: ${telResult.reason}`);
    }
  }

  if (config.whatsAppEnabled) {
    const waResult = await shareToWhatsApp(message, data, docId, config);
    if (waResult.success) {
      console.log(`  [WHATSAPP] Successfully posted!`);
    } else {
      console.warn(`  [WHATSAPP] Posting failed: ${waResult.reason}`);
    }
  }
}

module.exports = {
  loadConfig,
  formatMessage,
  shareToTelegram,
  shareToWhatsApp,
  shareNewPost
};
