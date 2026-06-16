const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, 'autopilot.log');

// Log writer helper
function logMessage(message) {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const formattedMsg = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFilePath, formattedMsg, 'utf8');
}

// Parse command-line arguments
function parseArgs() {
  const args = {
    categories: ['jobs', 'admit', 'results'], // Default: all categories
    limit: null, // Default: no limit (import all)
    loop: false,
    intervalHours: 1
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg.startsWith('--limit=')) {
      const limit = parseInt(arg.split('=')[1]);
      if (!isNaN(limit) && limit > 0) {
        args.limit = limit;
      }
    } else if (arg.startsWith('--categories=')) {
      const cats = arg.split('=')[1].toLowerCase().split(',');
      args.categories = cats.filter(cat => ['jobs', 'admit', 'results'].includes(cat));
    } else if (arg === '--jobs') {
      args.categories = ['jobs'];
    } else if (arg === '--admit') {
      args.categories = ['admit'];
    } else if (arg === '--results') {
      args.categories = ['results'];
    } else if (arg === '--loop') {
      args.loop = true;
    } else if (arg.startsWith('--interval=')) {
      const hours = parseInt(arg.split('=')[1]);
      if (!isNaN(hours) && hours > 0) {
        args.intervalHours = hours;
      }
    }
  }

  return args;
}

// Show help message
function showHelp() {
  console.log(`
India Result Exam - Autopilot Importer
======================================

Usage:
  node autopilot.js [options]

Options:
  --limit=N          Limit import to N posts per category
  --jobs             Import only Latest Jobs
  --admit            Import only Admit Cards
  --results          Import only Results
  --categories=X,Y,Z Import specific categories (comma-separated: jobs,admit,results)
  --loop             Run in continuous loop mode
  --interval=H       Loop interval in hours (default: 1)

Examples:
  node autopilot.js                              # Import all posts (all categories)
  node autopilot.js --limit=10                   # Import 10 posts from each category
  node autopilot.js --jobs --limit=5             # Import only 5 Latest Jobs
  node autopilot.js --admit --results            # Import only Admit Cards and Results
  node autopilot.js --categories=jobs,admit      # Import Jobs and Admit Cards
  node autopilot.js --limit=20 --loop            # Continuous loop, 20 posts each run
`);
}

// Run single scraper command asynchronously
function runCommand(command) {
  return new Promise((resolve) => {
    logMessage(`Running command: ${command}`);
    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
      if (stdout) {
        fs.appendFileSync(logFilePath, stdout, 'utf8');
      }
      if (stderr) {
        fs.appendFileSync(logFilePath, `[STDERR] ${stderr}\n`, 'utf8');
      }
      if (error) {
        logMessage(`ERROR running command ${command}: ${error.message}`);
        resolve(false);
      } else {
        logMessage(`SUCCESS: Command ${command} completed successfully.`);
        resolve(true);
      }
    });
  });
}

// Main sequence runner
async function startAutopilot() {
  const args = parseArgs();
  
  // Show help if requested
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    return;
  }

  logMessage('=== AUTOPILOT CYCLE STARTED ===');
  logMessage(`Configuration: Categories=${args.categories.join(', ')}, Limit=${args.limit || 'No limit'}`);
  
  let jobsSuccess = true;
  let admitSuccess = true;
  let resultsSuccess = true;
  
  // Build command arguments
  const cmdArgs = args.limit ? ` --limit=${args.limit}` : '';
  
  // Run selected scrapers
  if (args.categories.includes('jobs')) {
    jobsSuccess = await runCommand(`node scrape_and_import.js${cmdArgs}`);
  }
  if (args.categories.includes('admit')) {
    admitSuccess = await runCommand(`node scrape_admit_cards.js${cmdArgs}`);
  }
  if (args.categories.includes('results')) {
    resultsSuccess = await runCommand(`node scrape_results.js${cmdArgs}`);
  }
  
  logMessage(`=== AUTOPILOT CYCLE COMPLETE (Jobs: ${jobsSuccess ? 'OK' : 'ERR'}, Admits: ${admitSuccess ? 'OK' : 'ERR'}, Results: ${resultsSuccess ? 'OK' : 'ERR'}) ===\n`);
}

// Parse arguments
const args = parseArgs();

// Check for --loop flag
if (args.loop) {
  logMessage(`Autopilot running in LOOP mode (Every ${args.intervalHours} hour). Press Ctrl+C to stop.`);
  startAutopilot();
  setInterval(startAutopilot, args.intervalHours * 60 * 60 * 1000);
} else {
  startAutopilot();
}
