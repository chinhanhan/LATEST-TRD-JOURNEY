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

server.listen(3466, async () => {
  console.log('Server listening on http://localhost:3466');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3466', { waitUntil: 'networkidle0' });

    console.log('1. Testing MAE vs MFE Scatter Plot Matrix Rendering...');
    await page.evaluate(() => {
      window.resetTradeForm();
      const form = document.getElementById('tradeForm');
      form.elements.symbol.value = 'NQ';
      form.elements.pnl.value = '600'; // +3.0R
      form.elements.risk.value = '200';
      form.elements.maeR.value = '-0.8';
      form.elements.mfeR.value = '4.0';
      form.elements.openTime.value = '2026-08-10T10:00';
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 500));

    await page.evaluate(() => {
      if (window.renderMaeMfeScatterChart) window.renderMaeMfeScatterChart();
    });
    await new Promise(r => setTimeout(r, 400));

    const scatterStatus = await page.evaluate(() => {
      const svg = document.getElementById('maeMfeScatterSvg');
      const points = svg ? svg.querySelectorAll('.scatter-point').length : 0;
      const circles = svg ? Array.from(svg.querySelectorAll('circle')).map(c => ({
        cx: c.getAttribute('cx'),
        cy: c.getAttribute('cy'),
        fill: c.getAttribute('fill')
      })) : [];
      return {
        hasSvg: Boolean(svg),
        pointCount: points,
        circles
      };
    });
    console.log('   Scatter Plot Status:', JSON.stringify(scatterStatus, null, 2));

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
