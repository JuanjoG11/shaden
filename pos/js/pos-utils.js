/* =============================================
   SHADEN POS — Utilidades
   ============================================= */

/* ── Formato de moneda ── */
function fmt(n) {
  if (n == null || isNaN(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('es-CO');
}

/* ── Helper: aplica formato COP con puntos de miles a un input de texto ── */
function bindPriceInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => {
    const raw = el.value.replace(/\D/g, '');
    el.value = raw ? Number(raw).toLocaleString('es-CO') : '';
  });
  el.addEventListener('focus', () => {
    const raw = el.value.replace(/\./g, '').trim();
    if (raw) el.value = raw;
  });
  el.addEventListener('blur', () => {
    const raw = el.value.replace(/\D/g, '');
    el.value = raw ? Number(raw).toLocaleString('es-CO') : '';
  });
}

/* ── Leer precio de un input formateado con puntos ── */
function readPrice(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const raw = el.value.replace(/\D/g, '');
  return raw ? parseFloat(raw) : null;
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

/* ── Imprimir factura — ticket térmico 80mm (Digital POS E200I) ── */
function printInvoice(saleId) {
  PosDB.Sales.getById(saleId).then(async sale => {
    if (!sale) return;
    const cfg = window._posSettings || await PosDB.PosSettings.get();
    const w = window.open('', '_blank', 'width=400,height=800');
    if (!w) { Toast.error('Permite las ventanas emergentes para imprimir'); return; }

    const invoiceNum = `${cfg.invoice_prefix || 'FAC'}-${String(sale.invoice_num).padStart(5,'0')}`;
    const storeName  = cfg.store_name    || 'Shaden';
    const storeAddr  = cfg.store_address || '';
    const storePhone = cfg.store_phone   || '';
    const footer     = cfg.receipt_footer || '¡Gracias por tu compra!';

    // Caracteres por línea en 80mm con Courier New 12px ≈ 42 chars
    const W = 42;
    const SEP  = '-'.repeat(W);  // separador simple
    const SEP2 = '='.repeat(W);  // separador doble para totales

    // Centra texto en W columnas
    function center(txt) {
      txt = String(txt);
      if (txt.length >= W) return txt;
      const pad = Math.floor((W - txt.length) / 2);
      return ' '.repeat(pad) + txt;
    }

    // Alinea izq + der en W columnas
    function cols(left, right) {
      left  = String(left);
      right = String(right);
      const gap = W - left.length - right.length;
      if (gap <= 0) return left.slice(0, W - right.length - 1) + ' ' + right;
      return left + ' '.repeat(gap) + right;
    }

    // Línea de producto: nombre (wrapping) + cant x precio + total
    function itemLines(it) {
      const total   = fmt(it.line_total);
      const qtyPrice = `${it.quantity}x${fmt(it.unit_price)}`;
      // columna derecha ocupa total (max 10) + espacio + qtyPrice
      const right   = `${qtyPrice.padStart(12)} ${total.padStart(9)}`;
      const nameMax = W - right.length - 1;
      const name    = it.product_name || '';
      // parte el nombre si es muy largo
      const lines   = [];
      for (let i = 0; i < name.length; i += nameMax) lines.push(name.slice(i, i + nameMax));
      const firstLine = (lines[0] || '').padEnd(nameMax) + ' ' + right;
      const extraLines = lines.slice(1).map(l => '  ' + l);
      const discLine = it.discount_pct > 0 ? [`  Desc. ${it.discount_pct}%`] : [];
      return [firstLine, ...extraLines, ...discLine].join('\n');
    }

    const itemsText = (sale.sale_items || []).map(itemLines).join('\n');

    w.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura ${invoiceNum}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 3mm 4mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.35;
      color: #000;
      background: #fff;
      width: 72mm;
    }
    pre {
      font-family: inherit;
      font-size: inherit;
      white-space: pre;
      word-break: break-all;
    }
    .big   { font-size: 15px; font-weight: bold; }
    .med   { font-size: 13px; font-weight: bold; }
    /* Botón solo en pantalla */
    .no-print {
      display: block;
      margin-top: 14px;
      padding: 9px;
      width: 100%;
      font-size: 14px;
      font-weight: bold;
      background: #111;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: Arial, sans-serif;
    }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
<pre>
<span class="big">${center(storeName)}</span>
${storeAddr  ? center(storeAddr)  + '\n' : ''
}${storePhone ? center('Tel: ' + storePhone) + '\n' : ''
}${SEP}
<span class="med">${center('FACTURA ' + invoiceNum)}</span>
${center(fmtDateTime(sale.created_at))}
${SEP}
${cols('Cliente:', sale.customer_name || 'Cliente general')}
${cols('Cajero:',  sale.cashier || 'Admin')}
${cols('Pago:',    payMethodLabel(sale.payment_method))}
${sale.sale_notes ? cols('Nota:', sale.sale_notes) + '\n' : ''
}${SEP}
${'PRODUCTO'.padEnd(W - 22)}${'CANT x P.U.'.padStart(12)} ${'TOTAL'.padStart(9)}
${SEP}
${itemsText}
${SEP2}
${cols('SUBTOTAL', fmt(sale.subtotal))}${
  sale.discount_amt > 0 ? '\n' + cols(`Descuento (${sale.discount_pct}%)`, '-' + fmt(sale.discount_amt)) : ''
}${sale.tax_amt > 0 ? '\n' + cols(`IVA (${sale.tax_pct}%)`, fmt(sale.tax_amt)) : ''}
<span class="med">${cols('TOTAL', fmt(sale.total))}</span>
${SEP2}
${cols('Pagado (' + payMethodLabel(sale.payment_method) + ')', fmt(sale.amount_paid))}${
  sale.change_given > 0 ? '\n' + cols('Cambio:', fmt(sale.change_given)) : ''
}
${SEP}
${center(footer)}
${center(invoiceNum + ' - ' + fmtDateTime(sale.created_at))}
${SEP}
</pre>
<button class="no-print" onclick="window.print()">🖨  Imprimir</button>
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

