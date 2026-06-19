// Pure CSS 3D Carousel Implementation
// Replaces the heavy WebGL engine for authentic iOS/macOS blur aesthetics

class CSS3DCarousel {
  constructor() {
    this.wrapper = document.getElementById('css3d-carousel');
    this.container = document.getElementById('css3d-carousel-container');
    this.cards = Array.from(document.querySelectorAll('.css3d-card'));
    
    if (!this.wrapper || this.cards.length === 0) return;
    
    this.numCards = this.cards.length;
    this.theta = 360 / this.numCards;
    
    this.currentRotation = 0;
    this.targetRotation = 0;
    
    this.isDragging = false;
    this.startX = 0;
    this.startRotation = 0;
    
    this.isExpanded = false;
    this.expandedIndex = -1;
    this.selectedIndex = 0;
    
    this.updateRadius();
    this.initCards();
    this.addEventListeners();
    this.animate();
  }
  
  updateRadius() {
    // Read actual width of cards dynamically from offsetWidth
    const cardWidth = this.cards[0].offsetWidth || 260;
    this.radius = Math.round((cardWidth / 2) / Math.tan(Math.PI / this.numCards)) + 60; // 60px extra gap
  }
  
  initCards() {
    this.cards.forEach((card, i) => {
      // Set initial 3D positions in circle
      card.style.transform = `rotateY(${i * this.theta}deg) translateZ(${this.radius}px)`;
      
      // Card main click event
      card.addEventListener('click', (e) => {
        if (this.isExpanded) return;
        
        // Only click if we didn't just drag heavily
        if (Math.abs(this.targetRotation - this.startRotation) < 10) {
          const facingIndex = this.getFacingIndex();
          if (facingIndex === i) {
            this.expandCard(i);
          } else {
            // Spin to face the user first, then expand automatically
            this.targetRotation = -i * this.theta;
            setTimeout(() => {
              this.expandCard(i);
            }, 300);
          }
        }
      });
      
      // Close button inside the card back
      const closeBtn = card.querySelector('.card-back-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent card main click
          this.collapseCard();
        });
      }
      
      // Sub-items List (AnimatedList) hover and click events
      const listItems = Array.from(card.querySelectorAll('.animated-item'));
      listItems.forEach((item, itemIdx) => {
        // Selection index sets on hover
        item.addEventListener('mouseenter', () => {
          if (this.isExpanded && this.expandedIndex === i) {
            this.setSelectedIndex(itemIdx);
          }
        });
        
        // Run action on click
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.isExpanded && this.expandedIndex === i) {
            this.triggerAction(item.dataset.action);
          }
        });
      });
    });
    
    this.wrapper.style.transform = `translateZ(-${this.radius}px) rotateY(${this.currentRotation}deg)`;
  }
  
  addEventListeners() {
    // Mouse Events
    this.container.addEventListener('mousedown', this.onDragStart.bind(this));
    window.addEventListener('mousemove', this.onDragMove.bind(this));
    window.addEventListener('mouseup', this.onDragEnd.bind(this));
    
    // Touch Events
    this.container.addEventListener('touchstart', this.onDragStart.bind(this), { passive: true });
    window.addEventListener('touchmove', this.onDragMove.bind(this), { passive: true });
    window.addEventListener('touchend', this.onDragEnd.bind(this));
    
    // Wheel Events
    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: true });
    
    // Keyboard Navigation
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    
    // Resize Event
    window.addEventListener('resize', this.onResize.bind(this));
  }
  
  onResize() {
    if (this.isExpanded) return;
    this.updateRadius();
    this.cards.forEach((card, i) => {
      card.style.transform = `rotateY(${i * this.theta}deg) translateZ(${this.radius}px)`;
    });
    this.wrapper.style.transform = `translateZ(-${this.radius}px) rotateY(${this.currentRotation}deg)`;
  }
  
  onDragStart(e) {
    if (this.isExpanded) return;
    this.isDragging = true;
    this.startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    this.startRotation = this.targetRotation;
    this.container.style.cursor = 'grabbing';
  }
  
  onDragMove(e) {
    if (!this.isDragging || this.isExpanded) return;
    const x = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    const diff = x - this.startX;
    const sens = (window.state && window.state.preferences && window.state.preferences.carouselDragSensitivity) ?? 0.18;
    this.targetRotation = this.startRotation + (diff * sens);
  }
  
  onDragEnd() {
    if (!this.isDragging || this.isExpanded) return;
    this.isDragging = false;
    this.container.style.cursor = 'grab';
    
    // Snap to closest card
    const snapRotation = Math.round(this.targetRotation / this.theta) * this.theta;
    this.targetRotation = snapRotation;
  }
  
  onWheel(e) {
    if (this.isExpanded) return;
    const delta = e.deltaY || e.detail || e.wheelDelta;
    // Slower wheel scroll (changed from 15 to 5)
    this.targetRotation += (delta > 0 ? -1 : 1) * 5;
    
    // Snap
    clearTimeout(this.wheelTimeout);
    this.wheelTimeout = setTimeout(() => {
      const snapRotation = Math.round(this.targetRotation / this.theta) * this.theta;
      this.targetRotation = snapRotation;
    }, 150);
  }
  
  onKeyDown(e) {
    const landing = document.getElementById('landing-gallery');
    if (!landing || !landing.classList.contains('active')) return;
    
    if (this.isExpanded) {
      // Menu list navigation when card is expanded
      const card = this.cards[this.expandedIndex];
      const items = Array.from(card.querySelectorAll('.animated-item'));
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.setSelectedIndex(this.selectedIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.setSelectedIndex(this.selectedIndex - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.triggerActiveItemAction();
      } else if (e.key === 'Escape' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.collapseCard();
      }
    } else {
      // Standard carousel navigation
      if (e.key === 'ArrowRight') {
        this.targetRotation -= this.theta;
      } else if (e.key === 'ArrowLeft') {
        this.targetRotation += this.theta;
      } else if (e.key === 'Enter') {
        this.expandCard(this.getFacingIndex());
      }
    }
  }
  
  getFacingIndex() {
    const normalizedRot = Math.round(-this.targetRotation / this.theta) % this.numCards;
    return (normalizedRot + this.numCards) % this.numCards;
  }
  
  expandCard(index) {
    if (this.isExpanded) return;
    
    this.isExpanded = true;
    this.expandedIndex = index;
    this.selectedIndex = 0;
    
    // Snap rotation immediately to face user perfectly when expanding
    this.targetRotation = -index * this.theta;
    this.currentRotation = this.targetRotation;
    this.wrapper.style.transform = `translateZ(-${this.radius}px) rotateY(${this.currentRotation}deg)`;
    
    const card = this.cards[index];
    
    // Dim other cards and hide hint
    this.container.classList.add('has-expanded');
    card.classList.add('expanded');
    
    // Push the active card forward and scale it up
    card.style.transform = `rotateY(${index * this.theta}deg) translateZ(${this.radius + 150}px) scale(1.22)`;
    
    this.updateListSelection();
  }
  
  collapseCard() {
    if (!this.isExpanded) return;
    
    this.container.classList.remove('has-expanded');
    
    const card = this.cards[this.expandedIndex];
    card.classList.remove('expanded');
    
    // Recalculate radius in case window resized while expanded
    this.updateRadius();
    
    // Reposition all cards to the correct radius
    this.cards.forEach((c, i) => {
      if (i !== this.expandedIndex) {
        c.style.transform = `rotateY(${i * this.theta}deg) translateZ(${this.radius}px)`;
      }
    });
    
    // Restore collapsed card rotation and radius placement
    card.style.transform = `rotateY(${this.expandedIndex * this.theta}deg) translateZ(${this.radius}px)`;
    this.wrapper.style.transform = `translateZ(-${this.radius}px) rotateY(${this.currentRotation}deg)`;
    
    this.isExpanded = false;
    this.expandedIndex = -1;
  }
  
  setSelectedIndex(index) {
    if (this.expandedIndex === -1) return;
    const card = this.cards[this.expandedIndex];
    const items = card.querySelectorAll('.animated-item');
    if (items.length === 0) return;
    
    this.selectedIndex = (index + items.length) % items.length;
    this.updateListSelection();
  }
  
  updateListSelection() {
    if (this.expandedIndex === -1) return;
    const card = this.cards[this.expandedIndex];
    const items = card.querySelectorAll('.animated-item');
    
    items.forEach((item, idx) => {
      item.classList.toggle('selected', idx === this.selectedIndex);
    });
  }
  
  triggerActiveItemAction() {
    if (this.expandedIndex === -1) return;
    const card = this.cards[this.expandedIndex];
    const items = card.querySelectorAll('.animated-item');
    const activeItem = items[this.selectedIndex];
    if (activeItem) {
      this.triggerAction(activeItem.dataset.action);
    }
  }
  
  triggerAction(actionStr) {
    if (!actionStr) return;
    
    const targetModule = this.cards[this.expandedIndex].dataset.module;
    
    if (actionStr.startsWith('module:')) {
      const moduleId = actionStr.replace('module:', '');
      if (window.openModule) window.openModule(moduleId);
      this.collapseCard();
    } else if (actionStr.startsWith('click:')) {
      const selector = actionStr.replace('click:', '');
      if (window.openModule) window.openModule(targetModule);
      this.collapseCard();
      
      // Delay click slightly so the transition executes cleanly
      setTimeout(() => {
        const btn = document.querySelector(selector);
        if (btn) btn.click();
      }, 300);
    } else if (actionStr.startsWith('scroll:')) {
      const selector = actionStr.replace('scroll:', '');
      if (window.openModule) window.openModule(targetModule);
      this.collapseCard();
      
      // Scroll to target element with a smooth transition
      setTimeout(() => {
        const el = document.querySelector(selector);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }
  
  animate() {
    const diff = this.targetRotation - this.currentRotation;
    const friction = (window.state && window.state.preferences && window.state.preferences.carouselSnapFriction) ?? 0.04;
    this.currentRotation += diff * friction;
    
    if (Math.abs(diff) > 0.01 && !this.isExpanded) {
      this.wrapper.style.transform = `translateZ(-${this.radius}px) rotateY(${this.currentRotation}deg)`;
    }
    
    requestAnimationFrame(this.animate.bind(this));
  }
}

// Global initializer
window.initCSS3DCarousel = function() {
  new CSS3DCarousel();
};

window.dispatchEvent(new Event('gallery-ready'));
