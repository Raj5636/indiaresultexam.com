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
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/latest_jobs?pageSize=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  const upbed = data.documents.find(d => d.fields.title.stringValue.includes('UPBEd'));
  if (upbed) {
    console.log('Document ID:', upbed.name.split('/').pop());
    console.log('Fields:', JSON.stringify(upbed.fields, null, 2));
  } else {
    console.log('UPBEd document not found.');
  }
}
run();
