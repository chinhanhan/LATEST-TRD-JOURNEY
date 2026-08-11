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

server.listen(3458, async () => {
  console.log('Server listening on http://localhost:3458');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.toString()}`));

  try {
    await page.goto('http://localhost:3458', { waitUntil: 'networkidle0' });
    console.log('Page loaded.');

    // 1. Open Start Trade Sheet
    console.log('1. Opening Start Trade Sheet...');
    await page.evaluate(() => window.openSheet('tradeFormSheet'));
    await new Promise(r => setTimeout(r, 400));

    // 2. Check pre-flight items count and initial submit button disabled status
    const initialState = await page.evaluate(() => {
      const card = document.getElementById('preFlightCard');
      const cbs = document.querySelectorAll('.preflight-checkbox');
      const pill = document.getElementById('preflightProgressPill')?.textContent;
      const submitBtn = document.getElementById('saveTradeBtn');
      return {
        cardExists: Boolean(card),
        checkboxCount: cbs.length,
        pillText: pill,
        submitDisabled: submitBtn?.disabled
      };
    });
    console.log('   Initial Pre-Flight State:', JSON.stringify(initialState, null, 2));

    // 3. Check 4 out of 5 items
    console.log('2. Checking first 4 checkboxes...');
    const cbs = await page.$$('.preflight-checkbox');
    for (let i = 0; i < 4; i++) {
      if (cbs[i]) await cbs[i].click();
    }
    await new Promise(r => setTimeout(r, 200));

    const state4 = await page.evaluate(() => {
      const pill = document.getElementById('preflightProgressPill')?.textContent;
      const submitBtn = document.getElementById('saveTradeBtn');
      return { pillText: pill, submitDisabled: submitBtn?.disabled };
    });
    console.log('   State after 4 checks:', JSON.stringify(state4, null, 2));

    // 4. Check the 5th item
    console.log('3. Checking the 5th checkbox...');
    if (cbs[4]) await cbs[4].click();
    await new Promise(r => setTimeout(r, 200));

    const state5 = await page.evaluate(() => {
      const cardVerified = document.getElementById('preFlightCard')?.classList.contains('is-verified');
      const pill = document.getElementById('preflightProgressPill')?.textContent;
      const submitBtn = document.getElementById('saveTradeBtn');
      return { cardVerified, pillText: pill, submitDisabled: submitBtn?.disabled };
    });
    console.log('   State after 5 checks (Full Pass):', JSON.stringify(state5, null, 2));

    // 5. Fill required fields and submit trade
    console.log('4. Submitting trade...');
    await page.type('#tradeForm [name="symbol"]', 'NQ');
    await page.type('#tradeForm [name="risk"]', '150');
    await page.click('#saveTradeBtn');
    await new Promise(r => setTimeout(r, 600));

    // 6. Verify trade saved in state with preFlightChecklist
    const savedTrade = await page.evaluate(() => {
      const last = window.state.trades[window.state.trades.length - 1];
      return {
        symbol: last?.symbol,
        preflightPassed: last?.preFlightChecklist?.passed,
        preflightItemsCount: last?.preFlightChecklist?.items?.length
      };
    });
    console.log('   Saved Trade Pre-Flight Record:', JSON.stringify(savedTrade, null, 2));

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
