/* =============================================
   SHADEN POS — App principal
   ============================================= */

/* ─────────────────────────────────────────────
   ESTADO GLOBAL
───────────────────────────────────────────── */
const State = {
  cart:        [],
  customer:    null,   // { id, name, phone, customer_type, discount_pct, wholesale_level }
  products:    [],
  categories:  [],
  stock:       {},
  register:    null,
  globalDisc:  0,
  taxPct:      0,
  saleNote:    '',
};

/* ─────────────────────────────────────────────
   INIT
───────────────────────────────────────────── */
async function initApp() {
  // Clock
  startClock(document.getElementById('header-clock'));
  // Nav
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });
  // Carga inicial en paralelo
  try {
    const [prods, cats, stockData] = await Promise.all([
      ShadenDB.Products.getActive(),
      ShadenDB.Categories.getAll(),
      PosDB.Stock.getAll(),
    ]);
    State.products   = prods;
    State.categories = cats;
    State.stock      = {};
    stockData.forEach(s => { State.stock[s.product_id] = s.qty; });
    // Cargar configuración del sistema
    const cfg = await PosDB.PosSettings.get();
    window._posSettings = cfg;
    State.taxPct = cfg.tax_pct || 0;
    // Badge inicial de apartados
    _refreshLayawayBadge();
    // Verificar caja abierta
    State.register = await PosDB.CashRegister.getOpen();
    updateRegisterStatus();
    // Iniciar escáner de barras
    BarcodeScanner.init();

    // Realtime: sincronizar stock entre sesiones del POS
    db.channel('stock-pos')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stock' }, payload => {
        const row = payload.new;
        if (row?.product_id) {
          State.stock[row.product_id] = row.qty;
          const posPage = document.getElementById('page-pos');
          if (posPage?.classList.contains('active')) {
            const card = document.querySelector(`.pos-product-card[data-id="${row.product_id}"]`);
            if (card) {
              card.querySelector('.ppc-stock').innerHTML =
                row.qty === 0
                  ? `<span style="color:var(--red);font-size:.7rem">Sin stock</span>`
                  : `Stock: ${row.qty}`;
              card.classList.toggle('no-stock', row.qty === 0);
            }
          }
        }
      })
      .subscribe();

  } catch(e) {
    console.error('initApp error:', e);
    Toast.error('Error conectando con la base de datos');
  }
  // Render inicial
  navigate('dashboard');
}

/* ─────────────────────────────────────────────
   NAVEGACIÓN
───────────────────────────────────────────── */
function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === `page-${page}`));
  const titles = {
    dashboard:        'Dashboard',
    pos:              'Punto de Venta',
    sales:            'Ventas',
    inventory:        'Inventario',
    productos:        'Productos',
    customers:        'Clientes',
    wholesale:        'Mayoristas',
    reports:          'Reportes',
    cashier:          'Caja',
    config:           'Configuración',
    layaways:         'Apartados',
    'registro-rapido':'Modo Registro Rápido',
  };
  document.getElementById('page-title').textContent = titles[page] || page;
  const loaders = {
    dashboard:        renderDashboard,
    pos:              () => { BarcodeScanner.setMode('pos'); renderPOS(); },
    sales:            renderSales,
    inventory:        () => { BarcodeScanner.setMode('stock', handleInventoryScan); renderInventory(); bindInventoryScannerInput(); },
    productos:        () => { BarcodeScanner.setMode('productos', handleProductoScan); renderProductos(); },
    customers:        renderCustomers,
    wholesale:        renderWholesale,
    reports:          renderReports,
    cashier:          renderCashier,
    config:           renderConfig,
    layaways:         renderLayaways,
    'registro-rapido': initRegistroRapido,
  };
  if (loaders[page]) loaders[page]();
}

/* ─────────────────────────────────────────────
   REGISTER STATUS
───────────────────────────────────────────── */
function updateRegisterStatus() {
  const el = document.getElementById('register-status');
  if (!el) return;
  if (State.register) {
    el.innerHTML = `<span class="chip chip-green"><i class="fa-solid fa-lock-open"></i> Caja abierta</span>`;
  } else {
    el.innerHTML = `<span class="chip chip-red"><i class="fa-solid fa-lock"></i> Caja cerrada</span>`;
  }
}

/* ═══════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════ */
async function renderDashboard() {
  const el = document.getElementById('page-dashboard');
  el.querySelector('.dash-loading')?.remove();

  // Fetch datos
  const today = await PosDB.Sales.getToday();
  const completed = today.filter(s => s.status === 'completed');
  const totalToday = completed.reduce((a, b) => a + b.total, 0);
  const itemsToday = completed.reduce((a, b) => a + (b.sale_items?.length || 0), 0);
  const avgTicket  = completed.length ? totalToday / completed.length : 0;

  // Mes actual
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const salesMonth = await PosDB.Sales.getByRange(startMonth.toISOString(), new Date().toISOString());
  const totalMonth = salesMonth.filter(s => s.status === 'completed').reduce((a, b) => a + b.total, 0);

  // Alertas stock — usar umbral de configuración
  const alertThreshold = window._posSettings?.low_stock_alert ?? 5;
  const stockLow = Object.entries(State.stock).filter(([, qty]) => qty <= alertThreshold);

  document.getElementById('dash-total-today').textContent  = fmt(totalToday);
  document.getElementById('dash-sales-today').textContent  = completed.length;
  document.getElementById('dash-avg-ticket').textContent   = fmt(avgTicket);
  document.getElementById('dash-total-month').textContent  = fmt(totalMonth);
  document.getElementById('dash-items-today').textContent  = itemsToday + ' productos';
  document.getElementById('dash-stock-alerts').textContent = stockLow.length;
  // Badge en sidebar si hay alertas
  const navInv = document.querySelector('.nav-item[data-page="inventory"] .badge');
  if (navInv) { navInv.textContent = stockLow.length; navInv.style.display = stockLow.length ? '' : 'none'; }

  // Gráfica 7 días
  const report = await PosDB.Reports.summaryByDay(7);
  renderDashChart(report);

  // Últimas ventas
  renderRecentSales(today.slice(0, 8));

  // Alertas stock
  renderStockAlerts(stockLow);
}

function renderDashChart(data) {
  const ctx = document.getElementById('chart-sales')?.getContext('2d');
  if (!ctx) return;
  if (window._dashChart) window._dashChart.destroy();
  window._dashChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => {
        const [, m, day] = d.date.split('-');
        return `${day}/${m}`;
      }),
      datasets: [{
        label: 'Ventas',
        data: data.map(d => d.total),
        backgroundColor: 'rgba(181,134,74,.18)',
        borderColor: '#b5864a',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.raw) }, backgroundColor: '#fff', titleColor: '#3d2b1f', bodyColor: '#6b5040', borderColor: 'rgba(92,61,46,.12)', borderWidth: 1 } },
      scales: {
        x: { ticks: { color: '#a08070' }, grid: { color: 'rgba(92,61,46,.05)' } },
        y: { ticks: { color: '#a08070', callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(92,61,46,.06)' } },
      },
    },
  });
}

function renderRecentSales(sales) {
  const el = document.getElementById('recent-sales-list');
  if (!el) return;
  if (!sales.length) { el.innerHTML = '<p class="empty-msg">Sin ventas hoy</p>'; return; }
  el.innerHTML = sales.map(s => `
    <tr>
      <td><span class="text-gold fw-bold">${invoiceNum(s.invoice_num)}</span></td>
      <td>${s.customer_name || 'General'}</td>
      <td>${fmtDateTime(s.created_at)}</td>
      <td class="fw-bold text-gold">${fmt(s.total)}</td>
      <td>${statusChip(s.status)}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="printInvoice('${s.id}')"><i class="fa-solid fa-print"></i></button>
      </td>
    </tr>`).join('');
}

function renderStockAlerts(low) {
  const el = document.getElementById('stock-alerts-list');
  if (!el) return;
  if (!low.length) { el.innerHTML = '<p class="empty-msg text-green" style="padding:16px"><i class="fa-solid fa-circle-check"></i> Stock en orden</p>'; return; }
  el.innerHTML = low.map(([id, qty]) => {
    const prod = State.products.find(p => p.id === id);
    return `<div class="alert-item ${qty === 0 ? '' : 'warn'}">
      <i class="fa-solid ${qty === 0 ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i>
      <div>
        <div style="font-weight:600;font-size:.85rem">${prod?.name || id}</div>
        <div style="font-size:.75rem;color:var(--text3)">Stock: ${qty} unidades</div>
      </div>
    </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════
   POS
═══════════════════════════════════════════════ */
function renderPOS() {
  renderPOSProducts();
  renderCart();
  bindPOSSearch();
  renderPOSCategoryFilters();
}

let posFilter = 'all';

function renderPOSCategoryFilters() {
  const el = document.getElementById('pos-cat-filters');
  if (!el || el.dataset.init) return;
  el.dataset.init = '1';
  const chips = [{ id: 'all', name: 'Todos' }, ...State.categories];
  el.innerHTML = chips.map(c => `
    <button class="pos-filter-chip ${c.id === 'all' ? 'active' : ''}" data-cat="${c.id}">${c.name}</button>
  `).join('');
  el.addEventListener('click', e => {
    const btn = e.target.closest('.pos-filter-chip');
    if (!btn) return;
    el.querySelectorAll('.pos-filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    posFilter = btn.dataset.cat;
    renderPOSProducts();
  });
}

function renderPOSProducts(query = '') {
  const el = document.getElementById('pos-products-grid');
  if (!el) return;
  let prods = State.products;
  if (posFilter !== 'all') prods = prods.filter(p => p.category === posFilter);
  if (query) {
    const q = query.toLowerCase();
    prods = prods.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }
  if (!prods.length) { el.innerHTML = '<p class="empty-msg" style="grid-column:1/-1">Sin productos</p>'; return; }
  el.innerHTML = prods.map(p => {
    const qty = State.stock[p.id] ?? 0;
    return `
    <div class="pos-product-card ${qty === 0 ? 'no-stock' : ''}" data-id="${p.id}" title="${p.name}">
      ${productImg(p.image, p.name)}
      <div class="ppc-name">${p.name}</div>
      <div class="ppc-price">${p.price ? fmt(p.price) : '<span style="color:var(--text3);font-size:.78rem">Sin precio</span>'}</div>
      <div class="ppc-stock">${qty === 0 ? '<span style="color:var(--red);font-size:.7rem">Sin stock</span>' : `Stock: ${qty}`}</div>
      <div class="ppc-add-btn"><i class="fa-solid fa-plus"></i></div>
    </div>`;
  }).join('');
  el.querySelectorAll('.pos-product-card:not(.no-stock)').forEach(card => {
    card.addEventListener('click', () => addToCart(card.dataset.id));
  });
}

function bindPOSSearch() {
  const inp = document.getElementById('pos-search');
  if (!inp || inp.dataset.init) return;
  inp.dataset.init = '1';
  inp.addEventListener('input', debounce(() => renderPOSProducts(inp.value)));
}

/* ── CART ── */
function addToCart(productId) {
  const prod = State.products.find(p => p.id === productId);
  if (!prod) return;
  const maxQty = State.stock[productId] ?? 999;
  const existing = State.cart.find(i => i.product_id === productId);
  if (existing) {
    if (existing.quantity >= maxQty) { Toast.info(`Stock máximo: ${maxQty}`); return; }
    existing.quantity++;
  } else {
    State.cart.push({
      product_id:   productId,
      product_name: prod.name,
      category:     prod.category || '',
      unit_price:   prod.price || 0,
      quantity:     1,
      discount_pct: 0,
    });
  }
  renderCart();
  Toast.success(`${prod.name} agregado`);
}

function removeFromCart(idx) {
  State.cart.splice(idx, 1);
  renderCart();
}

function updateQty(idx, delta) {
  const item = State.cart[idx];
  if (!item) return;
  const newQty = item.quantity + delta;
  if (newQty <= 0) { removeFromCart(idx); return; }
  const maxQty = State.stock[item.product_id] ?? 999;
  if (newQty > maxQty) { Toast.info(`Stock máximo: ${maxQty}`); return; }
  item.quantity = newQty;
  renderCart();
}

function cartTotals() {
  const subtotal = State.cart.reduce((acc, i) => {
    const linePre = i.unit_price * i.quantity;
    const lineFinal = linePre * (1 - (i.discount_pct || 0) / 100);
    return acc + lineFinal;
  }, 0);
  const discAmt = subtotal * (State.globalDisc / 100);
  const afterDisc = subtotal - discAmt;
  const taxAmt  = afterDisc * (State.taxPct / 100);
  const total   = afterDisc + taxAmt;
  return { subtotal, discAmt, taxAmt, total };
}

function renderCart() {
  const el = document.getElementById('cart-items');
  const count = document.getElementById('cart-count');
  if (!el) return;
  const totalItems = State.cart.reduce((a, i) => a + i.quantity, 0);
  if (count) count.textContent = totalItems;

  if (!State.cart.length) {
    el.innerHTML = `<div class="cart-empty"><i class="fa-solid fa-cart-shopping"></i><span>Carrito vacío</span><span style="font-size:.78rem;color:var(--text3)">Haz clic en un producto para agregar</span></div>`;
  } else {
    el.innerHTML = State.cart.map((item, idx) => `
      <div class="cart-item">
        <span class="ci-name">${item.product_name}</span>
        <span class="ci-price">${fmt(item.unit_price * item.quantity * (1 - (item.discount_pct||0)/100))}</span>
        <div class="ci-controls">
          <button class="ci-qty-btn" onclick="updateQty(${idx}, -1)"><i class="fa-solid fa-minus"></i></button>
          <span class="ci-qty">${item.quantity}</span>
          <button class="ci-qty-btn" onclick="updateQty(${idx}, 1)"><i class="fa-solid fa-plus"></i></button>
          <span style="font-size:.75rem;color:var(--text3)">${fmt(item.unit_price)} c/u</span>
          <button class="ci-remove" onclick="removeFromCart(${idx})"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div class="ci-line-disc">
          <span>Desc. línea:</span>
          <input type="number" min="0" max="100" value="${item.discount_pct||0}" 
            onchange="State.cart[${idx}].discount_pct=+this.value; renderCart()"
            style="width:52px">%
        </div>
      </div>`).join('');
  }

  // Summary
  const { subtotal, discAmt, taxAmt, total } = cartTotals();
  document.getElementById('cart-subtotal').textContent  = fmt(subtotal);
  document.getElementById('cart-disc-row').style.display = State.globalDisc ? 'flex' : 'none';
  document.getElementById('cart-disc-amt').textContent  = '-' + fmt(discAmt);
  document.getElementById('cart-disc-pct').textContent  = State.globalDisc + '%';
  document.getElementById('cart-tax-row').style.display = State.taxPct ? 'flex' : 'none';
  document.getElementById('cart-tax-amt').textContent   = fmt(taxAmt);
  document.getElementById('cart-tax-pct').textContent   = State.taxPct + '%';
  document.getElementById('cart-total').textContent     = fmt(total);

  // Customer
  const custEl = document.getElementById('cart-customer-name');
  if (custEl) custEl.textContent = State.customer ? State.customer.name : 'Cliente general';

  // Badge + fila descuento mayorista
  const wsBadge   = document.getElementById('cart-wholesale-badge');
  const wsDiscRow = document.getElementById('cart-wholesale-disc-row');
  const wsDiscPct = document.getElementById('cart-ws-disc-pct');
  const isWholesale = State.customer?.customer_type === 'wholesale';
  if (wsBadge)   {
    wsBadge.style.display = isWholesale ? 'inline-flex' : 'none';
    if (isWholesale) wsBadge.innerHTML = wholesaleLevelChip(State.customer.wholesale_level);
  }
  if (wsDiscRow) wsDiscRow.style.display = (isWholesale && State.globalDisc > 0) ? 'flex' : 'none';
  if (wsDiscPct) wsDiscPct.textContent   = State.globalDisc;

  // Global discount input
  const gd = document.getElementById('global-disc-input');
  if (gd && !gd.dataset.init) {
    gd.dataset.init = '1';
    gd.addEventListener('change', () => { State.globalDisc = +gd.value || 0; renderCart(); });
  }
}

/* ── PAGO ── */
function openPaymentModal() {
  if (!State.cart.length) { Toast.error('El carrito está vacío'); return; }
  const { total } = cartTotals();
  document.getElementById('pay-total-display').textContent = fmt(total);
  document.getElementById('pay-amount-input').value = '';
  document.getElementById('pay-change').textContent = fmt(0);
  // Nota de venta
  const noteEl = document.getElementById('pay-sale-note');
  if (noteEl) noteEl.value = State.saleNote || '';
  // Pago mixto
  const mixCash = document.getElementById('pay-mix-cash');
  const mixCard = document.getElementById('pay-mix-card');
  const mixXfer = document.getElementById('pay-mix-xfer');
  if (mixCash) { mixCash.value = ''; mixCard.value = ''; mixXfer.value = ''; }
  selectPayMethod('cash');
  openModal('payment-modal');
}

function selectPayMethod(method) {
  document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.toggle('active', b.dataset.method === method));
  window._payMethod = method;
  // Mostrar/ocultar sección pago mixto
  const mixSection = document.getElementById('pay-mixed-section');
  if (mixSection) mixSection.style.display = method === 'mixed' ? 'block' : 'none';
  updateChange();
}

function updateChange() {
  const { total } = cartTotals();
  const method = window._payMethod || 'cash';
  let paid = 0;
  if (method === 'mixed') {
    paid = (+document.getElementById('pay-mix-cash')?.value || 0)
         + (+document.getElementById('pay-mix-card')?.value || 0)
         + (+document.getElementById('pay-mix-xfer')?.value || 0);
  } else {
    paid = +document.getElementById('pay-amount-input')?.value || 0;
  }
  const change = paid - total;
  const el = document.getElementById('pay-change');
  if (el) el.textContent = change >= 0 ? fmt(change) : '—';
  const el2 = document.getElementById('pay-change-row');
  if (el2) el2.style.display = change > 0 ? 'flex' : 'none';
}

async function completeSale() {
  if (!State.cart.length) return;
  const { subtotal, discAmt, taxAmt, total } = cartTotals();
  const method = window._payMethod || 'cash';
  const noteEl = document.getElementById('pay-sale-note');
  const saleNote = noteEl?.value?.trim() || '';

  let paid = 0, cashAmt = 0, cardAmt = 0, xferAmt = 0, change = 0;

  if (method === 'mixed') {
    cashAmt = +document.getElementById('pay-mix-cash')?.value || 0;
    cardAmt = +document.getElementById('pay-mix-card')?.value || 0;
    xferAmt = +document.getElementById('pay-mix-xfer')?.value || 0;
    paid = cashAmt + cardAmt + xferAmt;
    if (paid < total) { Toast.error('El total de los métodos no cubre el valor'); return; }
    change = Math.max(0, cashAmt - (total - cardAmt - xferAmt));
  } else {
    paid = +document.getElementById('pay-amount-input')?.value || total;
    change = Math.max(0, paid - total);
    if (method === 'cash' && paid < total) { Toast.error('Monto insuficiente'); return; }
    cashAmt = method === 'cash' ? paid : 0;
    cardAmt = method === 'card' ? total : 0;
    xferAmt = method === 'transfer' ? total : 0;
  }

  const salePayload = {
    customer_id:    State.customer?.id || null,
    customer_name:  State.customer?.name || 'Cliente general',
    subtotal, discount_pct: State.globalDisc, discount_amt: discAmt,
    tax_pct: State.taxPct, tax_amt: taxAmt, total,
    payment_method: method,
    amount_paid: paid, change_given: change,
    cash_amount: cashAmt, card_amount: cardAmt, xfer_amount: xferAmt,
    sale_notes: saleNote,
    status: 'completed',
    cashier: 'Admin',
  };
  const itemsPayload = State.cart.map(i => ({
    product_id: i.product_id, product_name: i.product_name, category: i.category,
    unit_price: i.unit_price, quantity: i.quantity, discount_pct: i.discount_pct || 0,
    line_total: i.unit_price * i.quantity * (1 - (i.discount_pct||0)/100),
  }));

  try {
    const sale = await PosDB.Sales.create(salePayload, itemsPayload);
    for (const item of State.cart) {
      await PosDB.Stock.adjust(item.product_id, -item.quantity, 'out', 'Venta', sale.id);
      if (State.stock[item.product_id] !== undefined)
        State.stock[item.product_id] = Math.max(0, (State.stock[item.product_id]||0) - item.quantity);
    }
    // Actualizar estadísticas del cliente si está registrado
    if (State.customer?.id) {
      PosDB.Customers.updateStats(State.customer.id, total).catch(() => {});
    }
    closeModal('payment-modal');
    Toast.success(`Venta completada — ${fmt(total)}`);
    State.cart = []; State.customer = null; State.saleNote = '';
    // Limpiar descuento mayorista
    State.globalDisc = 0;
    const gdEl = document.getElementById('global-disc-input');
    if (gdEl) gdEl.value = 0;
    renderCart();
    renderPOSProducts();
    // Alerta de stock bajo post-venta
    _checkStockAlertAfterSale(itemsPayload);
    setTimeout(() => printInvoice(sale.id, false), 500);
  } catch(e) { Toast.error('Error al guardar la venta: ' + e.message); }
}

function _checkStockAlertAfterSale(items) {
  const threshold = window._posSettings?.low_stock_alert ?? 5;
  items.forEach(item => {
    const remaining = State.stock[item.product_id] ?? 0;
    if (remaining <= threshold && remaining >= 0) {
      const prod = State.products.find(p => p.id === item.product_id);
      const name = prod?.name || item.product_name;
      if (remaining === 0) Toast.error(`⚠️ Sin stock: ${name}`);
      else Toast.info(`⚠️ Stock bajo (${remaining}): ${name}`);
    }
  });
}

/* ═══════════════════════════════════════════════
   PESTAÑAS INTERNAS (helper)
═══════════════════════════════════════════════ */
/**
 * Inicializa las pestañas internas de una sección.
 * @param {string} tabsContainerId - id del contenedor .inner-tabs
 * @param {Object} loaders - { tabId: callbackFn }
 */
function _initInnerTabs(tabsContainerId, loaders) {
  const container = document.getElementById(tabsContainerId);
  if (!container || container.dataset.init) return;
  container.dataset.init = '1';

  container.addEventListener('click', e => {
    const btn = e.target.closest('.inner-tab');
    if (!btn) return;
    const tabId = btn.dataset.tab;

    // Activar botón
    container.querySelectorAll('.inner-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Mostrar contenido
    document.querySelectorAll('.inner-tab-content').forEach(c => {
      c.classList.toggle('active', c.id === `tab-${tabId}`);
    });

    // Ejecutar loader si existe
    if (loaders[tabId]) loaders[tabId]();
  });
}

/* ═══════════════════════════════════════════════
   VENTAS / HISTORIAL
═══════════════════════════════════════════════ */
async function renderSales(filter = 'today') {
  _initInnerTabs('sales-inner-tabs', {
    'sales-history': () => {},
    'sales-refunds': renderRefunds,
  });
  const el = document.getElementById('sales-tbody');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="7" class="empty-msg">Cargando…</td></tr>';

  let sales = [];
  if (filter === 'today') {
    sales = await PosDB.Sales.getToday();
  } else if (filter === 'week') {
    const from = new Date(); from.setDate(from.getDate() - 7);
    sales = await PosDB.Sales.getByRange(from.toISOString(), new Date().toISOString());
  } else if (filter === 'month') {
    const from = new Date(); from.setDate(from.getDate() - 30);
    sales = await PosDB.Sales.getByRange(from.toISOString(), new Date().toISOString());
  } else {
    sales = await PosDB.Sales.getAll();
  }

  // Filter search
  const q = document.getElementById('sales-search')?.value?.toLowerCase() || '';
  if (q) sales = sales.filter(s => s.customer_name.toLowerCase().includes(q) || invoiceNum(s.invoice_num).includes(q));

  const total = sales.filter(s => s.status === 'completed').reduce((a, b) => a + b.total, 0);
  document.getElementById('sales-total-display').textContent = fmt(total);
  document.getElementById('sales-count-display').textContent = sales.filter(s => s.status === 'completed').length;

  if (!sales.length) { el.innerHTML = '<tr><td colspan="7" class="empty-msg">Sin ventas en este período</td></tr>'; return; }

  el.innerHTML = sales.map(s => `
    <tr>
      <td><span class="text-gold fw-bold">${invoiceNum(s.invoice_num)}</span></td>
      <td>${fmtDateTime(s.created_at)}</td>
      <td>${s.customer_name || 'General'}</td>
      <td>${payMethodLabel(s.payment_method)}</td>
      <td class="fw-bold text-gold">${fmt(s.total)}</td>
      <td>${statusChip(s.status)}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-outline" onclick="printInvoice('${s.id}', false)" title="Imprimir factura"><i class="fa-solid fa-print"></i></button>
          <button class="btn btn-sm btn-ghost" onclick="printInvoice('${s.id}', true)" title="Recibo térmico"><i class="fa-solid fa-receipt"></i></button>
          ${s.status === 'completed' ? `<button class="btn btn-sm btn-outline" onclick="openRefundModal('${s.id}')" title="Devolución"><i class="fa-solid fa-rotate-left"></i></button>` : ''}
          ${s.status === 'completed' ? `<button class="btn btn-sm btn-danger" onclick="cancelSale('${s.id}')" title="Anular"><i class="fa-solid fa-ban"></i></button>` : ''}
        </div>
      </td>
    </tr>`).join('');

  // Bind filter tabs
  document.querySelectorAll('[data-sales-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-sales-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSales(btn.dataset.salesFilter);
    });
  });
  // Exportar
  const exportBtn = document.getElementById('btn-export-sales');
  if (exportBtn && !exportBtn.dataset.init) {
    exportBtn.dataset.init = '1';
    exportBtn.onclick = () => exportSalesCSV(sales.filter(s => s.status === 'completed'));
  }
}

async function cancelSale(id) {
  const ok = await confirmDlg('¿Anular esta venta? Esta acción no se puede deshacer.');
  if (!ok) return;
  try {
    await PosDB.Sales.cancel(id);
    Toast.success('Venta anulada');
    renderSales();
  } catch(e) { Toast.error('Error al anular'); }
}

/* ═══════════════════════════════════════════════
   INVENTARIO
═══════════════════════════════════════════════ */
async function renderInventory() {
  _initInnerTabs('inventory-inner-tabs', {
    'inventory-stock':     () => {},
    'inventory-movements': renderMovements,
  });
  const el = document.getElementById('inventory-tbody');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="8" class="empty-msg">Cargando…</td></tr>';
  const stock = await PosDB.Stock.getAll();

  const q = document.getElementById('inventory-search')?.value?.toLowerCase() || '';
  let rows = stock;
  if (q) rows = rows.filter(s => (s.products?.name || '').toLowerCase().includes(q));

  if (!rows.length) { el.innerHTML = '<tr><td colspan="8" class="empty-msg">Sin productos en inventario</td></tr>'; return; }

  el.innerHTML = rows.map(s => {
    const prod = s.products || {};
    const pct  = s.min_qty > 0 ? Math.min(100, Math.round((s.qty / (s.min_qty * 4)) * 100)) : 50;
    const color = s.qty === 0 ? 'var(--red)' : s.qty <= s.min_qty ? 'var(--orange)' : 'var(--green)';
    return `
    <tr>
      <td><b>${prod.name || s.product_id}</b></td>
      <td>${State.categories.find(c => c.id === prod.category)?.name || '—'}</td>
      <td>${fmt(prod.price)}</td>
      <td>${fmt(s.cost_price)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <b style="color:${color}">${s.qty}</b>
          <div class="stock-bar" style="width:60px"><div class="stock-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        </div>
      </td>
      <td>${s.min_qty}</td>
      <td>${statusChip(prod.status)}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-outline" onclick="openStockEdit('${s.product_id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-sm btn-outline" onclick="openStockIn('${s.product_id}', '${(prod.name||'').replace(/'/g,"\\'")}')"><i class="fa-solid fa-plus"></i> Entrada</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  bindInventorySearch();
  // Exportar
  const expBtn = document.getElementById('btn-export-inventory');
  if (expBtn && !expBtn.dataset.init) { expBtn.dataset.init = '1'; expBtn.onclick = exportInventoryCSV; }
}

function bindInventorySearch() {
  const inp = document.getElementById('inventory-search');
  if (!inp || inp.dataset.init) return;
  inp.dataset.init = '1';
  inp.addEventListener('input', debounce(renderInventory));
}

function openStockIn(productId, productName) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <div class="modal-hdr"><h3>Entrada de Stock — ${productName}</h3><button class="icon-btn" onclick="this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="modal-body">
        <div class="form-grid cols-1">
          <div class="form-group"><label>Cantidad a ingresar</label><input type="number" min="1" id="stock-in-qty" class="form-ctrl" value="1"></div>
          <div class="form-group"><label>Costo por unidad</label><input type="number" min="0" id="stock-in-cost" class="form-ctrl" placeholder="Opcional"></div>
          <div class="form-group"><label>Notas</label><input type="text" id="stock-in-notes" class="form-ctrl" placeholder="Proveedor, referencia…"></div>
        </div>
      </div>
      <div class="modal-ftr">
        <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
        <button class="btn btn-gold" onclick="confirmStockIn('${productId}', '${productName}', this)">Confirmar entrada</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
}

async function confirmStockIn(productId, productName, btn) {
  const bg  = btn.closest('.modal-bg');
  const qty = +bg.querySelector('#stock-in-qty').value || 0;
  const cost = +bg.querySelector('#stock-in-cost').value || null;
  const notes = bg.querySelector('#stock-in-notes').value;
  if (qty <= 0) { Toast.error('Cantidad inválida'); return; }
  try {
    await PosDB.Stock.adjust(productId, qty, 'in', notes || 'Entrada manual');
    if (cost) await db.from('stock').update({ cost_price: cost }).eq('product_id', productId);
    State.stock[productId] = (State.stock[productId] || 0) + qty;
    Toast.success(`+${qty} unidades de ${productName}`);
    bg.remove();
    renderInventory();
  } catch(e) { Toast.error('Error: ' + e.message); }
}

function openStockEdit(productId) {
  PosDB.Stock.getByProduct(productId).then(s => {
    if (!s) return;
    const prod = State.products.find(p => p.id === productId);
    const bg = document.createElement('div');
    bg.className = 'modal-bg open';
    bg.innerHTML = `
      <div class="modal-box" style="max-width:400px">
        <div class="modal-hdr"><h3>Editar Stock — ${prod?.name || productId}</h3><button class="icon-btn" onclick="this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="modal-body">
          <div class="form-grid cols-1">
            <div class="form-group"><label>Cantidad actual</label><input type="number" min="0" id="se-qty" class="form-ctrl" value="${s.qty}"></div>
            <div class="form-group"><label>Stock mínimo</label><input type="number" min="0" id="se-min" class="form-ctrl" value="${s.min_qty}"></div>
            <div class="form-group"><label>Precio de costo</label><input type="number" min="0" id="se-cost" class="form-ctrl" value="${s.cost_price||0}"></div>
          </div>
        </div>
        <div class="modal-ftr">
          <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="saveStockEdit('${productId}', this)">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(bg);
  });
}

async function saveStockEdit(productId, btn) {
  const bg  = btn.closest('.modal-bg');
  const qty = +bg.querySelector('#se-qty').value;
  const min = +bg.querySelector('#se-min').value;
  const cost = +bg.querySelector('#se-cost').value;
  try {
    await PosDB.Stock.set(productId, qty, min, cost);
    State.stock[productId] = qty;
    Toast.success('Stock actualizado');
    bg.remove();
    renderInventory();
  } catch(e) { Toast.error('Error: ' + e.message); }
}

/* ═══════════════════════════════════════════════
   MAYORISTAS
═══════════════════════════════════════════════ */

/* ── Render página principal ── */
async function renderWholesale() {
  _bindWholesaleFilters();
  await _loadWholesaleTable();
  await _loadWholesaleKpis();
}

async function _loadWholesaleKpis() {
  const all = await PosDB.Customers.getAllWholesale();
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('ws-count', all.length);
  el('ws-platinum', all.filter(c => c.wholesale_level === 'platinum').length);
  el('ws-gold',     all.filter(c => c.wholesale_level === 'gold').length);

  // Ventas del mes de mayoristas
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const wholesaleIds = new Set(all.map(c => c.id));
  const sales = await PosDB.Sales.getByRange(start, new Date().toISOString());
  const wsTotal = sales
    .filter(s => s.status === 'completed' && wholesaleIds.has(s.customer_id))
    .reduce((a, b) => a + b.total, 0);
  el('ws-sales-month', fmt(wsTotal));
}

async function _loadWholesaleTable() {
  const tbody  = document.getElementById('ws-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" class="empty-msg"><i class="fa-solid fa-spinner fa-spin"></i> Cargando…</td></tr>`;

  const q     = document.getElementById('ws-search')?.value?.toLowerCase() || '';
  const level = document.getElementById('ws-filter-level')?.value || 'all';

  let list = q
    ? await PosDB.Customers.searchWholesale(q)
    : await PosDB.Customers.getAllWholesale();

  if (level !== 'all') list = list.filter(c => c.wholesale_level === level);

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-msg">Sin mayoristas registrados</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => `
    <tr>
      <td>
        <div style="font-weight:600;font-size:.88rem">${c.name}</div>
        ${c.company ? `<div style="font-size:.75rem;color:var(--text3)">${c.company}</div>` : ''}
      </td>
      <td>
        <span style="font-family:monospace;font-size:.82rem;background:var(--cream-light);padding:3px 8px;border-radius:6px;border:1px solid var(--cream-mid)">
          ${c.cedula || '—'}
        </span>
      </td>
      <td style="font-size:.82rem">${c.company || '—'}</td>
      <td style="font-size:.82rem">${c.phone || '—'}</td>
      <td>${wholesaleLevelChip(c.wholesale_level)}</td>
      <td>
        <span class="chip chip-green" style="font-size:.78rem;font-weight:700">
          <i class="fa-solid fa-tag"></i> ${c.discount_pct}%
        </span>
      </td>
      <td class="fw-bold text-gold">${fmt(c.total_purchases || 0)}</td>
      <td style="font-size:.8rem;color:var(--text3)">${c.last_purchase_at ? fmtDate(c.last_purchase_at) : 'Sin compras'}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-gold" onclick="wsSelectForSale('${c.id}')" title="Vender a este cliente">
            <i class="fa-solid fa-cash-register"></i>
          </button>
          <button class="btn btn-sm btn-outline" onclick="wsViewHistory('${c.id}','${c.name.replace(/'/g,"\\'")}')">
            <i class="fa-solid fa-clock-rotate-left"></i>
          </button>
          <button class="btn btn-sm btn-outline" onclick="openWholesaleForm('${c.id}')">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="wsDelete('${c.id}','${c.name.replace(/'/g,"\\'")}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`).join('');

  // Exportar
  const expBtn = document.getElementById('btn-export-wholesale');
  if (expBtn && !expBtn.dataset.init) {
    expBtn.dataset.init = '1';
    expBtn.onclick = () => exportCSV(list.map(c => ({
      Nombre:         c.name,
      Cedula:         c.cedula || '',
      Empresa:        c.company || '',
      Telefono:       c.phone || '',
      Email:          c.email || '',
      Ciudad:         c.city || '',
      Nivel:          c.wholesale_level,
      Descuento_pct:  c.discount_pct,
      Total_compras:  c.total_purchases || 0,
      Num_compras:    c.purchase_count || 0,
      Ultima_compra:  c.last_purchase_at ? fmtDate(c.last_purchase_at) : '',
    })), `mayoristas_shaden_${new Date().toISOString().slice(0,10)}.csv`);
  }
}

function _bindWholesaleFilters() {
  const search = document.getElementById('ws-search');
  if (search && !search.dataset.init) {
    search.dataset.init = '1';
    search.addEventListener('input', debounce(_loadWholesaleTable));
  }
  const filter = document.getElementById('ws-filter-level');
  if (filter && !filter.dataset.init) {
    filter.dataset.init = '1';
    filter.addEventListener('change', _loadWholesaleTable);
  }
}

/* ── Búsqueda rápida por cédula ── */
async function wsQuickSearch() {
  const cedula = document.getElementById('ws-cedula-quick')?.value?.trim();
  if (!cedula) { Toast.error('Ingresá un número de cédula'); return; }

  const customer = await PosDB.Customers.getByCedula(cedula);
  if (!customer) {
    const ok = await confirmDlg(`Cédula <b>${cedula}</b> no encontrada.<br>¿Querés registrar un nuevo mayorista con este número?`);
    if (ok) openWholesaleForm(null, cedula);
    return;
  }
  if (customer.customer_type !== 'wholesale') {
    Toast.info(`${customer.name} es cliente minorista. Podés convertirlo a mayorista editándolo.`);
    openWholesaleForm(customer.id);
    return;
  }
  // Mostrar ficha del mayorista
  wsShowCustomerCard(customer);
}

/* ── Ficha del cliente con opción de vender ── */
function wsShowCustomerCard(c) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal-box" style="max-width:480px">
      <div class="modal-hdr">
        <h3><i class="fa-solid fa-id-card" style="color:var(--gold);margin-right:8px"></i>Cliente Mayorista</h3>
        <button class="icon-btn" onclick="this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <!-- Header cliente -->
        <div style="display:flex;align-items:flex-start;gap:16px;padding:16px;background:var(--cream-light);border-radius:var(--radius);margin-bottom:16px">
          <div style="width:52px;height:52px;background:var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.4rem;flex-shrink:0">
            <i class="fa-solid fa-building"></i>
          </div>
          <div style="flex:1">
            <div style="font-size:1.05rem;font-weight:700;color:var(--brown)">${c.name}</div>
            ${c.company ? `<div style="font-size:.82rem;color:var(--text2)">${c.company}</div>` : ''}
            <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
              ${wholesaleLevelChip(c.wholesale_level)}
              <span class="chip chip-green"><i class="fa-solid fa-tag"></i> ${c.discount_pct}% desc.</span>
            </div>
          </div>
        </div>
        <!-- Datos -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          <div class="rr-found-info-item">
            <span class="rr-found-info-label">Cédula / NIT</span>
            <span class="rr-found-info-value" style="font-family:monospace">${c.cedula || '—'}</span>
          </div>
          <div class="rr-found-info-item">
            <span class="rr-found-info-label">Teléfono</span>
            <span class="rr-found-info-value">${c.phone || '—'}</span>
          </div>
          <div class="rr-found-info-item">
            <span class="rr-found-info-label">Ciudad</span>
            <span class="rr-found-info-value">${c.city || '—'}</span>
          </div>
          <div class="rr-found-info-item">
            <span class="rr-found-info-label">Última compra</span>
            <span class="rr-found-info-value">${c.last_purchase_at ? fmtDate(c.last_purchase_at) : 'Sin compras'}</span>
          </div>
          <div class="rr-found-info-item">
            <span class="rr-found-info-label">Total compras</span>
            <span class="rr-found-info-value text-gold fw-bold">${fmt(c.total_purchases || 0)}</span>
          </div>
          <div class="rr-found-info-item">
            <span class="rr-found-info-label">Nº de compras</span>
            <span class="rr-found-info-value">${c.purchase_count || 0}</span>
          </div>
        </div>
        ${c.notes ? `<div style="background:rgba(181,134,74,.08);border:1px solid var(--cream-mid);border-radius:var(--radius-sm);padding:10px;font-size:.82rem"><b>Notas:</b> ${c.notes}</div>` : ''}
      </div>
      <div class="modal-ftr">
        <button class="btn btn-outline" onclick="wsViewHistory('${c.id}','${c.name.replace(/'/g,"\\'")}');this.closest('.modal-bg').remove()">
          <i class="fa-solid fa-clock-rotate-left"></i> Historial
        </button>
        <button class="btn btn-outline" onclick="openWholesaleForm('${c.id}');this.closest('.modal-bg').remove()">
          <i class="fa-solid fa-pen"></i> Editar
        </button>
        <button class="btn btn-gold" onclick="wsSelectForSale('${c.id}');this.closest('.modal-bg').remove()">
          <i class="fa-solid fa-cash-register"></i> Ir a vender
        </button>
      </div>
    </div>`;
  document.body.appendChild(bg);
}

/* ── Seleccionar para venta y navegar al POS ── */
async function wsSelectForSale(customerId) {
  const c = await PosDB.Customers.getById(customerId);
  if (!c) return;
  State.customer = {
    id:              c.id,
    name:            c.name,
    phone:           c.phone || '',
    customer_type:   c.customer_type,
    discount_pct:    c.discount_pct || 0,
    wholesale_level: c.wholesale_level || 'standard',
  };
  // Auto-aplicar descuento
  if (c.discount_pct > 0) {
    State.globalDisc = c.discount_pct;
    const gd = document.getElementById('global-disc-input');
    if (gd) gd.value = c.discount_pct;
  }
  navigate('pos');
  Toast.success(`Cliente: ${c.name} — Descuento ${c.discount_pct}% aplicado`);
}

/* ── Historial de compras del mayorista ── */
async function wsViewHistory(customerId, customerName) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal-box modal-lg">
      <div class="modal-hdr">
        <h3><i class="fa-solid fa-clock-rotate-left" style="color:var(--gold);margin-right:8px"></i>Historial — ${customerName}</h3>
        <button class="icon-btn" onclick="this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div id="wsh-stats" class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px"></div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Factura</th><th>Fecha</th><th>Productos</th>
                <th>Desc.</th><th>Total</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody id="wsh-tbody">
              <tr><td colspan="7" class="empty-msg"><i class="fa-solid fa-spinner fa-spin"></i></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="modal-ftr">
        <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">Cerrar</button>
        <button class="btn btn-gold" onclick="wsSelectForSale('${customerId}');this.closest('.modal-bg').remove()">
          <i class="fa-solid fa-cash-register"></i> Nueva venta
        </button>
      </div>
    </div>`;
  document.body.appendChild(bg);

  const sales     = await PosDB.Customers.getSalesHistory(customerId);
  const completed = sales.filter(s => s.status === 'completed');
  const totalSpent = completed.reduce((a, b) => a + b.total, 0);
  const avgDisc    = completed.length
    ? (completed.reduce((a, b) => a + (b.discount_pct || 0), 0) / completed.length).toFixed(1)
    : 0;

  bg.querySelector('#wsh-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-card__label">Compras</div>
      <div class="stat-card__value">${completed.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__label">Total gastado</div>
      <div class="stat-card__value text-gold">${fmt(totalSpent)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-card__label">Desc. promedio</div>
      <div class="stat-card__value">${avgDisc}%</div>
    </div>`;

  const tbody = bg.querySelector('#wsh-tbody');
  if (!sales.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">Sin compras registradas</td></tr>';
    return;
  }
  tbody.innerHTML = sales.map(s => `
    <tr>
      <td class="fw-bold text-gold">${invoiceNum(s.invoice_num)}</td>
      <td style="font-size:.82rem">${fmtDateTime(s.created_at)}</td>
      <td style="font-size:.78rem;color:var(--text2);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        ${(s.sale_items||[]).map(i => i.product_name).join(', ')}
      </td>
      <td>
        ${s.discount_pct > 0
          ? `<span class="chip chip-green" style="font-size:.72rem">${s.discount_pct}%</span>`
          : '<span style="color:var(--text3);font-size:.78rem">—</span>'}
      </td>
      <td class="fw-bold">${fmt(s.total)}</td>
      <td>${statusChip(s.status)}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="printInvoice('${s.id}',false)">
          <i class="fa-solid fa-print"></i>
        </button>
      </td>
    </tr>`).join('');
}

/* ── Formulario nuevo / editar mayorista ── */
async function openWholesaleForm(id = null, prefillCedula = '') {
  let c = null;
  if (id) c = await PosDB.Customers.getById(id);

  const isEdit = !!c;
  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal-box modal-lg">
      <div class="modal-hdr">
        <h3>
          <i class="fa-solid fa-truck-ramp-box" style="color:var(--gold);margin-right:8px"></i>
          ${isEdit ? 'Editar Mayorista' : 'Nuevo Mayorista'}
        </h3>
        <button class="icon-btn" onclick="this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-grid">

          <div class="form-group full-col">
            <label>Nombre completo <span style="color:var(--red)">*</span></label>
            <input class="form-ctrl" id="wsf-name" value="${c?.name||''}" placeholder="Nombre del cliente o responsable" />
          </div>

          <div class="form-group">
            <label><i class="fa-solid fa-id-card" style="color:var(--gold);margin-right:5px"></i>Cédula / NIT <span style="color:var(--red)">*</span></label>
            <input class="form-ctrl" id="wsf-cedula" value="${c?.cedula || prefillCedula}" placeholder="Sin puntos ni guiones" />
          </div>

          <div class="form-group">
            <label>Teléfono</label>
            <input class="form-ctrl" id="wsf-phone" value="${c?.phone||''}" placeholder="3001234567" />
          </div>

          <div class="form-group">
            <label>Empresa / Negocio</label>
            <input class="form-ctrl" id="wsf-company" value="${c?.company||''}" placeholder="Nombre del negocio (opcional)" />
          </div>

          <div class="form-group">
            <label>Ciudad</label>
            <input class="form-ctrl" id="wsf-city" value="${c?.city||''}" placeholder="Pereira, Armenia…" />
          </div>

          <div class="form-group">
            <label>Email</label>
            <input class="form-ctrl" id="wsf-email" type="email" value="${c?.email||''}" />
          </div>

          <div class="form-group">
            <label>Dirección</label>
            <input class="form-ctrl" id="wsf-address" value="${c?.address||''}" />
          </div>

          <!-- Nivel mayorista -->
          <div class="form-group">
            <label><i class="fa-solid fa-layer-group" style="color:var(--gold);margin-right:5px"></i>Nivel mayorista</label>
            <select class="form-ctrl" id="wsf-level" onchange="wsUpdateDiscFromLevel(this.value)">
              <option value="standard" ${(!c || c.wholesale_level==='standard') ? 'selected' : ''}>Estándar (desc. manual)</option>
              <option value="silver"   ${c?.wholesale_level==='silver'   ? 'selected' : ''}>Silver — 10% auto</option>
              <option value="gold"     ${c?.wholesale_level==='gold'     ? 'selected' : ''}>Gold — 15% auto</option>
              <option value="platinum" ${c?.wholesale_level==='platinum' ? 'selected' : ''}>Platinum — 20% auto</option>
            </select>
          </div>

          <!-- Descuento -->
          <div class="form-group">
            <label><i class="fa-solid fa-tag" style="color:var(--green);margin-right:5px"></i>Descuento fijo (%)</label>
            <div style="display:flex;align-items:center;gap:8px">
              <input type="number" class="form-ctrl" id="wsf-disc" min="0" max="100" step="1"
                value="${c?.discount_pct || 0}"
                placeholder="0" style="max-width:100px" />
              <span style="font-size:.8rem;color:var(--text3)">Se aplica automático al seleccionar este cliente en el POS</span>
            </div>
          </div>

          <div class="form-group full-col">
            <label>Notas</label>
            <textarea class="form-ctrl" id="wsf-notes" rows="2" placeholder="Condiciones especiales, días de pago…">${c?.notes||''}</textarea>
          </div>

        </div>

        <!-- Preview descuento -->
        <div id="wsf-disc-preview" style="background:rgba(39,160,106,.08);border:1px solid rgba(39,160,106,.2);border-radius:var(--radius-sm);padding:12px;margin-top:4px;display:flex;align-items:center;gap:10px">
          <i class="fa-solid fa-circle-info" style="color:var(--green)"></i>
          <span style="font-size:.82rem;color:var(--text2)">
            Con un descuento de <b id="wsf-disc-show">${c?.discount_pct||0}%</b>,
            un producto de $100.000 queda en
            <b id="wsf-disc-example" style="color:var(--green)">${fmt(100000 * (1 - (c?.discount_pct||0)/100))}</b>
          </span>
        </div>
      </div>
      <div class="modal-ftr">
        <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
        <button class="btn btn-gold" onclick="wsFormSave('${id||''}', this)">
          <i class="fa-solid fa-floppy-disk"></i> ${isEdit ? 'Guardar cambios' : 'Registrar mayorista'}
        </button>
      </div>
    </div>`;
  document.body.appendChild(bg);

  // Bind live preview del descuento
  const discInput = bg.querySelector('#wsf-disc');
  discInput.addEventListener('input', () => {
    const pct = +discInput.value || 0;
    const show = bg.querySelector('#wsf-disc-show');
    const ex   = bg.querySelector('#wsf-disc-example');
    if (show) show.textContent = pct + '%';
    if (ex)   ex.textContent   = fmt(100000 * (1 - pct/100));
  });
}

/* Actualiza el input de descuento según el nivel seleccionado */
function wsUpdateDiscFromLevel(level) {
  const discMap = { standard: '', silver: 10, gold: 15, platinum: 20 };
  const inp = document.getElementById('wsf-disc');
  if (!inp) return;
  const val = discMap[level];
  if (val !== '') {
    inp.value = val;
    inp.dispatchEvent(new Event('input'));
  }
}

/* ── Guardar formulario mayorista ── */
async function wsFormSave(id, btn) {
  const bg = btn.closest('.modal-bg');
  const name   = bg.querySelector('#wsf-name').value.trim();
  const cedula = bg.querySelector('#wsf-cedula').value.trim();

  if (!name)   { Toast.error('El nombre es obligatorio'); return; }
  if (!cedula) { Toast.error('La cédula / NIT es obligatoria'); return; }

  // Verificar cédula duplicada (si es nuevo)
  if (!id) {
    const existing = await PosDB.Customers.getByCedula(cedula);
    if (existing) {
      Toast.error(`La cédula ${cedula} ya está registrada para "${existing.name}"`);
      return;
    }
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';

  const payload = {
    name,
    cedula,
    phone:           bg.querySelector('#wsf-phone').value.trim(),
    company:         bg.querySelector('#wsf-company').value.trim(),
    city:            bg.querySelector('#wsf-city').value.trim(),
    email:           bg.querySelector('#wsf-email').value.trim(),
    address:         bg.querySelector('#wsf-address').value.trim(),
    notes:           bg.querySelector('#wsf-notes').value.trim(),
    customer_type:   'wholesale',
    wholesale_level: bg.querySelector('#wsf-level').value,
    discount_pct:    parseFloat(bg.querySelector('#wsf-disc').value) || 0,
  };

  try {
    if (id) {
      await PosDB.Customers.update(id, payload);
      Toast.success(`"${name}" actualizado`);
    } else {
      await PosDB.Customers.add(payload);
      Toast.success(`"${name}" registrado como mayorista`);
    }
    bg.remove();
    renderWholesale();
  } catch(e) {
    Toast.error('Error: ' + e.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar';
  }
}

/* ── Eliminar mayorista ── */
async function wsDelete(id, name) {
  const ok = await confirmDlg(`¿Eliminar a <b>${name}</b>? Su historial de compras se mantiene.`);
  if (!ok) return;
  try {
    await PosDB.Customers.delete(id);
    Toast.success(`"${name}" eliminado`);
    renderWholesale();
  } catch(e) { Toast.error('Error: ' + e.message); }
}

/* ═══════════════════════════════════════════════
   CLIENTES
═══════════════════════════════════════════════ */
async function renderCustomers() {
  const el = document.getElementById('customers-tbody');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="6" class="empty-msg">Cargando…</td></tr>';
  const q = document.getElementById('customers-search')?.value?.toLowerCase() || '';
  const customers = q ? await PosDB.Customers.search(q) : await PosDB.Customers.getAll();

  if (!customers.length) { el.innerHTML = '<tr><td colspan="6" class="empty-msg">Sin clientes registrados</td></tr>'; return; }

  el.innerHTML = customers.map(c => `
    <tr>
      <td><b>${c.name}</b></td>
      <td>${c.phone || '—'}</td>
      <td>${c.email || '—'}</td>
      <td>${c.address || '—'}</td>
      <td>${fmtDate(c.created_at)}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-outline" onclick="openCustomerHistory('${c.id}', '${c.name.replace(/'/g,"\\'")}')"><i class="fa-solid fa-clock-rotate-left"></i></button>
          <button class="btn btn-sm btn-outline" onclick="openCustomerForm('${c.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-sm btn-danger"  onclick="deleteCustomer('${c.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');

  bindCustomerSearch();
}

function bindCustomerSearch() {
  const inp = document.getElementById('customers-search');
  if (!inp || inp.dataset.init) return;
  inp.dataset.init = '1';
  inp.addEventListener('input', debounce(renderCustomers));
}

function openCustomerForm(id = null) {
  PosDB.Customers.getById(id).then(c => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg open';
    bg.innerHTML = `
      <div class="modal-box">
        <div class="modal-hdr"><h3>${id ? 'Editar Cliente' : 'Nuevo Cliente'}</h3><button class="icon-btn" onclick="this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group full-col"><label>Nombre *</label><input class="form-ctrl" id="cf-name" value="${c?.name||''}" required></div>
            <div class="form-group"><label>Teléfono</label><input class="form-ctrl" id="cf-phone" value="${c?.phone||''}"></div>
            <div class="form-group"><label>Email</label><input class="form-ctrl" id="cf-email" type="email" value="${c?.email||''}"></div>
            <div class="form-group full-col"><label>Dirección</label><input class="form-ctrl" id="cf-address" value="${c?.address||''}"></div>
            <div class="form-group full-col"><label>Notas</label><textarea class="form-ctrl" id="cf-notes">${c?.notes||''}</textarea></div>
          </div>
        </div>
        <div class="modal-ftr">
          <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
          <button class="btn btn-gold" onclick="saveCustomer('${id||''}', this)">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(bg);
  });
}

async function saveCustomer(id, btn) {
  const bg = btn.closest('.modal-bg');
  const data = {
    name:    bg.querySelector('#cf-name').value.trim(),
    phone:   bg.querySelector('#cf-phone').value.trim(),
    email:   bg.querySelector('#cf-email').value.trim(),
    address: bg.querySelector('#cf-address').value.trim(),
    notes:   bg.querySelector('#cf-notes').value.trim(),
  };
  if (!data.name) { Toast.error('El nombre es obligatorio'); return; }
  try {
    if (id) await PosDB.Customers.update(id, data);
    else    await PosDB.Customers.add(data);
    Toast.success('Cliente guardado');
    bg.remove();
    renderCustomers();
  } catch(e) { Toast.error('Error: ' + e.message); }
}

async function deleteCustomer(id) {
  const ok = await confirmDlg('¿Eliminar este cliente?');
  if (!ok) return;
  try {
    await PosDB.Customers.delete(id);
    Toast.success('Cliente eliminado');
    renderCustomers();
  } catch(e) { Toast.error('Error: ' + e.message); }
}

/* ── Seleccionar cliente en POS ── */
async function openSelectCustomer() {
  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.id = 'select-cust-modal';
  bg.innerHTML = `
    <div class="modal-box" style="max-width:500px">
      <div class="modal-hdr"><h3>Seleccionar Cliente</h3><button class="icon-btn" onclick="this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="modal-body">
        <div class="search-wrap" style="margin-bottom:12px">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input class="search-input" style="width:100%" id="sc-search" placeholder="Buscar cliente…">
        </div>
        <div id="sc-list" style="display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto"></div>
      </div>
      <div class="modal-ftr">
        <button class="btn btn-outline" onclick="State.customer=null;renderCart();this.closest('.modal-bg').remove()">Sin cliente</button>
        <button class="btn btn-gold" onclick="openCustomerFormInline(this)"><i class="fa-solid fa-plus"></i> Nuevo</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  const searchInp = bg.querySelector('#sc-search');
  const listEl    = bg.querySelector('#sc-list');

  async function loadList(q = '') {
    const custs = q ? await PosDB.Customers.search(q) : await PosDB.Customers.getAll();
    if (!custs.length) { listEl.innerHTML = '<p class="empty-msg">Sin clientes</p>'; return; }
    listEl.innerHTML = custs.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--cream-light);border:1px solid var(--cream-mid);border-radius:12px;cursor:pointer"
           onclick="selectCustomerFromModal('${c.id}','${c.name.replace(/'/g,"\\'")}','${c.phone||''}','${c.customer_type||'retail'}',${c.discount_pct||0},'${c.wholesale_level||'standard'}')">
        <div>
          <div style="display:flex;align-items:center;gap:6px">
            <b style="font-size:.88rem">${c.name}</b>
            ${c.customer_type === 'wholesale' ? wholesaleLevelChip(c.wholesale_level) : ''}
          </div>
          <span style="font-size:.75rem;color:var(--text3)">${c.cedula ? `CC: ${c.cedula} · ` : ''}${c.phone||c.email||'Sin contacto'}${c.discount_pct > 0 ? ` · Desc: ${c.discount_pct}%` : ''}</span>
        </div>
        <i class="fa-solid fa-chevron-right" style="color:var(--text3);font-size:.8rem"></i>
      </div>`).join('');
  }
  loadList();
  searchInp.addEventListener('input', debounce(() => loadList(searchInp.value)));
}

/* ── Seleccionar cliente desde el modal (incluye campos mayorista) ── */
function selectCustomerFromModal(id, name, phone, type, discPct, level) {
  State.customer = {
    id,
    name,
    phone,
    customer_type:   type  || 'retail',
    discount_pct:    discPct || 0,
    wholesale_level: level || 'standard',
  };
  // Auto-aplicar descuento mayorista
  if (type === 'wholesale' && discPct > 0) {
    State.globalDisc = discPct;
    const gd = document.getElementById('global-disc-input');
    if (gd) gd.value = discPct;
    Toast.info(`Descuento mayorista ${discPct}% aplicado automáticamente`);
  } else if (type !== 'wholesale') {
    // Si era mayorista antes, quitar descuento
    State.globalDisc = 0;
    const gd = document.getElementById('global-disc-input');
    if (gd) gd.value = 0;
  }
  renderCart();
  document.getElementById('select-cust-modal')?.remove();
}

function openCustomerFormInline(btn) {
  const parent = btn.closest('.modal-bg');
  const inner  = parent.querySelector('.modal-box');
  inner.innerHTML = `
    <div class="modal-hdr"><h3>Nuevo Cliente</h3></div>
    <div class="modal-body">
      <div class="form-grid cols-1">
        <div class="form-group"><label>Nombre *</label><input class="form-ctrl" id="cf2-name"></div>
        <div class="form-group"><label>Teléfono</label><input class="form-ctrl" id="cf2-phone"></div>
        <div class="form-group"><label>Email</label><input class="form-ctrl" id="cf2-email" type="email"></div>
      </div>
    </div>
    <div class="modal-ftr">
      <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
      <button class="btn btn-gold" onclick="quickAddCustomer(this)">Guardar y seleccionar</button>
    </div>`;
}

async function quickAddCustomer(btn) {
  const bg = btn.closest('.modal-bg');
  const name = bg.querySelector('#cf2-name').value.trim();
  if (!name) { Toast.error('El nombre es obligatorio'); return; }
  try {
    const c = await PosDB.Customers.add({
      name,
      phone: bg.querySelector('#cf2-phone').value.trim(),
      email: bg.querySelector('#cf2-email').value.trim(),
    });
    State.customer = {
      id:              c.id,
      name:            c.name,
      phone:           c.phone,
      customer_type:   'retail',
      discount_pct:    0,
      wholesale_level: 'standard',
    };
    renderCart();
    Toast.success('Cliente creado y seleccionado');
    bg.remove();
  } catch(e) { Toast.error('Error: ' + e.message); }
}

/* ═══════════════════════════════════════════════
   REPORTES
═══════════════════════════════════════════════ */
async function renderReports() {
  const days = +document.getElementById('report-period')?.value || 30;

  // By day
  const byDay = await PosDB.Reports.summaryByDay(days);
  renderReportChart(byDay);

  // By category
  const byCat = await PosDB.Reports.byCategory(days);
  renderCatChart(byCat);

  // Top products
  const top = await PosDB.Reports.topProducts(days, 8);
  renderTopProducts(top);

  // Summary
  const total = byDay.reduce((a, b) => a + b.total, 0);
  const count = byDay.reduce((a, b) => a + b.count, 0);
  document.getElementById('rep-total').textContent = fmt(total);
  document.getElementById('rep-count').textContent = count;
  document.getElementById('rep-avg').textContent   = fmt(count ? total / count : 0);
}

function renderReportChart(data) {
  const ctx = document.getElementById('chart-report')?.getContext('2d');
  if (!ctx) return;
  if (window._reportChart) window._reportChart.destroy();
  window._reportChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.date.slice(5)),
      datasets: [{
        label: 'Ventas',
        data: data.map(d => d.total),
        borderColor: '#b5864a',
        backgroundColor: 'rgba(181,134,74,.08)',
        fill: true,
        tension: .4,
        pointRadius: 4,
        pointBackgroundColor: '#b5864a',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmt(c.raw) }, backgroundColor: '#fff', titleColor: '#3d2b1f', bodyColor: '#6b5040', borderColor: 'rgba(92,61,46,.12)', borderWidth: 1 } },
      scales: {
        x: { ticks: { color: '#a08070', maxTicksLimit: 12 }, grid: { color: 'rgba(92,61,46,.05)' } },
        y: { ticks: { color: '#a08070', callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: 'rgba(92,61,46,.06)' } },
      },
    },
  });
}

function renderCatChart(data) {
  const ctx = document.getElementById('chart-categories')?.getContext('2d');
  if (!ctx || !data.length) return;
  if (window._catChart) window._catChart.destroy();
  const colors = ['#b5864a','#27a06a','#2d6fa8','#c07030','#c0392b','#8c6030','#1a7a52','#1a4a7a'];
  window._catChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.cat),
      datasets: [{ data: data.map(d => d.total), backgroundColor: colors, borderWidth: 3, borderColor: '#ffffff' }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right', labels: { color: '#6b5040', font: { size: 11, family: 'Jost' }, padding: 14 } },
        tooltip: { callbacks: { label: c => `${c.label}: ${fmt(c.raw)}` }, backgroundColor: '#fff', titleColor: '#3d2b1f', bodyColor: '#6b5040', borderColor: 'rgba(92,61,46,.12)', borderWidth: 1 }
      },
    },
  });
}

function renderTopProducts(data) {
  const el = document.getElementById('top-products-list');
  if (!el) return;
  if (!data.length) { el.innerHTML = '<p class="empty-msg">Sin datos</p>'; return; }
  const maxTotal = data[0].total || 1;
  el.innerHTML = data.map((p, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border2)">
      <span style="font-size:.75rem;color:var(--text3);min-width:18px;text-align:right">#${i+1}</span>
      <div style="flex:1">
        <div style="font-size:.88rem;font-weight:600">${p.name}</div>
        <div style="height:4px;background:var(--cream-mid);border-radius:2px;margin-top:4px">
          <div style="height:100%;width:${Math.round(p.total/maxTotal*100)}%;background:var(--gold);border-radius:2px"></div>
        </div>
      </div>
      <div style="text-align:right;min-width:80px">
        <div style="font-size:.88rem;color:var(--gold);font-weight:700">${fmt(p.total)}</div>
        <div style="font-size:.73rem;color:var(--text3)">${p.qty} uds</div>
      </div>
    </div>`).join('');
}

/* ═══════════════════════════════════════════════
   CAJA
═══════════════════════════════════════════════ */
async function renderCashier() {
  const reg = await PosDB.CashRegister.getOpen();
  State.register = reg;
  updateRegisterStatus();

  const openSection   = document.getElementById('cashier-open');
  const activeSection = document.getElementById('cashier-active');
  const histSection   = document.getElementById('cashier-history');

  if (reg) {
    if (openSection)   openSection.style.display   = 'none';
    if (activeSection) activeSection.style.display = 'block';
    document.getElementById('reg-opened-at').textContent  = fmtDateTime(reg.opened_at);
    document.getElementById('reg-opening-amt').textContent = fmt(reg.opening_amount);
    document.getElementById('reg-cashier').textContent    = reg.cashier;

    // Ventas desde apertura
    const sales = await PosDB.Sales.getByRange(reg.opened_at, new Date().toISOString());
    const completed = sales.filter(s => s.status === 'completed');
    const cashSales = completed.reduce((a, b) => a + (b.payment_method === 'cash' ? b.total : 0), 0);
    const cardSales = completed.reduce((a, b) => a + (b.payment_method === 'card' ? b.total : 0), 0);
    const xferSales = completed.reduce((a, b) => a + (b.payment_method === 'transfer' ? b.total : 0), 0);
    const totalSales = completed.reduce((a, b) => a + b.total, 0);

    document.getElementById('reg-total-sales').textContent  = fmt(totalSales);
    document.getElementById('reg-cash-sales').textContent   = fmt(cashSales);
    document.getElementById('reg-card-sales').textContent   = fmt(cardSales);
    document.getElementById('reg-xfer-sales').textContent   = fmt(xferSales);
    document.getElementById('reg-sale-count').textContent   = completed.length;

    // Gastos
    const expenses = await PosDB.Expenses.getByRegister(reg.id);
    const totalExp = expenses.reduce((a, b) => a + b.amount, 0);
    document.getElementById('reg-expenses').textContent = fmt(totalExp);
    const expected = reg.opening_amount + cashSales - totalExp;
    document.getElementById('reg-expected').textContent = fmt(expected);

    renderExpensesList(expenses);
  } else {
    if (openSection)   openSection.style.display   = 'block';
    if (activeSection) activeSection.style.display = 'none';
  }

  // Historia
  const history = await PosDB.CashRegister.getHistory();
  renderRegisterHistory(history);
}

function renderExpensesList(expenses) {
  const el = document.getElementById('expenses-list');
  if (!el) return;
  if (!expenses.length) { el.innerHTML = '<p class="empty-msg">Sin gastos registrados</p>'; return; }
  el.innerHTML = expenses.map(e => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border2)">
      <div>
        <div style="font-size:.88rem;font-weight:600">${e.description}</div>
        <div style="font-size:.73rem;color:var(--text3)">${fmtDateTime(e.created_at)} · ${e.category}</div>
      </div>
      <span style="color:var(--red);font-weight:700">${fmt(e.amount)}</span>
    </div>`).join('');
}

function renderRegisterHistory(history) {
  const el = document.getElementById('register-history-tbody');
  if (!el || !history.length) return;
  el.innerHTML = history.map(r => `
    <tr>
      <td>${fmtDateTime(r.opened_at)}</td>
      <td>${r.closed_at ? fmtDateTime(r.closed_at) : '—'}</td>
      <td>${r.cashier}</td>
      <td>${fmt(r.opening_amount)}</td>
      <td>${fmt(r.closing_amount)}</td>
      <td class="${r.difference >= 0 ? 'text-green' : 'text-red'}">${r.difference != null ? fmt(r.difference) : '—'}</td>
      <td>${statusChip(r.status)}</td>
    </tr>`).join('');
}

async function openRegister() {
  const amount = +document.getElementById('opening-amount')?.value || 0;
  try {
    const reg = await PosDB.CashRegister.open(amount, 'Admin');
    State.register = reg;
    Toast.success('Caja abierta');
    renderCashier();
  } catch(e) { Toast.error('Error: ' + e.message); }
}

async function closeRegister() {
  if (!State.register) return;
  const closing = +document.getElementById('closing-amount')?.value;
  if (isNaN(closing)) { Toast.error('Ingresa el monto de cierre'); return; }
  const sales = await PosDB.Sales.getByRange(State.register.opened_at, new Date().toISOString());
  const cashSales = sales.filter(s => s.status === 'completed' && s.payment_method === 'cash').reduce((a, b) => a + b.total, 0);
  const expenses = await PosDB.Expenses.getByRegister(State.register.id);
  const totalExp = expenses.reduce((a, b) => a + b.amount, 0);
  const expected = State.register.opening_amount + cashSales - totalExp;
  const ok = await confirmDlg(`Cierre de caja. Efectivo esperado: ${fmt(expected)} · Ingresado: ${fmt(closing)} · Diferencia: ${fmt(closing - expected)}`);
  if (!ok) return;
  try {
    await PosDB.CashRegister.close(State.register.id, closing, expected);
    State.register = null;
    Toast.success('Caja cerrada');
    renderCashier();
    updateRegisterStatus();
  } catch(e) { Toast.error('Error: ' + e.message); }
}

async function addExpense() {
  if (!State.register) { Toast.error('No hay caja abierta'); return; }
  const desc  = document.getElementById('exp-desc')?.value?.trim();
  const amt   = +document.getElementById('exp-amt')?.value;
  const cat   = document.getElementById('exp-cat')?.value || 'general';
  if (!desc) { Toast.error('Ingresa una descripción'); return; }
  if (!amt || amt <= 0) { Toast.error('Monto inválido'); return; }
  try {
    await PosDB.Expenses.add({ description: desc, amount: amt, category: cat, register_id: State.register.id });
    Toast.success('Gasto registrado');
    document.getElementById('exp-desc').value = '';
    document.getElementById('exp-amt').value  = '';
    renderCashier();
  } catch(e) { Toast.error('Error: ' + e.message); }
}

/* ═══════════════════════════════════════════════
   PRODUCTOS — CRUD DESDE EL POS
═══════════════════════════════════════════════ */
let _editingProductoId = null; // null = nuevo, string = editar

/* ── Renderizar tabla de productos ── */
async function renderProductos() {
  const tbody   = document.getElementById('productos-tbody');
  const countEl = document.getElementById('productos-count');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="empty-msg"><i class="fa-solid fa-spinner fa-spin"></i> Cargando…</td></tr>`;

  // Cargar productos y stock
  const [allProds, stockAll] = await Promise.all([
    ShadenDB.Products.getAll(),
    PosDB.Stock.getAll(),
  ]);

  // Actualizar cache
  State.products = allProds.filter(p => p.status === 'active');

  // Filtros UI
  _populateProductosCatFilter(State.categories);

  const q      = document.getElementById('productos-search')?.value?.toLowerCase() || '';
  const catFil = document.getElementById('productos-filter-cat')?.value || 'all';

  let list = allProds;
  if (catFil !== 'all') list = list.filter(p => p.category === catFil);
  if (q) list = list.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.barcode || '').toLowerCase().includes(q)
  );

  if (countEl) countEl.textContent = `${list.length} producto${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">Sin resultados</td></tr>`;
    return;
  }

  const stockMap = {};
  stockAll.forEach(s => { stockMap[s.product_id] = s.qty; });

  tbody.innerHTML = list.map(p => {
    const cat = State.categories.find(c => c.id === p.category);
    const qty = stockMap[p.id] ?? '—';
    const qtyColor = qty === 0 ? 'var(--red)' : qty <= 5 ? 'var(--orange)' : 'var(--green)';
    return `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          ${p.image
            ? `<img src="${p.image}" style="width:36px;height:36px;object-fit:cover;border-radius:8px;flex-shrink:0" />`
            : `<div style="width:36px;height:36px;background:var(--cream-mid);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text3);flex-shrink:0"><i class="fa-solid fa-box"></i></div>`
          }
          <b style="font-size:.88rem">${p.name}</b>
        </div>
      </td>
      <td><span class="chip chip-gold" style="font-size:.7rem">${cat?.name || '—'}</span></td>
      <td class="fw-bold text-gold">${p.price ? fmt(p.price) : '—'}</td>
      <td>
        ${p.barcode
          ? `<span style="font-family:monospace;font-size:.8rem;background:var(--cream-light);padding:3px 8px;border-radius:6px;border:1px solid var(--cream-mid);display:inline-flex;align-items:center;gap:5px"><i class="fa-solid fa-barcode" style="color:var(--gold)"></i>${p.barcode}</span>`
          : `<button class="btn btn-sm btn-ghost" onclick="openProductoFormWithScan('${p.id}')"><i class="fa-solid fa-barcode"></i> Asignar</button>`
        }
      </td>
      <td>
        ${qty !== '—'
          ? `<span style="font-weight:700;color:${qtyColor}">${qty}</span>`
          : `<span style="color:var(--text3);font-size:.8rem">Sin registro</span>`
        }
      </td>
      <td>${p.status === 'active'
        ? '<span class="chip chip-green">Activo</span>'
        : '<span class="chip chip-gray">Oculto</span>'
      }</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-outline" onclick="openProductoForm('${p.id}')" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-sm btn-outline" onclick="openStockIn('${p.id}', '${p.name.replace(/'/g, "\\'")}')" title="Entrada de stock">
            <i class="fa-solid fa-plus"></i> Stock
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteProducto('${p.id}', '${p.name.replace(/'/g, "\\'")}')" title="Eliminar">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Listeners búsqueda y filtro
  _bindProductosFilters();
}

function _populateProductosCatFilter(cats) {
  const sel = document.getElementById('productos-filter-cat');
  if (!sel || sel.dataset.init) return;
  sel.dataset.init = '1';
  sel.innerHTML = '<option value="all">Todas las categorías</option>' +
    cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  sel.addEventListener('change', renderProductos);
}

function _bindProductosFilters() {
  const inp = document.getElementById('productos-search');
  if (!inp || inp.dataset.init) return;
  inp.dataset.init = '1';
  inp.addEventListener('input', debounce(renderProductos));
}

/* ── Abrir formulario (nuevo o editar) ── */
async function openProductoForm(id = null) {
  _editingProductoId = id;

  // Título
  document.getElementById('producto-modal-title').innerHTML =
    id
      ? '<i class="fa-solid fa-pen" style="color:var(--gold);margin-right:8px"></i>Editar producto'
      : '<i class="fa-solid fa-box-open" style="color:var(--gold);margin-right:8px"></i>Nuevo producto';

  // Poblar categorías
  const catSel = document.getElementById('pm-category');
  catSel.innerHTML = State.categories.map(c =>
    `<option value="${c.id}">${c.name}</option>`
  ).join('');

  // Resetear
  ['pm-name','pm-price','pm-desc','pm-image','pm-barcode','pm-cost'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('pm-stock').value     = '0';
  document.getElementById('pm-min-stock').value  = '5';
  document.getElementById('pm-badge').value      = '';
  document.getElementById('pm-status').value     = 'active';
  pmResetScanZone();

  if (id) {
    // Cargar datos existentes
    const [prod, stockRow] = await Promise.all([
      ShadenDB.Products.getById(id),
      PosDB.Stock.getByProduct(id),
    ]);
    if (!prod) return;
    document.getElementById('pm-name').value      = prod.name || '';
    document.getElementById('pm-category').value  = prod.category || '';
    document.getElementById('pm-price').value     = prod.price || '';
    document.getElementById('pm-desc').value      = prod.description || '';
    document.getElementById('pm-image').value     = prod.image || '';
    document.getElementById('pm-badge').value     = prod.badge || '';
    document.getElementById('pm-status').value    = prod.status || 'active';
    document.getElementById('pm-barcode').value   = prod.barcode || '';
    document.getElementById('pm-cost').value      = stockRow?.cost_price || '';
    document.getElementById('pm-min-stock').value = stockRow?.min_qty ?? 5;
    // No sobreescribir stock al editar — solo mostrar
    const currentQty = stockRow?.qty ?? 0;
    document.getElementById('pm-stock').value = currentQty;

    if (prod.barcode) pmShowBarcodeOk(prod.barcode);
  }

  // Activar escáner para el campo pm-barcode dentro del modal
  _bindModalBarcodeInput();

  openModal('producto-modal');
  setTimeout(() => document.getElementById('pm-name')?.focus(), 150);
}

function openProductoFormWithScan(id) {
  openProductoForm(id);
}

/* ── Input de código en el modal ── */
function _bindModalBarcodeInput() {
  const inp = document.getElementById('pm-barcode');
  if (!inp || inp.dataset.scanInit) return;
  inp.dataset.scanInit = '1';
  inp.addEventListener('input', () => {
    const v = inp.value.trim();
    if (v.length >= 4) pmShowBarcodeOk(v);
    else pmResetScanZone();
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
  });
}

/* ── Feedback visual zona de escaneo ── */
function pmShowBarcodeOk(code) {
  const zone = document.getElementById('pm-scan-zone');
  const icon = document.getElementById('pm-scan-icon');
  if (zone) { zone.classList.add('bsz-ok'); zone.classList.remove('bsz-scanning'); }
  if (icon) icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
  document.getElementById('pm-barcode').value = code;
}
function pmResetScanZone() {
  const zone = document.getElementById('pm-scan-zone');
  const icon = document.getElementById('pm-scan-icon');
  if (zone) { zone.classList.remove('bsz-ok', 'bsz-scanning'); }
  if (icon) icon.innerHTML = '<i class="fa-solid fa-barcode"></i>';
}
function pmGenBarcode() {
  const code = BarcodeScanner.generateEAN13();
  document.getElementById('pm-barcode').value = code;
  pmShowBarcodeOk(code);
  Toast.info('Código generado: ' + code);
}
function pmClearBarcode() {
  document.getElementById('pm-barcode').value = '';
  pmResetScanZone();
}

/* ── Escáner modo "productos" → autocompleta el campo de código ── */
function handleProductoScan(code) {
  const inp = document.getElementById('pm-barcode');
  if (!inp) return;
  inp.value = code;
  pmShowBarcodeOk(code);
  Toast.success('Código capturado: ' + code);
}

/* ── Guardar producto (crear o editar) ── */
async function saveProducto() {
  const name     = document.getElementById('pm-name').value.trim();
  const category = document.getElementById('pm-category').value;
  const price    = parseFloat(document.getElementById('pm-price').value) || null;
  const desc     = document.getElementById('pm-desc').value.trim();
  const image    = document.getElementById('pm-image').value.trim();
  const badge    = document.getElementById('pm-badge').value;
  const status   = document.getElementById('pm-status').value;
  const barcode  = document.getElementById('pm-barcode').value.trim();
  const stockQty = parseInt(document.getElementById('pm-stock').value) || 0;
  const minQty   = parseInt(document.getElementById('pm-min-stock').value) || 5;
  const cost     = parseFloat(document.getElementById('pm-cost').value) || 0;

  if (!name)     { Toast.error('El nombre es obligatorio'); return; }
  if (!category) { Toast.error('Selecciona una categoría'); return; }

  const btn = document.getElementById('pm-submit');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';

  try {
    const payload = { name, category, price, description: desc, image, badge, status, barcode };

    if (_editingProductoId) {
      // ── Editar ──
      await ShadenDB.Products.update(_editingProductoId, payload);
      // Actualizar stock mínimo y costo (no cambia qty al editar)
      const cur = await PosDB.Stock.getByProduct(_editingProductoId);
      await PosDB.Stock.set(_editingProductoId, cur?.qty ?? stockQty, minQty, cost);
      Toast.success(`"${name}" actualizado`);
    } else {
      // ── Crear ──
      const newProd = await ShadenDB.Products.add(payload);
      // Registrar stock inicial
      await PosDB.Stock.set(newProd.id, stockQty, minQty, cost);
      if (stockQty > 0) {
        await PosDB.Stock.adjust(newProd.id, stockQty, 'in', 'Stock inicial', '');
        // La función adjust hace upsert interno así que re-seteamos al valor correcto
        await db.from('stock').update({ qty: stockQty }).eq('product_id', newProd.id);
      }
      Toast.success(`"${name}" creado con stock inicial: ${stockQty}`);
    }

    // Actualizar cache
    const fresh = await ShadenDB.Products.getActive();
    State.products = fresh;
    const freshStock = await PosDB.Stock.getAll();
    freshStock.forEach(s => { State.stock[s.product_id] = s.qty; });

    closeModal('producto-modal');
    renderProductos();

  } catch (e) {
    Toast.error('Error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar producto';
  }
}

/* ── Eliminar producto ── */
async function deleteProducto(id, name) {
  const ok = await confirmDlg(`¿Eliminar <b>${name}</b>? Esta acción no se puede deshacer.`);
  if (!ok) return;
  try {
    await ShadenDB.Products.delete(id);
    State.products = State.products.filter(p => p.id !== id);
    Toast.success(`"${name}" eliminado`);
    renderProductos();
  } catch(e) { Toast.error('Error: ' + e.message); }
}

/* ═══════════════════════════════════════════════
   MODO REGISTRO RÁPIDO
═══════════════════════════════════════════════ */

/* ── Estado de la sesión de registro ── */
const RR = {
  sessionLog:    [],   // [ { type:'new'|'updated'|'skipped', code, name, price, time } ]
  countNew:      0,
  countUpdated:  0,
  countTotal:    0,
  currentCode:   '',
  currentProd:   null, // producto encontrado (si existe)
};

/* ── Abrir el modo ── */
function openModoRegistro() {
  navigate('registro-rapido');
}

/* ── navigate conoce esta página ── */
// Se agrega en el objeto titles y loaders dentro de navigate()

/* ── Inicializar la página cuando se navega a ella ── */
function initRegistroRapido() {
  // Poblar categorías en el select
  const sel = document.getElementById('rr-category');
  if (sel && !sel.dataset.init) {
    sel.dataset.init = '1';
    sel.innerHTML = State.categories.map(c =>
      `<option value="${c.id}">${c.name}</option>`
    ).join('');
  }

  // Foco automático al input de escaneo
  _rrFocusInput();

  // Bind del input de escaneo
  const inp = document.getElementById('rr-scanner-input');
  if (inp && !inp.dataset.init) {
    inp.dataset.init = '1';

    // Enter confirma el código
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        rrProcessInput();
      }
    });

    // Detectar entrada rápida del lector (completa en <100ms)
    let rrBuffer = '';
    let rrTimer  = null;
    inp.addEventListener('input', () => {
      clearTimeout(rrTimer);
      rrBuffer = inp.value;
      rrTimer = setTimeout(() => {
        // Si el valor tiene longitud de código y no se siguió escribiendo → es lector
        if (rrBuffer.length >= 4 && rrBuffer === inp.value) {
          rrProcessInput();
        }
      }, 120);
    });
  }

  // Modo escáner → registro
  BarcodeScanner.setMode('registro', code => {
    const inp = document.getElementById('rr-scanner-input');
    if (inp) inp.value = code;
    rrProcessInput();
  });
}

/* ── Mantener foco en el input ── */
function _rrFocusInput() {
  setTimeout(() => {
    const inp = document.getElementById('rr-scanner-input');
    if (inp) inp.focus();
  }, 80);
}

/* ── Actualizar contadores ── */
function _rrUpdateCounters() {
  const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  el('rr-count-new',     RR.countNew);
  el('rr-count-updated', RR.countUpdated);
  el('rr-count-total',   RR.countTotal);
}

/* ── Actualizar estado visual de la zona de escaneo ── */
function _rrSetZoneState(state, label, sub) {
  const zone = document.getElementById('rr-scan-zone');
  const icon = document.getElementById('rr-scan-icon');
  const lbl  = document.getElementById('rr-scan-label');
  const sub_ = document.getElementById('rr-scan-sub');
  if (!zone) return;

  zone.classList.remove('scanning', 'found-ok', 'found-new');
  if (state) zone.classList.add(state);

  if (icon) {
    const icons = {
      scanning:  'fa-barcode',
      'found-ok':  'fa-circle-check',
      'found-new': 'fa-circle-plus',
      '':          'fa-barcode',
    };
    icon.innerHTML = `<i class="fa-solid ${icons[state] || 'fa-barcode'}"></i>`;
  }
  if (lbl && label)  lbl.textContent = label;
  if (sub_ && sub)   sub_.textContent = sub;
}

/* ── Procesar el código ingresado ── */
async function rrProcessInput() {
  const inp  = document.getElementById('rr-scanner-input');
  const code = inp?.value?.trim();
  if (!code || code.length < 2) { _rrFocusInput(); return; }

  inp.value = '';
  RR.currentCode = code;
  RR.countTotal++;
  _rrUpdateCounters();

  _rrSetZoneState('scanning', 'Buscando…', `Código: ${code}`);

  // Ocultar paneles previos
  document.getElementById('rr-result-panel').style.display = 'none';
  document.getElementById('rr-found-panel').style.display  = 'none';
  document.getElementById('rr-new-panel').style.display    = 'none';
  document.getElementById('rr-edit-panel').style.display   = 'none';

  try {
    // Buscar en cache primero, luego en BD
    let prod = State.products.find(p => p.barcode === code)
            || await ShadenDB.Products.getByBarcode(code);

    if (prod) {
      // ── Producto EXISTENTE ──
      RR.currentProd = prod;
      _rrSetZoneState('found-ok', '¡Encontrado!', prod.name);
      _rrShowFound(prod, code);
    } else {
      // ── Producto NUEVO ──
      RR.currentProd = null;
      _rrSetZoneState('found-new', 'Código nuevo', 'Completá los datos del producto');
      _rrShowNew(code);
    }
  } catch(e) {
    Toast.error('Error al buscar: ' + e.message);
    _rrSetZoneState('', 'Listo para escanear', 'Apuntá el lector al código de barras del producto');
    _rrFocusInput();
  }
}

/* ── Mostrar panel de producto encontrado ── */
function _rrShowFound(prod, code) {
  const panel = document.getElementById('rr-result-panel');
  const found = document.getElementById('rr-found-panel');
  panel.style.display = 'block';
  found.style.display = 'block';

  document.getElementById('rr-found-code').textContent = code;

  const stock = State.stock[prod.id] ?? '—';
  const cat   = State.categories.find(c => c.id === prod.category)?.name || '—';

  document.getElementById('rr-found-info').innerHTML = `
    <div class="rr-found-info-item">
      <span class="rr-found-info-label">Producto</span>
      <span class="rr-found-info-value">${prod.name}</span>
    </div>
    <div class="rr-found-info-item">
      <span class="rr-found-info-label">Categoría</span>
      <span class="rr-found-info-value">${cat}</span>
    </div>
    <div class="rr-found-info-item">
      <span class="rr-found-info-label">Precio venta</span>
      <span class="rr-found-info-value text-gold">${prod.price ? fmt(prod.price) : '—'}</span>
    </div>
    <div class="rr-found-info-item">
      <span class="rr-found-info-label">Stock actual</span>
      <span class="rr-found-info-value" style="color:${stock === 0 ? 'var(--red)' : 'var(--green)'}">${stock}</span>
    </div>
  `;
}

/* ── Mostrar formulario de producto nuevo ── */
function _rrShowNew(code) {
  const panel = document.getElementById('rr-result-panel');
  const newP  = document.getElementById('rr-new-panel');
  panel.style.display = 'block';
  newP.style.display  = 'block';

  document.getElementById('rr-new-code').textContent = code;

  // Limpiar formulario
  ['rr-name', 'rr-price', 'rr-cost'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('rr-stock').value     = '1';
  document.getElementById('rr-min-stock').value = '5';

  // Foco al nombre
  setTimeout(() => document.getElementById('rr-name')?.focus(), 80);
}

/* ── Guardar producto nuevo ── */
async function rrSaveNew(e) {
  e.preventDefault();
  const name     = document.getElementById('rr-name').value.trim();
  const category = document.getElementById('rr-category').value;
  const price    = parseFloat(document.getElementById('rr-price').value) || null;
  const cost     = parseFloat(document.getElementById('rr-cost').value) || 0;
  const stock    = parseInt(document.getElementById('rr-stock').value) || 0;
  const minStock = parseInt(document.getElementById('rr-min-stock').value) || 5;

  if (!name)     { Toast.error('El nombre es obligatorio'); document.getElementById('rr-name').focus(); return; }
  if (!category) { Toast.error('Seleccioná una categoría'); return; }

  const btn = document.getElementById('rr-save-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';

  try {
    const newProd = await ShadenDB.Products.add({
      name, category, price, barcode: RR.currentCode,
      status: 'active', description: '', image: '', badge: '',
    });
    await PosDB.Stock.set(newProd.id, stock, minStock, cost);
    if (stock > 0) {
      await PosDB.Stock.adjust(newProd.id, stock, 'in', 'Stock inicial — Registro rápido', '');
      await db.from('stock').update({ qty: stock }).eq('product_id', newProd.id);
    }

    // Actualizar caches
    State.products.push({ ...newProd, price });
    State.stock[newProd.id] = stock;

    // Registrar en log
    RR.countNew++;
    _rrLog('new', RR.currentCode, name, price, stock);
    _rrUpdateCounters();

    Toast.success(`✓ "${name}" registrado`);
    rrNextScan();

  } catch(err) {
    Toast.error('Error: ' + err.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar y siguiente <kbd>Enter</kbd>';
  }
}

/* ── Editar producto existente ── */
async function rrEditExisting() {
  const prod = RR.currentProd;
  if (!prod) return;

  // Ocultar found, mostrar edit
  document.getElementById('rr-found-panel').style.display = 'none';
  document.getElementById('rr-edit-panel').style.display  = 'block';

  document.getElementById('rr-edit-code').textContent = RR.currentCode;
  document.getElementById('rre-name').value    = prod.name || '';
  document.getElementById('rre-price').value   = prod.price || '';

  // Cargar datos de stock
  const stockRow = await PosDB.Stock.getByProduct(prod.id);
  document.getElementById('rre-cost').value      = stockRow?.cost_price || '';
  document.getElementById('rre-stock').value     = stockRow?.qty ?? State.stock[prod.id] ?? 0;
  document.getElementById('rre-min-stock').value = stockRow?.min_qty ?? 5;

  setTimeout(() => document.getElementById('rre-price')?.focus(), 80);
}

/* ── Guardar edición de existente ── */
async function rrSaveEdit(e) {
  e.preventDefault();
  const prod     = RR.currentProd;
  if (!prod) return;

  const name     = document.getElementById('rre-name').value.trim();
  const price    = parseFloat(document.getElementById('rre-price').value) || null;
  const cost     = parseFloat(document.getElementById('rre-cost').value) || 0;
  const stock    = parseInt(document.getElementById('rre-stock').value) || 0;
  const minStock = parseInt(document.getElementById('rre-min-stock').value) || 5;

  try {
    await ShadenDB.Products.update(prod.id, { ...prod, name, price });
    await PosDB.Stock.set(prod.id, stock, minStock, cost);

    // Actualizar caches
    State.products = State.products.map(p =>
      p.id === prod.id ? { ...p, name, price } : p
    );
    State.stock[prod.id] = stock;

    // Log
    RR.countUpdated++;
    _rrLog('updated', RR.currentCode, name, price, stock);
    _rrUpdateCounters();

    Toast.success(`✓ "${name}" actualizado`);
    rrNextScan();

  } catch(err) {
    Toast.error('Error: ' + err.message);
  }
}

/* ── Saltar este código ── */
function rrSkip() {
  _rrLog('skipped', RR.currentCode, '—', null, null);
  rrNextScan();
}

/* ── Preparar para el siguiente escaneo ── */
function rrNextScan() {
  document.getElementById('rr-result-panel').style.display = 'none';
  document.getElementById('rr-found-panel').style.display  = 'none';
  document.getElementById('rr-new-panel').style.display    = 'none';
  document.getElementById('rr-edit-panel').style.display   = 'none';
  RR.currentCode = '';
  RR.currentProd = null;
  _rrSetZoneState('', 'Listo para escanear', 'Apuntá el lector al código de barras del producto');
  _rrFocusInput();
}

/* ── Agregar entrada al log ── */
function _rrLog(type, code, name, price, stock) {
  const entry = { type, code, name, price, stock, time: new Date() };
  RR.sessionLog.unshift(entry); // más reciente primero

  // Mostrar sección de log
  const logSection = document.getElementById('rr-log-section');
  const logList    = document.getElementById('rr-log-list');
  if (!logSection || !logList) return;
  logSection.style.display = 'block';

  const icons = { new: 'fa-circle-plus', updated: 'fa-pen', skipped: 'fa-forward' };
  const labels = { new: 'Nuevo', updated: 'Actualizado', skipped: 'Saltado' };

  const item = document.createElement('div');
  item.className = `rr-log-item ${type}`;
  item.innerHTML = `
    <i class="fa-solid ${icons[type]} rr-log-item__icon"></i>
    <span class="rr-log-item__name">${name}</span>
    <span class="rr-log-item__code">${code}</span>
    ${price ? `<span class="rr-log-item__price">${fmt(price)}</span>` : ''}
    ${stock != null ? `<span style="font-size:.75rem;color:var(--text3)">Stock: ${stock}</span>` : ''}
    <span class="rr-log-item__time">${entry.time.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}</span>
  `;
  logList.insertBefore(item, logList.firstChild);
}

/* ── Exportar log de sesión ── */
function rrExportLog() {
  if (!RR.sessionLog.length) { Toast.info('Sin registros en esta sesión'); return; }
  const rows = RR.sessionLog.map(e => ({
    Tipo:    e.type === 'new' ? 'Nuevo' : e.type === 'updated' ? 'Actualizado' : 'Saltado',
    Codigo:  e.code,
    Nombre:  e.name,
    Precio:  e.price ?? '',
    Stock:   e.stock ?? '',
    Hora:    e.time.toLocaleTimeString('es-CO'),
  }));
  exportCSV(rows, `registro_rapido_${new Date().toISOString().slice(0,10)}.csv`);
}

/* ═══════════════════════════════════════════════
   HISTORIAL DE COMPRAS POR CLIENTE
═══════════════════════════════════════════════ */
async function openCustomerHistory(customerId, customerName) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal-box modal-lg">
      <div class="modal-hdr">
        <h3><i class="fa-solid fa-clock-rotate-left" style="color:var(--gold);margin-right:8px"></i>Historial — ${customerName}</h3>
        <button class="icon-btn" onclick="this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div id="ch-stats" class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px"></div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Factura</th><th>Fecha</th><th>Productos</th><th>Método</th><th>Total</th><th>Estado</th><th></th></tr></thead>
            <tbody id="ch-tbody"><tr><td colspan="7" class="empty-msg"><i class="fa-solid fa-spinner fa-spin"></i> Cargando…</td></tr></tbody>
          </table>
        </div>
      </div>
      <div class="modal-ftr">
        <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(bg);

  // Buscar ventas de este cliente
  const { data } = await db.from('sales').select('*, sale_items(*)')
    .eq('customer_id', customerId).order('created_at', { ascending: false });
  const sales = data || [];
  const completed = sales.filter(s => s.status === 'completed');
  const totalSpent = completed.reduce((a, b) => a + b.total, 0);
  const avgTicket  = completed.length ? totalSpent / completed.length : 0;

  bg.querySelector('#ch-stats').innerHTML = `
    <div class="stat-card"><div class="stat-card__label">Total compras</div><div class="stat-card__value">${completed.length}</div></div>
    <div class="stat-card"><div class="stat-card__label">Total gastado</div><div class="stat-card__value text-gold">${fmt(totalSpent)}</div></div>
    <div class="stat-card"><div class="stat-card__label">Ticket promedio</div><div class="stat-card__value">${fmt(avgTicket)}</div></div>`;

  if (!sales.length) {
    bg.querySelector('#ch-tbody').innerHTML = '<tr><td colspan="7" class="empty-msg">Sin compras registradas</td></tr>';
    return;
  }
  bg.querySelector('#ch-tbody').innerHTML = sales.map(s => `
    <tr>
      <td class="fw-bold text-gold">${invoiceNum(s.invoice_num)}</td>
      <td>${fmtDateTime(s.created_at)}</td>
      <td style="font-size:.8rem;color:var(--text2)">${(s.sale_items||[]).map(i => i.product_name).join(', ').slice(0,60)}…</td>
      <td>${payMethodLabel(s.payment_method)}</td>
      <td class="fw-bold">${fmt(s.total)}</td>
      <td>${statusChip(s.status)}</td>
      <td><button class="btn btn-sm btn-outline" onclick="printInvoice('${s.id}',false)"><i class="fa-solid fa-print"></i></button></td>
    </tr>`).join('');
}

/* ═══════════════════════════════════════════════
   DEVOLUCIONES
═══════════════════════════════════════════════ */
async function renderRefunds() {
  const el = document.getElementById('refunds-tbody');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="7" class="empty-msg">Cargando…</td></tr>';
  const refunds = await PosDB.Refunds.getAll();
  if (!refunds.length) { el.innerHTML = '<tr><td colspan="7" class="empty-msg">Sin devoluciones registradas</td></tr>'; return; }
  el.innerHTML = refunds.map(r => `
    <tr>
      <td class="fw-bold text-gold">${r.invoice_num || r.id.slice(0,8)}</td>
      <td>${fmtDateTime(r.created_at)}</td>
      <td>${r.customer_name || '—'}</td>
      <td>${r.reason || '—'}</td>
      <td>${(r.refund_items||[]).length} ítem(s)</td>
      <td class="fw-bold text-red">${fmt(r.total_refund)}</td>
      <td>${r.refund_method === 'cash' ? '<span class="chip chip-green">Efectivo</span>' : '<span class="chip chip-blue">Crédito</span>'}</td>
    </tr>`).join('');
}

async function openRefundModal(saleId) {
  const sale = await PosDB.Sales.getById(saleId);
  if (!sale) return;
  const items = sale.sale_items || [];
  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal-box modal-lg">
      <div class="modal-hdr">
        <h3><i class="fa-solid fa-rotate-left" style="color:var(--red);margin-right:8px"></i>Devolución — ${invoiceNum(sale.invoice_num)}</h3>
        <button class="icon-btn" onclick="this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <p style="font-size:.82rem;color:var(--text2);margin-bottom:14px">Selecciona los ítems a devolver y la cantidad.</p>
        <table class="data-table" style="margin-bottom:16px">
          <thead><tr><th><input type="checkbox" id="ref-check-all" onchange="document.querySelectorAll('.ref-item-check').forEach(c=>c.checked=this.checked)"></th><th>Producto</th><th>Vendido</th><th>Devolver</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${items.map((it, i) => `
            <tr>
              <td><input type="checkbox" class="ref-item-check" data-idx="${i}" checked></td>
              <td>${it.product_name}</td>
              <td style="text-align:center">${it.quantity}</td>
              <td><input type="number" class="form-ctrl ref-qty" data-idx="${i}" data-price="${it.unit_price}" data-max="${it.quantity}" value="${it.quantity}" min="1" max="${it.quantity}" style="width:70px"></td>
              <td class="ref-line-total fw-bold">${fmt(it.line_total)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="form-grid">
          <div class="form-group">
            <label>Motivo de la devolución</label>
            <input type="text" class="form-ctrl" id="ref-reason" placeholder="Ej. Producto defectuoso, talla incorrecta…" />
          </div>
          <div class="form-group">
            <label>Método de devolución</label>
            <select class="form-ctrl" id="ref-method">
              <option value="cash">Efectivo</option>
              <option value="store_credit">Crédito en tienda</option>
            </select>
          </div>
          <div class="form-group">
            <label>¿Regresar al inventario?</label>
            <select class="form-ctrl" id="ref-restock">
              <option value="yes">Sí — reponer stock</option>
              <option value="no">No — producto dañado</option>
            </select>
          </div>
        </div>
        <div style="background:var(--cream-light);border:1px solid var(--cream-mid);border-radius:12px;padding:14px;margin-top:12px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:.88rem;color:var(--text2)">Total a devolver:</span>
          <span id="ref-total-display" class="fw-bold text-red" style="font-size:1.2rem">${fmt(sale.total)}</span>
        </div>
      </div>
      <div class="modal-ftr">
        <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
        <button class="btn btn-danger" onclick="processRefund('${sale.id}','${sale.customer_name||''}','${invoiceNum(sale.invoice_num)}',this)">
          <i class="fa-solid fa-rotate-left"></i> Procesar devolución
        </button>
      </div>
    </div>`;
  document.body.appendChild(bg);

  // Recalcular total al cambiar cantidades
  bg.querySelectorAll('.ref-qty, .ref-item-check').forEach(inp => {
    inp.addEventListener('input', () => {
      let total = 0;
      bg.querySelectorAll('.ref-item-check').forEach(chk => {
        if (!chk.checked) return;
        const idx = chk.dataset.idx;
        const qty = +bg.querySelector(`.ref-qty[data-idx="${idx}"]`).value || 0;
        const price = +bg.querySelector(`.ref-qty[data-idx="${idx}"]`).dataset.price || 0;
        total += qty * price;
      });
      bg.querySelector('#ref-total-display').textContent = fmt(total);
    });
  });
}

async function processRefund(saleId, customerName, invoiceNumStr, btn) {
  const bg = btn.closest('.modal-bg');
  const reason  = bg.querySelector('#ref-reason').value.trim();
  const method  = bg.querySelector('#ref-method').value;
  const restock = bg.querySelector('#ref-restock').value === 'yes';

  const itemsToRefund = [];
  bg.querySelectorAll('.ref-item-check').forEach(chk => {
    if (!chk.checked) return;
    const idx   = chk.dataset.idx;
    const qtyEl = bg.querySelector(`.ref-qty[data-idx="${idx}"]`);
    const qty   = +qtyEl.value || 0;
    const price = +qtyEl.dataset.price || 0;
    const rowName = bg.querySelector(`tr:has([data-idx="${idx}"].ref-item-check) td:nth-child(2)`)?.textContent || '';
    if (qty > 0) itemsToRefund.push({ product_name: rowName, quantity: qty, unit_price: price, line_total: qty * price, restock });
  });

  if (!itemsToRefund.length) { Toast.error('Selecciona al menos un ítem'); return; }

  const totalRefund = itemsToRefund.reduce((a, b) => a + b.line_total, 0);
  const ok = await confirmDlg(`¿Procesar devolución de ${fmt(totalRefund)}?${reason ? `<br><small>Motivo: ${reason}</small>` : ''}`);
  if (!ok) return;

  btn.disabled = true;
  try {
    const refund = await PosDB.Refunds.create({
      sale_id: saleId, invoice_num: invoiceNumStr,
      customer_name: customerName, reason,
      total_refund: totalRefund, refund_method: method,
      status: 'completed', cashier: 'Admin',
    }, itemsToRefund);

    // Reponer stock si corresponde
    if (restock) {
      for (const it of itemsToRefund) {
        // Buscar product_id desde sale_items
        const sale = await PosDB.Sales.getById(saleId);
        const saleItem = (sale?.sale_items || []).find(si => si.product_name === it.product_name);
        if (saleItem?.product_id) {
          await PosDB.Stock.adjust(saleItem.product_id, it.quantity, 'in', `Devolución ${invoiceNumStr}`, saleId);
          State.stock[saleItem.product_id] = (State.stock[saleItem.product_id] || 0) + it.quantity;
        }
      }
    }

    Toast.success(`Devolución procesada — ${fmt(totalRefund)}`);
    bg.remove();
    // Volver al historial de ventas y mostrar pestaña de devoluciones
    navigate('sales');
    setTimeout(() => {
      const tabBtn = document.querySelector('#sales-inner-tabs .inner-tab[data-tab="sales-refunds"]');
      if (tabBtn) tabBtn.click();
    }, 100);
  } catch(e) {
    Toast.error('Error: ' + e.message);
    btn.disabled = false;
  }
}

/* ═══════════════════════════════════════════════
   MOVIMIENTOS DE STOCK
═══════════════════════════════════════════════ */
async function renderMovements() {
  const el = document.getElementById('movements-tbody');
  if (!el) return;
  el.innerHTML = '<tr><td colspan="6" class="empty-msg">Cargando…</td></tr>';
  const mvs = await PosDB.Stock.movements(200);
  if (!mvs.length) { el.innerHTML = '<tr><td colspan="6" class="empty-msg">Sin movimientos</td></tr>'; return; }
  el.innerHTML = mvs.map(m => {
    const isIn  = m.type === 'in';
    const isOut = m.type === 'out';
    return `
    <tr>
      <td>${fmtDateTime(m.created_at)}</td>
      <td><b>${m.product_name}</b></td>
      <td>
        ${isIn  ? '<span class="chip chip-green">Entrada</span>'  : ''}
        ${isOut ? '<span class="chip chip-red">Salida</span>'     : ''}
        ${!isIn && !isOut ? '<span class="chip chip-gray">Ajuste</span>' : ''}
      </td>
      <td class="fw-bold ${isIn ? 'text-green' : 'text-red'}">${isIn ? '+' : ''}${m.qty}</td>
      <td style="font-size:.8rem;color:var(--text3)">${m.notes || '—'}</td>
      <td style="font-size:.8rem;color:var(--text3)">${m.ref_sale_id ? invoiceNum(m.ref_sale_id.replace('sale-','')) : '—'}</td>
    </tr>`;
  }).join('');
  // Exportar
  const expBtn = document.getElementById('btn-export-movements');
  if (expBtn && !expBtn.dataset.init) {
    expBtn.dataset.init = '1';
    expBtn.onclick = () => exportCSV(mvs.map(m => ({
      Fecha: fmtDateTime(m.created_at), Producto: m.product_name,
      Tipo: m.type, Cantidad: m.qty, Notas: m.notes||'', Referencia: m.ref_sale_id||'',
    })), `movimientos_${new Date().toISOString().slice(0,10)}.csv`);
  }
}

/* ═══════════════════════════════════════════════
   CONFIGURACIÓN DEL SISTEMA
═══════════════════════════════════════════════ */
async function renderConfig() {
  const cfg = await PosDB.PosSettings.get();
  window._posSettings = cfg;
  const f = id => document.getElementById(id);
  if (f('cfg-store-name'))    f('cfg-store-name').value    = cfg.store_name    || '';
  if (f('cfg-store-address')) f('cfg-store-address').value = cfg.store_address || '';
  if (f('cfg-store-phone'))   f('cfg-store-phone').value   = cfg.store_phone   || '';
  if (f('cfg-invoice-prefix'))f('cfg-invoice-prefix').value= cfg.invoice_prefix|| 'FAC';
  if (f('cfg-tax-pct'))       f('cfg-tax-pct').value       = cfg.tax_pct       || 0;
  if (f('cfg-low-stock'))     f('cfg-low-stock').value     = cfg.low_stock_alert|| 5;
  if (f('cfg-receipt-footer'))f('cfg-receipt-footer').value= cfg.receipt_footer || '';
  // Bind submit
  const form = document.getElementById('config-form');
  if (form && !form.dataset.init) {
    form.dataset.init = '1';
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const payload = {
        store_name:     f('cfg-store-name').value.trim(),
        store_address:  f('cfg-store-address').value.trim(),
        store_phone:    f('cfg-store-phone').value.trim(),
        invoice_prefix: f('cfg-invoice-prefix').value.trim() || 'FAC',
        tax_pct:        parseFloat(f('cfg-tax-pct').value) || 0,
        low_stock_alert:parseInt(f('cfg-low-stock').value) || 5,
        receipt_footer: f('cfg-receipt-footer').value.trim(),
      };
      try {
        await PosDB.PosSettings.save(payload);
        window._posSettings = { ...window._posSettings, ...payload };
        State.taxPct = payload.tax_pct;
        Toast.success('Configuración guardada');
        renderCart(); // actualiza IVA en carrito
      } catch(e) { Toast.error('Error: ' + e.message); }
    });
  }
}

/* ═══════════════════════════════════════════════
   APARTADOS (LAYAWAY)
═══════════════════════════════════════════════ */

function _layawayNum(n) {
  return 'APT-' + String(n).padStart(4, '0');
}

function _layawayStatusChip(status) {
  const map = {
    active:    `<span class="chip chip-blue"><i class="fa-solid fa-clock"></i> Activo</span>`,
    ready:     `<span class="chip chip-green"><i class="fa-solid fa-circle-check"></i> Listo</span>`,
    completed: `<span class="chip chip-gray"><i class="fa-solid fa-check"></i> Completado</span>`,
    cancelled: `<span class="chip chip-red"><i class="fa-solid fa-xmark"></i> Cancelado</span>`,
    expired:   `<span class="chip chip-orange"><i class="fa-solid fa-triangle-exclamation"></i> Vencido</span>`,
  };
  return map[status] || `<span class="chip chip-gray">${status}</span>`;
}

/* ── Renderizar tabla de apartados ── */
let _layawayFilter = 'active';

async function renderLayaways(filter = _layawayFilter) {
  _layawayFilter = filter;
  const tbody    = document.getElementById('layaways-tbody');
  const titleEl  = document.getElementById('lay-table-title');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="10" class="empty-msg"><i class="fa-solid fa-spinner fa-spin"></i> Cargando…</td></tr>`;

  const all = filter === 'all'
    ? await PosDB.Layaways.getAll()
    : await PosDB.Layaways.getAll(filter);

  // KPIs
  const active    = all.filter(l => l.status === 'active' || l.status === 'ready');
  const ready     = all.filter(l => l.status === 'ready');
  const balance   = active.reduce((a, l) => a + (l.balance ?? (l.total - l.amount_paid)), 0);
  const totalPaid = active.reduce((a, l) => a + l.amount_paid, 0);

  const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  setEl('lay-count-active', active.length);
  setEl('lay-total-balance', fmt(balance));
  setEl('lay-count-ready', ready.length);
  setEl('lay-total-paid', fmt(totalPaid));

  // Badge sidebar
  const badge = document.getElementById('layaway-badge');
  if (badge) {
    badge.textContent = active.length;
    badge.style.display = active.length ? '' : 'none';
  }

  if (titleEl) {
    titleEl.textContent = filter === 'all' ? 'Todos los apartados'
      : filter === 'active' ? 'Apartados activos'
      : filter;
  }

  // Filtrar por búsqueda
  const q = document.getElementById('layaway-search')?.value?.toLowerCase() || '';
  const rows = q ? all.filter(l => l.customer_name.toLowerCase().includes(q)) : all;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-msg">Sin apartados${filter !== 'all' ? ' activos' : ''}</td></tr>`;
    _bindLayawaySearch();
    return;
  }

  // Detectar vencidos
  const today = new Date().toISOString().slice(0, 10);

  tbody.innerHTML = rows.map(l => {
    const items   = l.layaway_items || [];
    const paid    = l.amount_paid || 0;
    const bal     = l.total - paid;
    const pct     = l.total > 0 ? Math.min(100, Math.round((paid / l.total) * 100)) : 0;
    const expired = l.expires_at && l.expires_at < today && l.status === 'active';
    const status  = expired ? 'expired' : l.status;

    const itemSummary = items.slice(0, 3).map(i =>
      `${i.quantity}× ${i.product_name}`
    ).join(', ') + (items.length > 3 ? ` +${items.length - 3} más` : '');

    return `
    <tr class="${expired ? 'row-expired' : ''}">
      <td class="fw-bold text-gold">${_layawayNum(l.layaway_num)}</td>
      <td>
        <div style="font-weight:600;font-size:.88rem">${l.customer_name}</div>
        ${l.customer_phone ? `<div style="font-size:.75rem;color:var(--text3)">${l.customer_phone}</div>` : ''}
      </td>
      <td style="font-size:.8rem;color:var(--text2)">${fmtDate(l.created_at)}</td>
      <td style="font-size:.78rem;color:var(--text2);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${itemSummary}">${itemSummary}</td>
      <td class="fw-bold">${fmt(l.total)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="text-green fw-bold">${fmt(paid)}</span>
          <div class="stock-bar" style="width:50px">
            <div class="stock-bar-fill" style="width:${pct}%;background:var(--green)"></div>
          </div>
          <span style="font-size:.72rem;color:var(--text3)">${pct}%</span>
        </div>
      </td>
      <td class="fw-bold" style="color:${bal > 0 ? 'var(--orange)' : 'var(--green)'}">
        ${bal > 0 ? fmt(bal) : '<i class="fa-solid fa-circle-check" style="color:var(--green)"></i> Pagado'}
      </td>
      <td style="font-size:.8rem;${expired ? 'color:var(--red);font-weight:700' : 'color:var(--text3)'}">
        ${l.expires_at || '—'}
        ${expired ? ' <i class="fa-solid fa-triangle-exclamation"></i>' : ''}
      </td>
      <td>${_layawayStatusChip(status)}</td>
      <td>
        <div class="td-actions">
          <button class="btn btn-sm btn-gold" onclick="openLayawayDetail('${l.id}')" title="Ver / Abonar">
            <i class="fa-solid fa-eye"></i>
          </button>
          ${(l.status === 'active' || l.status === 'ready') ? `
          <button class="btn btn-sm btn-green" onclick="openLayawayCheckout('${l.id}')" title="Convertir en venta">
            <i class="fa-solid fa-cash-register"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="cancelLayaway('${l.id}')" title="Cancelar apartado">
            <i class="fa-solid fa-xmark"></i>
          </button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  _bindLayawaySearch();
}

function _bindLayawaySearch() {
  const inp = document.getElementById('layaway-search');
  if (!inp || inp.dataset.init) return;
  inp.dataset.init = '1';
  inp.addEventListener('input', debounce(() => renderLayaways(_layawayFilter)));
}

/* ── Crear apartado desde el carrito ── */
async function openLayawayFromCart() {
  if (!State.cart.length) { Toast.error('El carrito está vacío'); return; }

  const { subtotal, discAmt, total } = cartTotals();
  const itemsSummary = State.cart.map(i =>
    `${i.quantity}× ${i.product_name} — ${fmt(i.unit_price)}`
  ).join('\n');

  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal-box modal-lg">
      <div class="modal-hdr">
        <h3><i class="fa-solid fa-hand-holding-dollar" style="color:var(--gold);margin-right:8px"></i>Nuevo Apartado</h3>
        <button class="icon-btn" onclick="this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">

        <!-- Resumen de ítems -->
        <div class="layaway-items-summary">
          <div class="card-title" style="margin-bottom:10px"><i class="fa-solid fa-box-open"></i> Productos a apartar</div>
          ${State.cart.map(i => `
          <div class="lay-item-row">
            <div class="lay-item-name">
              <b>${i.product_name}</b>
              ${i.discount_pct > 0 ? `<span class="chip chip-orange" style="font-size:.65rem">-${i.discount_pct}%</span>` : ''}
            </div>
            <div class="lay-item-detail">
              <span>${i.quantity} × ${fmt(i.unit_price)}</span>
              <span class="fw-bold text-gold">${fmt(i.unit_price * i.quantity * (1 - (i.discount_pct||0)/100))}</span>
            </div>
          </div>`).join('')}
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--cream-mid);padding-top:10px;margin-top:8px">
            ${discAmt > 0 ? `<div style="font-size:.82rem;color:var(--text2)">Descuento (${State.globalDisc}%): <b>-${fmt(discAmt)}</b></div>` : '<div></div>'}
            <div style="font-size:1.1rem;font-weight:700;color:var(--brown)">Total: <span style="color:var(--gold-dark)">${fmt(total)}</span></div>
          </div>
        </div>

        <div class="form-grid" style="margin-top:16px">
          <!-- Cliente -->
          <div class="form-group full-col">
            <label>Cliente *</label>
            <div style="display:flex;gap:8px">
              <input type="text" class="form-ctrl" id="lay-cust-name" placeholder="Nombre del cliente"
                value="${State.customer?.name || ''}" style="flex:1" />
              <input type="text" class="form-ctrl" id="lay-cust-phone" placeholder="Teléfono"
                value="${State.customer?.phone || ''}" style="width:150px" />
            </div>
            ${State.customer ? `<p style="font-size:.72rem;color:var(--green);margin-top:4px"><i class="fa-solid fa-circle-check"></i> Cliente seleccionado: <b>${State.customer.name}</b></p>` : ''}
          </div>

          <!-- Abono inicial -->
          <div class="form-group">
            <label><i class="fa-solid fa-coins" style="color:var(--gold);margin-right:4px"></i>Abono inicial</label>
            <input type="number" class="form-ctrl" id="lay-initial-payment"
              placeholder="0" min="0" step="1000"
              oninput="updateLayawayBalance(${total})" />
          </div>

          <!-- Método de pago del abono -->
          <div class="form-group">
            <label>Método del abono</label>
            <select class="form-ctrl" id="lay-payment-method">
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>

          <!-- Fecha de vencimiento -->
          <div class="form-group">
            <label><i class="fa-solid fa-calendar" style="color:var(--gold);margin-right:4px"></i>Fecha límite de pago</label>
            <input type="date" class="form-ctrl" id="lay-expires-at"
              min="${new Date().toISOString().slice(0,10)}"
              value="${new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10)}" />
          </div>

          <!-- Notas -->
          <div class="form-group full-col">
            <label>Notas</label>
            <input type="text" class="form-ctrl" id="lay-notes"
              placeholder="Ej. Pago en cuotas semanales, mercancía para reventa…" />
          </div>
        </div>

        <!-- Balance visual -->
        <div class="lay-balance-display" id="lay-balance-display">
          <div class="lay-balance-row">
            <span>Total del apartado</span>
            <span class="fw-bold">${fmt(total)}</span>
          </div>
          <div class="lay-balance-row">
            <span>Abono inicial</span>
            <span class="text-green fw-bold" id="lay-balance-paid">${fmt(0)}</span>
          </div>
          <div class="lay-balance-row lay-balance-pending">
            <span>Saldo pendiente</span>
            <span class="fw-bold" id="lay-balance-pending-amt">${fmt(total)}</span>
          </div>
        </div>

      </div>
      <div class="modal-ftr">
        <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
        <button class="btn btn-gold" id="lay-save-btn" onclick="saveLayaway(${total}, this)">
          <i class="fa-solid fa-hand-holding-dollar"></i> Guardar apartado
        </button>
      </div>
    </div>`;
  document.body.appendChild(bg);
}

function updateLayawayBalance(total) {
  const paid    = +document.getElementById('lay-initial-payment')?.value || 0;
  const pending = total - paid;
  const paidEl  = document.getElementById('lay-balance-paid');
  const pendEl  = document.getElementById('lay-balance-pending-amt');
  if (paidEl) paidEl.textContent  = fmt(paid);
  if (pendEl) pendEl.textContent  = fmt(Math.max(0, pending));
  if (pendEl) pendEl.style.color  = pending <= 0 ? 'var(--green)' : 'var(--orange)';
}

async function saveLayaway(total, btn) {
  const custName  = document.getElementById('lay-cust-name')?.value?.trim();
  const custPhone = document.getElementById('lay-cust-phone')?.value?.trim() || '';
  const initPay   = +document.getElementById('lay-initial-payment')?.value || 0;
  const payMethod = document.getElementById('lay-payment-method')?.value || 'cash';
  const expiresAt = document.getElementById('lay-expires-at')?.value || null;
  const notes     = document.getElementById('lay-notes')?.value?.trim() || '';
  const { subtotal, discAmt } = cartTotals();

  if (!custName) { Toast.error('El nombre del cliente es obligatorio'); return; }
  if (initPay > total) { Toast.error('El abono no puede superar el total'); return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando…';

  try {
    // Buscar o crear cliente
    let customerId = State.customer?.id || null;
    if (!customerId && custName) {
      // Buscar si ya existe
      const found = await PosDB.Customers.search(custName);
      const match = found.find(c => c.name.toLowerCase() === custName.toLowerCase());
      if (match) {
        customerId = match.id;
      } else {
        const newCust = await PosDB.Customers.add({ name: custName, phone: custPhone });
        customerId = newCust.id;
      }
    }

    const status = initPay >= total ? 'ready' : 'active';

    const layawayPayload = {
      customer_id:   customerId,
      customer_name: custName,
      customer_phone: custPhone,
      total,
      amount_paid:   initPay,
      discount_pct:  State.globalDisc,
      discount_amt:  discAmt,
      expires_at:    expiresAt || null,
      status,
      notes,
      cashier: 'Admin',
    };

    const itemsPayload = State.cart.map(i => ({
      product_id:   i.product_id,
      product_name: i.product_name,
      category:     i.category || '',
      unit_price:   i.unit_price,
      quantity:     i.quantity,
      discount_pct: i.discount_pct || 0,
      line_total:   i.unit_price * i.quantity * (1 - (i.discount_pct||0)/100),
    }));

    const layaway = await PosDB.Layaways.create(layawayPayload, itemsPayload);

    // Descontar stock (los productos quedan reservados)
    for (const item of State.cart) {
      await PosDB.Stock.adjust(
        item.product_id, -item.quantity, 'out',
        `Apartado ${_layawayNum(layaway.layaway_num)}`, layaway.id
      );
      if (State.stock[item.product_id] !== undefined)
        State.stock[item.product_id] = Math.max(0, (State.stock[item.product_id]||0) - item.quantity);
    }

    // Registrar abono inicial si hay
    if (initPay > 0) {
      await PosDB.Layaways.addPayment(layaway.id, {
        amount: initPay, payment_method: payMethod,
        notes: 'Abono inicial', cashier: 'Admin',
      });
    }

    // Limpiar carrito
    State.cart = []; State.customer = null;
    renderCart(); renderPOSProducts();

    btn.closest('.modal-bg').remove();

    Toast.success(`Apartado ${_layawayNum(layaway.layaway_num)} creado — Saldo: ${fmt(total - initPay)}`);

    // Actualizar badge sidebar
    _refreshLayawayBadge();

    // Imprimir recibo del apartado
    setTimeout(() => printLayawayReceipt(layaway.id), 400);

  } catch(e) {
    Toast.error('Error: ' + e.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-hand-holding-dollar"></i> Guardar apartado';
  }
}

/* ── Detalle del apartado + abonar ── */
async function openLayawayDetail(layawayId) {
  const lay = await PosDB.Layaways.getById(layawayId);
  if (!lay) return;

  const items    = lay.layaway_items || [];
  const payments = lay.layaway_payments || [];
  const balance  = lay.total - lay.amount_paid;
  const isActive = lay.status === 'active' || lay.status === 'ready';

  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal-box modal-lg">
      <div class="modal-hdr">
        <div>
          <h3><i class="fa-solid fa-hand-holding-dollar" style="color:var(--gold);margin-right:8px"></i>${_layawayNum(lay.layaway_num)}</h3>
          <p style="font-size:.78rem;color:var(--text2);margin-top:2px">${lay.customer_name} · ${fmtDate(lay.created_at)}</p>
        </div>
        <button class="icon-btn" onclick="this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

        <!-- Columna izquierda: ítems + resumen -->
        <div>
          <div class="card-title"><i class="fa-solid fa-box-open"></i> Productos</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
            ${items.map(it => `
            <div class="lay-item-row">
              <div class="lay-item-name"><b>${it.product_name}</b></div>
              <div class="lay-item-detail">
                <span style="color:var(--text2)">${it.quantity} × ${fmt(it.unit_price)}</span>
                <span class="fw-bold text-gold">${fmt(it.line_total)}</span>
              </div>
            </div>`).join('')}
          </div>

          <!-- Barra de progreso de pago -->
          <div class="lay-progress-card">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span style="font-size:.8rem;color:var(--text2)">Progreso de pago</span>
              <span style="font-size:.8rem;font-weight:700">${Math.round((lay.amount_paid/lay.total)*100)}%</span>
            </div>
            <div class="lay-progress-bar">
              <div class="lay-progress-fill" style="width:${Math.min(100,Math.round((lay.amount_paid/lay.total)*100))}%"></div>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:10px">
              <div style="font-size:.82rem"><span style="color:var(--text3)">Abonado</span><br><b class="text-green">${fmt(lay.amount_paid)}</b></div>
              <div style="font-size:.82rem;text-align:center"><span style="color:var(--text3)">Total</span><br><b>${fmt(lay.total)}</b></div>
              <div style="font-size:.82rem;text-align:right"><span style="color:var(--text3)">Saldo</span><br><b style="color:${balance>0?'var(--orange)':'var(--green)'}">${balance>0?fmt(balance):'<i class="fa-solid fa-circle-check"></i> Pagado'}</b></div>
            </div>
          </div>

          ${lay.notes ? `<div style="background:rgba(181,134,74,.07);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-top:12px;font-size:.82rem"><i class="fa-solid fa-note-sticky" style="color:var(--gold);margin-right:6px"></i>${lay.notes}</div>` : ''}
          ${lay.expires_at ? `<div style="font-size:.8rem;color:var(--text3);margin-top:8px"><i class="fa-solid fa-calendar"></i> Vence: <b>${lay.expires_at}</b></div>` : ''}
          ${_layawayStatusChip(lay.status)}
        </div>

        <!-- Columna derecha: historial de abonos + abonar -->
        <div>
          <div class="card-title"><i class="fa-solid fa-coins"></i> Historial de abonos</div>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;margin-bottom:14px">
            ${payments.length ? payments.map(p => `
            <div class="lay-payment-row">
              <div>
                <div style="font-size:.82rem;font-weight:600">${fmt(p.amount)}</div>
                <div style="font-size:.72rem;color:var(--text3)">${fmtDateTime(p.created_at)} · ${payMethodLabel(p.payment_method)}</div>
              </div>
              <span class="chip chip-green" style="font-size:.68rem">${payMethodLabel(p.payment_method)}</span>
            </div>`).join('') : '<p style="color:var(--text3);font-size:.82rem">Sin abonos registrados</p>'}
          </div>

          ${isActive && balance > 0 ? `
          <div style="background:var(--cream-light);border:1px solid var(--cream-mid);border-radius:12px;padding:14px">
            <div class="card-title" style="margin-bottom:12px"><i class="fa-solid fa-plus-circle"></i> Registrar abono</div>
            <div class="form-grid cols-1" style="gap:10px">
              <div class="form-group">
                <label>Monto del abono</label>
                <input type="number" class="form-ctrl" id="lay-new-payment-amt"
                  placeholder="0" min="1" max="${balance}"
                  style="font-size:1rem;font-weight:700" />
                <p style="font-size:.72rem;color:var(--text3);margin-top:3px">Saldo pendiente: <b>${fmt(balance)}</b></p>
              </div>
              <div class="form-group">
                <label>Método</label>
                <select class="form-ctrl" id="lay-new-payment-method">
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </div>
              <div class="form-group">
                <label>Notas (opcional)</label>
                <input type="text" class="form-ctrl" id="lay-new-payment-notes" placeholder="Ej. Abono semana 2…" />
              </div>
              <button class="btn btn-gold" onclick="addLayawayPayment('${lay.id}', ${lay.total}, this)">
                <i class="fa-solid fa-coins"></i> Registrar abono
              </button>
            </div>
          </div>` : ''}

          ${lay.status === 'ready' ? `
          <div style="background:rgba(39,160,106,.07);border:1px solid rgba(39,160,106,.25);border-radius:12px;padding:14px;margin-top:10px;text-align:center">
            <p style="font-size:.88rem;font-weight:600;color:var(--green);margin-bottom:10px"><i class="fa-solid fa-circle-check"></i> ¡Pagado completo!</p>
            <button class="btn btn-green" onclick="openLayawayCheckout('${lay.id}');this.closest('.modal-bg').remove()">
              <i class="fa-solid fa-cash-register"></i> Finalizar y generar venta
            </button>
          </div>` : ''}
        </div>

      </div>
      <div class="modal-ftr" style="justify-content:space-between">
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline btn-sm" onclick="printLayawayReceipt('${lay.id}')">
            <i class="fa-solid fa-print"></i> Recibo
          </button>
        </div>
        <div style="display:flex;gap:8px">
          ${isActive ? `<button class="btn btn-danger btn-sm" onclick="cancelLayaway('${lay.id}');this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i> Cancelar apartado</button>` : ''}
          <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">Cerrar</button>
          ${isActive ? `<button class="btn btn-gold" onclick="openLayawayCheckout('${lay.id}');this.closest('.modal-bg').remove()"><i class="fa-solid fa-cash-register"></i> Cobrar</button>` : ''}
        </div>
      </div>
    </div>`;
  document.body.appendChild(bg);
}

/* ── Registrar abono ── */
async function addLayawayPayment(layawayId, total, btn) {
  const bg     = btn.closest('.modal-bg');
  const amount = +bg.querySelector('#lay-new-payment-amt')?.value || 0;
  const method = bg.querySelector('#lay-new-payment-method')?.value || 'cash';
  const notes  = bg.querySelector('#lay-new-payment-notes')?.value?.trim() || '';

  if (amount <= 0) { Toast.error('Ingresa un monto válido'); return; }

  btn.disabled = true;
  try {
    const result = await PosDB.Layaways.addPayment(layawayId, {
      amount, payment_method: method, notes, cashier: 'Admin',
    });
    const statusMsg = result.isComplete ? '¡Apartado pagado completo!' : `Saldo restante: ${fmt(total - result.totalPaid)}`;
    Toast.success(`Abono registrado — ${statusMsg}`);
    bg.remove();
    renderLayaways(_layawayFilter);
    _refreshLayawayBadge();
    if (result.isComplete) {
      setTimeout(() => {
        confirmDlg('¡El apartado está pagado! ¿Deseas convertirlo en venta ahora?')
          .then(ok => { if (ok) openLayawayCheckout(layawayId); });
      }, 400);
    }
  } catch(e) {
    Toast.error('Error: ' + e.message);
    btn.disabled = false;
  }
}

/* ── Convertir apartado en venta ── */
async function openLayawayCheckout(layawayId) {
  const lay = await PosDB.Layaways.getById(layawayId);
  if (!lay) return;

  const balance = lay.total - lay.amount_paid;
  const items   = lay.layaway_items || [];

  const bg = document.createElement('div');
  bg.className = 'modal-bg open';
  bg.innerHTML = `
    <div class="modal-box" style="max-width:480px">
      <div class="modal-hdr">
        <h3><i class="fa-solid fa-cash-register" style="color:var(--green);margin-right:8px"></i>Cobrar apartado ${_layawayNum(lay.layaway_num)}</h3>
        <button class="icon-btn" onclick="this.closest('.modal-bg').remove()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="pay-summary">
          <div class="pay-summary-row"><span>Cliente</span><span><b>${lay.customer_name}</b></span></div>
          <div class="pay-summary-row"><span>Total apartado</span><span>${fmt(lay.total)}</span></div>
          <div class="pay-summary-row"><span>Ya abonado</span><span class="text-green">${fmt(lay.amount_paid)}</span></div>
          <div class="pay-summary-row total"><span>SALDO A COBRAR</span><span>${fmt(balance)}</span></div>
        </div>

        ${balance > 0 ? `
        <div class="form-group" style="margin-top:14px">
          <label>Método de pago del saldo</label>
          <div class="payment-methods" style="margin-top:8px">
            <button class="pay-method-btn active" data-lco="cash" onclick="document.querySelectorAll('[data-lco]').forEach(b=>b.classList.remove('active'));this.classList.add('active')"><i class="fa-solid fa-money-bill"></i><span>Efectivo</span></button>
            <button class="pay-method-btn" data-lco="card" onclick="document.querySelectorAll('[data-lco]').forEach(b=>b.classList.remove('active'));this.classList.add('active')"><i class="fa-solid fa-credit-card"></i><span>Tarjeta</span></button>
            <button class="pay-method-btn" data-lco="transfer" onclick="document.querySelectorAll('[data-lco]').forEach(b=>b.classList.remove('active'));this.classList.add('active')"><i class="fa-solid fa-building-columns"></i><span>Transferencia</span></button>
          </div>
        </div>
        ${lay.payment_method === 'cash' ? `
        <div class="form-group" style="margin-top:12px">
          <label>Monto recibido</label>
          <input type="number" class="form-ctrl" id="lco-amount-paid" placeholder="${balance}"
            min="0" style="font-size:1.1rem;font-weight:700"
            oninput="const c=+this.value-${balance};document.getElementById('lco-change').textContent=c>0?'Cambio: '+fmt(c):''">
          <p id="lco-change" style="font-size:.82rem;color:var(--green);margin-top:4px;font-weight:700"></p>
        </div>` : ''}` : `
        <div style="background:rgba(39,160,106,.08);border:1px solid rgba(39,160,106,.25);border-radius:10px;padding:12px;margin-top:12px;text-align:center;color:var(--green);font-weight:600">
          <i class="fa-solid fa-circle-check"></i> Sin saldo pendiente — el apartado ya fue pagado completo
        </div>`}
      </div>
      <div class="modal-ftr">
        <button class="btn btn-outline" onclick="this.closest('.modal-bg').remove()">Cancelar</button>
        <button class="btn btn-green" onclick="completeLayaway('${lay.id}', ${lay.total}, ${lay.amount_paid}, ${balance}, '${lay.customer_id||''}', '${lay.customer_name}', this)" style="min-width:160px">
          <i class="fa-solid fa-check"></i> Completar y generar factura
        </button>
      </div>
    </div>`;
  document.body.appendChild(bg);
}

async function completeLayaway(layawayId, total, alreadyPaid, balance, customerId, customerName, btn) {
  const bg     = btn.closest('.modal-bg');
  const method = bg.querySelector('[data-lco].active')?.dataset.lco || 'cash';
  const amountInput = bg.querySelector('#lco-amount-paid');
  const finalPay = balance > 0 ? (+amountInput?.value || balance) : 0;

  if (balance > 0 && finalPay < balance && method === 'cash') {
    Toast.error('El monto recibido no cubre el saldo'); return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando…';

  try {
    // Registrar último abono si hay saldo
    if (balance > 0) {
      await PosDB.Layaways.addPayment(layawayId, {
        amount: balance, payment_method: method,
        notes: 'Pago final', cashier: 'Admin',
      });
    }

    // Traer ítems del apartado para crear la venta
    const lay = await PosDB.Layaways.getById(layawayId);
    const items = lay.layaway_items || [];

    // El stock ya fue descontado al crear el apartado — no descontar de nuevo
    const salePayload = {
      customer_id:    customerId || null,
      customer_name:  customerName,
      subtotal:       lay.total,
      discount_pct:   lay.discount_pct || 0,
      discount_amt:   lay.discount_amt || 0,
      tax_pct:        State.taxPct,
      tax_amt:        0,
      total:          lay.total,
      payment_method: method,
      amount_paid:    lay.total,
      change_given:   Math.max(0, finalPay - balance),
      sale_notes:     `Apartado ${_layawayNum(lay.layaway_num)}`,
      status:         'completed',
      cashier:        'Admin',
    };

    const itemsPayload = items.map(i => ({
      product_id:   i.product_id,
      product_name: i.product_name,
      category:     i.category || '',
      unit_price:   i.unit_price,
      quantity:     i.quantity,
      discount_pct: i.discount_pct || 0,
      line_total:   i.line_total,
    }));

    // Crear la venta (sin descontar stock — ya se descontó)
    const sale = await PosDB.Sales.create(salePayload, itemsPayload);

    // Marcar apartado como completado
    await PosDB.Layaways.complete(layawayId, sale.id);

    bg.remove();
    Toast.success(`Venta completada — Factura ${invoiceNum(sale.invoice_num)}`);
    renderLayaways(_layawayFilter);
    _refreshLayawayBadge();
    setTimeout(() => printInvoice(sale.id, false), 400);

  } catch(e) {
    Toast.error('Error: ' + e.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Completar y generar factura';
  }
}

/* ── Cancelar apartado ── */
async function cancelLayaway(layawayId) {
  const ok = await confirmDlg('¿Cancelar este apartado? El stock reservado se devolverá al inventario.');
  if (!ok) return;

  const lay = await PosDB.Layaways.getById(layawayId);
  if (!lay) return;

  try {
    // Devolver stock
    for (const it of (lay.layaway_items || [])) {
      if (it.product_id) {
        await PosDB.Stock.adjust(
          it.product_id, it.quantity, 'in',
          `Cancelación apartado ${_layawayNum(lay.layaway_num)}`, layawayId
        );
        if (State.stock[it.product_id] !== undefined)
          State.stock[it.product_id] = (State.stock[it.product_id] || 0) + it.quantity;
      }
    }
    await PosDB.Layaways.cancel(layawayId, 'Cancelado por administrador');
    Toast.success('Apartado cancelado — stock devuelto al inventario');
    renderLayaways(_layawayFilter);
    _refreshLayawayBadge();
    renderPOSProducts();
  } catch(e) { Toast.error('Error: ' + e.message); }
}

/* ── Badge sidebar ── */
async function _refreshLayawayBadge() {
  const active = await PosDB.Layaways.getAll('active');
  const ready  = await PosDB.Layaways.getAll('ready');
  const total  = active.length + ready.length;
  const badge  = document.getElementById('layaway-badge');
  if (badge) { badge.textContent = total; badge.style.display = total ? '' : 'none'; }
}

/* ── Imprimir recibo del apartado ── */
async function printLayawayReceipt(layawayId) {
  const lay = await PosDB.Layaways.getById(layawayId);
  if (!lay) return;
  const cfg   = window._posSettings || {};
  const items = lay.layaway_items || [];
  const pays  = lay.layaway_payments || [];
  const bal   = lay.total - lay.amount_paid;

  const w = window.open('', '_blank', 'width=400,height=700');
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Apartado ${_layawayNum(lay.layaway_num)}</title>
    <style>
      * { box-sizing:border-box; margin:0; padding:0; }
      body { font-family:'Courier New',monospace; font-size:12px; color:#000; width:80mm; max-width:80mm; padding:5mm; }
      h1 { font-size:18px; text-align:center; } h2 { font-size:13px; text-align:center; margin-top:3px; }
      .center { text-align:center; } .right { text-align:right; }
      .line { border-top:1px dashed #000; margin:5px 0; }
      .row { display:flex; justify-content:space-between; margin:2px 0; }
      .total-row { display:flex; justify-content:space-between; font-size:14px; font-weight:bold; margin-top:4px; border-top:2px solid #000; padding-top:4px; }
      .bal-row { display:flex; justify-content:space-between; font-size:13px; font-weight:bold; color:#c07030; }
      @media print { button { display:none; } }
    </style></head><body>
    <h1>${cfg.store_name || 'Shaden'}</h1>
    <div class="center" style="font-size:10px">${cfg.store_address || ''}</div>
    <div class="line"></div>
    <h2>COMPROBANTE DE APARTADO</h2>
    <div class="center" style="font-size:13px;font-weight:bold;margin:4px 0">${_layawayNum(lay.layaway_num)}</div>
    <div class="row"><span>Fecha:</span><span>${fmtDate(lay.created_at)}</span></div>
    <div class="row"><span>Cliente:</span><span><b>${lay.customer_name}</b></span></div>
    ${lay.customer_phone ? `<div class="row"><span>Tel:</span><span>${lay.customer_phone}</span></div>` : ''}
    ${lay.expires_at ? `<div class="row"><span>Vence:</span><span>${lay.expires_at}</span></div>` : ''}
    <div class="line"></div>
    <b>Productos apartados:</b>
    ${items.map(it => `
    <div style="margin:3px 0">
      <div>${it.product_name}</div>
      <div class="row" style="font-size:11px;color:#555"><span>${it.quantity} × ${fmt(it.unit_price)}</span><span>${fmt(it.line_total)}</span></div>
    </div>`).join('')}
    <div class="line"></div>
    <div class="total-row"><span>TOTAL</span><span>${fmt(lay.total)}</span></div>
    <div class="row text-green"><span>Abonado</span><span><b>${fmt(lay.amount_paid)}</b></span></div>
    <div class="bal-row"><span>SALDO PENDIENTE</span><span>${fmt(bal)}</span></div>
    ${pays.length > 1 ? `
    <div class="line"></div>
    <b style="font-size:11px">Historial de abonos:</b>
    ${pays.map(p => `<div class="row" style="font-size:10px"><span>${fmtDate(p.created_at)}</span><span>${payMethodLabel(p.payment_method)}: ${fmt(p.amount)}</span></div>`).join('')}` : ''}
    ${lay.notes ? `<div class="line"></div><div style="font-size:11px">Nota: ${lay.notes}</div>` : ''}
    <div class="line"></div>
    <div class="center" style="font-size:10px">${cfg.receipt_footer || '¡Gracias por tu preferencia!'}</div>
    <div class="center" style="margin-top:10px"><button onclick="window.print()">🖨 Imprimir</button></div>
    </body></html>`);
  w.document.close();
}

/* ─────────────────────────────────────────────
   ESCÁNER — MODO INVENTARIO
───────────────────────────────────────────── */
async function handleInventoryScan(code) {
  // Buscar producto por barcode
  let prod = State.products.find(p => p.barcode === code);
  if (!prod) prod = await ShadenDB.Products.getByBarcode(code);

  const indicator = document.getElementById('inventory-scanner-indicator');

  if (!prod) {
    Toast.error(`Código <b>${code}</b> no registrado`);
    if (indicator) { indicator.classList.add('flash-err'); setTimeout(() => indicator.classList.remove('flash-err'), 600); }
    return;
  }

  if (indicator) { indicator.classList.add('flash-ok'); setTimeout(() => indicator.classList.remove('flash-ok'), 600); }
  Toast.info(`<b>${prod.name}</b> — abriendo entrada de stock`);
  setTimeout(() => openStockIn(prod.id, prod.name), 300);
}

function bindInventoryScannerInput() {
  const inp = document.getElementById('inventory-scanner-input');
  if (!inp || inp.dataset.scanInit) return;
  inp.dataset.scanInit = '1';
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = inp.value.trim();
      inp.value = '';
      if (code.length >= 4) handleInventoryScan(code);
    }
  });
}

/* ─────────────────────────────────────────────
   ARRANQUE
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Sin login — acceso directo al POS
  document.getElementById('pos-app').style.display = 'flex';
  initApp();

  // Sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('pos-sidebar').classList.toggle('collapsed');
  });

  // Pay modal events
  document.querySelectorAll('.pay-method-btn').forEach(btn => {
    btn.addEventListener('click', () => selectPayMethod(btn.dataset.method));
  });
  document.getElementById('pay-amount-input')?.addEventListener('input', updateChange);
  ['pay-mix-cash','pay-mix-card','pay-mix-xfer'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateChange);
  });
  document.getElementById('btn-complete-sale')?.addEventListener('click', completeSale);
  document.getElementById('btn-cancel-payment')?.addEventListener('click', () => closeModal('payment-modal'));

  // Report period
  document.getElementById('report-period')?.addEventListener('change', renderReports);
});
