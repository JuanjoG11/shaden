/* =============================================
   SHADEN POS — Data Layer (Supabase)
   ============================================= */

const PosDB = (() => {

  function check(error, ctx) {
    if (error) { console.error(`PosDB [${ctx}]:`, error.message); throw new Error(error.message); }
  }

  /* ══ CUSTOMERS ══════════════════════════════ */
  const Customers = {
    async getAll() {
      const { data, error } = await db.from('customers').select('*').order('name');
      check(error, 'Customers.getAll');
      return data || [];
    },
    async getAllWholesale() {
      const { data, error } = await db.from('customers').select('*')
        .eq('customer_type', 'wholesale').order('name');
      check(error, 'Customers.getAllWholesale');
      return data || [];
    },
    async search(q) {
      const { data, error } = await db.from('customers').select('*')
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%,cedula.ilike.%${q}%`).limit(20);
      check(error, 'Customers.search');
      return data || [];
    },
    async searchWholesale(q) {
      const { data, error } = await db.from('customers').select('*')
        .eq('customer_type', 'wholesale')
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%,cedula.ilike.%${q}%,company.ilike.%${q}%`)
        .limit(20);
      check(error, 'Customers.searchWholesale');
      return data || [];
    },
    async getByCedula(cedula) {
      const { data } = await db.from('customers').select('*')
        .eq('cedula', cedula.trim()).single();
      return data || null;
    },
    async getById(id) {
      const { data, error } = await db.from('customers').select('*').eq('id', id).single();
      if (error) return null; return data;
    },
    async add(c) {
      const id = 'cust-' + Date.now();
      const { data, error } = await db.from('customers')
        .insert({
          id,
          name:            c.name,
          phone:           c.phone           || '',
          email:           c.email           || '',
          address:         c.address         || '',
          notes:           c.notes           || '',
          customer_type:   c.customer_type   || 'retail',
          cedula:          c.cedula          || '',
          company:         c.company         || '',
          city:            c.city            || '',
          discount_pct:    c.discount_pct    || 0,
          wholesale_level: c.wholesale_level || 'standard',
        })
        .select().single();
      check(error, 'Customers.add'); return data;
    },
    async update(id, c) {
      const { error } = await db.from('customers')
        .update({
          name:            c.name,
          phone:           c.phone           || '',
          email:           c.email           || '',
          address:         c.address         || '',
          notes:           c.notes           || '',
          customer_type:   c.customer_type   || 'retail',
          cedula:          c.cedula          || '',
          company:         c.company         || '',
          city:            c.city            || '',
          discount_pct:    c.discount_pct    || 0,
          wholesale_level: c.wholesale_level || 'standard',
        })
        .eq('id', id);
      check(error, 'Customers.update');
    },
    async delete(id) {
      const { error } = await db.from('customers').delete().eq('id', id);
      check(error, 'Customers.delete');
    },
    async updateStats(id, saleTotal) {
      // Actualiza acumulado de compras y fecha de última compra
      const { data: cur } = await db.from('customers')
        .select('total_purchases, purchase_count').eq('id', id).single();
      if (!cur) return;
      const { error } = await db.from('customers').update({
        total_purchases:  (cur.total_purchases  || 0) + saleTotal,
        purchase_count:   (cur.purchase_count   || 0) + 1,
        last_purchase_at: new Date().toISOString(),
      }).eq('id', id);
      check(error, 'Customers.updateStats');
    },
    async getSalesHistory(customerId, limit = 50) {
      const { data, error } = await db.from('sales')
        .select('*, sale_items(*)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(limit);
      check(error, 'Customers.getSalesHistory');
      return data || [];
    },
  };

  /* ══ SALES ══════════════════════════════════ */
  const Sales = {
    async getAll(limit = 200) {
      const { data, error } = await db.from('sales').select('*, sale_items(*)')
        .order('created_at', { ascending: false }).limit(limit);
      check(error, 'Sales.getAll'); return data || [];
    },
    async getById(id) {
      const { data, error } = await db.from('sales').select('*, sale_items(*)')
        .eq('id', id).single();
      if (error) return null; return data;
    },
    async getByRange(from, to) {
      const { data, error } = await db.from('sales').select('*, sale_items(*)')
        .gte('created_at', from).lte('created_at', to)
        .order('created_at', { ascending: false });
      check(error, 'Sales.getByRange'); return data || [];
    },
    async getToday() {
      const start = new Date(); start.setHours(0,0,0,0);
      const end   = new Date(); end.setHours(23,59,59,999);
      return Sales.getByRange(start.toISOString(), end.toISOString());
    },
    async create(sale, items) {
      const saleId = 'sale-' + Date.now() + Math.random().toString(36).slice(2,6);
      const { data, error } = await db.from('sales').insert({ id: saleId, ...sale }).select().single();
      check(error, 'Sales.create');
      const itemsWithId = items.map(it => ({
        id:           'si-' + Date.now() + Math.random().toString(36).slice(2,6),
        sale_id:      saleId,
        product_id:   it.product_id,
        product_name: it.product_name,
        category:     it.category || '',
        unit_price:   it.unit_price,
        quantity:     it.quantity,
        discount_pct: it.discount_pct || 0,
        line_total:   it.line_total,
      }));
      const { error: err2 } = await db.from('sale_items').insert(itemsWithId);
      check(err2, 'Sales.createItems');
      return data;
    },
    async cancel(id) {
      const { error } = await db.from('sales').update({ status: 'cancelled' }).eq('id', id);
      check(error, 'Sales.cancel');
    },
  };

  /* ══ STOCK ══════════════════════════════════ */
  const Stock = {
    async getAll() {
      const { data, error } = await db.from('stock')
        .select('*, products(id,name,category,price,image,status)')
        .order('qty');
      check(error, 'Stock.getAll'); return data || [];
    },
    async getByProduct(productId) {
      const { data, error } = await db.from('stock').select('*').eq('product_id', productId).single();
      if (error) return null; return data;
    },
    async getLow() {
      const { data, error } = await db.from('stock')
        .select('*, products(id,name)')
        .filter('qty', 'lte', db.from('stock').select('min_qty'));
      // manual filter fallback
      const all = await Stock.getAll();
      return all.filter(s => s.qty <= s.min_qty);
    },
    async set(productId, qty, minQty, costPrice) {
      const { error } = await db.from('stock').upsert({
        product_id: productId, qty, min_qty: minQty, cost_price: costPrice,
      });
      check(error, 'Stock.set');
    },
    async adjust(productId, delta, type, notes, refSaleId) {
      // Get current
      const { data: cur } = await db.from('stock').select('qty').eq('product_id', productId).single();
      const newQty = (cur?.qty || 0) + delta;
      await db.from('stock').upsert({ product_id: productId, qty: Math.max(0, newQty), updated_at: new Date().toISOString() });
      // Log movement
      const { data: prod } = await db.from('products').select('name').eq('id', productId).single();
      const { error } = await db.from('stock_movements').insert({
        id: 'mv-' + Date.now() + Math.random().toString(36).slice(2,6),
        product_id: productId,
        product_name: prod?.name || productId,
        type, qty: delta,
        ref_sale_id: refSaleId || '',
        notes: notes || '',
      });
      check(error, 'Stock.adjust');
    },
    async movements(limit = 100) {
      const { data, error } = await db.from('stock_movements')
        .select('*').order('created_at', { ascending: false }).limit(limit);
      check(error, 'Stock.movements'); return data || [];
    },
  };

  /* ══ CASH REGISTER ══════════════════════════ */
  const CashRegister = {
    async getOpen() {
      const { data } = await db.from('cash_registers').select('*').eq('status', 'open').single();
      return data || null;
    },
    async open(amount, cashier) {
      const id = 'cr-' + Date.now();
      const { data, error } = await db.from('cash_registers')
        .insert({ id, opening_amount: amount, cashier, status: 'open' }).select().single();
      check(error, 'CashRegister.open'); return data;
    },
    async close(id, closingAmount, expectedAmount) {
      const diff = closingAmount - expectedAmount;
      const { error } = await db.from('cash_registers').update({
        status: 'closed', closed_at: new Date().toISOString(),
        closing_amount: closingAmount, expected_amount: expectedAmount, difference: diff,
      }).eq('id', id);
      check(error, 'CashRegister.close');
    },
    async getHistory(limit = 30) {
      const { data, error } = await db.from('cash_registers')
        .select('*').order('opened_at', { ascending: false }).limit(limit);
      check(error, 'CashRegister.getHistory'); return data || [];
    },
  };

  /* ══ EXPENSES ════════════════════════════════ */
  const Expenses = {
    async getByRegister(registerId) {
      const { data, error } = await db.from('expenses').select('*')
        .eq('register_id', registerId).order('created_at', { ascending: false });
      check(error, 'Expenses.getByRegister'); return data || [];
    },
    async add(exp) {
      const id = 'exp-' + Date.now();
      const { data, error } = await db.from('expenses').insert({ id, ...exp }).select().single();
      check(error, 'Expenses.add'); return data;
    },
  };

  /* ══ REPORTS ═════════════════════════════════ */
  const Reports = {
    async summaryByDay(days = 30) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      const sales = await Sales.getByRange(from.toISOString(), new Date().toISOString());
      const map = {};
      sales.filter(s => s.status === 'completed').forEach(s => {
        const day = s.created_at.slice(0, 10);
        if (!map[day]) map[day] = { total: 0, count: 0 };
        map[day].total += s.total;
        map[day].count++;
      });
      return Object.entries(map).map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));
    },
    async byCategory(days = 30) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      const sales = await Sales.getByRange(from.toISOString(), new Date().toISOString());
      const map = {};
      sales.filter(s => s.status === 'completed').forEach(s => {
        (s.sale_items || []).forEach(it => {
          const cat = it.category || 'Sin categoría';
          if (!map[cat]) map[cat] = { total: 0, qty: 0 };
          map[cat].total += it.line_total;
          map[cat].qty   += it.quantity;
        });
      });
      return Object.entries(map).map(([cat, v]) => ({ cat, ...v })).sort((a, b) => b.total - a.total);
    },
    async topProducts(days = 30, limit = 10) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      const sales = await Sales.getByRange(from.toISOString(), new Date().toISOString());
      const map = {};
      sales.filter(s => s.status === 'completed').forEach(s => {
        (s.sale_items || []).forEach(it => {
          const k = it.product_name;
          if (!map[k]) map[k] = { name: k, total: 0, qty: 0 };
          map[k].total += it.line_total;
          map[k].qty   += it.quantity;
        });
      });
      return Object.values(map).sort((a, b) => b.total - a.total).slice(0, limit);
    },
  };

  /* ══ POS SETTINGS ══════════════════════════ */
  const PosSettings = {
    _defaults: {
      store_name: 'Shaden', store_address: 'Cra 27 #72-03, Cuba, Pereira',
      store_phone: '573042468500', invoice_prefix: 'FAC', tax_pct: 0,
      currency: 'COP', low_stock_alert: 5,
      receipt_footer: '¡Gracias por tu compra! Cambios con factura · 5 días hábiles',
    },
    async get() {
      const { data } = await db.from('pos_settings').select('*').eq('id', 1).single();
      return data || this._defaults;
    },
    async save(payload) {
      const { error } = await db.from('pos_settings').upsert({ id: 1, ...payload, updated_at: new Date().toISOString() });
      check(error, 'PosSettings.save');
    },
  };

  /* ══ REFUNDS ════════════════════════════════ */
  const Refunds = {
    async getAll(limit = 100) {
      const { data, error } = await db.from('refunds').select('*, refund_items(*)')
        .order('created_at', { ascending: false }).limit(limit);
      check(error, 'Refunds.getAll'); return data || [];
    },
    async getBySale(saleId) {
      const { data } = await db.from('refunds').select('*, refund_items(*)')
        .eq('sale_id', saleId).order('created_at', { ascending: false });
      return data || [];
    },
    async create(refund, items) {
      const id = 'ref-' + Date.now() + Math.random().toString(36).slice(2,5);
      const { data, error } = await db.from('refunds').insert({ id, ...refund }).select().single();
      check(error, 'Refunds.create');
      const rows = items.map(it => ({
        id: 'ri-' + Date.now() + Math.random().toString(36).slice(2,5),
        refund_id: id, ...it,
      }));
      if (rows.length) {
        const { error: e2 } = await db.from('refund_items').insert(rows);
        check(e2, 'Refunds.createItems');
      }
      return data;
    },
  };

  /* ══ LAYAWAYS (APARTADOS) ══════════════════ */
  const Layaways = {
    _id() { return 'lay-' + Date.now() + Math.random().toString(36).slice(2,5); },

    async getAll(status = null) {
      let q = db.from('layaways')
        .select('*, layaway_items(*), layaway_payments(*)')
        .order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      check(error, 'Layaways.getAll');
      return data || [];
    },

    async getActive() {
      const { data, error } = await db.from('layaways')
        .select('*, layaway_items(*), layaway_payments(*)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      check(error, 'Layaways.getActive');
      return data || [];
    },

    async getById(id) {
      const { data, error } = await db.from('layaways')
        .select('*, layaway_items(*), layaway_payments(*)')
        .eq('id', id).single();
      if (error) return null;
      return data;
    },

    async getByCustomer(customerId) {
      const { data, error } = await db.from('layaways')
        .select('*, layaway_items(*), layaway_payments(*)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      check(error, 'Layaways.getByCustomer');
      return data || [];
    },

    async create(layaway, items) {
      const id = this._id();
      const { data, error } = await db.from('layaways')
        .insert({ id, ...layaway }).select().single();
      check(error, 'Layaways.create');
      const rows = items.map(it => ({
        id:           this._id(),
        layaway_id:   id,
        product_id:   it.product_id,
        product_name: it.product_name,
        category:     it.category || '',
        unit_price:   it.unit_price,
        quantity:     it.quantity,
        discount_pct: it.discount_pct || 0,
        line_total:   it.line_total,
      }));
      const { error: e2 } = await db.from('layaway_items').insert(rows);
      check(e2, 'Layaways.createItems');
      return data;
    },

    async addPayment(layawayId, payment) {
      // Insertar abono
      const pid = this._id();
      const { error } = await db.from('layaway_payments')
        .insert({ id: pid, layaway_id: layawayId, ...payment });
      check(error, 'Layaways.addPayment');
      // Recalcular amount_paid en el apartado
      const { data: pays } = await db.from('layaway_payments')
        .select('amount').eq('layaway_id', layawayId);
      const totalPaid = (pays || []).reduce((a, b) => a + b.amount, 0);
      // Obtener total del apartado
      const { data: lay } = await db.from('layaways')
        .select('total').eq('id', layawayId).single();
      const newStatus = totalPaid >= (lay?.total || 0) ? 'ready' : 'active';
      const { error: e2 } = await db.from('layaways').update({
        amount_paid: totalPaid,
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', layawayId);
      check(e2, 'Layaways.updatePaid');
      return { totalPaid, isComplete: newStatus === 'ready' };
    },

    async complete(layawayId, saleId) {
      const { error } = await db.from('layaways').update({
        status: 'completed',
        sale_id: saleId,
        updated_at: new Date().toISOString(),
      }).eq('id', layawayId);
      check(error, 'Layaways.complete');
    },

    async cancel(layawayId, reason) {
      const { error } = await db.from('layaways').update({
        status: 'cancelled',
        notes: reason || '',
        updated_at: new Date().toISOString(),
      }).eq('id', layawayId);
      check(error, 'Layaways.cancel');
    },

    async updateNotes(id, notes) {
      const { error } = await db.from('layaways')
        .update({ notes, updated_at: new Date().toISOString() }).eq('id', id);
      check(error, 'Layaways.updateNotes');
    },
  };

  return { Customers, Sales, Stock, CashRegister, Expenses, Reports, PosSettings, Refunds, Layaways };
})();

/* ══════════════════════════════════════════════
   WHOLESALE HELPERS — Niveles y badges
══════════════════════════════════════════════ */
const WholesaleLevels = {
  standard:  { label: 'Estándar',  color: 'chip-gray',   icon: 'fa-user',         disc: 0  },
  silver:    { label: 'Silver',    color: 'chip-blue',   icon: 'fa-medal',         disc: 10 },
  gold:      { label: 'Gold',      color: 'chip-gold',   icon: 'fa-star',          disc: 15 },
  platinum:  { label: 'Platinum',  color: 'chip-green',  icon: 'fa-crown',         disc: 20 },
};

function wholesaleLevelChip(level) {
  const l = WholesaleLevels[level] || WholesaleLevels.standard;
  return `<span class="chip ${l.color}"><i class="fa-solid ${l.icon}"></i> ${l.label}</span>`;
}

function wholesaleAutoDisc(level) {
  return WholesaleLevels[level]?.disc ?? 0;
}

