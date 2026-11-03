/* =============================================
   SHADEN POS — Utilidades
   ============================================= */

/* ── Formato de moneda ── */
function fmt(n) {
  if (n == null || isNaN(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('es-CO');
}

/* ── Formato de fecha corta ── */
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ── Formato de fecha + hora ── */
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
         ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

/* ── Reloj live ── */
function startClock(el) {
  function tick() {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tick();
  return setInterval(tick, 1000);
}

/* ── Toasts ── */
const Toast = (() => {
  let container;
  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'pos-toast';
      document.body.appendChild(container);
    }
    return container;
  }
  function show(msg, type = 'success', duration = 3200) {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i> ${msg}`;
    getContainer().appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 320); }, duration);
  }
  return { success: (m) => show(m, 'success'), error: (m) => show(m, 'error'), info: (m) => show(m, 'info') };
})();

/* ── Confirm dialog ── */
function confirmDlg(msg) {
  return new Promise(resolve => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg open';
    bg.innerHTML = `
      <div class="modal-box" style="max-width:360px">
        <div class="modal-hdr"><h3>Confirmar</h3></div>
        <div class="modal-body"><p style="font-size:.9rem;line-height:1.5">${msg}</p></div>
        <div class="modal-ftr">
          <button class="btn btn-outline" id="dlg-cancel">Cancelar</button>
          <button class="btn btn-danger"  id="dlg-ok">Confirmar</button>
        </div>
      </div>`;
    document.body.appendChild(bg);
    bg.querySelector('#dlg-cancel').onclick = () => { bg.remove(); resolve(false); };
    bg.querySelector('#dlg-ok').onclick     = () => { bg.remove(); resolve(true); };
    bg.onclick = (e) => { if (e.target === bg) { bg.remove(); resolve(false); } };
  });
}

/* ── Modal genérico ── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* ── Generar número de factura legible ── */
function invoiceNum(n) {
  return 'FAC-' + String(n).padStart(5, '0');
}

/* ── Método de pago legible ── */
function payMethodLabel(m) {
  const map = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mixed: 'Mixto' };
  return map[m] || m;
}

/* ── Status chip ── */
function statusChip(status) {
  const map = {
    completed: '<span class="chip chip-green"><i class="fa-solid fa-check"></i> Completada</span>',
    cancelled:  '<span class="chip chip-red"><i class="fa-solid fa-xmark"></i> Anulada</span>',
    refunded:   '<span class="chip chip-orange"><i class="fa-solid fa-rotate-left"></i> Reembolso</span>',
    open:       '<span class="chip chip-green"><i class="fa-solid fa-lock-open"></i> Abierta</span>',
    closed:     '<span class="chip chip-gray"><i class="fa-solid fa-lock"></i> Cerrada</span>',
  };
  return map[status] || `<span class="chip chip-gray">${status}</span>`;
}

/* ── Debounce ── */
function debounce(fn, ms = 320) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ── Input de dinero COP con puntos de miles ──────────────────────────
   Uso: bindCopInput('my-input-id', onChangeFn)
   - Convierte el input a type="text"
   - Muestra el valor formateado con puntos: 1.250.000
   - El valor numérico real está en el atributo data-raw
   - Para leer el valor: getCopValue('my-input-id')
   ──────────────────────────────────────────────────────────────────── */
function bindCopInput(id, onChangeFn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type = 'text';
  el.inputMode = 'numeric';
  el.dataset.raw = '0';

  el.addEventListener('input', () => {
    // Extraer solo dígitos
    const digits = el.value.replace(/\D/g, '');
    const num = parseInt(digits, 10) || 0;
    el.dataset.raw = String(num);
    // Formatear con puntos de miles
    el.value = num > 0 ? num.toLocaleString('es-CO') : '';
    // Mover cursor al final
    const len = el.value.length;
    el.setSelectionRange(len, len);
    if (typeof onChangeFn === 'function') onChangeFn(num);
  });

  el.addEventListener('focus', () => {
    // Al enfocar, mostrar solo dígitos para facilitar borrado
    const num = parseInt(el.dataset.raw, 10) || 0;
    el.value = num > 0 ? String(num) : '';
  });

  el.addEventListener('blur', () => {
    // Al salir, volver a formatear
    const num = parseInt(el.dataset.raw, 10) || 0;
    el.value = num > 0 ? num.toLocaleString('es-CO') : '';
  });
}

function getCopValue(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  return parseInt(el.dataset.raw, 10) || 0;
}

/* ── Placeholder image para productos sin imagen ── */
function productImg(src, name) {
  if (src && src.startsWith('http')) return `<img src="${src}" alt="${name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=ppc-img-placeholder><i class=\\'fa-solid fa-box\\'></i></div>'" />`;
  return `<div class="ppc-img-placeholder"><i class="fa-solid fa-box"></i></div>`;
}

/* ── Imprimir factura — ticket térmico 80mm bonito ── */
function printInvoice(saleId) {
  PosDB.Sales.getById(saleId).then(async sale => {
    if (!sale) return;
    const cfg = window._posSettings || await PosDB.PosSettings.get();
    const w = window.open('', '_blank', 'width=380,height=720');
    if (!w) { Toast.error('Permite las ventanas emergentes para imprimir'); return; }

    const invoiceNum = `${cfg.invoice_prefix || 'FAC'}-${String(sale.invoice_num).padStart(5,'0')}`;
    const storeName = cfg.store_name || 'Shaden';
    const storeAddr = cfg.store_address || '';
    const storePhone = cfg.store_phone || '';
    const footer = cfg.receipt_footer || '¡Gracias por tu compra!';

    const items = (sale.sale_items || []).map(it => {
      const hasDisc = it.discount_pct > 0;
      return `
        <tr>
          <td class="prod-name">${it.product_name}${hasDisc ? `<br><small class="disc-tag">Desc. ${it.discount_pct}%</small>` : ''}</td>
          <td class="qty">${it.quantity}</td>
          <td class="price">${fmt(it.unit_price)}</td>
          <td class="total">${fmt(it.line_total)}</td>
        </tr>`;
    }).join('');

    w.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${invoiceNum}</title>
  <style>
    @page { margin: 4mm; size: 80mm auto; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11.5px;
      color: #000;
      width: 72mm;
      background: #fff;
      padding: 4mm 2mm;
    }
    /* ── Encabezado ── */
    .header { text-align: center; margin-bottom: 6px; }
    .store-name {
      font-size: 17px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .store-sub { font-size: 10px; color: #333; margin-top: 1px; }
    .store-phone { font-size: 10.5px; margin-top: 2px; }

    /* ── Separadores ── */
    .sep-solid { border: none; border-top: 1.5px solid #000; margin: 5px 0; }
    .sep-dash  { border: none; border-top: 1px dashed #555; margin: 5px 0; }

    /* ── Info factura ── */
    .inv-box { text-align: center; margin: 4px 0; }
    .inv-num { font-size: 13.5px; font-weight: 900; letter-spacing: 1px; }
    .inv-date { font-size: 10px; color: #444; margin-top: 1px; }
    .inv-row { display: flex; justify-content: space-between; font-size: 10.5px; margin: 1px 0; }
    .inv-row span:first-child { color: #444; }
    .inv-row span:last-child { font-weight: 700; }

    /* ── Tabla de productos ── */
    table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    thead tr th {
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .5px;
      padding: 2px 1px 3px;
      border-bottom: 1.5px solid #000;
    }
    th.prod-name { text-align: left; width: 44%; }
    th.qty  { text-align: center; width: 10%; }
    th.price { text-align: right; width: 22%; }
    th.total { text-align: right; width: 24%; }
    tbody td {
      font-size: 11px;
      padding: 3px 1px;
      border-bottom: 1px dashed #ccc;
      vertical-align: top;
    }
    td.prod-name { text-align: left; }
    td.qty  { text-align: center; }
    td.price { text-align: right; white-space: nowrap; }
    td.total { text-align: right; font-weight: 700; white-space: nowrap; }
    small.disc-tag { font-size: 9px; color: #888; }

    /* ── Totales ── */
    .totals { width: 100%; margin-top: 2px; }
    .totals td { font-size: 11px; padding: 1.5px 1px; }
    .totals td:last-child { text-align: right; font-weight: 700; }
    .grand td {
      font-size: 14px;
      font-weight: 900;
      padding-top: 4px;
      padding-bottom: 3px;
    }
    .grand td:first-child { letter-spacing: .5px; }
    .pago td { font-size: 10.5px; }
    .cambio td { font-size: 10.5px; color: #555; }

    /* ── Footer ── */
    .footer {
      text-align: center;
      font-size: 10px;
      color: #333;
      margin-top: 8px;
      line-height: 1.5;
    }
    .footer .thanks {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }

    /* ── Botón solo en pantalla ── */
    .print-btn {
      display: block;
      width: 100%;
      margin-top: 12px;
      padding: 8px;
      font-size: 13px;
      font-weight: 700;
      background: #000;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      letter-spacing: 1px;
    }
    .print-btn:hover { background: #333; }
    .print-hint {
      font-family: Arial, sans-serif;
      font-size: 10px;
      color: #555;
      background: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 6px 8px;
      margin-top: 10px;
      line-height: 1.5;
    }
    @media print {
      body { padding: 0; }
      .print-btn { display: none; }
      .print-hint { display: none; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="store-name">${storeName}</div>
    ${storeAddr ? `<div class="store-sub">${storeAddr}</div>` : ''}
    ${storePhone ? `<div class="store-phone">Tel: ${storePhone}</div>` : ''}
  </div>

  <hr class="sep-solid">

  <div class="inv-box">
    <div class="inv-num">FACTURA ${invoiceNum}</div>
    <div class="inv-date">${fmtDateTime(sale.created_at)}</div>
  </div>

  <hr class="sep-dash">

  <div class="inv-row"><span>Cliente:</span><span>${sale.customer_name || 'Cliente general'}</span></div>
  <div class="inv-row"><span>Cajero:</span><span>${sale.cashier || 'Admin'}</span></div>
  <div class="inv-row"><span>Pago:</span><span>${payMethodLabel(sale.payment_method)}</span></div>

  ${sale.sale_notes ? `<div class="inv-row" style="margin-top:3px"><span>Nota:</span><span style="text-align:right;max-width:60%">${sale.sale_notes}</span></div>` : ''}

  <hr class="sep-dash">

  <table>
    <thead>
      <tr>
        <th class="prod-name">Producto</th>
        <th class="qty">Cant</th>
        <th class="price">Precio</th>
        <th class="total">Total</th>
      </tr>
    </thead>
    <tbody>${items}</tbody>
  </table>

  <hr class="sep-solid">

  <table class="totals">
    ${sale.subtotal !== sale.total || sale.discount_amt > 0 || sale.tax_amt > 0 ? `
    <tr><td>Subtotal</td><td>${fmt(sale.subtotal)}</td></tr>` : ''}
    ${sale.discount_amt > 0 ? `<tr><td>Descuento (${sale.discount_pct}%)</td><td>-${fmt(sale.discount_amt)}</td></tr>` : ''}
    ${sale.tax_amt > 0 ? `<tr><td>IVA (${sale.tax_pct}%)</td><td>${fmt(sale.tax_amt)}</td></tr>` : ''}
    <tr class="grand">
      <td>TOTAL</td>
      <td>${fmt(sale.total)}</td>
    </tr>
    <tr class="pago">
      <td>Pagado (${payMethodLabel(sale.payment_method)})</td>
      <td>${fmt(sale.amount_paid)}</td>
    </tr>
    ${sale.change_given > 0 ? `<tr class="cambio"><td>Cambio</td><td>${fmt(sale.change_given)}</td></tr>` : ''}
  </table>

  <hr class="sep-dash">

  <div class="footer">
    <div class="thanks">¡Gracias por tu compra!</div>
    <div>${footer}</div>
    <div style="margin-top:3px;font-size:9.5px">${invoiceNum} · ${fmtDateTime(sale.created_at)}</div>
  </div>

  <div class="print-hint">
    <b>⚙️ Al imprimir:</b> selecciona <b>Digital POS E200I</b> como impresora,
    tamaño de papel <b>80 × 297mm</b> (o «Recibo») y márgenes en <b>Ninguno / Sin márgenes</b>.
  </div>

  <button class="print-btn" onclick="window.print();">🖨&nbsp; Imprimir</button>

</body>
</html>`);
    w.document.close();
  }).catch(() => Toast.error('Error al generar factura'));
}

/* ── Exportar CSV ── */
function exportCSV(rows, filename) {
  if (!rows.length) { Toast.info('Sin datos para exportar'); return; }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const v = r[h] == null ? '' : String(r[h]);
      return v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(','))
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  Toast.success(`Exportado: ${filename}`);
}

async function exportSalesCSV(sales) {
  const rows = sales.map(s => ({
    Factura:   `${(window._posSettings?.invoice_prefix || 'FAC')}-${String(s.invoice_num).padStart(5,'0')}`,
    Fecha:     fmtDateTime(s.created_at),
    Cliente:   s.customer_name || 'General',
    Método:    payMethodLabel(s.payment_method),
    Subtotal:  s.subtotal,
    Descuento: s.discount_amt,
    IVA:       s.tax_amt,
    Total:     s.total,
    Estado:    s.status,
    Notas:     s.sale_notes || '',
  }));
  exportCSV(rows, `ventas_shaden_${new Date().toISOString().slice(0,10)}.csv`);
}

async function exportInventoryCSV() {
  const stock = await PosDB.Stock.getAll();
  const rows = stock.map(s => ({
    Producto:       s.products?.name || s.product_id,
    Stock_actual:   s.qty,
    Stock_minimo:   s.min_qty,
    Precio_costo:   s.cost_price || 0,
    Precio_venta:   s.products?.price || 0,
    Alerta:         s.qty <= s.min_qty ? 'SÍ' : 'NO',
  }));
  exportCSV(rows, `inventario_shaden_${new Date().toISOString().slice(0,10)}.csv`);
}

