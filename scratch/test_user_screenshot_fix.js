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

server.listen(3460, async () => {
  console.log('Server listening on http://localhost:3460');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3460', { waitUntil: 'networkidle0' });

    // Open SOP modal for active SOP and fill user's exact screenshot input
    console.log('1. Opening SOP Modal...');
    await page.evaluate(() => window.openSopModal(window.state.activeSopId));
    await new Promise(r => setTimeout(r, 400));

    console.log('2. Entering user multiline checklist rules...');
    await page.evaluate(() => {
      const textarea = document.querySelector('#sopEditorForm [name="checklist"]');
      if (textarea) {
        textarea.value = `1) 有没有很靠近的snr zone\n可能会test到哪里\n2) candle close 会不会离开zone很远?\n3) 有没有关联的pair 开着单子`;
      }
    });

    console.log('3. Saving SOP from modal...');
    await page.click('#sopEditorForm button[type="submit"]');
    await new Promise(r => setTimeout(r, 500));

    console.log('4. Opening Start Trade Form Sheet...');
    await page.evaluate(() => window.openSheet('tradeFormSheet'));
    await new Promise(r => setTimeout(r, 400));

    const result = await page.evaluate(() => {
      const pill = document.getElementById('preflightProgressPill')?.textContent;
      const texts = Array.from(document.querySelectorAll('.preflight-item-text')).map(el => el.textContent);
      const submitDisabled = document.getElementById('saveTradeBtn')?.disabled;
      return {
        pillText: pill,
        ruleCount: texts.length,
        rulesParsed: texts,
        submitDisabled
      };
    });

    console.log('\n--- TEST RESULT ---');
    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
