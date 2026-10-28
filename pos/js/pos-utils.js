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

/* ── Imprimir factura — versión completa con config ── */
function printInvoice(saleId, thermal = false) {
  PosDB.Sales.getById(saleId).then(async sale => {
    if (!sale) return;
    const cfg = window._posSettings || await PosDB.PosSettings.get();
    const w = window.open('', '_blank', thermal ? 'width=340,height=700' : 'width=600,height=800');
    const items = (sale.sale_items || []).map(it => thermal ? `
      <div class="t-item">
        <div>${it.product_name}${it.discount_pct > 0 ? ` <small>(-${it.discount_pct}%)</small>` : ''}</div>
        <div class="t-item-row"><span>${it.quantity} x ${fmt(it.unit_price)}</span><span>${fmt(it.line_total)}</span></div>
      </div>` : `
      <tr>
        <td>${it.product_name}</td>
        <td style="text-align:center">${it.quantity}</td>
        <td style="text-align:right">${fmt(it.unit_price)}</td>
        ${it.discount_pct > 0 ? `<td style="text-align:center">${it.discount_pct}%</td>` : '<td></td>'}
        <td style="text-align:right">${fmt(it.line_total)}</td>
      </tr>`).join('');

    if (thermal) {
      w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
        <title>Recibo ${cfg.invoice_prefix}-${String(sale.invoice_num).padStart(5,'0')}</title>
        <style>
          * { box-sizing:border-box; margin:0; padding:0; }
          body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; width: 72mm; padding: 4mm; }
          h1 { font-size:18px; text-align:center; margin-bottom:2px; }
          .center { text-align:center; }
          .line { border-top:1px dashed #000; margin:5px 0; }
          .t-item { margin:4px 0; }
          .t-item-row { display:flex; justify-content:space-between; }
          .total-row { display:flex; justify-content:space-between; font-weight:bold; font-size:14px; margin-top:4px; border-top:1px solid #000; padding-top:4px; }
          .sub-row { display:flex; justify-content:space-between; font-size:11px; }
          .footer { text-align:center; font-size:10px; margin-top:8px; color:#555; }
          @media print { button { display:none; } }
        </style></head><body>
        <h1>${cfg.store_name}</h1>
        <div class="center" style="font-size:10px">${cfg.store_address}</div>
        <div class="center" style="font-size:10px">${cfg.store_phone}</div>
        <div class="line"></div>
        <div class="center"><b>RECIBO ${cfg.invoice_prefix}-${String(sale.invoice_num).padStart(5,'0')}</b></div>
        <div class="sub-row"><span>${fmtDateTime(sale.created_at)}</span><span>${sale.cashier||'Admin'}</span></div>
        <div class="sub-row"><span>Cliente: ${sale.customer_name||'General'}</span></div>
        <div class="line"></div>
        ${items}
        <div class="line"></div>
        ${sale.discount_amt > 0 ? `<div class="sub-row"><span>Descuento (${sale.discount_pct}%):</span><span>-${fmt(sale.discount_amt)}</span></div>` : ''}
        ${sale.tax_amt > 0 ? `<div class="sub-row"><span>IVA (${sale.tax_pct}%):</span><span>${fmt(sale.tax_amt)}</span></div>` : ''}
        <div class="total-row"><span>TOTAL</span><span>${fmt(sale.total)}</span></div>
        <div class="sub-row"><span>Pago (${payMethodLabel(sale.payment_method)}):</span><span>${fmt(sale.amount_paid)}</span></div>
        ${sale.change_given > 0 ? `<div class="sub-row"><span>Cambio:</span><span>${fmt(sale.change_given)}</span></div>` : ''}
        ${sale.sale_notes ? `<div class="line"></div><div style="font-size:11px">Nota: ${sale.sale_notes}</div>` : ''}
        <div class="line"></div>
        <div class="footer">${cfg.receipt_footer}</div>
        <div style="text-align:center;margin-top:10px"><button onclick="window.print()">🖨 Imprimir</button></div>
        </body></html>`);
    } else {
      w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
        <title>Factura ${cfg.invoice_prefix}-${String(sale.invoice_num).padStart(5,'0')}</title>
        <style>
          body { font-family: monospace; color: #1a1a1a; padding: 24px; font-size: 13px; }
          h1 { font-size: 1.5rem; margin: 0; } h4 { margin: 0; font-size: .9rem; }
          table { width: 100%; border-collapse: collapse; margin: 14px 0; }
          th { border-bottom: 2px solid #000; padding: 5px 4px; text-align: left; font-size: .78rem; text-transform: uppercase; }
          td { padding: 4px; border-bottom: 1px solid #eee; font-size: .82rem; }
          .right { text-align: right; } .center { text-align: center; }
          .total-section { text-align: right; margin-top: 8px; }
          .total-section p { margin: 3px 0; font-size: .88rem; }
          .grand-total { font-size: 1.1rem; font-weight: 700; border-top: 2px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 20px; font-size: .75rem; color: #666; }
          @media print { button { display: none; } }
        </style></head><body>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
          <div><h1>${cfg.store_name}</h1><h4>Tienda de Variedades</h4><p style="font-size:.78rem;color:#666">${cfg.store_address} · ${cfg.store_phone}</p></div>
          <div style="text-align:right"><h2 style="font-size:1.1rem;margin:0">FACTURA</h2>
            <p style="font-size:.82rem;margin:2px 0">${cfg.invoice_prefix}-${String(sale.invoice_num).padStart(5,'0')}</p>
            <p style="font-size:.82rem;margin:0;color:#666">${fmtDateTime(sale.created_at)}</p>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.82rem;background:#f5f5f5;padding:8px 10px;border-radius:4px;margin-bottom:8px">
          <span><b>Cliente:</b> ${sale.customer_name||'General'}</span>
          <span><b>Cajero:</b> ${sale.cashier||'Admin'}</span>
          <span><b>Pago:</b> ${payMethodLabel(sale.payment_method)}</span>
        </div>
        ${sale.sale_notes ? `<div style="background:#fffbe6;border:1px solid #f0d060;padding:6px 10px;border-radius:4px;font-size:.82rem;margin-bottom:8px"><b>Nota:</b> ${sale.sale_notes}</div>` : ''}
        <table>
          <thead><tr><th>Producto</th><th class="center">Cant.</th><th class="right">P. Unit</th><th class="center">Desc.</th><th class="right">Total</th></tr></thead>
          <tbody>${items}</tbody>
        </table>
        <div class="total-section">
          <p>Subtotal: <b>${fmt(sale.subtotal)}</b></p>
          ${sale.discount_amt > 0 ? `<p>Descuento (${sale.discount_pct}%): <b>-${fmt(sale.discount_amt)}</b></p>` : ''}
          ${sale.tax_amt > 0 ? `<p>IVA (${sale.tax_pct}%): <b>${fmt(sale.tax_amt)}</b></p>` : ''}
          <p class="grand-total">TOTAL: ${fmt(sale.total)}</p>
          ${sale.change_given > 0 ? `<p>Cambio: <b>${fmt(sale.change_given)}</b></p>` : ''}
        </div>
        <div class="footer"><p>${cfg.receipt_footer}</p></div>
        <div style="text-align:center;margin-top:20px"><button onclick="window.print()">🖨️ Imprimir</button></div>
        </body></html>`);
    }
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

