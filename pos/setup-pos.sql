-- =============================================
-- SHADEN POS — Tablas adicionales
-- Ejecutar en: Supabase > SQL Editor > New query
-- =============================================

-- 1. CLIENTES
create table if not exists customers (
  id         text primary key,
  name       text not null,
  phone      text default '',
  email      text default '',
  address    text default '',
  notes      text default '',
  created_at timestamptz default now()
);

-- 2. VENTAS (cabecera de factura)
create table if not exists sales (
  id            text primary key,
  invoice_num   serial,
  customer_id   text references customers(id) on delete set null,
  customer_name text default 'Cliente general',
  subtotal      numeric not null default 0,
  discount_pct  numeric not null default 0,
  discount_amt  numeric not null default 0,
  tax_pct       numeric not null default 0,
  tax_amt       numeric not null default 0,
  total         numeric not null default 0,
  payment_method text default 'cash',  -- cash | card | transfer | mixed
  amount_paid   numeric not null default 0,
  change_given  numeric not null default 0,
  status        text default 'completed', -- completed | cancelled | refunded
  notes         text default '',
  cashier       text default 'Admin',
  created_at    timestamptz default now()
);

-- 3. DETALLE DE VENTAS
create table if not exists sale_items (
  id          text primary key,
  sale_id     text references sales(id) on delete cascade,
  product_id  text references products(id) on delete set null,
  product_name text not null,
  category    text default '',
  unit_price  numeric not null,
  quantity    integer not null default 1,
  discount_pct numeric not null default 0,
  line_total  numeric not null,
  created_at  timestamptz default now()
);

-- 4. STOCK (inventario)
create table if not exists stock (
  product_id  text primary key references products(id) on delete cascade,
  qty         integer not null default 0,
  min_qty     integer not null default 5,
  cost_price  numeric default 0,
  updated_at  timestamptz default now()
);

-- 5. MOVIMIENTOS DE STOCK
create table if not exists stock_movements (
  id          text primary key,
  product_id  text references products(id) on delete set null,
  product_name text not null,
  type        text not null,  -- in | out | adjustment
  qty         integer not null,
  ref_sale_id text default '',
  notes       text default '',
  created_at  timestamptz default now()
);

-- 6. CAJA (turnos)
create table if not exists cash_registers (
  id            text primary key,
  opened_at     timestamptz default now(),
  closed_at     timestamptz,
  opening_amount numeric not null default 0,
  closing_amount numeric,
  expected_amount numeric,
  difference     numeric,
  status         text default 'open',  -- open | closed
  cashier        text default 'Admin',
  notes          text default ''
);

-- 7. EXPENSES (gastos)
create table if not exists expenses (
  id          text primary key,
  description text not null,
  amount      numeric not null,
  category    text default 'general',
  register_id text references cash_registers(id) on delete set null,
  created_at  timestamptz default now()
);

-- ── RLS ──────────────────────────────────────
alter table customers        enable row level security;
alter table sales             enable row level security;
alter table sale_items        enable row level security;
alter table stock             enable row level security;
alter table stock_movements   enable row level security;
alter table cash_registers    enable row level security;
alter table expenses          enable row level security;

create policy "pos_customers_all"      on customers      for all using (true) with check (true);
create policy "pos_sales_all"          on sales          for all using (true) with check (true);
create policy "pos_sale_items_all"     on sale_items     for all using (true) with check (true);
create policy "pos_stock_all"          on stock          for all using (true) with check (true);
create policy "pos_stock_mov_all"      on stock_movements for all using (true) with check (true);
create policy "pos_cash_registers_all" on cash_registers for all using (true) with check (true);
create policy "pos_expenses_all"       on expenses       for all using (true) with check (true);

-- ── Stock inicial para productos de muestra ──
insert into stock (product_id, qty, min_qty, cost_price) values
('p1',  15, 3, 50000),
('p2',  30, 5, 18000),
('p3',  20, 5, 25000),
('p4',  40, 8, 10000),
('p5',  25, 5, 12000),
('p6',  10, 3, 30000),
('p7',  18, 4, 15000),
('p8',   8, 2, 40000),
('p9',  35, 6, 14000),
('p10', 12, 3, 38000),
('p11', 22, 5, 18000),
('p12', 17, 4, 23000)
on conflict (product_id) do nothing;
