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

server.listen(3462, async () => {
  console.log('Server listening on http://localhost:3462');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    // 1. Mobile Viewport 375x812 Test
    console.log('1. Setting mobile viewport 375x812...');
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:3462', { waitUntil: 'networkidle0' });

    // Open Start Trade Sheet
    await page.evaluate(() => window.openSheet('tradeFormSheet'));
    await new Promise(r => setTimeout(r, 400));

    const mobileCheck = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.preflight-item'));
      const itemHeights = items.map(item => item.getBoundingClientRect().height);
      const isBodyLocked = document.body.classList.contains('sheet-open') && document.body.style.overflow === 'hidden';
      const sheetCard = document.querySelector('.sheet-card');
      const cardHeight = sheetCard ? sheetCard.getBoundingClientRect().height : 0;
      return {
        itemHeights,
        minHeightValid: itemHeights.every(h => h >= 44),
        isBodyLocked,
        cardHeight
      };
    });
    console.log('Mobile Check Results:', JSON.stringify(mobileCheck, null, 2));

    // 2. Test Desktop Viewport & Skeleton Shimmer in Trade Detail
    console.log('\n2. Testing Desktop Viewport 1440x900 & Skeleton Shimmer...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3462', { waitUntil: 'networkidle0' });

    // Open a trade detail with image
    await page.evaluate(() => {
      const tradeWithImage = window.state.trades.find(t => t.images?.length || t.imageData || t.imageUrl) || window.state.trades[0];
      if (tradeWithImage) {
        tradeWithImage.imageUrl = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>';
        window.openDetail(tradeWithImage.id);
      }
    });
    await new Promise(r => setTimeout(r, 300));

    const detailCheck = await page.evaluate(() => {
      const isBodyLocked = document.body.classList.contains('sheet-open');
      const skeletonContainer = document.querySelector('.skeleton-shimmer');
      return {
        isBodyLocked,
        hasSkeletonContainer: Boolean(skeletonContainer)
      };
    });
    console.log('Detail Check Results:', JSON.stringify(detailCheck, null, 2));

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
