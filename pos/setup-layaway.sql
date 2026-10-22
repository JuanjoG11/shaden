-- =============================================
-- SHADEN POS — Módulo de Apartados (Layaway)
-- Ejecutar en: Supabase > SQL Editor > New query
-- =============================================

-- 1. APARTADOS
create table if not exists layaways (
  id              text primary key,
  layaway_num     serial,
  customer_id     text references customers(id) on delete set null,
  customer_name   text not null default 'Cliente general',
  customer_phone  text default '',
  total           numeric not null default 0,
  amount_paid     numeric not null default 0,
  balance         numeric generated always as (total - amount_paid) stored,
  discount_pct    numeric not null default 0,
  discount_amt    numeric not null default 0,
  expires_at      date,
  status          text not null default 'active',
  -- active | completed | cancelled | expired
  notes           text default '',
  cashier         text default 'Admin',
  sale_id         text references sales(id) on delete set null,
  -- cuando se convierte en venta
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 2. ÍTEMS DEL APARTADO
create table if not exists layaway_items (
  id            text primary key,
  layaway_id    text references layaways(id) on delete cascade,
  product_id    text references products(id) on delete set null,
  product_name  text not null,
  category      text default '',
  unit_price    numeric not null,
  quantity      integer not null default 1,
  discount_pct  numeric not null default 0,
  line_total    numeric not null,
  created_at    timestamptz default now()
);

-- 3. ABONOS DEL APARTADO
create table if not exists layaway_payments (
  id            text primary key,
  layaway_id    text references layaways(id) on delete cascade,
  amount        numeric not null,
  payment_method text default 'cash',  -- cash | card | transfer
  notes         text default '',
  cashier       text default 'Admin',
  created_at    timestamptz default now()
);

-- ── RLS ──────────────────────────────────────
alter table layaways          enable row level security;
alter table layaway_items     enable row level security;
alter table layaway_payments  enable row level security;

create policy "layaways_all"         on layaways         for all using (true) with check (true);
create policy "layaway_items_all"    on layaway_items    for all using (true) with check (true);
create policy "layaway_payments_all" on layaway_payments for all using (true) with check (true);

-- ── Realtime ──────────────────────────────────
alter publication supabase_realtime add table layaways;
alter publication supabase_realtime add table layaway_payments;
