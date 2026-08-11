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

server.listen(3464, async () => {
  console.log('Server listening on http://localhost:3464');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3464', { waitUntil: 'networkidle0' });

    // 1. Verify IndexedDB storage engine active
    console.log('1. Checking IndexedDB Storage Engine Status...');
    const idbStatus = await page.evaluate(async () => {
      const hasIdb = typeof window.idbGet === 'function' && typeof window.idbSet === 'function';
      let dataInIdb = false;
      try {
        const stored = await window.idbGet("trd-journey-os-v1");
        dataInIdb = Boolean(stored);
      } catch (e) {}
      return { hasIdb, dataInIdb };
    });
    console.log('   IndexedDB Engine Status:', JSON.stringify(idbStatus, null, 2));

    // 2. Open Settings Panel & Check Storage Diagnostics Widget
    console.log('\n2. Testing Storage Diagnostics Monitor Widget...');
    await page.evaluate(() => {
      if (window.populateSettings) window.populateSettings();
    });
    await new Promise(r => setTimeout(r, 400));

    const storageWidget = await page.evaluate(() => {
      const used = document.getElementById('storageUsedMb')?.textContent;
      const quota = document.getElementById('storageQuotaMb')?.textContent;
      const imgCount = document.getElementById('storageImageCount')?.textContent;
      return { used, quota, imgCount };
    });
    console.log('   Storage Diagnostics Widget State:', JSON.stringify(storageWidget, null, 2));

    // 3. Test Canvas Image Compression
    console.log('\n3. Testing Canvas Image Compression Pipeline...');
    const compressionTest = await page.evaluate(async () => {
      // Create a dummy high-res canvas image data URL
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 1500;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 2000, 1500);
      const rawDataUrl = canvas.toDataURL('image/png');

      let compressedUrl = rawDataUrl;
      if (typeof window.compressImage === 'function') {
        compressedUrl = await window.compressImage(rawDataUrl);
      }

      return {
        rawLength: rawDataUrl.length,
        compressedLength: compressedUrl.length,
        reductionPercent: Math.round((1 - compressedUrl.length / rawDataUrl.length) * 100)
      };
    });
    console.log('   Canvas Compression Pipeline Result:', JSON.stringify(compressionTest, null, 2));

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
