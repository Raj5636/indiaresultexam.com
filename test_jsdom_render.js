const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Simulate a browser load of the details page
async function run() {
  const html = fs.readFileSync(path.join(__dirname, 'details.html'), 'utf8');
  
  // Set up JSDOM with scripts execution enabled
  const dom = new JSDOM(html, {
    url: "http://localhost:5000/details.html?id=f4TGtLR73iWwKC5D7O1p",
    runScripts: "dangerously",
    resources: "usable"
  });

  // Mock global window objects
  dom.window.localStorage = {
    getItem: (key) => "light",
    setItem: (key, val) => {}
  };
  
  // Wait for the scripts to load and execute
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const document = dom.window.document;
  
  console.log("Details Container InnerHTML length:", document.getElementById("detailsContainer")?.innerHTML.length);
  console.log("Date Alert Panel exists:", !!document.querySelector(".date-alert-panel"));
  console.log("WhatsApp Share Button exists:", !!document.querySelector(".btn-share-whatsapp"));
  console.log("Body data-theme attribute:", dom.window.document.body.getAttribute("data-theme"));
}

run().catch(console.error);
