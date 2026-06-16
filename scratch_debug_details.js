const REFRESH_TOKEN = "1//0gYEx5PhcLkaiCgYIARAAGBASNwF-L9IrS1NxUmL3wSfkSP4xl_yGl9J6hh9eb5p7owD9Oq8IkQy40O5yTHIteQq7TE0ogjRmoTA";
const CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const PROJECT_ID = "india-result-exam";

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN
    })
  });
  const json = await res.json();
  return json.access_token;
}

async function run() {
  const token = await getAccessToken();
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/latest_jobs/f4TGtLR73iWwKC5D7O1p`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const docData = await res.json();
  const fields = docData.fields;
  
  const data = {};
  for (const k of Object.keys(fields)) {
    data[k] = fields[k].stringValue || fields[k].integerValue || fields[k].timestampValue;
  }
  
  console.log('Parsed startStr / lastStr keys:');
  const startStr = data.start_date || data.startDate || data.applicationBegin || '';
  const lastStr = data.last_date || data.lastDate || '';
  
  console.log('startStr =', JSON.stringify(startStr));
  console.log('lastStr =', JSON.stringify(lastStr));
  
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
  
  const start = parseToDate(startStr);
  const last = parseToDate(lastStr);
  
  console.log('start date object =', start);
  console.log('last date object =', last);
  console.log('start > last =', start && last && start > last);
}
run();
