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

server.listen(3456, async () => {
  console.log('Server listening on http://localhost:3456');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    consoleLogs.push(`[PAGE ERROR] ${err.toString()}\n${err.stack}`);
  });

  try {
    await page.goto('http://localhost:3456', { waitUntil: 'networkidle0' });
    console.log('Page loaded successfully.');

    // 1. Test clicking Journal Bento Card on Initial Launcher
    console.log('1. Clicking Journal Bento Card on Initial Launcher...');
    await page.click('.css3d-card[data-module="journal"]');
    await new Promise(r => setTimeout(r, 400));

    let activeView = await page.evaluate(() => document.querySelector('.view.active')?.id);
    console.log('   Active view after Journal click:', activeView);

    // 2. Test clicking Brand Logo to return to Launchpad
    console.log('2. Clicking Header Brand Logo to return to Launchpad...');
    await page.click('.brand');
    await new Promise(r => setTimeout(r, 400));

    let landingActive = await page.evaluate(() => document.getElementById('landing-gallery')?.classList.contains('active'));
    console.log('   Is landing launcher active after Brand click:', landingActive);

    // 3. Test clicking Header Log Trade button
    console.log('3. Clicking Header Log Trade Button...');
    await page.click('#headerLogTradeBtn');
    await new Promise(r => setTimeout(r, 400));

    let sheetActive = await page.evaluate(() => document.getElementById('tradeFormSheet')?.classList.contains('active'));
    console.log('   Is tradeFormSheet active after Header Log Trade click:', sheetActive);

    // Close sheet
    await page.evaluate(() => window.closeSheet('tradeFormSheet'));
    await new Promise(r => setTimeout(r, 400));

    // 4. Test clicking Bottom Dock + Log Trade item
    console.log('4. Clicking Dock + Log Trade item...');
    await page.evaluate(() => {
      const item = document.querySelector('.dock-item[data-dock-module="action-trade"]');
      if (item) item.click();
    });
    await new Promise(r => setTimeout(r, 400));

    sheetActive = await page.evaluate(() => document.getElementById('tradeFormSheet')?.classList.contains('active'));
    console.log('   Is tradeFormSheet active after Dock Log Trade click:', sheetActive);

    console.log('\n--- CONSOLE ERRORS ---');
    const errors = consoleLogs.filter(l => l.includes('ERROR') || l.includes('error'));
    console.log(errors.length > 0 ? errors.join('\n') : 'NO JS CONSOLE ERRORS DETECTED!');

  } catch (err) {
    console.error('Test script error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
