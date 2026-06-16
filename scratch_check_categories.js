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
  if (json.access_token) {
    return json.access_token;
  }
  throw new Error('Failed to refresh access token: ' + JSON.stringify(json));
}

async function listJobs() {
  try {
    console.log('Refreshing token...');
    const token = await getAccessToken();
    console.log('Fetching documents from latest_jobs...');
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/latest_jobs?pageSize=100`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!res.ok) {
      console.error('Fetch failed:', res.statusText, await res.text());
      return;
    }
    
    const data = await res.json();
    if (!data.documents || data.documents.length === 0) {
      console.log('No documents found in latest_jobs.');
      return;
    }
    
    console.log(`Found ${data.documents.length} documents. Summarizing categories:`);
    const summary = {};
    for (const doc of data.documents) {
      const fields = doc.fields;
      const title = fields.title ? fields.title.stringValue : 'No Title';
      const category = fields.category ? fields.category.stringValue : 'No Category';
      
      summary[category] = (summary[category] || 0) + 1;
      console.log(`- Category: "${category}" | Title: "${title.substring(0, 50)}..."`);
    }
    console.log('\nCategory Counts:', summary);
  } catch (e) {
    console.error('Error:', e);
  }
}

listJobs();
