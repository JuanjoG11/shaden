-- =============================================
-- SHADEN — Soporte de códigos de barras
-- Ejecutar en: Supabase > SQL Editor > New query
-- =============================================

-- Agrega columna barcode a products (si no existe)
alter table products
  add column if not exists barcode text default '';

-- Índice único para búsqueda rápida por código
create unique index if not exists idx_products_barcode
  on products (barcode)
  where barcode is not null and barcode <> '';

-- =============================================
-- Habilitar Supabase Realtime en tabla stock
-- Ejecutar también en Supabase > SQL Editor
-- =============================================

-- Agrega la tabla stock a la publicación realtime
-- (necesario para que la web y el POS se actualicen en vivo)
alter publication supabase_realtime add table stock;
