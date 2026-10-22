-- =============================================
-- SHADEN POS — Módulo Mayoristas
-- Ejecutar en: Supabase > SQL Editor > New query
-- =============================================

-- 1. Extender tabla customers con campos mayoristas
alter table customers
  add column if not exists customer_type    text    not null default 'retail',
  -- retail | wholesale
  add column if not exists cedula           text    default '',
  add column if not exists company          text    default '',
  add column if not exists city             text    default '',
  add column if not exists discount_pct     numeric not null default 0,
  -- % de descuento automático al seleccionar este cliente
  add column if not exists wholesale_level  text    default 'standard',
  -- standard | silver | gold | platinum
  add column if not exists total_purchases  numeric not null default 0,
  add column if not exists purchase_count   integer not null default 0,
  add column if not exists last_purchase_at timestamptz;

-- Índice para búsqueda rápida por cédula
create index if not exists idx_customers_cedula
  on customers (cedula)
  where cedula <> '';

create index if not exists idx_customers_type
  on customers (customer_type);

-- ── RLS (ya existe en setup-pos.sql, no duplicar) ──
-- La política "pos_customers_all" ya cubre la tabla completa.

-- 2. Niveles de descuento mayorista predeterminados
-- (referencia, no es una tabla — se maneja en la app)
-- standard  → discount manual
-- silver    → 10%
-- gold      → 15%
-- platinum  → 20%

comment on column customers.cedula          is 'Número de cédula / NIT del cliente mayorista';
comment on column customers.customer_type   is 'retail = minorista, wholesale = mayorista';
comment on column customers.discount_pct    is 'Descuento automático aplicado al seleccionar este cliente';
comment on column customers.wholesale_level is 'Nivel mayorista: standard, silver, gold, platinum';
comment on column customers.total_purchases is 'Acumulado total de compras del cliente';
comment on column customers.purchase_count  is 'Número total de compras del cliente';
