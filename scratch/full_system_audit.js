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

server.listen(3461, async () => {
  console.log('Server listening on http://localhost:3461');
  
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
    await page.goto('http://localhost:3461', { waitUntil: 'networkidle0' });
    console.log('Page loaded successfully.');

    // 1. Audit SOP Editing and Preflight Sync
    console.log('\n--- 1. Testing SOP Editor & Preflight Checklist Sync ---');
    await page.evaluate(() => window.openSopModal(window.state.activeSopId));
    await new Promise(r => setTimeout(r, 300));
    
    // Set custom 3-rule checklist
    await page.evaluate(() => {
      const form = document.getElementById('sopEditorForm');
      if (form) {
        form.elements.checklist.value = "1) 第一条规则\n2) 第二条规则\n3) 第三条规则";
      }
    });
    
    await page.evaluate(() => {
      const form = document.getElementById('sopEditorForm');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 400));

    // Open trade form sheet
    await page.evaluate(() => window.openSheet('tradeFormSheet'));
    await new Promise(r => setTimeout(r, 400));

    const checkState = await page.evaluate(() => {
      const cbs = document.querySelectorAll('.preflight-checkbox');
      const pill = document.getElementById('preflightProgressPill')?.textContent;
      const submitBtn = document.getElementById('saveTradeBtn');
      return {
        count: cbs.length,
        pillText: pill,
        submitDisabled: submitBtn?.disabled
      };
    });
    console.log('Checklist State after SOP Save:', JSON.stringify(checkState, null, 2));

    // Check all 3 checkboxes
    console.log('\n--- 2. Checking Preflight Rules & Submitting Trade ---');
    await page.evaluate(() => {
      window.resetTradeForm();
      window.openSheet('tradeFormSheet');
    });
    await new Promise(r => setTimeout(r, 400));

    await page.evaluate(() => {
      document.querySelectorAll('.preflight-checkbox').forEach(cb => {
        cb.checked = true;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    await new Promise(r => setTimeout(r, 200));

    const checkStateFull = await page.evaluate(() => {
      const pill = document.getElementById('preflightProgressPill')?.textContent;
      const submitBtn = document.getElementById('saveTradeBtn');
      return {
        pillText: pill,
        submitDisabled: submitBtn?.disabled
      };
    });
    console.log('Checklist State after Full Pass:', JSON.stringify(checkStateFull, null, 2));

    // Submit Trade
    await page.evaluate(() => {
      const form = document.getElementById('tradeForm');
      form.elements.symbol.value = 'ES';
      form.elements.risk.value = '100';
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 500));

    // Audit Saved Trade
    const savedTradeState = await page.evaluate(() => {
      const last = window.state.trades[window.state.trades.length - 1];
      return {
        id: last?.id,
        symbol: last?.symbol,
        preflightPassed: last?.preFlightChecklist?.passed,
        preflightItemsCount: last?.preFlightChecklist?.items?.length
      };
    });
    console.log('Saved Trade State:', JSON.stringify(savedTradeState, null, 2));

    // 3. Test Editing Saved Trade
    console.log('\n--- 3. Testing Edit Saved Trade ---');
    if (savedTradeState.id) {
      await page.evaluate((id) => window.editTrade(id), savedTradeState.id);
      await new Promise(r => setTimeout(r, 400));

      const editFormState = await page.evaluate(() => {
        const cbs = Array.from(document.querySelectorAll('.preflight-checkbox')).map(cb => cb.checked);
        const submitBtn = document.getElementById('saveTradeBtn');
        return {
          checkedArray: cbs,
          submitDisabled: submitBtn?.disabled
        };
      });
      console.log('Edit Form Preflight State:', JSON.stringify(editFormState, null, 2));
    }

    console.log('\n--- CONSOLE ERRORS & WARNINGS SUMMARY ---');
    console.log(jsErrors.length > 0 ? jsErrors.join('\n') : 'NO JS CONSOLE ERRORS DETECTED!');

  } catch (err) {
    console.error('Audit script error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
