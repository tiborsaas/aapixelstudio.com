import './style.css';
import { HullamWaveAnimation, HULLAM_CONFIG } from './hullam_animation.js';
import { portfolioItems } from './portfolio_data.js';

import logoImg from './assets/logo-color.png';
import featherHeroImg from './assets/feather-hero.png';
import featherSmallImg from './assets/feather-small.png';
import portraitImg from './assets/cilinderella.jpg';

// Initialize static image elements
document.addEventListener('DOMContentLoaded', () => {
  const heroLogo = document.getElementById('hero-logo-img');
  const heroFeather = document.getElementById('hero-feather-img');
  const servicesFeather = document.getElementById('services-feather-top');
  const portrait = document.getElementById('rolam-portrait-img');
  const footerFeather = document.getElementById('footer-feather-img');

  if (heroLogo) heroLogo.src = logoImg;
  if (heroFeather) heroFeather.src = featherHeroImg;
  if (servicesFeather) servicesFeather.src = featherSmallImg;
  if (portrait) portrait.src = portraitImg;
  if (footerFeather) footerFeather.src = featherHeroImg;

  // Initialize Generative Hullam Animation
  const canvas = document.getElementById('hullam-canvas');
  if (canvas) {
    const wave = new HullamWaveAnimation(canvas);
    window.hullamWave = wave;

    // Pause wave when document is hidden to save battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        wave.stop();
      } else {
        wave.start();
      }
    });
  }

  // Initialize Portfolio Grid & Pop-out Row System
  initPortfolioSystem();

  // Initialize Mobile Navigation
  initMobileNav();

  // Header Scroll Effect & Back-to-top
  initHeaderEffects();
});

/**
 * Portfolio Grid & Smooth Animated Pop-Out Row Expander
 */
function initPortfolioSystem() {
  const grid = document.getElementById('portfolio-grid');
  if (!grid) return;

  let activeIndex = -1;
  let expanderEl = null;
  let isAnimating = false;

  // Helper to determine number of columns in current responsive layout
  function getColumnCount() {
    const w = window.innerWidth;
    if (w >= 1024) return 4;
    if (w >= 640) return 2;
    return 1;
  }

  // Render initial cards
  function renderGrid() {
    grid.innerHTML = '';
    portfolioItems.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'portfolio-card';
      card.dataset.index = idx;
      card.dataset.category = item.category;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-expanded', 'false');
      card.setAttribute('aria-label', `${item.title} részleteinek megtekintése`);

      // Special span for wide image on desktop (Balaton Boat show)
      if (item.isWide) {
        card.classList.add('is-wide-item');
      }

      card.innerHTML = `
        <div class="card-media-wrapper">
          <img src="${item.image}" alt="${item.title}" class="card-img" loading="lazy" />
          <div class="card-overlay">
            <span class="card-category-badge">${item.category}</span>
            <h4 class="card-title">${item.title}</h4>
            <span class="card-action-hint">Részletek megnyitása &rarr;</span>
          </div>
        </div>
        <div class="card-pointer-arrow" aria-hidden="true"></div>
      `;

      card.addEventListener('click', () => handleCardClick(idx));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick(idx);
        }
      });

      grid.appendChild(card);
    });
  }

  renderGrid();

  // Handle clicking a card
  function handleCardClick(index) {
    if (isAnimating) return;

    if (activeIndex === index) {
      // Toggle close
      closeExpander();
      return;
    }

    const prevIndex = activeIndex;
    activeIndex = index;

    const cols = getColumnCount();
    const prevRow = prevIndex !== -1 ? Math.floor(prevIndex / cols) : -1;
    const newRow = Math.floor(index / cols);

    updateCardActiveStates();

    if (expanderEl && prevRow === newRow) {
      // Same row: smoothly crossfade content without collapsing container height!
      updateExpanderContent(index, true);
    } else {
      // Different row: collapse old if exists, move expander to new row position, and smoothly expand
      if (expanderEl) {
        closeExpander(() => {
          openExpanderAt(index);
        });
      } else {
        openExpanderAt(index);
      }
    }
  }

  function updateCardActiveStates() {
    const cards = grid.querySelectorAll('.portfolio-card');
    cards.forEach((card, idx) => {
      const isActive = idx === activeIndex;
      card.classList.toggle('is-active', isActive);
      card.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    });
  }

  function createExpanderElement(index) {
    const expander = document.createElement('div');
    expander.className = 'ref-detail-expander';
    expander.id = 'active-ref-expander';
    expander.innerHTML = `
      <div class="expander-inner">
        <div class="expander-content-container" id="expander-content-wrap">
          <!-- Dynamic Content Injected Here -->
        </div>
      </div>
    `;
    return expander;
  }

  function openExpanderAt(index) {
    isAnimating = true;
    const cards = Array.from(grid.querySelectorAll('.portfolio-card'));
    const cols = getColumnCount();
    
    // Find where the row ends in the current layout
    const rowIndex = Math.floor(index / cols);
    const rowEndIdx = Math.min(cards.length - 1, (rowIndex + 1) * cols - 1);
    const targetCard = cards[rowEndIdx];

    expanderEl = createExpanderElement(index);

    // Insert expander right after the last card of this row
    if (targetCard.nextSibling) {
      grid.insertBefore(expanderEl, targetCard.nextSibling);
    } else {
      grid.appendChild(expanderEl);
    }

    // Populate content
    updateExpanderContent(index, false);

    // Trigger smooth CSS grid expansion animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        expanderEl.classList.add('is-open');

        setTimeout(() => {
          isAnimating = false;
          // Smoothly bring the active card and expander into view
          cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 450);
      });
    });
  }

  function closeExpander(callback) {
    if (!expanderEl) {
      activeIndex = -1;
      updateCardActiveStates();
      if (callback) callback();
      return;
    }

    isAnimating = true;
    expanderEl.classList.remove('is-open');
    activeIndex = -1;
    updateCardActiveStates();

    setTimeout(() => {
      if (expanderEl && expanderEl.parentNode) {
        expanderEl.parentNode.removeChild(expanderEl);
      }
      expanderEl = null;
      isAnimating = false;
      if (callback) callback();
    }, 400);
  }

  function updateExpanderContent(index, isCrossfade = false) {
    const wrap = document.getElementById('expander-content-wrap');
    if (!wrap) return;

    const item = portfolioItems[index];

    const deliverablesHtml = item.deliverables.map(d => `
      <li class="deliverable-item">
        <span class="deliverable-check" aria-hidden="true">✦</span>
        <span>${d}</span>
      </li>
    `).join('');

    const newHtml = `
      <div class="expander-body" data-category="${item.category}">
        <button class="expander-close-btn" id="btn-close-expander" aria-label="Részletek bezárása" title="Bezárás">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <div class="expander-columns">
          <div class="expander-visual-col">
            <div class="expander-img-frame">
              <img src="${item.image}" alt="${item.title}" class="expander-feature-img" />
              <div class="img-badge-category">${item.categoryHu}</div>
            </div>
          </div>

          <div class="expander-info-col">
            <div class="expander-header">
              <div class="expander-meta-top">
                <span class="meta-client">Ügyfél: ${item.client}</span>
                <span class="meta-dot">&bull;</span>
                <span class="meta-year">${item.year}</span>
              </div>
              <h3 class="expander-title">${item.title}</h3>
              <p class="expander-summary">${item.summary}</p>
            </div>

            <div class="expander-desc-block">
              <h4 class="expander-section-sub">A projektről</h4>
              <p class="expander-full-text">${item.description}</p>
            </div>

            <div class="expander-deliverables-block">
              <h4 class="expander-section-sub">Átadott anyagok & Megvalósítás</h4>
              <ul class="expander-deliverables-list">
                ${deliverablesHtml}
              </ul>
            </div>

            <div class="expander-navigation-footer">
              <button class="nav-prev-btn" id="btn-prev-ref" title="Előző referencia (Balra nyíl)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 19l-7-7 7-7"/></svg>
                <span>Előző</span>
              </button>
              
              <span class="nav-counter">${index + 1} / ${portfolioItems.length}</span>

              <button class="nav-next-btn" id="btn-next-ref" title="Következő referencia (Jobbra nyíl)">
                <span>Következő</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (isCrossfade) {
      wrap.classList.add('is-fading');
      setTimeout(() => {
        wrap.innerHTML = newHtml;
        bindExpanderEvents(index);
        wrap.classList.remove('is-fading');
      }, 150);
    } else {
      wrap.innerHTML = newHtml;
      bindExpanderEvents(index);
    }
  }

  function bindExpanderEvents(index) {
    const closeBtn = document.getElementById('btn-close-expander');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => closeExpander());
    }

    const prevBtn = document.getElementById('btn-prev-ref');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const nextIdx = (index - 1 + portfolioItems.length) % portfolioItems.length;
        handleCardClick(nextIdx);
      });
    }

    const nextBtn = document.getElementById('btn-next-ref');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const nextIdx = (index + 1) % portfolioItems.length;
        handleCardClick(nextIdx);
      });
    }
  }

  // Keyboard accessibility
  window.addEventListener('keydown', (e) => {
    if (activeIndex === -1) return;

    if (e.key === 'Escape') {
      closeExpander();
    } else if (e.key === 'ArrowLeft') {
      const prevIdx = (activeIndex - 1 + portfolioItems.length) % portfolioItems.length;
      handleCardClick(prevIdx);
    } else if (e.key === 'ArrowRight') {
      const nextIdx = (activeIndex + 1) % portfolioItems.length;
      handleCardClick(nextIdx);
    }
  });

  // Handle responsive layout recalculations on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (activeIndex !== -1 && expanderEl) {
        // Re-anchor expander to new row end in the resized grid
        const savedIndex = activeIndex;
        closeExpander(() => {
          activeIndex = savedIndex;
          openExpanderAt(savedIndex);
        });
      }
    }, 200);
  });
}

/**
 * Mobile Navigation Drawer Toggle & Links
 */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');
  if (!toggleBtn || !drawer) return;

  function toggleMenu(open) {
    const isOpen = open !== undefined ? open : !drawer.classList.contains('is-open');
    drawer.classList.toggle('is-open', isOpen);
    toggleBtn.classList.toggle('is-active', isOpen);
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    drawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    document.body.classList.toggle('drawer-locked', isOpen);
  }

  toggleBtn.addEventListener('click', () => toggleMenu());

  drawer.querySelectorAll('.drawer-link').forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  drawer.querySelector('.drawer-backdrop')?.addEventListener('click', () => toggleMenu(false));
}

/**
 * Header Scroll Effects & Smooth Anchors
 */
function initHeaderEffects() {
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header?.classList.add('is-scrolled');
    } else {
      header?.classList.remove('is-scrolled');
    }
  }, { passive: true });

  // Smooth scroll for anchor tags
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}
