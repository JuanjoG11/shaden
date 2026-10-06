/* =============================================
   SHADEN — Catalog JavaScript
   ============================================= */

/* ── Utilidades ── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function formatPrice(price) {
  if (!price && price !== 0) return null;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
}

function showToast(msg, type = 'default', duration = 3000) {
  const container = $('#toast-container');
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', default: 'fa-star' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.default}"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

function getBadgeHTML(badge) {
  const map = {
    new:      { label: 'Nuevo',     cls: 'badge-new' },
    offer:    { label: 'Oferta',    cls: 'badge-blush' },
    featured: { label: 'Destacado', cls: 'badge-gold' },
  };
  if (!badge || !map[badge]) return '';
  return `<span class="badge ${map[badge].cls}">${map[badge].label}</span>`;
}

/* ── Estado de la app ── */
const State = {
  currentCat: 'all',
  currentSort: 'default',
  searchQuery: '',
};

/* ── Navbar scroll ── */
(function initNavbar() {
  const navbar = $('#navbar');
  const hamburger = $('#hamburger');
  const navLinks = $('#nav-links');
  const navOverlay = $('#nav-overlay');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  function toggleMenu(open) {
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
    navLinks.classList.toggle('open', open);
    navOverlay.classList.toggle('active', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  hamburger.addEventListener('click', () => toggleMenu(!navLinks.classList.contains('open')));
  navOverlay.addEventListener('click', () => toggleMenu(false));

  // Cerrar al hacer clic en link
  navLinks.addEventListener('click', e => {
    if (e.target.classList.contains('nav-link')) toggleMenu(false);
  });

  // Active link on scroll
  const sections = $$('section[id], div[id]').filter(el =>
    ['inicio','categorias','catalogo','nosotros','contacto'].includes(el.id)
  );
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        $$('.nav-link').forEach(l => l.classList.remove('active'));
        const active = $(`.nav-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: .3 });
  sections.forEach(s => observer.observe(s));
})();

/* ── Search bar ── */
(function initSearch() {
  const toggle = $('#search-toggle');
  const bar    = $('#search-bar');
  const input  = $('#search-input');
  const close  = $('#search-close');

  function openSearch() {
    bar.classList.add('open');
    setTimeout(() => input.focus(), 100);
  }
  function closeSearch() {
    bar.classList.remove('open');
    input.value = '';
    State.searchQuery = '';
    renderProducts();
  }

  toggle.addEventListener('click', () => {
    bar.classList.contains('open') ? closeSearch() : openSearch();
  });
  close.addEventListener('click', closeSearch);

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      State.searchQuery = input.value.trim();
      State.currentCat  = 'all';
      // Reset filter tabs
      $$('.filter-tab').forEach(t => t.classList.remove('active'));
      const allTab = $('.filter-tab[data-cat="all"]');
      if (allTab) allTab.classList.add('active');
      renderProducts();
      // Scroll al catálogo si hay query
      if (State.searchQuery) {
        document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  });

  // Cerrar con Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && bar.classList.contains('open')) closeSearch();
  });
})();

/* ── Categorías ── */
function renderCategories() {
  const grid = $('#categories-grid');
  const tabs  = $('#filter-tabs');
  const footerCats = $('#footer-cats');
  const cats  = ShadenDB.Categories.getAll();
  const prods = ShadenDB.Products.getActive();

  // Grid de tarjetas
  grid.innerHTML = cats.map(cat => {
    const count = prods.filter(p => p.category === cat.id).length;
    return `
      <button class="cat-card${State.currentCat === cat.id ? ' active' : ''}" data-cat="${cat.id}" aria-pressed="${State.currentCat === cat.id}">
        <div class="cat-card-icon"><i class="${cat.icon}"></i></div>
        <h4>${cat.name}</h4>
        <span>${count} producto${count !== 1 ? 's' : ''}</span>
      </button>`;
  }).join('');

  // Filter tabs (después del "Todos")
  const existingTabs = $$('.filter-tab[data-cat]:not([data-cat="all"])');
  existingTabs.forEach(t => t.remove());
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-tab' + (State.currentCat === cat.id ? ' active' : '');
    btn.dataset.cat = cat.id;
    btn.textContent = cat.name;
    tabs.appendChild(btn);
  });

  // Footer links
  if (footerCats) {
    footerCats.innerHTML = cats.map(cat =>
      `<li><a href="#catalogo" data-cat="${cat.id}">${cat.name}</a></li>`
    ).join('');
    footerCats.addEventListener('click', e => {
      const a = e.target.closest('a[data-cat]');
      if (a) { filterByCategory(a.dataset.cat); document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' }); }
    });
  }

  // Listeners cat cards
  $$('.cat-card').forEach(btn => {
    btn.addEventListener('click', () => filterByCategory(btn.dataset.cat));
  });

  // Listeners filter tabs
  $$('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => filterByCategory(btn.dataset.cat));
  });
}

function filterByCategory(catId) {
  State.currentCat  = catId;
  State.searchQuery = '';
  $('#search-input').value = '';
  renderCategories();
  renderProducts();
  document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Productos ── */
function getFilteredProducts() {
  let products = State.searchQuery
    ? ShadenDB.Products.search(State.searchQuery)
    : ShadenDB.Products.getActive();

  if (State.currentCat !== 'all') {
    products = products.filter(p => p.category === State.currentCat);
  }

  // Sort
  switch (State.currentSort) {
    case 'name-asc':   products.sort((a,b) => a.name.localeCompare(b.name)); break;
    case 'name-desc':  products.sort((a,b) => b.name.localeCompare(a.name)); break;
    case 'price-asc':  products.sort((a,b) => (a.price||0) - (b.price||0)); break;
    case 'price-desc': products.sort((a,b) => (b.price||0) - (a.price||0)); break;
    case 'new':        products.sort((a,b) => b.createdAt - a.createdAt); break;
  }

  return products;
}

function renderProducts() {
  const grid      = $('#products-grid');
  const emptyEl   = $('#empty-state');
  const products  = getFilteredProducts();
  const cats      = ShadenDB.Categories.getAll();
  const settings  = ShadenDB.Settings.get();

  if (products.length === 0) {
    grid.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;

  grid.innerHTML = products.map((p, i) => {
    const cat      = cats.find(c => c.id === p.category);
    const price    = formatPrice(p.price);
    const waMsg    = encodeURIComponent(`Hola Shaden! Me interesa el producto: *${p.name}*${price ? ` (${price})` : ''}. ¿Está disponible?`);
    const waLink   = `https://wa.me/${settings.phone}?text=${waMsg}`;
    const delay    = (i % 8) * 50;

    return `
      <article class="product-card" data-id="${p.id}" style="animation-delay:${delay}ms" tabindex="0" role="button" aria-label="Ver ${p.name}">
        <div class="product-img-wrap">
          ${p.image
            ? `<img src="${p.image}" alt="${p.name}" loading="lazy" />`
            : `<div class="product-no-img"><i class="${cat?.icon || 'fa-solid fa-box'}"></i></div>`
          }
          <div class="product-badges">${getBadgeHTML(p.badge)}</div>
        </div>
        <div class="product-info">
          <p class="product-cat-tag">${cat?.name || ''}</p>
          <h3 class="product-name">${p.name}</h3>
          ${p.description ? `<p class="product-desc">${p.description}</p>` : ''}
          <div class="product-footer">
            ${price
              ? `<span class="product-price">${price}</span>`
              : `<span class="product-price no-price">Consultar precio</span>`
            }
            <a href="${waLink}" target="_blank" class="product-wa-btn" aria-label="Preguntar por WhatsApp" onclick="event.stopPropagation()">
              <i class="fa-brands fa-whatsapp"></i>
            </a>
          </div>
        </div>
      </article>`;
  }).join('');

  // Listeners para abrir modal
  $$('.product-card').forEach(card => {
    card.addEventListener('click',  () => openProductModal(card.dataset.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openProductModal(card.dataset.id); });
  });
}

/* ── Modal producto ── */
function openProductModal(productId) {
  const p        = ShadenDB.Products.getById(productId);
  if (!p) return;
  const cat      = ShadenDB.Categories.getById(p.category);
  const settings = ShadenDB.Settings.get();
  const price    = formatPrice(p.price);
  const waMsg    = encodeURIComponent(`Hola Shaden! Me interesa: *${p.name}*${price ? ` (${price})` : ''}. ¿Está disponible?`);

  $('#modal-product-name').textContent = p.name;
  $('#modal-cat').textContent  = cat?.name || '';
  $('#modal-price').textContent = price || 'Consultar precio';
  $('#modal-desc').textContent  = p.description || '';
  $('#modal-wa').href = `https://wa.me/${settings.phone}?text=${waMsg}`;

  const imgEl   = $('#modal-img');
  const badgeEl = $('#modal-badge');

  if (p.image) {
    imgEl.src = p.image;
    imgEl.alt = p.name;
    imgEl.style.display = 'block';
  } else {
    imgEl.style.display = 'none';
  }

  badgeEl.innerHTML = getBadgeHTML(p.badge);

  $('#product-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  $('#product-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function initModal() {
  $('#modal-close').addEventListener('click', closeProductModal);
  $('#product-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeProductModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeProductModal();
  });
}

/* ── Sort ── */
function initSort() {
  $('#sort-select').addEventListener('change', e => {
    State.currentSort = e.target.value;
    renderProducts();
  });
}

/* ── Animación de números "nosotros" ── */
function initCounters() {
  const counters = $$('[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.target);
      const dur    = 1500;
      const start  = performance.now();

      function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / dur, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(ease * target);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      observer.unobserve(el);
    });
  }, { threshold: .5 });

  counters.forEach(c => observer.observe(c));
}

/* ── Scroll reveal ── */
function initScrollReveal() {
  const els = $$('.cat-card, .contact-card, .about-text > *');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        observer.unobserve(e.target);
      }
    });
  }, { threshold: .1 });

  els.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity .5s ease ${i * 60}ms, transform .5s ease ${i * 60}ms`;
    observer.observe(el);
  });
}

/* ── Parallax hero shapes (sutil) ── */
function initParallax() {
  const shapes = $$('.hero-shape');
  window.addEventListener('mousemove', e => {
    const x = (e.clientX / window.innerWidth  - .5) * 20;
    const y = (e.clientY / window.innerHeight - .5) * 20;
    shapes.forEach((s, i) => {
      const factor = (i + 1) * .4;
      s.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
    });
  }, { passive: true });
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  renderCategories();
  renderProducts();
  initModal();
  initSort();
  initCounters();
  initScrollReveal();
  initParallax();
});
