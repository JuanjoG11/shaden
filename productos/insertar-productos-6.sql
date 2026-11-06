-- =============================================
-- SHADEN — Inserción masiva de productos #6
-- Fuente: La Bodega H&C S.A.S. — FVBC-10001
-- 15/10/2026 — Cosméticos y cuidado personal
-- 80 referencias · price = NULL (asignar después)
-- =============================================

-- ─────────────────────────────────────────────
-- 0. CATEGORÍAS NUEVAS (si no existen)
-- ─────────────────────────────────────────────
INSERT INTO categories (id, name, icon) VALUES
  ('cabello',          'Cabello',          'fa-solid fa-wand-magic-sparkles'),
  ('cuidado-personal', 'Cuidado Personal', 'fa-solid fa-hand-sparkles')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 1. INSERTAR PRODUCTOS
-- ─────────────────────────────────────────────
INSERT INTO products (id, name, category, barcode, status, price, description, image, badge)
VALUES
-- PONDS
('bod_PONDS_ROJA',      'CREMA FACIAL PONDS SOBRE ROJA CAJA X 10 UNI',             'cuidado-personal', '0756BODEGA', 'active', NULL, '', '', ''),
('bod_PONDS_AZUL',      'CREMA FACIAL PONDS SOBRE AZUL CAJA X 10 UNI',             'cuidado-personal', '5150BODEGA', 'active', NULL, '', '', ''),
('bod_PONDS_REJUV',     'CREMA FACIAL PONDS REJUVENESS X 50',                      'cuidado-personal', '1480BODEGA', 'active', NULL, '', '', ''),
('bod_PONDS_CLAR_SECA', 'CREMA FACIAL PONDS CLARANT B X 50 - SECA',                'cuidado-personal', '11731BODEGA','active', NULL, '', '', ''),
('bod_PONDS_CLAR_GRAS', 'CREMA FACIAL PONDS CLARANT B X 50 - GRASA',               'cuidado-personal', '1545BODEGA', 'active', NULL, '', '', ''),

-- RITUAL BOTANICO
('bod_RITBOT_MSK400',   'MASCARILLA BOMBA RITUAL BOTANICO X 400 ml',               'cabello',          '10568BODEGA','active', NULL, '', '', ''),
('bod_RITBOT_TRAT400',  'TRAT RITUAL BOTANICO X 400 ml - INTENSIVO PLEX',          'cabello',          '10569BODEGA','active', NULL, '', '', ''),
('bod_RITBOT_SH_ROME',  'SH RITUAL BOTANICO X 400 ml - ROMERO Y EUCALIPTO',        'cabello',          '10571BODEGA','active', NULL, '', '', ''),
('bod_RITBOT_SH_AJI',   'SH RITUAL BOTANICO X 400 ml - AJI CONTROL CAIDA',        'cabello',          '10993BODEGA','active', NULL, '', '', ''),
('bod_RITBOT_TERMO_AZ', 'TERMOPROTECTOR RITUAL BOTANICO X 120 ml AZUL',            'cabello',          '11345BODEGA','active', NULL, '', '', ''),
('bod_RITBOT_TERMO_RO', 'TERMOPROTECTOR RITUAL BOTANICO X 120 ml ROSADO',          'cabello',          '5850BODEGA', 'active', NULL, '', '', ''),
('bod_RITBOT_KERA120',  'KERATINA RITUAL BOTANICO X 120 ml',                       'cabello',          '4855BODEGA', 'active', NULL, '', '', ''),

-- MONTOC
('bod_MON_POLVO_MINI',  'POLVO SUELTO MONTOC MINI X 5 gr TRASLUCIDO',              'maquillaje',       '10617BODEGA','active', NULL, '', '', ''),
('bod_MON_POLVO_PEQ',   'POLVO SUELTO MONTOC PEQUEÑO X 10 gr TRASLUCIDO',         'maquillaje',       '5149BODEGA', 'active', NULL, '', '', ''),
('bod_MON_CORR300',     'CORRECTOR LIQUIDO MONTOC HUMIDE #300 VERY NATURAL',       'maquillaje',       '11713BODEGA','active', NULL, '', '', ''),
('bod_MON_CORR200',     'CORRECTOR LIQUIDO MONTOC HUMIDE #200 YOGURT FIT',         'maquillaje',       '11721BODEGA','active', NULL, '', '', ''),
('bod_MON_FIJADOR',     'FIJADOR DE MAQUILLAJE MONTOC DUXY FIX X 10 ml',          'maquillaje',       '14261BODEGA','active',  6700, '', '', ''),
('bod_MON_RUBOR_NOST',  'RUBOR LIQUIDO MONTOC NOSTALGIC X 10 gr RECE',            'maquillaje',       '8154BODEGA', 'active', NULL, '', '', ''),
('bod_MON_CONT_AMBER',  'CONTORNO LIQUIDO HUMIDE MONTOC AMBER',                   'maquillaje',       '9418BODEGA', 'active', NULL, '', '', ''),
('bod_MON_BASE_HUM500', 'BASE MONTOC HUMIDE X 30 TONO 500',                       'maquillaje',       '9419BODEGA', 'active', NULL, '', '', ''),
('bod_MON_BASE_HUM300', 'BASE MONTOC HUMIDE X 30 TONO 300',                       'maquillaje',       '9420BODEGA', 'active', NULL, '', '', ''),
('bod_MON_BASE_HUM400', 'BASE MONTOC HUMIDE X 30 TONO 400',                       'maquillaje',       '9421BODEGA', 'active', NULL, '', '', ''),

-- BLOOMSHELL
('bod_BLO_KIT_BK526',   'KIT MINI INFALTABLES X 6 BLOOMSHELL BL-BK526',           'maquillaje',       '10949BODEGA','active', NULL, '', '', ''),
('bod_BLO_CORR_J03',    'CORRECTOR LIQUIDO BLOOMSHELL JUMBO TONO 03 BL-B0808-03', 'maquillaje',       '11820BODEGA','active', NULL, '', '', ''),
('bod_BLO_CORR_J04',    'CORRECTOR LIQUIDO BLOOMSHELL JUMBO TONO 04 BL-B0808-04', 'maquillaje',       '11821BODEGA','active', NULL, '', '', ''),
('bod_BLO_CORR_N00',    'CORRECTOR LIQUIDO BLOOMSHELL NEW TONO 00 BL-B1010-00',   'maquillaje',       '11827BODEGA','active', NULL, '', '', ''),
('bod_BLO_CORR_N01',    'CORRECTOR LIQUIDO BLOOMSHELL NEW TONO 01 BL-B1010-01',   'maquillaje',       '11828BODEGA','active', NULL, '', '', ''),
('bod_BLO_CORR_N02',    'CORRECTOR LIQUIDO BLOOMSHELL NEW TONO 02 BL-B1010-02',   'maquillaje',       '11829BODEGA','active', NULL, '', '', ''),
('bod_BLO_CORR_N03',    'CORRECTOR LIQUIDO BLOOMSHELL NEW TONO 03 BL-B1010-03',   'maquillaje',       '11830BODEGA','active', NULL, '', '', ''),
('bod_BLO_CORR_N04',    'CORRECTOR LIQUIDO BLOOMSHELL NEW TONO 04 BL-B1010-04',   'maquillaje',       '11831BODEGA','active', NULL, '', '', ''),
('bod_BLO_PSP38',       'POLVO SUELTO BLOOMSHELL 4 EN 1 BL-PSP38',                'maquillaje',       '13842BODEGA','active', NULL, '', '', ''),
('bod_BLO_KIT_BKM36',   'KIT MINI FAVORITOS X 6 BLOOMSHELL BL-BKM36',             'maquillaje',       '13941BODEGA','active', NULL, '', '', ''),
('bod_BLO_PALETA_RUB',  'PALETA DE RUBORES BLOOM DOLCE BOUQUET BL-BRB2938',       'maquillaje',       '12617BODEGA','active', NULL, '', '', ''),
('bod_BLO_KIT_POKET',   'KIT BLOOMSHELL POKET KISS BL-BL0077',                    'maquillaje',       '16514BODEGA','active', NULL, '', '', ''),
('bod_BLO_KIT_KISS',    'KIT BLOOMSHELL KISS LOVE BL-BL0106',                     'maquillaje',       '16510BODEGA','active', NULL, '', '', ''),

-- MAJIKAL / PURE COVER
('bod_MAJ_CORR_02',     'CORRECTOR LIQUIDO PURE COVER MAJIKAL 02 OFF WHITE',      'maquillaje',       '14364BODEGA','active', NULL, '', '', ''),
('bod_MAJ_CORR_03',     'CORRECTOR LIQUIDO PURE COVER MAJIKAL 03 LATINA',         'maquillaje',       '14365BODEGA','active', NULL, '', '', ''),
('bod_MAJ_CORR_04',     'CORRECTOR LIQUIDO PURE COVER MAJIKAL 04 CREAM BRULE',    'maquillaje',       '14366BODEGA','active', NULL, '', '', ''),
('bod_MAJ_CORR_XL03',   'CORRECTOR LIQUIDO PURE COVER MAJIKAL XL 03 LATINA',     'maquillaje',       '14516BODEGA','active', NULL, '', '', ''),

-- LULA*
('bod_LULA_BASE_T01',   'BASE LIQUIDA LULA* TONO 01',                             'maquillaje',       '12151BODEGA','active', NULL, '', '', ''),
('bod_LULA_BASE_T04',   'BASE LIQUIDA LULA* TONO 04',                             'maquillaje',       '12154BODEGA','active', NULL, '', '', ''),
('bod_LULA_BASE_T05',   'BASE LIQUIDA LULA* TONO 05',                             'maquillaje',       '12165BODEGA','active', NULL, '', '', ''),
('bod_LULA_BASE_T06',   'BASE LIQUIDA LULA* TONO 06',                             'maquillaje',       '12156BODEGA','active', NULL, '', '', ''),
('bod_LULA_PRIMER',     'PRIMER LULA* X 30 ml',                                   'maquillaje',       '12242BODEGA','active', NULL, '', '', ''),
('bod_LULA_BRILLO_CAR', 'BRILLO LABIOS LULA* BALSAMO + MASCARILLA KITDL01 CARAMELO','maquillaje',     '16338BODEGA','active', NULL, '', '', ''),
('bod_LULA_TONICO30',   'TONICO ANTI-IMPERFECCIONES LB* X 30 ml',                 'cuidado-personal', '5187BODEGA', 'active', NULL, '', '', ''),

-- NAILEN
('bod_NAI_POLVO_T0',    'POLVO NAILEN COMPACTO TONO 0',                           'maquillaje',       '1281BODEGA', 'active',  7900, '', '', ''),
('bod_NAI_POLVO_T1',    'POLVO NAILEN COMPACTO TONO 1',                           'maquillaje',       '12811BODEGA','active',  7900, '', '', ''),
('bod_NAI_POLVO_T3',    'POLVO NAILEN COMPACTO TONO 3',                           'maquillaje',       '12813BODEGA','active',  7900, '', '', ''),

-- VOGUE
('bod_VOG_PEST_AMOR',   'PESTANINA VOGUE AMOR A PRIMERA VISTA',                   'maquillaje',       '16659BODEGA','active', NULL, '', '', ''),
('bod_VOG_PEST_CURVA',  'PESTANINA VOGUE CURVA',                                  'maquillaje',       '3001BODEGA', 'active', NULL, '', '', ''),
('bod_VOG_BRILLO_FIE',  'BRILLO VOGUE COLORISIMO EXTRA B - FIESTA',               'maquillaje',       '4735BODEGA', 'active', NULL, '', '', ''),

-- ATENEA
('bod_ATE_SOMB_HAW',    'SOMBRA ATENEA HAWAII X 35',                              'maquillaje',       '5187BATE',   'active', NULL, '', '', ''),
('bod_ATE_SOMB_MAR',    'SOMBRA ATENEA MARVELOUS X 35 ATEMAR1',                   'maquillaje',       '7327BODEGA', 'active', NULL, '', '', ''),
('bod_ATE_RUBOR_DUO',   'RUBOR DUO ATENEA PINK CRUSH',                            'maquillaje',       '7117BODEGA', 'active', NULL, '', '', ''),

-- ARRURRU
('bod_ARR_LOC_AZUL',    'LOCION ARRURRU AZUL X 30 mini',                          'cuidado-personal', '1237BODEGA', 'active',  6200, '', '', ''),
('bod_ARR_LOC_ROSA',    'LOCION ARRURRU ROSADA X 30 mini',                        'cuidado-personal', '8773BODEGA', 'active',  5200, '', '', ''),

-- GLOW SHINE*
('bod_GLO_SPLASH250',   'SPLASH CORPORAL GLOW SHINE* X 250 ml - DORADO',          'cuidado-personal', '14842BODEGA','active', NULL, '', '', ''),
('bod_GLO_MANT300',     'MANTEQUILLA CORPORAL GLOW SHINE* X 300 ml - GRASA',      'cuidado-personal', '14844BODEGA','active', NULL, '', '', ''),
('bod_GLO_MANT140',     'MANTEQUILLA CORPORAL GLOW SHINE* X 140 ml - ROSADO',     'cuidado-personal', '15734BODEGA','active', NULL, '', '', ''),

-- VIVE BEAUTY
('bod_VIV_CHISP130',    'CHISPITA DE LUNA VIVE BEAUTY X 130 ml - YUMMY CAKE',     'cuidado-personal', '15604BODEGA','active', NULL, '', '', ''),
('bod_VIV_MANT200_YUM', 'MANTEQUILLA CORPORAL VIVE BEAUTY X 200 ml - YUMMY CAKE', 'cuidado-personal', '15696BODEGA','active', NULL, '', '', ''),
('bod_VIV_MANT200_ROM', 'MANTEQUILLA CORPORAL VIVE BEAUTY X 200 ml - ROOMBERRY BOMBOMBUN','cuidado-personal','5149BVIV','active', NULL, '', '', ''),

-- COSMETIQUERA
('bod_ANIK_CA2650',     'COSMETIQUERA ANIK CA2650',                               'accesorios',       '14824BODEGA','active', NULL, '', '', ''),

-- ALMA DE ROMERO
('bod_ALM_SH_CEB',      'SH ALMA DE ROMERO X 500 ml - CEBOLLA',                   'cabello',          '15563BODEGA','active', NULL, '', '', ''),
('bod_ALM_SH_AGU',      'SH ALMA DE ROMERO X 500 ml - AGUACATE',                  'cabello',          '15566BODEGA','active', NULL, '', '', ''),
('bod_ALM_ACO_CEB',     'ACOND ALMA DE ROMERO X 500 ml - CEBOLLA',                'cabello',          '15569BODEGA','active', NULL, '', '', ''),
('bod_ALM_ACO_AGU',     'ACOND ALMA DE ROMERO X 500 ml - AGUACATE',               'cabello',          '15573BODEGA','active', NULL, '', '', ''),
('bod_ALM_TRAT_AGU',    'TRAT ALMA DE ROMERO X 400 ml - AGUACATE',                'cabello',          '15573BTRAT', 'active', NULL, '', '', ''),

-- LIGNE DOR / GIRLY / LECHE PAL PELO
('bod_LIG_DESMITH',     'DESMAQUILLANTE BIFASICO LIGNE DOR X 120 ml',             'cuidado-personal', '8923BODEGA', 'active', NULL, '', '', ''),
('bod_GIR_DESMAQ120',   'DESMAQUILLANTE PARA OJOS GIRLY X 120 ml',                'cuidado-personal', '8102BODEGA', 'active', NULL, '', '', ''),
('bod_LEC_REPAR35',     'REPARAPUNTAS FINISH CHIA OIL LECHE PAL PELO X 35 ml',    'cabello',          '8139BODEGA', 'active', NULL, '', '', ''),
('bod_LEC_RECON30',     'RECONSTRUCTOR LECHE PAL PELO SOBRE X 30 INSTANTANEO',    'cabello',          '8145BODEGA', 'active',  2600, '', '', ''),
('bod_LEC_SPLASH120',   'SPLASH CAPILAR LECHE PAL PELO X 120 KIDS',               'cabello',          '8140BODEGA', 'active', NULL, '', '', ''),

-- LAPIZ SAMY
('bod_SAM_TERRA08',     'LAPIZ SAMY DELINEADOR TERRACOTA #08',                    'maquillaje',       '2286BTER',   'active',  2700, '', '', ''),
('bod_SAM_CAFE03',      'LAPIZ SAMY DELINEADOR CAFE 02 #03',                      'maquillaje',       '2286BCAF',   'active',  2700, '', '', ''),
('bod_SAM_CARM23',      'LAPIZ SAMY DELINEADOR CARMESI #23',                      'maquillaje',       '2286BCAR',   'active',  2700, '', '', ''),
('bod_SAM_NEGR06',      'LAPIZ SAMY DELINEADOR NEGRO #06',                        'maquillaje',       '2286BNEG',   'active',  2700, '', '', ''),
('bod_SAM_ROSA24',      'LAPIZ SAMY DELINEADOR PALO DE ROSA #24',                 'maquillaje',       '2286BROS',   'active',  2700, '', '', '')

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────
-- 2. INSERTAR STOCK
-- ─────────────────────────────────────────────
INSERT INTO stock (product_id, qty, min_qty, cost_price, updated_at)
VALUES
-- PONDS
('bod_PONDS_ROJA',       2, 1, 15966, now()),
('bod_PONDS_AZUL',       2, 1, 15966, now()),
('bod_PONDS_REJUV',      6, 2, 10084, now()),
('bod_PONDS_CLAR_SECA',  5, 2, 13697, now()),
('bod_PONDS_CLAR_GRAS',  6, 2, 11765, now()),

-- RITUAL BOTANICO
('bod_RITBOT_MSK400',    3, 1, 25210, now()),
('bod_RITBOT_TRAT400',   3, 1, 24286, now()),
('bod_RITBOT_SH_ROME',  10, 3, 24286, now()),
('bod_RITBOT_SH_AJI',    6, 2, 24286, now()),
('bod_RITBOT_TERMO_AZ',  6, 2, 15846, now()),
('bod_RITBOT_TERMO_RO',  3, 1, 15846, now()),
('bod_RITBOT_KERA120',   6, 2, 22689, now()),

-- MONTOC
('bod_MON_POLVO_MINI',   3, 1, 14958, now()),
('bod_MON_POLVO_PEQ',    3, 1, 18487, now()),
('bod_MON_CORR300',      3, 1, 22269, now()),
('bod_MON_CORR200',      3, 1, 22269, now()),
('bod_MON_FIJADOR',      6, 2,  5630, now()),
('bod_MON_RUBOR_NOST',   3, 1, 16555, now()),
('bod_MON_CONT_AMBER',   3, 1, 17563, now()),
('bod_MON_BASE_HUM500',  3, 1, 30924, now()),
('bod_MON_BASE_HUM300',  3, 1, 30924, now()),
('bod_MON_BASE_HUM400',  3, 1, 30924, now()),

-- BLOOMSHELL
('bod_BLO_KIT_BK526',    3, 1, 13361, now()),
('bod_BLO_CORR_J03',     3, 1, 18740, now()),
('bod_BLO_CORR_J04',     3, 1, 18740, now()),
('bod_BLO_CORR_N00',     3, 1, 11681, now()),
('bod_BLO_CORR_N01',     3, 1, 11681, now()),
('bod_BLO_CORR_N02',     3, 1, 11681, now()),
('bod_BLO_CORR_N03',     3, 1, 11681, now()),
('bod_BLO_CORR_N04',     3, 1, 11681, now()),
('bod_BLO_PSP38',        3, 1, 21849, now()),
('bod_BLO_KIT_BKM36',    3, 1, 13361, now()),
('bod_BLO_PALETA_RUB',   3, 1, 21008, now()),
('bod_BLO_KIT_POKET',   10, 3, 10338, now()),
('bod_BLO_KIT_KISS',     8, 2, 65546, now()),

-- MAJIKAL / PURE COVER
('bod_MAJ_CORR_02',      3, 1, 22941, now()),
('bod_MAJ_CORR_03',      3, 1, 22941, now()),
('bod_MAJ_CORR_04',      3, 1, 22941, now()),
('bod_MAJ_CORR_XL03',    4, 1, 28151, now()),

-- LULA*
('bod_LULA_BASE_T01',    3, 1, 13445, now()),
('bod_LULA_BASE_T04',    3, 1, 13445, now()),
('bod_LULA_BASE_T05',    3, 1, 13445, now()),
('bod_LULA_BASE_T06',    3, 1, 13445, now()),
('bod_LULA_PRIMER',      6, 2, 13109, now()),
('bod_LULA_BRILLO_CAR',  3, 1, 10924, now()),
('bod_LULA_TONICO30',   16, 4, 18908, now()),

-- NAILEN
('bod_NAI_POLVO_T0',     6, 2,  6639, now()),
('bod_NAI_POLVO_T1',     6, 2,  6639, now()),
('bod_NAI_POLVO_T3',     6, 2,  6639, now()),

-- VOGUE
('bod_VOG_PEST_AMOR',    2, 1, 16367, now()),
('bod_VOG_PEST_CURVA',   2, 1, 15796, now()),
('bod_VOG_BRILLO_FIE',   6, 2,  9244, now()),

-- ATENEA
('bod_ATE_SOMB_HAW',     2, 1, 47899, now()),
('bod_ATE_SOMB_MAR',     3, 1, 47899, now()),
('bod_ATE_RUBOR_DUO',    3, 1,  9580, now()),

-- ARRURRU
('bod_ARR_LOC_AZUL',    10, 3,  5210, now()),
('bod_ARR_LOC_ROSA',    10, 3,  5210, now()),

-- GLOW SHINE*
('bod_GLO_SPLASH250',    6, 2, 18487, now()),
('bod_GLO_MANT300',      6, 2, 19328, now()),
('bod_GLO_MANT140',      6, 2, 13109, now()),

-- VIVE BEAUTY
('bod_VIV_CHISP130',     8, 2, 14706, now()),
('bod_VIV_MANT200_YUM',  6, 2, 17647, now()),
('bod_VIV_MANT200_ROM',  6, 2, 15966, now()),

-- COSMETIQUERA
('bod_ANIK_CA2650',      4, 1, 13361, now()),

-- ALMA DE ROMERO
('bod_ALM_SH_CEB',       3, 1, 18908, now()),
('bod_ALM_SH_AGU',       3, 1, 18908, now()),
('bod_ALM_ACO_CEB',      3, 1, 18908, now()),
('bod_ALM_ACO_AGU',      3, 1, 18908, now()),
('bod_ALM_TRAT_AGU',     3, 1, 19748, now()),

-- LIGNE DOR / GIRLY / LECHE PAL PELO
('bod_LIG_DESMITH',      6, 2,  9580, now()),
('bod_GIR_DESMAQ120',    4, 1, 24706, now()),
('bod_LEC_REPAR35',      4, 1, 15210, now()),
('bod_LEC_RECON30',     10, 3,  2185, now()),
('bod_LEC_SPLASH120',    8, 2, 15796, now()),

-- LAPIZ SAMY
('bod_SAM_TERRA08',      6, 2,  2269, now()),
('bod_SAM_CAFE03',       6, 2,  2269, now()),
('bod_SAM_CARM23',       6, 2,  2269, now()),
('bod_SAM_NEGR06',       6, 2,  2269, now()),
('bod_SAM_ROSA24',       3, 1,  2269, now())

ON CONFLICT (product_id) DO UPDATE
  SET qty = stock.qty + EXCLUDED.qty,
      updated_at = now();
