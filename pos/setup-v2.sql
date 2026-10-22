-- =============================================
-- SHADEN POS v2 — Mejoras
-- Ejecutar en: Supabase > SQL Editor > New query
-- =============================================

-- 1. CONFIGURACIÓN DEL SISTEMA (IVA, nombre tienda, factura, etc.)
create table if not exists pos_settings (
  id            integer primary key default 1,
  store_name    text default 'Shaden',
  store_address text default 'Cra 27 #72-03, Cuba, Pereira',
  store_phone   text default '573042468500',
  invoice_prefix text default 'FAC',
  tax_pct       numeric default 0,
  currency      text default 'COP',
  low_stock_alert integer default 5,
  receipt_footer text default '¡Gracias por tu compra! Cambios con factura · 5 días hábiles',
  updated_at    timestamptz default now()
);

insert into pos_settings (id) values (1) on conflict (id) do nothing;

-- 2. DEVOLUCIONES
create table if not exists refunds (
  id            text primary key,
  sale_id       text references sales(id) on delete set null,
  invoice_num   text default '',
  customer_name text default '',
  reason        text default '',
  total_refund  numeric not null default 0,
  refund_method text default 'cash',  -- cash | store_credit
  status        text default 'completed',
  cashier       text default 'Admin',
  created_at    timestamptz default now()
);

create table if not exists refund_items (
  id            text primary key,
  refund_id     text references refunds(id) on delete cascade,
  sale_item_id  text default '',
  product_name  text not null,
  quantity      integer not null default 1,
  unit_price    numeric not null,
  line_total    numeric not null,
  restock       boolean default true
);

-- 3. NOTAS EN VENTA — agregar columna si no existe
alter table sales add column if not exists sale_notes text default '';
alter table sales add column if not exists cash_amount  numeric default 0;
alter table sales add column if not exists card_amount  numeric default 0;
alter table sales add column if not exists xfer_amount  numeric default 0;

-- 4. RLS
alter table pos_settings  enable row level security;
alter table refunds        enable row level security;
alter table refund_items   enable row level security;

create policy "pos_settings_all"   on pos_settings  for all using (true) with check (true);
create policy "refunds_all"        on refunds        for all using (true) with check (true);
create policy "refund_items_all"   on refund_items   for all using (true) with check (true);

-- 5. REALTIME en tablas nuevas
alter publication supabase_realtime add table pos_settings;
alter publication supabase_realtime add table refunds;
