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

server.listen(3467, async () => {
  console.log('Server listening on http://localhost:3467');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3467', { waitUntil: 'networkidle0' });

    // 1. Test Cmd+K (Control+k) for Command Palette
    console.log('1. Testing Cmd/Ctrl + K Command Palette Shortcut...');
    await page.keyboard.down('Control');
    await page.keyboard.press('k');
    await page.keyboard.up('Control');
    await new Promise(r => setTimeout(r, 400));

    const paletteStatus = await page.evaluate(() => {
      const modal = document.getElementById('detailSheet');
      const isVisible = modal && modal.classList.contains('active');
      const title = document.getElementById('detailSheetTitle')?.textContent;
      return { isVisible, title };
    });
    console.log('   Command Palette Modal Status:', JSON.stringify(paletteStatus, null, 2));

    // 2. Test Escape to dismiss
    console.log('\n2. Testing Escape Key to Dismiss Modal...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 400));

    const dismissStatus = await page.evaluate(() => {
      const modal = document.getElementById('detailSheet');
      return { isDismissed: !modal.classList.contains('active') };
    });
    console.log('   Dismiss Status:', JSON.stringify(dismissStatus, null, 2));

    // 3. Test Cmd+N for Start Trade Sheet
    console.log('\n3. Testing Cmd/Ctrl + N Start Trade Shortcut...');
    await page.keyboard.down('Control');
    await page.keyboard.press('n');
    await page.keyboard.up('Control');
    await new Promise(r => setTimeout(r, 400));

    const startTradeStatus = await page.evaluate(() => {
      const sheet = document.getElementById('tradeFormSheet');
      return { isSheetActive: sheet && sheet.classList.contains('active') };
    });
    console.log('   Start Trade Sheet Status:', JSON.stringify(startTradeStatus, null, 2));

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
