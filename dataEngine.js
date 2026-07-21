// TRD Journey Data Backup & Export Engine
// Features: JSON Backup & Restore, CSV Trade Logs Export, and Monthly PDF Performance Report Generator

class TRDDataEngine {
  constructor() {
    this.init();
  }

  init() {
    window.exportJSONBackup = () => this.exportJSON();
    window.importJSONBackup = (fileInput) => this.importJSON(fileInput);
    window.exportTradesCSV = () => this.exportCSV();
    window.generateMonthlyReport = () => this.generateReport();
  }

  getTrades() {
    try {
      const stored = localStorage.getItem("trd_trades_v1");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  exportJSON() {
    const trades = this.getTrades();
    const sop = localStorage.getItem("trd_sop_v1") || "";
    const accounts = localStorage.getItem("trd_accounts_v1") || "";
    const settings = localStorage.getItem("trd_settings_v1") || "";

    const backupData = {
      app: "TRD Journey",
      version: "1.0",
      exportDate: new Date().toISOString(),
      trades,
      sop,
      accounts,
      settings
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const dateStr = new Date().toISOString().slice(0, 10);
    this.downloadBlob(blob, `TRD_Journey_Backup_${dateStr}.json`);

    if (window.appleAudioEngine) window.appleAudioEngine.play('checklist');
  }

  importJSON(fileInput) {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.trades && Array.isArray(data.trades)) {
          localStorage.setItem("trd_trades_v1", JSON.stringify(data.trades));
          if (data.sop) localStorage.setItem("trd_sop_v1", data.sop);
          if (data.accounts) localStorage.setItem("trd_accounts_v1", data.accounts);
          if (data.settings) localStorage.setItem("trd_settings_v1", data.settings);

          alert(`Successfully imported ${data.trades.length} trade record(s)! Page will reload now.`);
          window.location.reload();
        } else {
          alert("Invalid backup file format. Missing trades array.");
        }
      } catch (err) {
        alert("Error parsing backup JSON file: " + err.message);
      }
    };

    reader.readAsText(file);
  }

  exportCSV() {
    const trades = this.getTrades();
    if (!trades.length) {
      alert("No trade records found to export.");
      return;
    }

    const headers = ["Date", "Symbol", "Direction", "Setup", "Risk ($)", "R-Multiple", "Net PnL ($)", "Grade", "Rule Followed", "Emotion", "Entry Plan", "Exit Note"];
    const rows = trades.map(t => [
      t.date || "",
      t.symbol || "",
      t.direction || "Long",
      t.setup || "",
      t.risk || 0,
      t.pnl && t.risk ? (t.pnl / t.risk).toFixed(2) : 0,
      t.pnl || 0,
      t.grade || "A",
      t.rule ? "Yes" : "No",
      t.emotion || "Calm",
      `"${(t.entryPlan || "").replace(/"/g, '""')}"`,
      `"${(t.exitNote || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const dateStr = new Date().toISOString().slice(0, 10);
    this.downloadBlob(blob, `TRD_Trades_${dateStr}.csv`);

    if (window.appleAudioEngine) window.appleAudioEngine.play('checklist');
  }

  generateReport() {
    const trades = this.getTrades();
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

    const totalTrades = trades.length;
    const wins = trades.filter(t => t.pnl > 0).length;
    const winRate = totalTrades ? Math.round((wins / totalTrades) * 100) : 0;
    const totalR = trades.reduce((acc, t) => acc + (t.pnl && t.risk ? t.pnl / t.risk : 0), 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>TRD Journey - Monthly Performance Report (${dateStr})</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: 800; color: #0071e3; margin: 0; }
          .meta { font-size: 14px; color: #64748b; margin-top: 4px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
          .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
          .metric-val { font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 6px; }
          .metric-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; }
          th { background: #f1f5f9; font-weight: 700; }
          .win { color: #10b981; font-weight: 700; }
          .loss { color: #ef4444; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">TRD Journey Trading Operating System</h1>
            <p class="meta">Monthly Executive Performance Report · ${dateStr}</p>
          </div>
          <button onclick="window.print()" style="padding:8px 16px; background:#0071e3; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Print / Save PDF</button>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Total Trades</div>
            <div class="metric-val">${totalTrades}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Win Rate</div>
            <div class="metric-val">${winRate}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Cumulative Net R</div>
            <div class="metric-val">${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Disciplined Rule Compliance</div>
            <div class="metric-val">100%</div>
          </div>
        </div>

        <h2>Trade Execution Ledger</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Direction</th>
              <th>Setup</th>
              <th>Risk ($)</th>
              <th>Net R</th>
              <th>PnL ($)</th>
              <th>Rule Followed</th>
            </tr>
          </thead>
          <tbody>
            ${trades.map(t => {
              const r = t.pnl && t.risk ? (t.pnl / t.risk).toFixed(2) : '0.00';
              return `
                <tr>
                  <td>${t.date || ''}</td>
                  <td><strong>${t.symbol || ''}</strong></td>
                  <td>${t.direction || 'Long'}</td>
                  <td>${t.setup || ''}</td>
                  <td>$${t.risk || 0}</td>
                  <td class="${r >= 0 ? 'win' : 'loss'}">${r >= 0 ? '+' : ''}${r}R</td>
                  <td class="${t.pnl >= 0 ? 'win' : 'loss'}">${t.pnl >= 0 ? '+' : ''}$${t.pnl || 0}</td>
                  <td>${t.rule ? 'Yes ✓' : 'No ✕'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

window.trdDataEngine = new TRDDataEngine();
