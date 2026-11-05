-- =============================================
-- SHADEN — Inserción masiva de productos #4
-- Fuente: PDFs escaneados Adriana Álvarez Díaz
--   • Remisión BX 001283 (8 productos — belleza)
--   • Remisión 001282 (48 productos — didácticos)
--   • Remisión 000086 (21 productos — juguetes)
-- Total: 77 productos únicos
-- price = NULL (para asignar después)
-- =============================================

INSERT INTO products (id, name, category, barcode, status, price, description, image, badge)
VALUES

-- ══════════════════════════════════════════════
-- REMISIÓN BX 001283 — 14/10/2026
-- Belleza y cuidado personal
-- ══════════════════════════════════════════════
('bx_BX16',       'DEPILADORA',                                     'variedades', 'BX-16',       'active', NULL, '', '', ''),
('bx_BX22',       'MANILLA NINA',                                   'accesorios', 'BX-22',       'active', NULL, '', '', ''),
('bx_HC8191',     'SECADOR CABELLO VIAJERO',                        'variedades', 'HC8191',      'active', NULL, '', '', ''),
('bx_ML842',      'SAUNA FACIAL PEQUENO',                           'maquillaje', 'ML-842',      'active', NULL, '', '', ''),
('bx_COS2',       'SET COSMETIQUERA X2PCS',                         'maquillaje', 'COS-2',       'active', NULL, '', '', ''),
('bx_COS5',       'COSMETIQUERA',                                   'maquillaje', 'COS-5',       'active', NULL, '', '', ''),
('bx_ML881',      'MASAJEADOR RODILLO PIEDRA VOLCANICA',            'maquillaje', 'ML-881',      'active', NULL, '', '', ''),
('bx_ML105K',     'KIT RODILLO JADE',                               'maquillaje', 'ML-105-K',    'active', NULL, '', '', ''),

-- ══════════════════════════════════════════════
-- REMISIÓN 001282 — 14/10/2026
-- Didácticos, juguetes, mascotas, lámparas
-- ══════════════════════════════════════════════
('rx_L01',        'DIDACTICO PROFESIONES 18x11.2cm',                'regalos',    'L-01',        'active', NULL, '', '', ''),
('rx_L02',        'DIDACTICO MADERA LETRAS 20x20cm',                'regalos',    'L-02',        'active', NULL, '', '', ''),
('rx_L03',        'DIDACTICO MADERA NUMEROS Y FORMAS 20x20cm',      'regalos',    'L-03',        'active', NULL, '', '', ''),
('rx_L07',        'ROMPECABEZAS CUBO X9 10.5x10.5cm A',             'regalos',    'L-07',        'active', NULL, '', '', ''),
('rx_L08',        'ROMPECABEZAS CUBO X9 10.5x10.5cm B',             'regalos',    'L-08',        'active', NULL, '', '', ''),
('rx_L09',        'ROMPECABEZAS NOMBRES ANIMALES 15x11cm',          'regalos',    'L-09',        'active', NULL, '', '', ''),
('rx_L12',        'ABACO LABERINTO PEQ 8.5x11.5cm',                 'regalos',    'L-12',        'active', NULL, '', '', ''),
('rx_L29',        'DOMINO INFANTIL',                                 'regalos',    'L-29',        'active', NULL, '', '', ''),
('rx_L35',        'DIDACTICO TARJETAS OPERACIONES',                  'regalos',    'L-35',        'active', NULL, '', '', ''),
('rx_L37',        'DIDACTICO LIBRO INTERACTIVO 21.5x14.5cm A',      'regalos',    'L-37',        'active', NULL, '', '', ''),
('rx_L38',        'DIDACTICO LIBRO INTERACTIVO 21.5x14.5cm B',      'regalos',    'L-38',        'active', NULL, '', '', ''),
('rx_L46',        'DIDACTICO 4 COLORES GDE 32.5x19cm',              'regalos',    'L-46',        'active', NULL, '', '', ''),
('rx_L591',       'JUGUETE BLOQUES CONSTRUCCION',                   'regalos',    'L-591',       'active', NULL, '', '', ''),
('rx_L581',       'JUGUETE ELEFANTE ENSAMBLE',                      'regalos',    'L-581',       'active', NULL, '', '', ''),
('rx_L584',       'JUGUETE CARRO ARMABLE',                          'regalos',    'L-584',       'active', NULL, '', '', ''),
('rx_L1223',      'DIDACTICO TARJETAS TRADUCTOR A',                  'regalos',    'L-1223',      'active', NULL, '', '', ''),
('rx_L1222',      'DIDACTICO TARJETAS TRADUCTOR B',                  'regalos',    'L-1222',      'active', NULL, '', '', ''),
('rx_L175',       'VELA AROMATICA X10 UND 3.8x1cm',                 'regalos',    'L-175',       'active', NULL, '', '', ''),
('rx_L177',       'PALA MASCOTA 27x12cm',                           'variedades', 'L-177',       'active', NULL, '', '', ''),
('rx_L210',       'BOLSAS MASCOTAS X4 15pcs/rollo',                 'variedades', 'L-210',       'active', NULL, '', '', ''),
('rx_L181',       'BEBEDERO MASCOTA 250ML',                         'variedades', 'L-181',       'active', NULL, '', '', ''),
('rx_L290',       'BOTELLA DE AGUA MASCOTA 350ml',                  'variedades', 'L-290',       'active', NULL, '', '', ''),
('rx_L200',       'CRETA Y CEPILLO MASCOTA 95g',                    'variedades', 'L-200',       'active', NULL, '', '', ''),
('rx_L176',       'GUACAL MASCOTA X3',                              'variedades', 'L-176',       'active', NULL, '', '', ''),
('rx_L259',       'JUGUETE MASCOTA X2 14cm',                        'variedades', 'L-259',       'active', NULL, '', '', ''),
('rx_L276',       'VARITA MASCOTA 40cm',                            'variedades', 'L-276',       'active', NULL, '', '', ''),
('rx_L256',       'JUGUETE MASCOTA X2 9cm',                         'variedades', 'L-256',       'active', NULL, '', '', ''),
('rx_L274',       'VARITA MASCOTA 50cm',                            'variedades', 'L-274',       'active', NULL, '', '', ''),
('rx_L143',       'CARRO COLECCION CLASICO',                        'regalos',    'L-143',       'active', NULL, '', '', ''),
('rx_L150',       'MOTO METALICA LUCES Y SONIDO A',                 'regalos',    'L-150',       'active', NULL, '', '', ''),
('rx_L151',       'MOTO METALICA LUCES Y SONIDO B',                 'regalos',    'L-151',       'active', NULL, '', '', ''),
('rx_L148',       'MOTO METALICA LUCES Y SONIDO C',                 'regalos',    'L-148',       'active', NULL, '', '', ''),
('rx_L577',       'MOTO Y PATINETA REPUESTOS',                      'regalos',    'L-577',       'active', NULL, '', '', ''),
('rx_L1207',      'CARRO MONTER SPEED EN CAJA X12',                 'regalos',    'L-1207',      'active', NULL, '', '', ''),
('rx_L108',       'SQUICHI MUNECO OJOS EN CAJA X12 A',              'regalos',    'L-108',       'active', NULL, '', '', ''),
('rx_L109',       'SQUICHI MUNECO OJOS EN CAJA X12 B',              'regalos',    'L-109',       'active', NULL, '', '', ''),
('rx_L110',       'SQUICHI MUNECO OJOS EN CAJA X12 C',              'regalos',    'L-110',       'active', NULL, '', '', ''),
('rx_ESP18',      'ESPEJO FRESA',                                   'variedades', 'ESP-18',      'active', NULL, '', '', ''),
('rx_KIT1',       'KIT ESPEJO PEINILLA',                            'variedades', 'KIT-1',       'active', NULL, '', '', ''),
('rx_SB1',        'SET BROCHAS X6 PCS',                             'maquillaje', 'SB-1',        'active', NULL, '', '', ''),
('rx_MS3',        'MASAJEADOR 3D ELECTRICO',                        'maquillaje', 'MS-3',        'active', NULL, '', '', ''),
('rx_L1185',      'LAMPARA ESFERA ASTRONAUTA 6cm A',                'regalos',    'L-1185',      'active', NULL, '', '', ''),
('rx_L1187',      'LAMPARA ESFERA ASTRONAUTA 6cm B',                'regalos',    'L-1187',      'active', NULL, '', '', ''),
('rx_L1188',      'LAMPARA ESFERA ASTRONAUTA 6cm C',                'regalos',    'L-1188',      'active', NULL, '', '', ''),

-- ══════════════════════════════════════════════
-- REMISIÓN 000086 — 14/10/2026
-- Juguetes recargables, cocinas, carros
-- ══════════════════════════════════════════════
('r86_6234001',   'MALETA DE DOCTOR 28PCS',                         'regalos',    '623-4001',    'active', NULL, '', '', ''),
('r86_388822C',   'JUGUETE TIRO DARDOS Y PELOTAS CON LUZ',          'regalos',    '3888-22C',    'active', NULL, '', '', ''),
('r86_747600',    'AVION DOBLE CON HELICOPTERO LUCES',              'regalos',    '747-600',     'active', NULL, '', '', ''),
('r86_9661',      'ARCO DARDOS',                                    'regalos',    '966-1',       'active', NULL, '', '', ''),
('r86_123418C',   'MALETA HERRAMIENTAS 154PCS',                     'regalos',    '1234-18C',    'active', NULL, '', '', ''),
('r86_12342F',    'COCINA NINA 99PCS',                              'regalos',    '1234-2F',     'active', NULL, '', '', ''),
('r86_TC5814A1',  'BEBE CON COCHE Y ACCESORIOS',                    'regalos',    'TC5814A-1',   'active', NULL, '', '', ''),
('r86_3817',      'SET COCINA EN BOLSA 10PCS',                      'regalos',    '381-7',       'active', NULL, '', '', ''),
('r86_MY6152',    'BEBE HORA DE COMER',                             'regalos',    'MY615-2',     'active', NULL, '', '', ''),
('r86_869M',      'BEBE ACCESORIOS VASENILLA',                      'regalos',    '869M',        'active', NULL, '', '', ''),
('r86_MY202',     'COCHE MOISES DE NINAS',                          'regalos',    'MY202',       'active', NULL, '', '', ''),
('r86_MY103',     'COCHE PASEADOR DE NINAS A',                      'regalos',    'MY103',       'active', NULL, '', '', ''),
('r86_MY104',     'COCHE PASEADOR DE NINAS B',                      'regalos',    'MY104',       'active', NULL, '', '', ''),
('r86_MY303',     'COCHE PASEADOR DE NINAS C',                      'regalos',    'MY303',       'active', NULL, '', '', ''),
('r86_88238',     'TREN TOMAS LUCES Y SONIDOS',                     'regalos',    '88238',       'active', NULL, '', '', ''),
('r86_2031',      'KIT DE JOYERIA NINAS',                           'regalos',    '203-1',       'active', NULL, '', '', ''),
('r86_MBK586',    'SET DE MANILLAS',                                'accesorios', 'MBK-586',     'active', NULL, '', '', ''),
('r86_98632A',    'CARRO RUEDAS LUMINOSAS GIRO VERTICAL RECARGABLE','regalos',    '986-32A',     'active', NULL, '', '', ''),
('r86_333TS',     'MONSTER TRUCK LANZADORA RAMPA RECARGABLE',       'regalos',    '333-TS251401','active', NULL, '', '', ''),
('r86_SY213KH1U', 'CAMIONETA TODOTERRENO 4X4 METALIZADA RECARGABLE','regalos',   'SY213KH-1U',  'active', NULL, '', '', ''),
('r86_92818',     'CAMIONETA LUCES SPRAY RECARGABLE',               'regalos',    '928-18',      'active', NULL, '', '', ''),
('r86_CZ14A',     'AUTO CARRERAS CAMARA LUCES RECARGABLE',          'regalos',    'CZ14A',       'active', NULL, '', '', ''),
('r86_9802S10',   'CARRO LOCO SPRAY RECARGABLE',                    'regalos',    '9802S-10',    'active', NULL, '', '', '')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 2. INSERTAR STOCK
-- ─────────────────────────────────────────────
INSERT INTO stock (product_id, qty, min_qty, cost_price, updated_at)
VALUES

-- ── Remisión BX 001283 ────────────────────────
('bx_BX16',      10, 5, 0, now()),
('bx_BX22',       3, 2, 0, now()),
('bx_HC8191',     6, 3, 0, now()),
('bx_ML842',      3, 2, 0, now()),
('bx_COS2',       3, 2, 0, now()),
('bx_COS5',       3, 2, 0, now()),
('bx_ML881',     10, 5, 0, now()),
('bx_ML105K',    10, 5, 0, now()),

-- ── Remisión 001282 ───────────────────────────
('rx_L01',       12, 5, 0, now()),
('rx_L02',        6, 3, 0, now()),
('rx_L03',        6, 3, 0, now()),
('rx_L07',        5, 3, 0, now()),
('rx_L08',        5, 3, 0, now()),
('rx_L09',        6, 3, 0, now()),
('rx_L12',        6, 3, 0, now()),
('rx_L29',        3, 2, 0, now()),
('rx_L35',        3, 2, 0, now()),
('rx_L37',        2, 2, 0, now()),
('rx_L38',        2, 2, 0, now()),
('rx_L46',        1, 1, 0, now()),
('rx_L591',       2, 2, 0, now()),
('rx_L581',       2, 2, 0, now()),
('rx_L584',       3, 2, 0, now()),
('rx_L1223',      2, 2, 0, now()),
('rx_L1222',      2, 2, 0, now()),
('rx_L175',      10, 5, 0, now()),
('rx_L177',       6, 3, 0, now()),
('rx_L210',      12, 5, 0, now()),
('rx_L181',       3, 2, 0, now()),
('rx_L290',       2, 2, 0, now()),
('rx_L200',       3, 2, 0, now()),
('rx_L176',       2, 2, 0, now()),
('rx_L259',       4, 2, 0, now()),
('rx_L276',       4, 2, 0, now()),
('rx_L256',       4, 2, 0, now()),
('rx_L274',       4, 2, 0, now()),
('rx_L143',       3, 2, 0, now()),
('rx_L150',       2, 2, 0, now()),
('rx_L151',       2, 2, 0, now()),
('rx_L148',       2, 2, 0, now()),
('rx_L577',       3, 2, 0, now()),
('rx_L1207',     12, 5, 0, now()),
('rx_L108',       4, 2, 0, now()),
('rx_L109',       4, 2, 0, now()),
('rx_L110',       4, 2, 0, now()),
('rx_ESP18',     12, 5, 0, now()),
('rx_KIT1',      10, 5, 0, now()),
('rx_SB1',        5, 3, 0, now()),
('rx_MS3',        6, 3, 0, now()),
('rx_L1185',      2, 2, 0, now()),
('rx_L1187',      2, 2, 0, now()),
('rx_L1188',      2, 2, 0, now()),

-- ── Remisión 000086 ───────────────────────────
('r86_6234001',   2, 1, 0, now()),
('r86_388822C',   3, 2, 0, now()),
('r86_747600',    2, 2, 0, now()),
('r86_9661',      2, 2, 0, now()),
('r86_123418C',   2, 2, 0, now()),
('r86_12342F',    2, 2, 0, now()),
('r86_TC5814A1',  3, 2, 0, now()),
('r86_3817',      5, 3, 0, now()),
('r86_MY6152',    2, 2, 0, now()),
('r86_869M',      2, 2, 0, now()),
('r86_MY202',     1, 1, 0, now()),
('r86_MY103',     1, 1, 0, now()),
('r86_MY104',     1, 1, 0, now()),
('r86_MY303',     1, 1, 0, now()),
('r86_88238',     5, 3, 0, now()),
('r86_2031',      2, 2, 0, now()),
('r86_MBK586',    2, 2, 0, now()),
('r86_98632A',    2, 2, 0, now()),
('r86_333TS',     1, 1, 0, now()),
('r86_SY213KH1U', 2, 2, 0, now()),
('r86_92818',     2, 2, 0, now()),
('r86_CZ14A',     2, 2, 0, now()),
('r86_9802S10',   4, 2, 0, now())

ON CONFLICT (product_id) DO UPDATE
  SET qty = stock.qty + EXCLUDED.qty,
      updated_at = now();
