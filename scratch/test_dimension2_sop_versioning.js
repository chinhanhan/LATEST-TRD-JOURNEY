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

server.listen(3463, async () => {
  console.log('Server listening on http://localhost:3463');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3463', { waitUntil: 'networkidle0' });

    // 1. Edit SOP Checklist to trigger version bump to v2
    console.log('1. Editing SOP Checklist to trigger version bump...');
    const initialVer = await page.evaluate(() => window.state.sops[0]?.version || 1);
    console.log(`   Initial SOP Version: v${initialVer}`);

    await page.evaluate(() => window.openSopModal(window.state.sops[0].id));
    await new Promise(r => setTimeout(r, 400));

    await page.evaluate(() => {
      const textarea = document.querySelector('#sopEditorForm [name="checklist"]');
      if (textarea) {
        textarea.value = `1) 规则 v2-1: 校验关键位\n2) 规则 v2-2: 校验止损设置`;
      }
    });

    // Submit SOP form
    await page.evaluate(() => {
      const form = document.getElementById('sopEditorForm');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 500));

    const updatedVer = await page.evaluate(() => window.state.sops[0]?.version);
    console.log(`   Updated SOP Version: v${updatedVer}`);

    // 2. Open Start Trade sheet and check rules
    console.log('\n2. Logging new trade under SOP v2...');
    await page.evaluate(() => {
      window.resetTradeForm();
      window.openSheet('tradeFormSheet');
    });
    await new Promise(r => setTimeout(r, 400));

    const cbs = await page.$$('.preflight-checkbox');
    for (let cb of cbs) {
      await cb.click();
    }
    await new Promise(r => setTimeout(r, 200));

    await page.evaluate(() => {
      const form = document.getElementById('tradeForm');
      form.elements.symbol.value = 'MNQ';
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 500));

    const lastTrade = await page.evaluate(() => {
      const t = window.state.trades.find(trade => trade.symbol === 'MNQ') || window.state.trades[window.state.trades.length - 1];
      return {
        id: t?.id,
        symbol: t?.symbol,
        snapshotVersion: t?.sopSnapshot?.version,
        snapshotChecklist: t?.sopSnapshot?.checklist
      };
    });
    console.log('   Trade SOP Snapshot Saved:', JSON.stringify(lastTrade, null, 2));

    // 3. Open Detail Modal and verify SOP v2 snapshot drawer
    console.log('\n3. Reopening Trade Detail modal to verify v2 snapshot drawer...');
    await page.evaluate((id) => window.openDetail(id), lastTrade.id);
    await new Promise(r => setTimeout(r, 400));

    const detailAudit = await page.evaluate(() => {
      const drawer = document.querySelector('.sop-snapshot-drawer');
      const drawerText = drawer ? drawer.textContent : '';
      return {
        hasDrawer: Boolean(drawer),
        drawerContentSnippet: drawerText.slice(0, 100).trim()
      };
    });
    console.log('   Detail Modal Audit Result:', JSON.stringify(detailAudit, null, 2));

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
