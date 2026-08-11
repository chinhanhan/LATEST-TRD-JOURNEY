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

server.listen(3459, async () => {
  console.log('Server listening on http://localhost:3459');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3459', { waitUntil: 'networkidle0' });

    // Set an SOP with exactly 3 rules
    await page.evaluate(() => {
      if (window.state && window.state.sops[0]) {
        window.state.sops[0].checklist = [
          '注意事项 1: 确认 Trend 向上',
          '注意事项 2: 止损设置完成',
          '注意事项 3: 无红盒新闻'
        ];
        window.renderPreFlightChecklist(window.state.sops[0].id);
      }
    });

    // Open Start Trade sheet
    await page.evaluate(() => window.openSheet('tradeFormSheet'));
    await new Promise(r => setTimeout(r, 400));

    const state3 = await page.evaluate(() => {
      const cbs = document.querySelectorAll('.preflight-checkbox');
      const pill = document.getElementById('preflightProgressPill')?.textContent;
      const btn = document.getElementById('saveTradeBtn');
      return {
        ruleCount: cbs.length,
        pillText: pill,
        submitDisabled: btn?.disabled
      };
    });
    console.log('Dynamic 3-Rule SOP Test Initial State:', JSON.stringify(state3, null, 2));

    // Check 2 rules
    const cbs = await page.$$('.preflight-checkbox');
    if (cbs[0]) await cbs[0].click();
    if (cbs[1]) await cbs[1].click();
    await new Promise(r => setTimeout(r, 200));

    const stateCheck2 = await page.evaluate(() => {
      const pill = document.getElementById('preflightProgressPill')?.textContent;
      const btn = document.getElementById('saveTradeBtn');
      return { pillText: pill, submitDisabled: btn?.disabled };
    });
    console.log('State after checking 2/3 rules:', JSON.stringify(stateCheck2, null, 2));

    // Check 3rd rule
    if (cbs[2]) await cbs[2].click();
    await new Promise(r => setTimeout(r, 200));

    const stateCheck3 = await page.evaluate(() => {
      const pill = document.getElementById('preflightProgressPill')?.textContent;
      const btn = document.getElementById('saveTradeBtn');
      return { pillText: pill, submitDisabled: btn?.disabled };
    });
    console.log('State after checking 3/3 rules (Full Pass):', JSON.stringify(stateCheck3, null, 2));

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
