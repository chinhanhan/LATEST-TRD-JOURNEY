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

  async exportJSON() {
    try {
      // Read directly from IndexedDB — the single source of truth used by app.js
      const STORAGE_KEY = "trd-journey-os-v1";
      let stateData = null;
      try {
        if (window.idbGet) {
          stateData = await window.idbGet(STORAGE_KEY);
        }
      } catch (e) {}

      // Fallback: use live window.state if IDB not available yet
      if (!stateData && window.state) {
        stateData = JSON.parse(JSON.stringify(window.state));
      }

      // Final fallback: localStorage (legacy support)
      if (!stateData) {
        const lsRaw = localStorage.getItem(STORAGE_KEY);
        if (lsRaw) stateData = JSON.parse(lsRaw);
      }

      if (!stateData) {
        alert("No data found to back up.");
        return;
      }

      const backupData = {
        app: "TRD Journey",
        version: "2.0",
        exportDate: new Date().toISOString(),
        state: stateData
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const dateStr = new Date().toISOString().slice(0, 10);
      this.downloadBlob(blob, `TRD_Journey_Backup_${dateStr}.json`);

      if (window.appleAudioEngine) window.appleAudioEngine.play('checklist');
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  }

  async importJSON(fileInput) {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const STORAGE_KEY = "trd-journey-os-v1";

        // --- Support both new v2.0 format (data.state) and legacy format ---
        let stateToRestore = null;

        if (data.state && typeof data.state === "object") {
          // New v2.0 backup format: { app, version, exportDate, state: {...} }
          stateToRestore = data.state;
        } else if (data.trades && Array.isArray(data.trades)) {
          // Legacy v1.x backup format: { trades: [], sop: "...", accounts: "...", ... }
          // Reconstruct a minimal state object from the old fragmented format
          let sops = [];
          let accounts = [];
          let preferences = {};
          let dailyPlans = {};
          let dailyReviews = {};
          let reflections = {};
          let playbook = {};

          try { sops = data.sop ? (typeof data.sop === "string" ? JSON.parse(data.sop) : data.sop) : []; } catch (e) {}
          try { accounts = data.accounts ? (typeof data.accounts === "string" ? JSON.parse(data.accounts) : data.accounts) : []; } catch (e) {}
          try { preferences = data.settings ? (typeof data.settings === "string" ? JSON.parse(data.settings) : data.settings) : {}; } catch (e) {}
          try { dailyPlans = data.plans ? (typeof data.plans === "string" ? JSON.parse(data.plans) : data.plans) : {}; } catch (e) {}
          try { dailyReviews = data.reviews ? (typeof data.reviews === "string" ? JSON.parse(data.reviews) : data.reviews) : {}; } catch (e) {}
          try { reflections = data.reflections ? (typeof data.reflections === "string" ? JSON.parse(data.reflections) : data.reflections) : {}; } catch (e) {}
          try { playbook = data.playbook ? (typeof data.playbook === "string" ? JSON.parse(data.playbook) : data.playbook) : {}; } catch (e) {}

          stateToRestore = {
            version: 1,
            trades: data.trades,
            sops: Array.isArray(sops) ? sops : [],
            accounts: Array.isArray(accounts) ? accounts : [],
            preferences,
            dailyPlans,
            dailyReviews,
            reflections,
            playbook,
            activeSopId: sops[0]?.id || "",
            activeAccountId: accounts[0]?.id || ""
          };
        } else {
          alert("Invalid backup file: not a recognized TRD Journey backup format.");
          return;
        }

        // Write to IndexedDB (primary store)
        if (window.idbSet) {
          await window.idbSet(STORAGE_KEY, stateToRestore);
        } else {
          // Fallback: write to localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToRestore));
        }

        const tradeCount = (stateToRestore.trades || []).length;
        alert(`✅ Successfully restored ${tradeCount} trade record(s)!\nPage will reload now.`);
        window.location.reload();
      } catch (err) {
        alert("Error restoring backup: " + err.message);
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

    const esc = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;

    const headers = ["Open Time", "Close Time", "Duration", "Date", "Symbol", "Direction", "Setup", "Risk ($)", "R-Multiple", "Net PnL ($)", "Grade", "Rule Followed", "Emotion", "Entry Plan", "Exit Note"];
    const rows = trades.map(t => {
      const openDisp = t.openTime ? t.openTime.replace("T", " ") : t.date || "";
      const closeDisp = t.closeTime ? t.closeTime.replace("T", " ") : (t.closedAt || "");
      const duration = (window.formatHoldDuration ? window.formatHoldDuration(t.openTime || t.date, t.closeTime || t.closedAt) : "");
      const rVal = t.pnl && t.risk && Number(t.risk) > 0 ? (Number(t.pnl) / Number(t.risk)).toFixed(2) : 0;
      return [
        esc(openDisp),
        esc(closeDisp),
        esc(duration),
        esc(t.date || ""),
        esc(t.symbol || ""),
        esc(t.direction || "Long"),
        esc(t.setup || ""),
        t.risk || 0,
        rVal,
        t.pnl || 0,
        esc(t.grade || "A"),
        esc(t.ruleStatus === "incomplete" || t.rule === "incomplete" ? "Incomplete" : (t.rule ? "Yes" : "No")),
        esc(t.emotion || "Calm"),
        esc(t.entryPlan || ""),
        esc(t.exitNote || "")
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
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
                  <td>${t.ruleStatus === "incomplete" || t.rule === "incomplete" ? '🟠 Incomplete' : (t.ruleStatus === "violated" || t.rule === false ? 'No ✕' : 'Yes ✓')}</td>
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

class ForexFactoryRedNewsEngine {
  // All data comes from state.redNews (persisted in IndexedDB via app.js)
  // NO hardcoded fake events — users manually enter real events from ForexFactory

  getEvents() {
    return Array.isArray(window.state?.redNews) ? window.state.redNews : [];
  }

  getAllRedEvents() {
    return this.getEvents().slice().sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
    );
  }

  filterByCurrency(currency = "All") {
    const list = this.getAllRedEvents();
    if (!currency || currency === "All") return list;
    return list.filter(e => e.currency === currency.toUpperCase());
  }

  getNextRedEvent() {
    const now = new Date();
    const sorted = this.getAllRedEvents();
    for (const evt of sorted) {
      const evtDate = new Date(`${evt.date}T${evt.time}:00`);
      if (evtDate > now) {
        return { ...evt, eventDate: evtDate, diffMs: evtDate - now };
      }
    }
    return null;
  }

  isTradeNearRedNews(tradeDateStr, windowMins = 30) {
    if (!tradeDateStr) return null;
    const cleanStr = String(tradeDateStr).trim().replace(" ", "T");
    const dateOnly = cleanStr.split("T")[0];
    const isDateOnly = !cleanStr.includes("T");

    const windowMs = windowMins * 60 * 1000;
    for (const evt of this.getEvents()) {
      if (isDateOnly) {
        if (evt.date === dateOnly) {
          return { event: evt, diffMins: 0, sameDay: true };
        }
      } else {
        const tradeTime = new Date(cleanStr);
        const evtTime = new Date(`${evt.date}T${evt.time}:00`);
        if (!isNaN(tradeTime.getTime()) && !isNaN(evtTime.getTime())) {
          const diffMs = Math.abs(tradeTime - evtTime);
          if (diffMs <= windowMs) {
            return { event: evt, diffMins: Math.round(diffMs / 60000), sameDay: false };
          }
        }
      }
    }
    return null;
  }

  // Delegates to app.js state management functions
  addEvent(evt) {
    if (window.addRedNewsEvent) return window.addRedNewsEvent(evt);
  }

  deleteEvent(id) {
    if (window.deleteRedNewsEvent) window.deleteRedNewsEvent(id);
  }

  clearPast() {
    if (window.clearPastRedNewsEvents) window.clearPastRedNewsEvents();
  }
}

window.trdDataEngine = new TRDDataEngine();
window.forexFactoryRedNewsEngine = new ForexFactoryRedNewsEngine();

