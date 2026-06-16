const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'india-result-exam'
});

const db = admin.firestore();

async function run() {
  console.log('Attempting write to latest_jobs collection...');
  try {
    const docRef = await db.collection('latest_jobs').add({
      title: 'Test Post from Server CLI ' + Date.now(),
      category: 'Latest Jobs',
      organization: 'Test Org',
      state: 'ALL',
      officialLink: 'https://example.com',
      applyLink: 'https://example.com/apply',
      applicationBegin: '01/01/2026',
      lastDate: '31/01/2026',
      examDate: 'TBD',
      admitCardDate: 'TBD',
      feeGeneral: '100',
      feeSCST: '0',
      feeFemale: '0',
      ageLimit: '18-40',
      selectionProcess: 'Exam',
      recruitmentPosts: [],
      links: [],
      description: 'Test description',
      categoryVacancyHTML: '',
      categoryVacancyRows: [],
      customTableHeaders: [],
      customTableRows: [],
      customVacancyTableHTML: '',
      department: 'Test Dept',
      location: 'India',
      salary: 'As per rules',
      qualification: 'Various Posts',
      priority: 50,
      badge: 'New',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('SUCCESS: Document written with ID:', docRef.id);
    
    // Clean it up immediately
    await docRef.delete();
    console.log('Cleaned up test document.');
  } catch (e) {
    console.error('ERROR WRITING DOCUMENT:', e);
  }
}

run();
