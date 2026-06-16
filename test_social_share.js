const socialShare = require('./social_share');

async function runTest() {
  const config = socialShare.loadConfig();
  console.log('--- Social Auto-Share Diagnostics ---');
  console.log('Configuration Loaded:');
  console.log(`- Telegram Enabled: ${config.telegramEnabled}`);
  console.log(`- Telegram Chat ID: ${config.telegramChatId}`);
  console.log(`- WhatsApp Enabled: ${config.whatsAppEnabled}`);
  console.log(`- WhatsApp Provider: ${config.whatsAppProvider}`);
  console.log('-------------------------------------\n');

  const mockData = {
    title: "Test Recruitment Board Bharti 2026 Online Form",
    category: "Latest Job",
    organization: "Test Recruitment Commission (TRC)",
    totalPosts: "999",
    qualification: "Bachelor Degree in Any Stream",
    applicationBegin: "05 June 2026",
    lastDate: "30 June 2026"
  };

  const mockDocId = "mock_document_test_id";
  const message = socialShare.formatMessage(mockData, mockDocId);

  console.log('Formatted Message Preview:');
  console.log('=====================================');
  console.log(message);
  console.log('=====================================\n');

  if (config.telegramEnabled) {
    console.log('Sending Test Telegram Message...');
    if (config.telegramBotToken === 'YOUR_TELEGRAM_BOT_TOKEN') {
      console.warn('[WARNING] Please replace placeholder value "YOUR_TELEGRAM_BOT_TOKEN" in social_config.json first!');
    } else {
      const res = await socialShare.shareToTelegram(message, config);
      if (res.success) {
        console.log(`[SUCCESS] Telegram Message Sent! Msg ID: ${res.messageId}`);
      } else {
        console.error(`[FAIL] Telegram Error: ${res.reason}`);
      }
    }
  } else {
    console.log('Telegram sharing is disabled in configuration. Skipping Telegram test.');
  }

  console.log('');

  if (config.whatsAppEnabled) {
    console.log('Sending Test WhatsApp Message...');
    if (config.whatsAppProvider === 'webhook' && config.whatsAppWebhookUrl === 'https://your-webhook-url-here.com') {
      console.warn('[WARNING] Please replace placeholder webhook URL in social_config.json first!');
    } else {
      const res = await socialShare.shareToWhatsApp(message, mockData, mockDocId, config);
      if (res.success) {
        console.log('[SUCCESS] WhatsApp Message Sent successfully!');
      } else {
        console.error(`[FAIL] WhatsApp Error: ${res.reason}`);
      }
    }
  } else {
    console.log('WhatsApp sharing is disabled in configuration. Skipping WhatsApp test.');
  }

  console.log('\nDiagnostics complete. Check social_config.json to customize settings.');
}

runTest();
