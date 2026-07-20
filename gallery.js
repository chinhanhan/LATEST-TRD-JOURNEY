// visionOS 2.0 Spatial Liquid Glass Bento Grid & Dynamic Island Launcher
// Direct single-click 5-module spatial launcher with 3D tilt & specular glare physics

class VisionOSBentoLauncher {
  constructor() {
    this.container = document.getElementById('css3d-carousel-container');
    this.cards = Array.from(document.querySelectorAll('.css3d-card'));
    
    if (!this.container || this.cards.length === 0) return;
    
    this.initCards();
    this.addEventListeners();
    this.updateDynamicIsland();
    this.updateBentoStats();
  }
  
  updateDynamicIsland() {
    if (!window.state) return;
    
    const islandGuardrail = document.getElementById('islandGuardrail');
    if (islandGuardrail && window.state.preferences) {
      islandGuardrail.textContent = `Max Loss: -${window.state.preferences.dailyMaxLossR || 2}R`;
    }
    
    const islandStreak = document.getElementById('islandStreak');
    if (islandStreak) {
      const streakCount = window.state.stats ? window.state.stats.disciplineStreak : 5;
      islandStreak.textContent = `${streakCount || 5} Trades`;
    }
  }

  updateBentoStats() {
    if (!window.state || !window.state.trades) return;
    const trades = window.state.trades;
    let totalR = 0;
    const points = [0];
    trades.forEach(t => {
      totalR += (t.resultR || 0);
      points.push(totalR);
    });
    
    const statEl = document.getElementById('bentoEquityStat');
    if (statEl) {
      const formatted = (totalR >= 0 ? '+' : '') + totalR.toFixed(2) + 'R Equity';
      statEl.textContent = formatted;
    }

    // Dynamic SVG Sparkline generator from real trade history
    const sparklinePath = document.getElementById('bentoSparklinePath');
    if (sparklinePath && points.length > 1) {
      const minR = Math.min(...points, 0);
      const maxR = Math.max(...points, 1);
      const range = (maxR - minR) || 1;
      const width = 200;
      const height = 30;
      const padding = 5;
      
      const d = points.map((val, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height + padding - ((val - minR) / range) * height;
        return `${idx === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      
      sparklinePath.setAttribute('d', d);
    }
  }
  
  initCards() {
    this.cards.forEach((card) => {
      card.style.transform = '';
      const targetModule = card.dataset.module;
      
      // Single Click Handler: Instant module launch
      card.addEventListener('click', (e) => {
        if (window.openModule) {
          window.openModule(targetModule);
        }
      });
      
      // visionOS 3D Mouse Parallax Tilt & Specular Glare Sheen
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const tiltX = -((y - centerY) / centerY) * 12;
        const tiltY = ((x - centerX) / centerX) * 12;
        
        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;
        
        const inner = card.querySelector('.card-inner');
        if (inner) {
          inner.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
          inner.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
          inner.style.setProperty('--glare-x', `${glareX.toFixed(2)}%`);
          inner.style.setProperty('--glare-y', `${glareY.toFixed(2)}%`);
          inner.style.setProperty('--glare-opacity', '0.45');
        }
      });
      
      card.addEventListener('mouseleave', () => {
        const inner = card.querySelector('.card-inner');
        if (inner) {
          inner.style.setProperty('--tilt-x', '0deg');
          inner.style.setProperty('--tilt-y', '0deg');
          inner.style.setProperty('--glare-opacity', '0');
        }
      });
    });
  }
  
  addEventListeners() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }
  
  onKeyDown(e) {
    const landing = document.getElementById('landing-gallery');
    if (!landing || !landing.classList.contains('active')) return;
    
    // Quick module launch shortcuts via keyboard 1-5
    if (['1', '2', '3', '4', '5'].includes(e.key)) {
      const modules = ['overview', 'journal', 'missions', 'review', 'settings'];
      const target = modules[parseInt(e.key, 10) - 1];
      if (window.openModule) window.openModule(target);
    }
  }
  
  collapseCard() {
    // Compatibility helper
  }
}

// Global helper for Dynamic Island action
window.triggerBentoAction = function(actionStr, moduleName) {
  if (actionStr === 'open-capture') {
    if (window.openSheet) window.openSheet('tradeFormSheet');
    return;
  }
  if (moduleName && window.openModule) {
    window.openModule(moduleName);
  }
};

// Global initializer
window.initCSS3DCarousel = function() {
  window.css3dCarousel = new VisionOSBentoLauncher();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.initCSS3DCarousel();
  });
} else {
  window.initCSS3DCarousel();
}
