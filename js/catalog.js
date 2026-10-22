/* =============================================
   SHADEN — Catalog JavaScript (Supabase async)
   ============================================= */

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
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
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

/* ── Estado ── */
const State = {
  currentCat:  'all',
  currentSort: 'default',
  searchQuery: '',
  categories:  [],
  settings:    {},
  stock:       {},   // map productId → qty
};

/* ── Actualizar UI de stock sin re-renderizar todo ── */
function _refreshProductStockUI(productId, newQty) {
  const card = document.querySelector(`.product-card[data-id="${productId}"]`);
  if (!card) return; // tarjeta no visible actualmente

  const isAgotado = newQty <= 0;
  const isLow     = newQty > 0 && newQty <= 5;

  // Toggle clase agotado
  card.classList.toggle('product-agotado', isAgotado);
  card.setAttribute('tabindex', isAgotado ? '-1' : '0');
  card.setAttribute('aria-label',
    card.getAttribute('aria-label')?.replace(/ — Agotado$/, '') + (isAgotado ? ' — Agotado' : '')
  );

  // Overlay agotado
  let overlay = card.querySelector('.product-agotado-overlay');
  if (isAgotado && !overlay) {
    overlay = document.createElement('div');
    overlay.className = 'product-agotado-overlay';
    overlay.innerHTML = '<span>Agotado</span>';
    card.querySelector('.product-img-wrap')?.appendChild(overlay);
  } else if (!isAgotado && overlay) {
    overlay.remove();
  }

  // Stock badge
  const badgesEl = card.querySelector('.product-badges');
  if (badgesEl) {
    // Eliminar badge de stock anterior
    badgesEl.querySelectorAll('.stock-badge').forEach(b => b.remove());
    // Agregar el nuevo
    if (isAgotado) {
      badgesEl.insertAdjacentHTML('beforeend',
        `<span class="stock-badge stock-agotado"><i class="fa-solid fa-circle-xmark"></i> Agotado</span>`);
    } else if (isLow) {
      badgesEl.insertAdjacentHTML('beforeend',
        `<span class="stock-badge stock-poco"><i class="fa-solid fa-circle-exclamation"></i> Últimas unidades</span>`);
    }
  }

  // Botón WhatsApp
  const footer = card.querySelector('.product-footer');
  if (footer) {
    const waOld = footer.querySelector('.product-wa-btn');
    if (waOld) {
      if (isAgotado) {
        waOld.outerHTML = `<span class="product-wa-btn wa-agotado" aria-disabled="true"><i class="fa-solid fa-circle-xmark"></i></span>`;
      } else if (waOld.classList.contains('wa-agotado')) {
        // Recuperar el stock — restaurar botón WA
        renderProducts(); // re-render completo para recuperar el href correcto
      }
    }
  }
}

/* ── Navbar scroll ── */
function initNavbar() {
  const navbar    = $('#navbar');
  const hamburger = $('#hamburger');
  const navLinks  = $('#nav-links');
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
  navLinks.addEventListener('click', e => { if (e.target.classList.contains('nav-link')) toggleMenu(false); });

  const sections = $$('section[id], div[id]').filter(el =>
    ['inicio','categorias','catalogo','nosotros','contacto'].includes(el.id)
  );
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        $$('.nav-link').forEach(l => l.classList.remove('active'));
        const a = $(`.nav-link[href="#${entry.target.id}"]`);
        if (a) a.classList.add('active');
      }
    });
  }, { threshold: .3 });
  sections.forEach(s => obs.observe(s));
}

/* ── Search bar ── */
function initSearch() {
  const toggle = $('#search-toggle');
  const bar    = $('#search-bar');
  const input  = $('#search-input');
  const close  = $('#search-close');

  const openSearch = () => { bar.classList.add('open'); setTimeout(() => input.focus(), 100); };
  const closeSearch = () => {
    bar.classList.remove('open');
    input.value = '';
    State.searchQuery = '';
    renderProducts();
  };

  toggle.addEventListener('click', () => bar.classList.contains('open') ? closeSearch() : openSearch());
  close.addEventListener('click', closeSearch);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && bar.classList.contains('open')) closeSearch(); });

  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      State.searchQuery = input.value.trim();
      State.currentCat  = 'all';
      $$('.filter-tab').forEach(t => t.classList.remove('active'));
      const allTab = $('.filter-tab[data-cat="all"]');
      if (allTab) allTab.classList.add('active');
      await renderProducts();
      if (State.searchQuery) document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
  });
}

/* ── Categorías ── */
async function renderCategories() {
  const grid      = $('#categories-grid');
  const tabs      = $('#filter-tabs');
  const footerCats = $('#footer-cats');
  const cats      = State.categories;
  const prods     = await ShadenDB.Products.getActive();

  // Cards
  grid.innerHTML = cats.map(cat => {
    const count = prods.filter(p => p.category === cat.id).length;
    return `
      <button class="cat-card${State.currentCat === cat.id ? ' active' : ''}" data-cat="${cat.id}" aria-pressed="${State.currentCat === cat.id}">
        <div class="cat-card-icon"><i class="${cat.icon}"></i></div>
        <h4>${cat.name}</h4>
        <span>${count} producto${count !== 1 ? 's' : ''}</span>
      </button>`;
  }).join('');

  // Filter tabs
  $$('.filter-tab[data-cat]:not([data-cat="all"])').forEach(t => t.remove());
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-tab' + (State.currentCat === cat.id ? ' active' : '');
    btn.dataset.cat = cat.id;
    btn.textContent = cat.name;
    tabs.appendChild(btn);
  });

  // Footer
  if (footerCats) {
    footerCats.innerHTML = cats.map(cat =>
      `<li><a href="#catalogo" data-cat="${cat.id}">${cat.name}</a></li>`
    ).join('');
    footerCats.addEventListener('click', e => {
      const a = e.target.closest('a[data-cat]');
      if (a) { filterByCategory(a.dataset.cat); document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' }); }
    });
  }

  // Listeners
  $$('.cat-card').forEach(btn => btn.addEventListener('click', () => filterByCategory(btn.dataset.cat)));
  $$('.filter-tab').forEach(btn => btn.addEventListener('click', () => filterByCategory(btn.dataset.cat)));
}

async function filterByCategory(catId) {
  State.currentCat  = catId;
  State.searchQuery = '';
  $('#search-input').value = '';
  await renderCategories();
  await renderProducts();
  document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Productos ── */
async function getFilteredProducts() {
  let products;
  if (State.searchQuery) {
    products = await ShadenDB.Products.search(State.searchQuery);
  } else if (State.currentCat !== 'all') {
    products = await ShadenDB.Products.getByCategory(State.currentCat);
  } else {
    products = await ShadenDB.Products.getActive();
  }

  switch (State.currentSort) {
    case 'name-asc':   products.sort((a,b) => a.name.localeCompare(b.name)); break;
    case 'name-desc':  products.sort((a,b) => b.name.localeCompare(a.name)); break;
    case 'price-asc':  products.sort((a,b) => (a.price||0) - (b.price||0)); break;
    case 'price-desc': products.sort((a,b) => (b.price||0) - (a.price||0)); break;
    case 'new':        products.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); break;
  }
  return products;
}

async function renderProducts() {
  const grid    = $('#products-grid');
  const emptyEl = $('#empty-state');

  // Skeleton mientras carga
  grid.innerHTML = Array(4).fill(0).map(() => `
    <div class="product-card skeleton-card">
      <div class="product-img-wrap skeleton-img"></div>
      <div class="product-info">
        <div class="skeleton-line" style="width:50%;height:10px;margin-bottom:8px;"></div>
        <div class="skeleton-line" style="width:80%;height:14px;margin-bottom:6px;"></div>
        <div class="skeleton-line" style="width:65%;height:10px;margin-bottom:14px;"></div>
        <div class="skeleton-line" style="width:40%;height:18px;"></div>
      </div>
    </div>`).join('');

  const products = await getFilteredProducts();
  const cats     = State.categories;
  const settings = State.settings;

  if (products.length === 0) {
    grid.innerHTML = '';
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  grid.innerHTML = products.map((p, i) => {
    const cat    = cats.find(c => c.id === p.category);
    const price  = formatPrice(p.price);
    const waMsg  = encodeURIComponent(`Hola Shaden! Me interesa: *${p.name}*${price ? ` (${price})` : ''}. ¿Está disponible?`);
    const waLink = `https://wa.me/${settings.phone || '573042468500'}?text=${waMsg}`;
    const delay  = (i % 8) * 50;

    // Stock: null = sin control de inventario (siempre disponible), 0 = agotado, >0 = disponible
    const stockQty  = State.stock.hasOwnProperty(p.id) ? State.stock[p.id] : null;
    const isAgotado = stockQty !== null && stockQty <= 0;
    const stockBadge = isAgotado
      ? `<span class="stock-badge stock-agotado"><i class="fa-solid fa-circle-xmark"></i> Agotado</span>`
      : stockQty !== null && stockQty <= 5
        ? `<span class="stock-badge stock-poco"><i class="fa-solid fa-circle-exclamation"></i> Últimas unidades</span>`
        : '';

    return `
      <article class="product-card${isAgotado ? ' product-agotado' : ''}" data-id="${p.id}" style="animation-delay:${delay}ms" tabindex="${isAgotado ? -1 : 0}" role="button" aria-label="Ver ${p.name}${isAgotado ? ' — Agotado' : ''}">
        <div class="product-img-wrap">
          ${p.image
            ? `<img src="${p.image}" alt="${p.name}" loading="lazy" />`
            : `<div class="product-no-img"><i class="${cat?.icon || 'fa-solid fa-box'}"></i></div>`
          }
          <div class="product-badges">${getBadgeHTML(p.badge)}${stockBadge}</div>
          ${isAgotado ? '<div class="product-agotado-overlay"><span>Agotado</span></div>' : ''}
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
            ${isAgotado
              ? `<span class="product-wa-btn wa-agotado" aria-disabled="true" title="Sin stock"><i class="fa-solid fa-circle-xmark"></i></span>`
              : `<a href="${waLink}" target="_blank" class="product-wa-btn" aria-label="Preguntar por WhatsApp" onclick="event.stopPropagation()"><i class="fa-brands fa-whatsapp"></i></a>`
            }
          </div>
        </div>
      </article>`;
  }).join('');

  $$('.product-card').forEach(card => {
    card.addEventListener('click',   () => {
      if (card.classList.contains('product-agotado')) return;
      openProductModal(card.dataset.id);
    });
    card.addEventListener('keydown', e => {
      if (card.classList.contains('product-agotado')) return;
      if (e.key === 'Enter' || e.key === ' ') openProductModal(card.dataset.id);
    });
  });
}

/* ── Modal producto ── */
async function openProductModal(productId) {
  const p = await ShadenDB.Products.getById(productId);
  if (!p) return;
  const cat      = State.categories.find(c => c.id === p.category);
  const settings = State.settings;
  const price    = formatPrice(p.price);
  const waMsg    = encodeURIComponent(`Hola Shaden! Me interesa: *${p.name}*${price ? ` (${price})` : ''}. ¿Está disponible?`);

  const stockQty  = State.stock.hasOwnProperty(p.id) ? State.stock[p.id] : null;
  const isAgotado = stockQty !== null && stockQty <= 0;
  const isLow     = stockQty !== null && stockQty > 0 && stockQty <= 5;

  $('#modal-product-name').textContent = p.name;
  $('#modal-cat').textContent   = cat?.name || '';
  $('#modal-price').textContent = price || 'Consultar precio';
  $('#modal-desc').textContent  = p.description || '';

  // Badge de stock en modal
  const modalStock = document.getElementById('modal-stock');
  if (modalStock) {
    if (isAgotado) {
      modalStock.innerHTML = '<span class="stock-badge stock-agotado"><i class="fa-solid fa-circle-xmark"></i> Agotado</span>';
    } else if (isLow) {
      modalStock.innerHTML = '<span class="stock-badge stock-poco"><i class="fa-solid fa-circle-exclamation"></i> ¡Últimas unidades!</span>';
    } else if (stockQty !== null) {
      modalStock.innerHTML = '<span class="stock-badge stock-ok"><i class="fa-solid fa-circle-check"></i> Disponible</span>';
    } else {
      modalStock.innerHTML = '';
    }
  }

  // Botón WhatsApp
  const waBtn = $('#modal-wa');
  if (isAgotado) {
    waBtn.href = '#';
    waBtn.style.opacity = '.4';
    waBtn.style.pointerEvents = 'none';
    waBtn.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Sin stock';
  } else {
    waBtn.href = `https://wa.me/${settings.phone || '573042468500'}?text=${waMsg}`;
    waBtn.style.opacity = '';
    waBtn.style.pointerEvents = '';
    waBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Preguntar por WhatsApp';
  }

  const imgEl = $('#modal-img');
  if (p.image) { imgEl.src = p.image; imgEl.alt = p.name; imgEl.style.display = 'block'; }
  else          { imgEl.style.display = 'none'; }

  $('#modal-badge').innerHTML = getBadgeHTML(p.badge);
  $('#product-modal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  $('#product-modal').classList.remove('active');
  document.body.style.overflow = '';
}

function initModal() {
  $('#modal-close').addEventListener('click', closeProductModal);
  $('#product-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeProductModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProductModal(); });
}

/* ── Sort ── */
function initSort() {
  $('#sort-select').addEventListener('change', async e => {
    State.currentSort = e.target.value;
    await renderProducts();
  });
}

/* ── Contadores animados ── */
function initCounters() {
  const counters = $$('[data-target]');
  if (!counters.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target);
      const dur = 1500;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(ease * target);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      obs.unobserve(el);
    });
  }, { threshold: .5 });
  counters.forEach(c => obs.observe(c));
}

/* ── Scroll reveal ── */
function initScrollReveal() {
  const els = $$('.cat-card, .contact-card, .about-text > *');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: .1 });
  els.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity .5s ease ${i * 60}ms, transform .5s ease ${i * 60}ms`;
    obs.observe(el);
  });
}

/* ── Parallax hero ── */
function initParallax() {
  const shapes = $$('.hero-shape');
  window.addEventListener('mousemove', e => {
    const x = (e.clientX / window.innerWidth  - .5) * 20;
    const y = (e.clientY / window.innerHeight - .5) * 20;
    shapes.forEach((s, i) => {
      const f = (i + 1) * .4;
      s.style.transform = `translate(${x * f}px, ${y * f}px)`;
    });
  }, { passive: true });
}

/* ── Init principal ── */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Carga paralela de datos iniciales
    const [cats, settings, stockRows] = await Promise.all([
      ShadenDB.Categories.getAll(),
      ShadenDB.Settings.get(),
      db.from('stock').select('product_id, qty').then(r => r.data || []),
    ]);
    State.categories = cats;
    State.settings   = settings;
    // Mapa rápido de stock
    State.stock = {};
    stockRows.forEach(s => { State.stock[s.product_id] = s.qty; });

    // Escuchar cambios de stock en tiempo real (Supabase Realtime)
    db.channel('stock-web')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock' }, payload => {
        const { new: row } = payload;
        if (row && row.product_id) {
          State.stock[row.product_id] = row.qty;
          // Re-renderizar silenciosamente las tarjetas afectadas
          _refreshProductStockUI(row.product_id, row.qty);
        }
      })
      .subscribe();

    initNavbar();
    initSearch();
    initModal();
    initSort();
    initCounters();
    initScrollReveal();
    initParallax();

    await renderCategories();
    await renderProducts();

  } catch (err) {
    console.error('Error cargando catálogo:', err);
    showToast('Error conectando con la base de datos.', 'error', 5000);
  }
});
