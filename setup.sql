-- =============================================
-- SHADEN — Setup completo de base de datos
-- Ejecutar en: Supabase > SQL Editor > New query
-- =============================================

-- 1. TABLA CATEGORÍAS
create table if not exists categories (
  id         text primary key,
  name       text not null,
  icon       text not null default 'fa-solid fa-tag',
  created_at timestamptz default now()
);

-- 2. TABLA PRODUCTOS
create table if not exists products (
  id          text primary key,
  name        text not null,
  category    text references categories(id) on delete set null,
  price       numeric,
  description text default '',
  image       text default '',
  badge       text default '',
  status      text default 'active',
  created_at  timestamptz default now()
);

-- 3. TABLA AJUSTES
create table if not exists settings (
  id         integer primary key default 1,
  store_name text default 'Shaden',
  tagline    text default 'Tienda de Variedades',
  phone      text default '573042468500',
  address    text default 'Cra 27 #72-03, Cuba, Pereira',
  instagram  text default '@shaden_variedades',
  discount   integer default 10,
  about      text default 'En Shaden encontrarás todo lo que necesitas.',
  updated_at timestamptz default now()
);

-- 4. POLÍTICAS RLS
alter table categories enable row level security;
alter table products    enable row level security;
alter table settings    enable row level security;

create policy "lectura publica categorias" on categories for select using (true);
create policy "lectura publica productos"  on products    for select using (true);
create policy "lectura publica settings"   on settings    for select using (true);

create policy "escritura anon categorias" on categories for all using (true) with check (true);
create policy "escritura anon productos"  on products    for all using (true) with check (true);
create policy "escritura anon settings"   on settings    for all using (true) with check (true);

-- 5. CATEGORÍAS
insert into categories (id, name, icon) values
  ('variedades', 'Variedades', 'fa-solid fa-shirt'),
  ('regalos',    'Regalos',    'fa-solid fa-gift'),
  ('accesorios', 'Accesorios', 'fa-solid fa-gem'),
  ('maquillaje', 'Maquillaje', 'fa-solid fa-palette'),
  ('sexshop',    'Sex Shop',   'fa-solid fa-heart')
on conflict (id) do nothing;

-- 6. AJUSTES
insert into settings (id, store_name, tagline, phone, address, instagram, discount, about)
values (1, 'Shaden', 'Tienda de Variedades', '573042468500',
        'Cra 27 #72-03, Cuba, Pereira', '@shaden_variedades', 10,
        'En Shaden encontrarás todo lo que necesitas.')
on conflict (id) do nothing;

-- 7. PRODUCTOS DE MUESTRA
insert into products (id, name, category, price, description, image, badge, status) values
('p1','Set de Maquillaje Completo','maquillaje',85000,'Set completo con sombras, labiales, rubor y corrector.','https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80','featured','active'),
('p2','Collar Dorado Elegante','accesorios',32000,'Collar fino bañado en oro con dije delicado.','https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80','new','active'),
('p3','Caja de Regalo Premium','regalos',45000,'Caja decorativa con lazo y papel de seda.','https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&q=80','','active'),
('p4','Aretes Perla Blanca','accesorios',18000,'Aretes de perla sintética con base dorada.','https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80','','active'),
('p5','Labial Mate Colección Rosa','maquillaje',22000,'Labial de larga duración en tonos rosados.','https://images.unsplash.com/photo-1586495777744-4e6232bf5b25?w=600&q=80','offer','active'),
('p6','Bolso Tote Canvas','variedades',55000,'Bolso tote en tela canvas resistente.','https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80','new','active'),
('p7','Vela Aromática Lavanda','regalos',28000,'Vela artesanal de soya con fragancia de lavanda.','https://images.unsplash.com/photo-1608181831688-c6b4a4fc5cc5?w=600&q=80','','active'),
('p8','Kit Íntimo Pareja','sexshop',75000,'Kit discreto para parejas con accesorios de bienestar.','','','active'),
('p9','Pulsera Charm Dorada','accesorios',24000,'Pulsera ajustable con charms bañada en oro.','https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80','','active'),
('p10','Perfume Floral 50ml','variedades',68000,'Fragancia femenina con notas de jazmín y rosa.','https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&q=80','featured','active'),
('p11','Juego de Cuadernos Aesthetic','variedades',35000,'Set de 3 cuadernos con diseños florales, tapa dura.','https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80','','active'),
('p12','Base de Maquillaje HD','maquillaje',42000,'Base líquida cobertura media-alta con SPF 15.','https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=600&q=80','new','active')
on conflict (id) do nothing;
