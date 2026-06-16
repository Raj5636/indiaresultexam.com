// Inject shared sidebar and header from index.html into pages that include placeholders
async function injectShell() {
  try {
    const res = await fetch('/index.html', { credentials: 'same-origin' });
    const html = await res.text();
    const doc = document.implementation.createHTMLDocument('index');
    doc.documentElement.innerHTML = html;
    const sidebar = doc.querySelector('.sidebar');
    const header = doc.querySelector('.header');
    const targetSidebar = document.querySelector('#injectedSidebar');
    const targetHeader = document.querySelector('#injectedHeader');
    if (sidebar && targetSidebar) {
      targetSidebar.innerHTML = sidebar.innerHTML;
      targetSidebar.hidden = false;
    }
    if (header && targetHeader) {
      targetHeader.innerHTML = header.innerHTML;
    }
    // Minimal hamburger toggle for mobile
    const hamburger = document.querySelector('.hamburger');
    const app = document.querySelector('.app');
    if (hamburger && app) {
      hamburger.addEventListener('click', (e) => {
        e.preventDefault();
        app.classList.toggle('sidebar-open');
      });
    }
  } catch (e) {
    console.warn('Shell injection failed:', e);
  }
}

injectShell();
