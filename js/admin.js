/* =============================================
   SHADEN — Admin Panel JavaScript
   ============================================= */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ── Formato precio ── */
function formatPrice(price) {
  if (!price && price !== 0) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0,
  }).format(price);
}

/* ── Toast ── */
function showToast(msg, type = 'default', duration = 3500) {
  const container = $('#toast-container');
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', default: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.default}"></i> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ── Badge HTML ── */
function getBadgeHTML(badge) {
  const map = {
    new:      { label: 'Nuevo',     cls: 'badge-new' },
    offer:    { label: 'Oferta',    cls: 'badge-blush' },
    featured: { label: 'Destacado', cls: 'badge-gold' },
  };
  if (!badge || !map[badge]) return '';
  return `<span class="badge ${map[badge].cls}">${map[badge].label}</span>`;
}

/* ══════════════════════════════
   AUTH
══════════════════════════════ */
const AuthUI = (() => {
  function init() {
    const loginScreen = $('#login-screen');
    const adminPanel  = $('#admin-panel');

    if (ShadenDB.Auth.isLoggedIn()) {
      loginScreen.hidden = true;
      adminPanel.hidden  = false;
      return;
    }

    // Login form
    $('#login-form').addEventListener('submit', e => {
      e.preventDefault();
      const user = $('#login-user').value.trim();
      const pass = $('#login-pass').value;
      const errEl = $('#login-error');

      if (ShadenDB.Auth.check(user, pass)) {
        ShadenDB.Auth.setSession();
        loginScreen.hidden = true;
        adminPanel.hidden  = false;
        AdminPanel.init();
        showToast('¡Bienvenida! 👋', 'success');
      } else {
        errEl.hidden = false;
        $('#login-pass').value = '';
        setTimeout(() => { errEl.hidden = true; }, 3000);
      }
    });

    // Toggle password visibility
    $('#toggle-pass').addEventListener('click', () => {
      const inp = $('#login-pass');
      const icon = $('#toggle-pass i');
      if (inp.type === 'password') {
        inp.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
      } else {
        inp.type = 'password';
        icon.className = 'fa-solid fa-eye';
      }
    });

    // Enter on username → focus password
    $('#login-user').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); $('#login-pass').focus(); }
    });
  }

  return { init };
})();

/* ══════════════════════════════
   ADMIN PANEL
══════════════════════════════ */
const AdminPanel = (() => {

  let currentView = 'dashboard';

  /* ── Navegación ── */
  function initNav() {
    const sidebar        = $('#sidebar');
    const overlay        = $('#sidebar-overlay');
    const toggleBtn      = $('#sidebar-toggle');
    const logoutBtn      = $('#logout-btn');
    const topbarTitle    = $('#topbar-title');

    const viewLabels = {
      dashboard:  'Dashboard',
      products:   'Productos',
      categories: 'Categorías',
      settings:   'Ajustes',
    };

    function navigate(view) {
      // Hide all views
      $$('.admin-view').forEach(v => v.classList.remove('active'));
      $$('.sidebar-link[data-view]').forEach(l => l.classList.remove('active'));

      const viewEl = $(`#view-${view}`);
      if (viewEl) viewEl.classList.add('active');

      const link = $(`.sidebar-link[data-view="${view}"]`);
      if (link) link.classList.add('active');

      topbarTitle.textContent = viewLabels[view] || view;
      currentView = view;

      // Close sidebar on mobile
      sidebar.classList.remove('open');
      overlay.classList.remove('active');

      // Refresh content
      switch (view) {
        case 'dashboard':  DashboardView.render(); break;
        case 'products':   ProductsView.render();  break;
        case 'categories': CategoriesView.render(); break;
        case 'settings':   SettingsView.render();  break;
      }
    }

    // Sidebar links
    $$('.sidebar-link[data-view]').forEach(link => {
      link.addEventListener('click', () => navigate(link.dataset.view));
    });

    // "Ver todos" dashboard button uses data-view
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn-text[data-view]');
      if (btn) navigate(btn.dataset.view);
    });

    // Mobile sidebar toggle
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
      ShadenDB.Auth.clearSession();
      location.reload();
    });

    // Initial render
    navigate('dashboard');
  }

  /* ── Init ── */
  function init() {
    initNav();
    ProductsView.initForm();
    CategoriesView.initForm();
    SettingsView.init();
    ConfirmModal.init();
  }

  return { init };
})();

/* ══════════════════════════════
   DASHBOARD VIEW
══════════════════════════════ */
const DashboardView = (() => {

  function render() {
    const products   = ShadenDB.Products.getAll();
    const active     = products.filter(p => p.status === 'active');
    const cats       = ShadenDB.Categories.getAll();
    const featured   = products.filter(p => p.badge === 'featured').length;

    // Stats
    const statsGrid = $('#stats-grid');
    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon gold"><i class="fa-solid fa-box"></i></div>
        <div class="stat-card-info">
          <div class="stat-card-num">${active.length}</div>
          <div class="stat-card-label">Productos activos</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon brown"><i class="fa-solid fa-tag"></i></div>
        <div class="stat-card-info">
          <div class="stat-card-num">${cats.length}</div>
          <div class="stat-card-label">Categorías</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon blush"><i class="fa-solid fa-eye-slash"></i></div>
        <div class="stat-card-info">
          <div class="stat-card-num">${products.length - active.length}</div>
          <div class="stat-card-label">Productos ocultos</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon green"><i class="fa-solid fa-certificate"></i></div>
        <div class="stat-card-info">
          <div class="stat-card-num">${featured}</div>
          <div class="stat-card-label">Destacados</div>
        </div>
      </div>`;

    // Recent products (últimos 5)
    const recent = [...products]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
    const recentList = $('#recent-products-list');
    recentList.innerHTML = recent.length
      ? recent.map(p => {
          const cat = ShadenDB.Categories.getById(p.category);
          return `
            <div class="recent-product-row">
              <div class="rpr-img">
                ${p.image
                  ? `<img src="${p.image}" alt="${p.name}" loading="lazy" />`
                  : `<i class="${cat?.icon || 'fa-solid fa-box'}"></i>`
                }
              </div>
              <div class="rpr-info">
                <div class="rpr-name">${p.name}</div>
                <div class="rpr-cat">${cat?.name || '—'}</div>
              </div>
              <div class="rpr-price">${p.price ? formatPrice(p.price) : '—'}</div>
            </div>`;
        }).join('')
      : '<p style="color:var(--text-muted);font-size:.85rem;padding:12px 0">Sin productos aún.</p>';

    // Categories summary
    const catList = $('#cat-summary-list');
    catList.innerHTML = cats.map(cat => {
      const count = products.filter(p => p.category === cat.id).length;
      return `
        <div class="cat-summary-row">
          <div class="csr-icon"><i class="${cat.icon}"></i></div>
          <span class="csr-name">${cat.name}</span>
          <span class="csr-count">${count}</span>
        </div>`;
    }).join('');
  }

  return { render };
})();

/* ══════════════════════════════
   PRODUCTS VIEW
══════════════════════════════ */
const ProductsView = (() => {

  let filterCat   = 'all';
  let searchQuery = '';

  /* ── Render tabla ── */
  function render() {
    populateCatFilter();
    renderTable();
    initTableListeners();
  }

  function populateCatFilter() {
    const sel = $('#admin-filter-cat');
    const cats = ShadenDB.Categories.getAll();
    sel.innerHTML = `<option value="all">Todas las categorías</option>` +
      cats.map(c => `<option value="${c.id}"${filterCat === c.id ? ' selected' : ''}>${c.name}</option>`).join('');
  }

  function getFiltered() {
    let list = ShadenDB.Products.getAll();
    if (filterCat !== 'all') list = list.filter(p => p.category === filterCat);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  function renderTable() {
    const tbody   = $('#products-tbody');
    const countEl = $('#table-count');
    const list    = getFiltered();
    const cats    = ShadenDB.Categories.getAll();

    countEl.textContent = `${list.length} producto${list.length !== 1 ? 's' : ''}`;

    if (!list.length) {
      tbody.innerHTML = `
        <tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">
          <i class="fa-solid fa-box-open" style="font-size:2rem;margin-bottom:10px;display:block;"></i>
          Sin resultados
        </td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(p => {
      const cat = cats.find(c => c.id === p.category);
      return `
        <tr data-id="${p.id}">
          <td>
            <div class="td-product">
              <div class="td-thumb">
                ${p.image
                  ? `<img src="${p.image}" alt="${p.name}" loading="lazy" />`
                  : `<i class="${cat?.icon || 'fa-solid fa-box'}"></i>`
                }
              </div>
              <div>
                <div class="td-name">${p.name}</div>
                ${getBadgeHTML(p.badge)}
              </div>
            </div>
          </td>
          <td><span class="td-cat-badge">${cat?.name || '—'}</span></td>
          <td class="td-price">${p.price ? formatPrice(p.price) : '—'}</td>
          <td>
            <span class="status-pill ${p.status}">
              ${p.status === 'active' ? 'Activo' : 'Oculto'}
            </span>
          </td>
          <td>
            <div class="td-actions">
              <button class="action-btn edit" data-id="${p.id}" title="Editar" aria-label="Editar ${p.name}">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="action-btn delete" data-id="${p.id}" title="Eliminar" aria-label="Eliminar ${p.name}">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function initTableListeners() {
    // Search
    const searchInput = $('#admin-search');
    searchInput.value = searchQuery;
    searchInput.oninput = debounce(e => {
      searchQuery = e.target.value.trim();
      renderTable();
    }, 300);

    // Filter category
    $('#admin-filter-cat').onchange = e => {
      filterCat = e.target.value;
      renderTable();
    };

    // Edit / Delete via event delegation
    const tbody = $('#products-tbody');
    tbody.onclick = e => {
      const editBtn   = e.target.closest('.action-btn.edit');
      const deleteBtn = e.target.closest('.action-btn.delete');
      if (editBtn)   openProductForm(editBtn.dataset.id);
      if (deleteBtn) confirmDeleteProduct(deleteBtn.dataset.id);
    };
  }

  /* ── Product Form Modal ── */
  function initForm() {
    $('#add-product-btn').addEventListener('click', () => openProductForm(null));
    $('#pf-modal-close').addEventListener('click', closeProductForm);
    $('#pf-cancel').addEventListener('click', closeProductForm);
    $('#product-form-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeProductForm();
    });

    // Image preview
    $('#pf-image').addEventListener('input', debounce(e => {
      const url  = e.target.value.trim();
      const wrap = $('#img-preview-wrap');
      const img  = $('#img-preview');
      if (url) {
        img.src = url;
        img.onload  = () => wrap.classList.add('show');
        img.onerror = () => wrap.classList.remove('show');
      } else {
        wrap.classList.remove('show');
      }
    }, 500));

    // Submit
    $('#product-form').addEventListener('submit', e => {
      e.preventDefault();
      saveProduct();
    });
  }

  function openProductForm(productId) {
    const titleEl = $('#pf-modal-title');
    const form    = $('#product-form');
    form.reset();
    $('#img-preview-wrap').classList.remove('show');
    populateCategorySelect();

    if (productId) {
      const p = ShadenDB.Products.getById(productId);
      if (!p) return;
      titleEl.textContent   = 'Editar producto';
      $('#pf-id').value     = p.id;
      $('#pf-name').value   = p.name;
      $('#pf-category').value = p.category;
      $('#pf-price').value  = p.price || '';
      $('#pf-desc').value   = p.description || '';
      $('#pf-image').value  = p.image || '';
      $('#pf-badge').value  = p.badge || '';
      $('#pf-status').value = p.status || 'active';

      if (p.image) {
        const wrap = $('#img-preview-wrap');
        const img  = $('#img-preview');
        img.src = p.image;
        img.onload = () => wrap.classList.add('show');
      }
    } else {
      titleEl.textContent = 'Nuevo producto';
      $('#pf-id').value   = '';
    }

    $('#product-form-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#pf-name').focus(), 150);
  }

  function closeProductForm() {
    $('#product-form-modal').classList.remove('active');
    document.body.style.overflow = '';
  }

  function populateCategorySelect() {
    const sel  = $('#pf-category');
    const cats = ShadenDB.Categories.getAll();
    sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  function saveProduct() {
    const id   = $('#pf-id').value;
    const name = $('#pf-name').value.trim();
    const cat  = $('#pf-category').value;

    if (!name) { showToast('El nombre es obligatorio.', 'error'); return; }
    if (!cat)  { showToast('Selecciona una categoría.', 'error'); return; }

    const data = {
      name,
      category:    cat,
      price:       parseFloat($('#pf-price').value) || null,
      description: $('#pf-desc').value.trim(),
      image:       $('#pf-image').value.trim(),
      badge:       $('#pf-badge').value,
      status:      $('#pf-status').value,
    };

    if (id) {
      ShadenDB.Products.update(id, data);
      showToast(`"${name}" actualizado. ✓`, 'success');
    } else {
      ShadenDB.Products.add(data);
      showToast(`"${name}" agregado al catálogo. ✓`, 'success');
    }

    closeProductForm();
    renderTable();
    DashboardView.render();
  }

  function confirmDeleteProduct(productId) {
    const p = ShadenDB.Products.getById(productId);
    if (!p) return;
    ConfirmModal.show(
      `¿Eliminar "<strong>${p.name}</strong>"? Esta acción no se puede deshacer.`,
      () => {
        ShadenDB.Products.delete(productId);
        showToast(`"${p.name}" eliminado.`, 'default');
        renderTable();
        DashboardView.render();
      }
    );
  }

  return { render, initForm };
})();

/* ══════════════════════════════
   CATEGORIES VIEW
══════════════════════════════ */
const CategoriesView = (() => {

  function render() {
    const grid = $('#cat-admin-grid');
    const cats = ShadenDB.Categories.getAll();
    const prods = ShadenDB.Products.getAll();

    grid.innerHTML = cats.map(cat => {
      const count = prods.filter(p => p.category === cat.id).length;
      return `
        <div class="cat-admin-card" data-id="${cat.id}">
          <div class="cat-admin-icon"><i class="${cat.icon}"></i></div>
          <div class="cat-admin-name">${cat.name}</div>
          <div class="cat-admin-count">${count} producto${count !== 1 ? 's' : ''}</div>
          <div class="cat-admin-actions">
            <button class="action-btn edit" data-id="${cat.id}" title="Editar" aria-label="Editar ${cat.name}">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="action-btn delete" data-id="${cat.id}" title="Eliminar" aria-label="Eliminar ${cat.name}">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    // Listeners
    grid.querySelectorAll('.action-btn.edit').forEach(btn => {
      btn.onclick = () => openCatForm(btn.dataset.id);
    });
    grid.querySelectorAll('.action-btn.delete').forEach(btn => {
      btn.onclick = () => confirmDeleteCat(btn.dataset.id);
    });
  }

  function initForm() {
    $('#add-cat-btn').addEventListener('click', () => openCatForm(null));
    $('#cf-modal-close').addEventListener('click', closeCatForm);
    $('#cf-cancel').addEventListener('click', closeCatForm);
    $('#cat-form-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeCatForm();
    });
    $('#cat-form').addEventListener('submit', e => {
      e.preventDefault();
      saveCat();
    });
  }

  function openCatForm(catId) {
    const titleEl = $('#cf-modal-title');
    $('#cat-form').reset();

    if (catId) {
      const cat = ShadenDB.Categories.getById(catId);
      if (!cat) return;
      titleEl.textContent  = 'Editar categoría';
      $('#cf-id').value    = cat.id;
      $('#cf-name').value  = cat.name;
      $('#cf-icon').value  = cat.icon;
    } else {
      titleEl.textContent = 'Nueva categoría';
      $('#cf-id').value   = '';
    }

    $('#cat-form-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#cf-name').focus(), 150);
  }

  function closeCatForm() {
    $('#cat-form-modal').classList.remove('active');
    document.body.style.overflow = '';
  }

  function saveCat() {
    const id   = $('#cf-id').value;
    const name = $('#cf-name').value.trim();
    const icon = $('#cf-icon').value.trim() || 'fa-solid fa-tag';

    if (!name) { showToast('El nombre es obligatorio.', 'error'); return; }

    if (id) {
      ShadenDB.Categories.update(id, { name, icon });
      showToast(`Categoría "${name}" actualizada. ✓`, 'success');
    } else {
      ShadenDB.Categories.add({ name, icon });
      showToast(`Categoría "${name}" creada. ✓`, 'success');
    }

    closeCatForm();
    render();
    DashboardView.render();
  }

  function confirmDeleteCat(catId) {
    const cat   = ShadenDB.Categories.getById(catId);
    if (!cat) return;
    const prods = ShadenDB.Products.getAll().filter(p => p.category === catId);

    const msg = prods.length
      ? `¿Eliminar la categoría "<strong>${cat.name}</strong>"? Tiene ${prods.length} producto(s) asociados.`
      : `¿Eliminar la categoría "<strong>${cat.name}</strong>"? Esta acción no se puede deshacer.`;

    ConfirmModal.show(msg, () => {
      ShadenDB.Categories.delete(catId);
      showToast(`Categoría "${cat.name}" eliminada.`);
      render();
      DashboardView.render();
    });
  }

  return { render, initForm };
})();

/* ══════════════════════════════
   SETTINGS VIEW
══════════════════════════════ */
const SettingsView = (() => {

  function render() {
    const s = ShadenDB.Settings.get();
    $('#s-storename').value = s.storeName  || '';
    $('#s-tagline').value   = s.tagline    || '';
    $('#s-phone').value     = s.phone      || '';
    $('#s-address').value   = s.address    || '';
    $('#s-instagram').value = s.instagram  || '';
    $('#s-discount').value  = s.discount   || 10;
    $('#s-about').value     = s.about      || '';
  }

  function init() {
    // Settings form
    $('#settings-form').addEventListener('submit', e => {
      e.preventDefault();
      ShadenDB.Settings.save({
        storeName: $('#s-storename').value.trim(),
        tagline:   $('#s-tagline').value.trim(),
        phone:     $('#s-phone').value.trim(),
        address:   $('#s-address').value.trim(),
        instagram: $('#s-instagram').value.trim(),
        discount:  parseInt($('#s-discount').value) || 0,
        about:     $('#s-about').value.trim(),
      });
      showToast('Ajustes guardados. ✓', 'success');
    });

    // Password form
    $('#pass-form').addEventListener('submit', e => {
      e.preventDefault();
      const current = $('#s-pass-current').value;
      const newPass = $('#s-pass-new').value;
      const auth    = ShadenDB.Auth.get();

      if (current !== auth.password) {
        showToast('La contraseña actual no es correcta.', 'error');
        return;
      }
      if (newPass.length < 6) {
        showToast('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
        return;
      }

      ShadenDB.Auth.changePassword(newPass);
      $('#pass-form').reset();
      showToast('Contraseña cambiada. ✓', 'success');
    });
  }

  return { render, init };
})();

/* ══════════════════════════════
   CONFIRM MODAL
══════════════════════════════ */
const ConfirmModal = (() => {
  let _callback = null;

  function init() {
    $('#confirm-close').addEventListener('click', close);
    $('#confirm-cancel').addEventListener('click', close);
    $('#confirm-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) close();
    });
    $('#confirm-ok').addEventListener('click', () => {
      if (_callback) _callback();
      close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && $('#confirm-modal').classList.contains('active')) close();
    });
  }

  function show(message, callback) {
    $('#confirm-msg').innerHTML = message;
    _callback = callback;
    $('#confirm-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#confirm-ok').focus(), 150);
  }

  function close() {
    $('#confirm-modal').classList.remove('active');
    document.body.style.overflow = '';
    _callback = null;
  }

  return { init, show };
})();

/* ── Debounce helper ── */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  AuthUI.init();
  // Si ya está logueado, init panel directamente
  if (ShadenDB.Auth.isLoggedIn()) {
    AdminPanel.init();
  }
});
