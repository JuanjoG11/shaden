/* =============================================
   SHADEN â€” Admin Panel JavaScript (Supabase async)
   ============================================= */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function formatPrice(price) {
  if (!price && price !== 0) return 'â€”';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
}

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

function getBadgeHTML(badge) {
  const map = { new: { label:'Nuevo', cls:'badge-new' }, offer: { label:'Oferta', cls:'badge-blush' }, featured: { label:'Destacado', cls:'badge-gold' } };
  if (!badge || !map[badge]) return '';
  return `<span class="badge ${map[badge].cls}">${map[badge].label}</span>`;
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

/* Estado compartido del admin */
const AdminState = {
  categories: [],
  settings:   {},
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   AUTH
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const AuthUI = (() => {
  function init() {
    const loginScreen = $('#login-screen');
    const adminPanel  = $('#admin-panel');

    if (ShadenDB.Auth.isLoggedIn()) {
      loginScreen.style.display = "none";
      adminPanel.style.display  = "flex";
      // init se llama desde DOMContentLoaded
      return;
    }

    // Asegurarse que el panel estÃ© oculto
    loginScreen.style.display = "flex";
    adminPanel.style.display  = "none";

    $('#login-form').addEventListener('submit', async e => {
      e.preventDefault();
      const user  = $('#login-user').value.trim();
      const pass  = $('#login-pass').value;
      const errEl = $('#login-error');

      if (ShadenDB.Auth.check(user, pass)) {
        ShadenDB.Auth.setSession();
        loginScreen.style.display = "none";
        adminPanel.style.display  = "flex";
        await AdminPanel.init();
        showToast('Â¡Bienvenida! ðŸ‘‹', 'success');
      } else {
        errEl.hidden = false;
        $('#login-pass').value = '';
        setTimeout(() => { errEl.hidden = true; }, 3000);
      }
    });

    $('#toggle-pass').addEventListener('click', () => {
      const inp  = $('#login-pass');
      const icon = $('#toggle-pass i');
      inp.type   = inp.type === 'password' ? 'text' : 'password';
      icon.className = inp.type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
    });

    $('#login-user').addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); $('#login-pass').focus(); }
    });
  }

  return { init };
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ADMIN PANEL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const AdminPanel = (() => {

  const viewLabels = { dashboard:'Dashboard', products:'Productos', categories:'CategorÃ­as', settings:'Ajustes' };

  function navigate(view) {
    $$('.admin-view').forEach(v => v.classList.remove('active'));
    $$('.sidebar-link[data-view]').forEach(l => l.classList.remove('active'));
    const viewEl = $(`#view-${view}`);
    if (viewEl) viewEl.classList.add('active');
    const link = $(`.sidebar-link[data-view="${view}"]`);
    if (link) link.classList.add('active');
    $('#topbar-title').textContent = viewLabels[view] || view;
    $('#sidebar').classList.remove('open');
    $('#sidebar-overlay').classList.remove('active');

    switch (view) {
      case 'dashboard':  DashboardView.render();    break;
      case 'products':   ProductsView.render();     break;
      case 'categories': CategoriesView.render();   break;
      case 'settings':   SettingsView.render();     break;
    }
  }

  async function init() {
    // Cargar datos globales una sola vez
    const [cats, settings] = await Promise.all([
      ShadenDB.Categories.getAll(),
      ShadenDB.Settings.get(),
    ]);
    AdminState.categories = cats;
    AdminState.settings   = settings;

    // Sidebar links
    $$('.sidebar-link[data-view]').forEach(l => l.addEventListener('click', () => navigate(l.dataset.view)));

    // "Ver todos" en dashboard
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn-text[data-view]');
      if (btn) navigate(btn.dataset.view);
    });

    // Mobile sidebar
    $('#sidebar-toggle').addEventListener('click', () => {
      $('#sidebar').classList.toggle('open');
      $('#sidebar-overlay').classList.toggle('active');
    });
    $('#sidebar-overlay').addEventListener('click', () => {
      $('#sidebar').classList.remove('open');
      $('#sidebar-overlay').classList.remove('active');
    });

    // Logout
    $('#logout-btn').addEventListener('click', () => {
      ShadenDB.Auth.clearSession();
      location.reload();
    });

    ProductsView.initForm();
    CategoriesView.initForm();
    SettingsView.init();
    ConfirmModal.init();

    navigate('dashboard');
  }

  return { init };
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DASHBOARD
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const DashboardView = (() => {

  async function render() {
    const [products, cats] = await Promise.all([
      ShadenDB.Products.getAll(),
      ShadenDB.Categories.getAll(),
    ]);
    AdminState.categories = cats;

    const active   = products.filter(p => p.status === 'active');
    const featured = products.filter(p => p.badge === 'featured').length;

    // Stats
    $('#stats-grid').innerHTML = `
      <div class="stat-card">
        <div class="stat-card-icon gold"><i class="fa-solid fa-box"></i></div>
        <div class="stat-card-info"><div class="stat-card-num">${active.length}</div><div class="stat-card-label">Productos activos</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon brown"><i class="fa-solid fa-tag"></i></div>
        <div class="stat-card-info"><div class="stat-card-num">${cats.length}</div><div class="stat-card-label">CategorÃ­as</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon blush"><i class="fa-solid fa-eye-slash"></i></div>
        <div class="stat-card-info"><div class="stat-card-num">${products.length - active.length}</div><div class="stat-card-label">Productos ocultos</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon green"><i class="fa-solid fa-certificate"></i></div>
        <div class="stat-card-info"><div class="stat-card-num">${featured}</div><div class="stat-card-label">Destacados</div></div>
      </div>`;

    // Ãšltimos 5 productos
    const recent = [...products].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    $('#recent-products-list').innerHTML = recent.length
      ? recent.map(p => {
          const cat = cats.find(c => c.id === p.category);
          return `
            <div class="recent-product-row">
              <div class="rpr-img">${p.image ? `<img src="${p.image}" alt="${p.name}" loading="lazy"/>` : `<i class="${cat?.icon||'fa-solid fa-box'}"></i>`}</div>
              <div class="rpr-info"><div class="rpr-name">${p.name}</div><div class="rpr-cat">${cat?.name||'â€”'}</div></div>
              <div class="rpr-price">${p.price ? formatPrice(p.price) : 'â€”'}</div>
            </div>`;
        }).join('')
      : '<p style="color:var(--text-muted);font-size:.85rem;padding:12px 0">Sin productos aÃºn.</p>';

    // Resumen por categorÃ­a
    $('#cat-summary-list').innerHTML = cats.map(cat => {
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PRODUCTS VIEW
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const ProductsView = (() => {

  let filterCat   = 'all';
  let searchQuery = '';

  async function render() {
    await populateCatFilter();
    await renderTable();
    initTableListeners();
  }

  async function populateCatFilter() {
    const cats = AdminState.categories;
    const sel  = $('#admin-filter-cat');
    sel.innerHTML = `<option value="all">Todas las categorÃ­as</option>` +
      cats.map(c => `<option value="${c.id}"${filterCat===c.id?' selected':''}>${c.name}</option>`).join('');
  }

  async function renderTable() {
    const tbody   = $('#products-tbody');
    const countEl = $('#table-count');
    const cats    = AdminState.categories;

    // Skeleton
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="font-size:1.4rem;"></i></td></tr>`;

    let list = await ShadenDB.Products.getAll();
    if (filterCat !== 'all') list = list.filter(p => p.category === filterCat);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.description||'').toLowerCase().includes(q));
    }

    countEl.textContent = `${list.length} producto${list.length!==1?'s':''}`;

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);"><i class="fa-solid fa-box-open" style="font-size:2rem;margin-bottom:10px;display:block;"></i>Sin resultados</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(p => {
      const cat = cats.find(c => c.id === p.category);
      return `
        <tr data-id="${p.id}">
          <td>
            <div class="td-product">
              <div class="td-thumb">${p.image?`<img src="${p.image}" alt="${p.name}" loading="lazy"/>` : `<i class="${cat?.icon||'fa-solid fa-box'}"></i>`}</div>
              <div><div class="td-name">${p.name}</div>${getBadgeHTML(p.badge)}</div>
            </div>
          </td>
          <td><span class="td-cat-badge">${cat?.name||'â€”'}</span></td>
          <td class="td-price">${p.price?formatPrice(p.price):'â€”'}</td>
          <td><span class="status-pill ${p.status}">${p.status==='active'?'Activo':'Oculto'}</span></td>
          <td>
            <div class="td-actions">
              <button class="action-btn edit"   data-id="${p.id}" title="Editar"   aria-label="Editar ${p.name}"><i class="fa-solid fa-pen"></i></button>
              <button class="action-btn delete" data-id="${p.id}" title="Eliminar" aria-label="Eliminar ${p.name}"><i class="fa-solid fa-trash"></i></button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  function initTableListeners() {
    const searchInput = $('#admin-search');
    searchInput.value = searchQuery;
    searchInput.oninput = debounce(async e => { searchQuery = e.target.value.trim(); await renderTable(); }, 300);

    $('#admin-filter-cat').onchange = async e => { filterCat = e.target.value; await renderTable(); };

    $('#products-tbody').onclick = e => {
      const editBtn   = e.target.closest('.action-btn.edit');
      const deleteBtn = e.target.closest('.action-btn.delete');
      if (editBtn)   openProductForm(editBtn.dataset.id);
      if (deleteBtn) confirmDeleteProduct(deleteBtn.dataset.id);
    };
  }

  /* â”€â”€ Form â”€â”€ */
  function initForm() {
    $('#add-product-btn').addEventListener('click', () => openProductForm(null));
    $('#pf-modal-close').addEventListener('click', closeProductForm);
    $('#pf-cancel').addEventListener('click', closeProductForm);
    $('#product-form-modal').addEventListener('click', e => { if (e.target===e.currentTarget) closeProductForm(); });

    $('#pf-image').addEventListener('input', debounce(e => {
      const url  = e.target.value.trim();
      const wrap = $('#img-preview-wrap');
      const img  = $('#img-preview');
      if (url) { img.src = url; img.onload = () => wrap.classList.add('show'); img.onerror = () => wrap.classList.remove('show'); }
      else      { wrap.classList.remove('show'); }
    }, 500));

    $('#product-form').addEventListener('submit', async e => { e.preventDefault(); await saveProduct(); });
  }

  async function openProductForm(productId) {
    const titleEl = $('#pf-modal-title');
    $('#product-form').reset();
    $('#img-preview-wrap').classList.remove('show');
    populateCategorySelect();

    if (productId) {
      const p = await ShadenDB.Products.getById(productId);
      if (!p) return;
      titleEl.textContent     = 'Editar producto';
      $('#pf-id').value       = p.id;
      $('#pf-name').value     = p.name;
      $('#pf-category').value = p.category;
      $('#pf-price').value    = p.price || '';
      $('#pf-desc').value     = p.description || '';
      $('#pf-image').value    = p.image || '';
      $('#pf-badge').value    = p.badge || '';
      $('#pf-status').value   = p.status || 'active';
      if (p.image) { const wrap=$('#img-preview-wrap'); const img=$('#img-preview'); img.src=p.image; img.onload=()=>wrap.classList.add('show'); }
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
    const cats = AdminState.categories;
    sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  async function saveProduct() {
    const id   = $('#pf-id').value;
    const name = $('#pf-name').value.trim();
    const cat  = $('#pf-category').value;

    if (!name) { showToast('El nombre es obligatorio.', 'error'); return; }
    if (!cat)  { showToast('Selecciona una categorÃ­a.', 'error'); return; }

    const btn = $('#pf-submit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardandoâ€¦';

    try {
      const data = {
        name,
        category:    cat,
        price:       parseFloat($('#pf-price').value) || null,
        description: $('#pf-desc').value.trim(),
        image:       $('#pf-image').value.trim(),
        badge:       $('#pf-badge').value,
        status:      $('#pf-status').value,
      };

      if (id) { await ShadenDB.Products.update(id, data); showToast(`"${name}" actualizado. âœ“`, 'success'); }
      else    { await ShadenDB.Products.add(data);        showToast(`"${name}" agregado. âœ“`, 'success'); }

      closeProductForm();
      await renderTable();
      await DashboardView.render();
    } catch (err) {
      showToast('Error al guardar: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar';
    }
  }

  function confirmDeleteProduct(productId) {
    ShadenDB.Products.getById(productId).then(p => {
      if (!p) return;
      ConfirmModal.show(
        `Â¿Eliminar "<strong>${p.name}</strong>"? Esta acciÃ³n no se puede deshacer.`,
        async () => {
          try {
            await ShadenDB.Products.delete(productId);
            showToast(`"${p.name}" eliminado.`);
            await renderTable();
            await DashboardView.render();
          } catch (err) {
            showToast('Error al eliminar: ' + err.message, 'error');
          }
        }
      );
    });
  }

  return { render, initForm };
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CATEGORIES VIEW
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const CategoriesView = (() => {

  async function render() {
    const grid  = $('#cat-admin-grid');
    const [cats, products] = await Promise.all([
      ShadenDB.Categories.getAll(),
      ShadenDB.Products.getAll(),
    ]);
    AdminState.categories = cats;

    grid.innerHTML = cats.map(cat => {
      const count = products.filter(p => p.category === cat.id).length;
      return `
        <div class="cat-admin-card" data-id="${cat.id}">
          <div class="cat-admin-icon"><i class="${cat.icon}"></i></div>
          <div class="cat-admin-name">${cat.name}</div>
          <div class="cat-admin-count">${count} producto${count!==1?'s':''}</div>
          <div class="cat-admin-actions">
            <button class="action-btn edit"   data-id="${cat.id}" aria-label="Editar ${cat.name}"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn delete" data-id="${cat.id}" aria-label="Eliminar ${cat.name}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.action-btn.edit').forEach(btn   => { btn.onclick = () => openCatForm(btn.dataset.id); });
    grid.querySelectorAll('.action-btn.delete').forEach(btn => { btn.onclick = () => confirmDeleteCat(btn.dataset.id); });
  }

  function initForm() {
    $('#add-cat-btn').addEventListener('click', () => openCatForm(null));
    $('#cf-modal-close').addEventListener('click', closeCatForm);
    $('#cf-cancel').addEventListener('click', closeCatForm);
    $('#cat-form-modal').addEventListener('click', e => { if (e.target===e.currentTarget) closeCatForm(); });
    $('#cat-form').addEventListener('submit', async e => { e.preventDefault(); await saveCat(); });
  }

  async function openCatForm(catId) {
    const titleEl = $('#cf-modal-title');
    $('#cat-form').reset();

    if (catId) {
      const cat = await ShadenDB.Categories.getById(catId);
      if (!cat) return;
      titleEl.textContent  = 'Editar categorÃ­a';
      $('#cf-id').value    = cat.id;
      $('#cf-name').value  = cat.name;
      $('#cf-icon').value  = cat.icon;
    } else {
      titleEl.textContent = 'Nueva categorÃ­a';
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

  async function saveCat() {
    const id   = $('#cf-id').value;
    const name = $('#cf-name').value.trim();
    const icon = $('#cf-icon').value.trim() || 'fa-solid fa-tag';

    if (!name) { showToast('El nombre es obligatorio.', 'error'); return; }

    try {
      if (id) { await ShadenDB.Categories.update(id, { name, icon }); showToast(`"${name}" actualizada. âœ“`, 'success'); }
      else    { await ShadenDB.Categories.add({ name, icon });         showToast(`"${name}" creada. âœ“`, 'success'); }
      closeCatForm();
      await render();
      await DashboardView.render();
    } catch (err) {
      showToast('Error al guardar: ' + err.message, 'error');
    }
  }

  function confirmDeleteCat(catId) {
    ShadenDB.Categories.getById(catId).then(async cat => {
      if (!cat) return;
      const prods = (await ShadenDB.Products.getAll()).filter(p => p.category === catId);
      const msg   = prods.length
        ? `Â¿Eliminar "<strong>${cat.name}</strong>"? Tiene ${prods.length} producto(s) asociados.`
        : `Â¿Eliminar "<strong>${cat.name}</strong>"? Esta acciÃ³n no se puede deshacer.`;

      ConfirmModal.show(msg, async () => {
        try {
          await ShadenDB.Categories.delete(catId);
          showToast(`"${cat.name}" eliminada.`);
          await render();
          await DashboardView.render();
        } catch (err) {
          showToast('Error al eliminar: ' + err.message, 'error');
        }
      });
    });
  }

  return { render, initForm };
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SETTINGS VIEW
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const SettingsView = (() => {

  async function render() {
    const s = await ShadenDB.Settings.get();
    AdminState.settings = s;
    $('#s-storename').value = s.storeName || '';
    $('#s-tagline').value   = s.tagline   || '';
    $('#s-phone').value     = s.phone     || '';
    $('#s-address').value   = s.address   || '';
    $('#s-instagram').value = s.instagram || '';
    $('#s-discount').value  = s.discount  || 10;
    $('#s-about').value     = s.about     || '';
  }

  function init() {
    $('#settings-form').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.submitter;
      btn.disabled = true;
      try {
        await ShadenDB.Settings.save({
          storeName: $('#s-storename').value.trim(),
          tagline:   $('#s-tagline').value.trim(),
          phone:     $('#s-phone').value.trim(),
          address:   $('#s-address').value.trim(),
          instagram: $('#s-instagram').value.trim(),
          discount:  parseInt($('#s-discount').value) || 0,
          about:     $('#s-about').value.trim(),
        });
        showToast('Ajustes guardados. âœ“', 'success');
      } catch (err) {
        showToast('Error al guardar: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    $('#pass-form').addEventListener('submit', e => {
      e.preventDefault();
      const current = $('#s-pass-current').value;
      const newPass = $('#s-pass-new').value;
      if (current !== ShadenDB.Auth.get().password) { showToast('ContraseÃ±a actual incorrecta.', 'error'); return; }
      if (newPass.length < 6) { showToast('La contraseÃ±a debe tener al menos 6 caracteres.', 'error'); return; }
      ShadenDB.Auth.changePassword(newPass);
      $('#pass-form').reset();
      showToast('ContraseÃ±a cambiada. âœ“', 'success');
    });
  }

  return { render, init };
})();

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CONFIRM MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const ConfirmModal = (() => {
  let _cb = null;

  function init() {
    $('#confirm-close').addEventListener('click', close);
    $('#confirm-cancel').addEventListener('click', close);
    $('#confirm-modal').addEventListener('click', e => { if (e.target===e.currentTarget) close(); });
    $('#confirm-ok').addEventListener('click', () => { if (_cb) _cb(); close(); });
    document.addEventListener('keydown', e => { if (e.key==='Escape' && $('#confirm-modal').classList.contains('active')) close(); });
  }

  function show(message, callback) {
    $('#confirm-msg').innerHTML = message;
    _cb = callback;
    $('#confirm-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#confirm-ok').focus(), 150);
  }

  function close() {
    $('#confirm-modal').classList.remove('active');
    document.body.style.overflow = '';
    _cb = null;
  }

  return { init, show };
})();

/* â”€â”€ Init â”€â”€ */
/* -- Init -- */
document.addEventListener('DOMContentLoaded', async () => {
  const loginScreen = document.getElementById('login-screen');
  const adminPanel  = document.getElementById('admin-panel');

  if (ShadenDB.Auth.isLoggedIn()) {
    loginScreen.style.display = 'none';
    adminPanel.style.display  = 'flex';
    await AdminPanel.init();
  } else {
    loginScreen.style.display = '';
    adminPanel.style.display  = 'none';
    AuthUI.init();
  }
});