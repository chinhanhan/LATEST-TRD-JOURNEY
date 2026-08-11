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

server.listen(3465, async () => {
  console.log('Server listening on http://localhost:3465');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3465', { waitUntil: 'networkidle0' });

    // 1. Log trade with MAE / MFE
    console.log('1. Logging trade with MAE/MFE parameters...');
    await page.evaluate(() => {
      window.resetTradeForm();
      const form = document.getElementById('tradeForm');
      form.elements.symbol.value = 'NQ';
      form.elements.pnl.value = '400'; // +2.0R (Risk is $200)
      form.elements.risk.value = '200';
      form.elements.maeR.value = '-0.5';
      form.elements.mfeR.value = '3.0';
      form.elements.openTime.value = '2026-08-10T10:00'; // NY AM session on Monday
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
    await new Promise(r => setTimeout(r, 500));

    const savedTrade = await page.evaluate(() => {
      const t = window.state.trades.find(tr => tr.symbol === 'NQ' && tr.pnl === 400);
      const eff = window.getTradeExecutionEfficiency(t);
      return {
        id: t?.id,
        symbol: t?.symbol,
        pnl: t?.pnl,
        maeR: t?.maeR,
        mfeR: t?.mfeR,
        calculatedEfficiency: eff
      };
    });
    console.log('   Saved Trade MAE/MFE State:', JSON.stringify(savedTrade, null, 2));

    // 2. Open Trade Detail Modal and verify Execution Efficiency card
    console.log('\n2. Reopening Trade Detail modal to verify Execution Efficiency Card...');
    await page.evaluate((id) => window.openDetail(id), savedTrade.id);
    await new Promise(r => setTimeout(r, 400));

    const detailCardText = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('#detailSheetBody .insight-card'));
      const effCard = cards.find(c => c.textContent.includes('Execution Eff.'));
      return effCard ? effCard.textContent.trim() : 'NOT FOUND';
    });
    console.log('   Detail Modal Efficiency Card:', detailCardText);

    // 3. Render Session & Day-of-Week 2D Heatmap Matrix
    console.log('\n3. Testing 2D Session & Day-of-Week Heatmap Matrix...');
    await page.evaluate(() => {
      if (window.renderSessionHeatmap) window.renderSessionHeatmap();
    });
    await new Promise(r => setTimeout(r, 400));

    const heatmapStatus = await page.evaluate(() => {
      const table = document.querySelector('.heatmap-matrix-table');
      const rows = table ? table.querySelectorAll('tbody tr').length : 0;
      const cells = table ? table.querySelectorAll('.heatmap-cell').length : 0;
      const activeCell = table ? document.querySelector('.heatmap-cell.level-positive-mid, .heatmap-cell.level-positive-high') : null;
      return {
        hasTable: Boolean(table),
        rowCount: rows,
        cellCount: cells,
        activeCellText: activeCell ? activeCell.textContent : 'None'
      };
    });
    console.log('   Heatmap Matrix Status:', JSON.stringify(heatmapStatus, null, 2));

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    server.close();
  }
});
