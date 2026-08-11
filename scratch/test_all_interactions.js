const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const server = http.createServer((req, res) => {
  let filePath = path.join(root, req.url.split('?')[0]);
  if (filePath === root || filePath === root + '/') filePath = path.join(root, 'index.html');
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.js') contentType = 'application/javascript';
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.json') contentType = 'application/json';
    if (ext === '.png') contentType = 'image/png';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(3457, async () => {
  console.log('Server listening on http://localhost:3457');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const consoleLogs = [];
  const jsErrors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      jsErrors.push(text);
    }
  });
  
  page.on('pageerror', err => {
    const errText = `[PAGE ERROR] ${err.toString()}\n${err.stack}`;
    consoleLogs.push(errText);
    jsErrors.push(errText);
  });

  try {
    await page.goto('http://localhost:3457', { waitUntil: 'networkidle0' });
    console.log('Page loaded.');

    // Check window objects
    const globals = await page.evaluate(() => {
      return {
        hasState: Boolean(window.state),
        hasOpenModule: typeof window.openModule === 'function',
        hasOpenSheet: typeof window.openSheet === 'function',
        hasTriggerBentoAction: typeof window.triggerBentoAction === 'function',
        hasForexEngine: Boolean(window.forexFactoryRedNewsEngine),
        hasTRDEngine: Boolean(window.trdDataEngine),
        activeModule: window.activeModule || 'none'
      };
    });
    console.log('\n--- GLOBAL UTILITIES CHECK ---');
    console.log(JSON.stringify(globals, null, 2));

    // Test clicking all 5 Bento cards on Landing Launcher
    const cards = ['overview', 'journal', 'missions', 'review', 'settings'];
    for (const mod of cards) {
      console.log(`\nTesting click on Bento Card: [${mod}]`);
      
      // Ensure landing gallery is active first
      await page.evaluate(() => window.openModule('landing-gallery'));
      await new Promise(r => setTimeout(r, 300));
      
      const cardSelector = `.css3d-card[data-module="${mod}"]`;
      const cardExists = await page.$(cardSelector);
      console.log(`  Selector ${cardSelector} exists:`, Boolean(cardExists));
      
      if (cardExists) {
        await page.click(cardSelector);
        await new Promise(r => setTimeout(r, 400));
        
        const viewState = await page.evaluate((m) => {
          const landingActive = document.getElementById('landing-gallery')?.classList.contains('active');
          const targetView = document.getElementById(m);
          const targetActive = targetView?.classList.contains('active');
          return { landingActive, targetActive };
        }, mod);
        
        console.log(`  Result for [${mod}]: landingActive=${viewState.landingActive}, targetActive=${viewState.targetActive}`);
      }
    }

    console.log('\n--- SUMMARY OF CONSOLE ERRORS ---');
    console.log(jsErrors.length > 0 ? jsErrors.join('\n') : 'NONE (0 errors)');

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
