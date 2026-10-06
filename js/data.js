/* =============================================
   SHADEN — Data Layer
   Gestión de datos con localStorage
   ============================================= */

const ShadenDB = (() => {

  /* ── Claves de almacenamiento ── */
  const KEYS = {
    products:   'shaden_products',
    categories: 'shaden_categories',
    settings:   'shaden_settings',
    auth:       'shaden_auth',
  };

  /* ── Categorías por defecto ── */
  const DEFAULT_CATEGORIES = [
    { id: 'variedades',  name: 'Variedades',  icon: 'fa-solid fa-shirt' },
    { id: 'regalos',     name: 'Regalos',     icon: 'fa-solid fa-gift' },
    { id: 'accesorios',  name: 'Accesorios',  icon: 'fa-solid fa-gem' },
    { id: 'maquillaje',  name: 'Maquillaje',  icon: 'fa-solid fa-palette' },
    { id: 'sexshop',     name: 'Sex Shop',    icon: 'fa-solid fa-heart' },
  ];

  /* ── Productos de muestra ── */
  const DEFAULT_PRODUCTS = [
    {
      id: 'p1',
      name: 'Set de Maquillaje Completo',
      category: 'maquillaje',
      price: 85000,
      description: 'Set completo con sombras, labiales, rubor y corrector. Colores vibrantes de larga duración ideales para cualquier ocasión.',
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80',
      badge: 'featured',
      status: 'active',
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      id: 'p2',
      name: 'Collar Dorado Elegante',
      category: 'accesorios',
      price: 32000,
      description: 'Collar fino bañado en oro con dije delicado. Perfecto para complementar cualquier look, casual o formal.',
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80',
      badge: 'new',
      status: 'active',
      createdAt: Date.now() - 86400000 * 4,
    },
    {
      id: 'p3',
      name: 'Caja de Regalo Premium',
      category: 'regalos',
      price: 45000,
      description: 'Caja decorativa con lazo y papel de seda. Ideal para sorprender a alguien especial en cualquier fecha.',
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&q=80',
      badge: '',
      status: 'active',
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      id: 'p4',
      name: 'Aretes Perla Blanca',
      category: 'accesorios',
      price: 18000,
      description: 'Aretes de perla sintética con base dorada. Elegantes y versátiles para el día a día.',
      image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80',
      badge: '',
      status: 'active',
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'p5',
      name: 'Labial Mate Colección Rosa',
      category: 'maquillaje',
      price: 22000,
      description: 'Labial de larga duración en tonos rosados. Fórmula hidratante que no reseca los labios.',
      image: 'https://images.unsplash.com/photo-1586495777744-4e6232bf5b25?w=600&q=80',
      badge: 'offer',
      status: 'active',
      createdAt: Date.now() - 86400000 * 1,
    },
    {
      id: 'p6',
      name: 'Bolso Tote Canvas',
      category: 'variedades',
      price: 55000,
      description: 'Bolso tote en tela canvas resistente con asas reforzadas. Espacio amplio para el día a día.',
      image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80',
      badge: 'new',
      status: 'active',
      createdAt: Date.now(),
    },
    {
      id: 'p7',
      name: 'Vela Aromática Lavanda',
      category: 'regalos',
      price: 28000,
      description: 'Vela artesanal de soya con fragancia de lavanda y vainilla. Tiempo de quema de 40 horas.',
      image: 'https://images.unsplash.com/photo-1608181831688-c6b4a4fc5cc5?w=600&q=80',
      badge: '',
      status: 'active',
      createdAt: Date.now() - 86400000 * 6,
    },
    {
      id: 'p8',
      name: 'Kit Íntimo Pareja',
      category: 'sexshop',
      price: 75000,
      description: 'Kit discreto para parejas. Incluye accesorios de bienestar y aceite de masaje.',
      image: '',
      badge: '',
      status: 'active',
      createdAt: Date.now() - 86400000 * 7,
    },
    {
      id: 'p9',
      name: 'Pulsera Charm Dorada',
      category: 'accesorios',
      price: 24000,
      description: 'Pulsera ajustable con charms decorativos bañada en oro. Viene en caja de regalo.',
      image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80',
      badge: '',
      status: 'active',
      createdAt: Date.now() - 86400000 * 8,
    },
    {
      id: 'p10',
      name: 'Perfume Floral 50ml',
      category: 'variedades',
      price: 68000,
      description: 'Fragancia femenina con notas de jazmín, rosa y sándalo. Duración prolongada.',
      image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=600&q=80',
      badge: 'featured',
      status: 'active',
      createdAt: Date.now() - 86400000 * 9,
    },
    {
      id: 'p11',
      name: 'Juego de Cuadernos Aesthetic',
      category: 'variedades',
      price: 35000,
      description: 'Set de 3 cuadernos con diseños florales. Papel de alta calidad, tapa dura.',
      image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80',
      badge: '',
      status: 'active',
      createdAt: Date.now() - 86400000 * 10,
    },
    {
      id: 'p12',
      name: 'Base de Maquillaje HD',
      category: 'maquillaje',
      price: 42000,
      description: 'Base líquida de cobertura media-alta. Fórmula con SPF 15, disponible en 12 tonos.',
      image: 'https://images.unsplash.com/photo-1631730486572-226d1f595b68?w=600&q=80',
      badge: 'new',
      status: 'active',
      createdAt: Date.now() - 86400000 * 11,
    },
  ];

  /* ── Configuración por defecto ── */
  const DEFAULT_SETTINGS = {
    storeName:  'Shaden',
    tagline:    'Tienda de Variedades',
    phone:      '573042468500',
    address:    'Cra 27 #72-03, Cuba, Pereira',
    instagram:  '@shaden_variedades',
    discount:   10,
    about:      'En Shaden encontrarás todo lo que necesitas: desde accesorios y regalos únicos hasta maquillaje y artículos de variedades seleccionados con amor.',
  };

  /* ── Auth por defecto ── */
  const DEFAULT_AUTH = {
    username: 'admin',
    password: 'shaden2026',
  };

  /* ── Helpers ── */
  function load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) { console.error('ShadenDB save error:', e); }
  }

  function generateId() {
    return 'p' + Date.now() + Math.random().toString(36).slice(2, 6);
  }

  /* ── Init: carga defaults si no hay datos ── */
  function init() {
    if (!load(KEYS.categories)) save(KEYS.categories, DEFAULT_CATEGORIES);
    if (!load(KEYS.products))   save(KEYS.products,   DEFAULT_PRODUCTS);
    if (!load(KEYS.settings))   save(KEYS.settings,   DEFAULT_SETTINGS);
    if (!load(KEYS.auth))       save(KEYS.auth,        DEFAULT_AUTH);
  }

  /* ── Categories API ── */
  const Categories = {
    getAll() { return load(KEYS.categories) || []; },
    getById(id) { return this.getAll().find(c => c.id === id) || null; },
    add(cat) {
      const list = this.getAll();
      const newCat = { ...cat, id: cat.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() };
      list.push(newCat);
      save(KEYS.categories, list);
      return newCat;
    },
    update(id, data) {
      const list = this.getAll().map(c => c.id === id ? { ...c, ...data } : c);
      save(KEYS.categories, list);
    },
    delete(id) {
      const list = this.getAll().filter(c => c.id !== id);
      save(KEYS.categories, list);
    },
  };

  /* ── Products API ── */
  const Products = {
    getAll() { return load(KEYS.products) || []; },
    getActive() { return this.getAll().filter(p => p.status === 'active'); },
    getById(id) { return this.getAll().find(p => p.id === id) || null; },
    getByCategory(catId) { return this.getActive().filter(p => p.category === catId); },
    add(product) {
      const list = this.getAll();
      const newProd = { ...product, id: generateId(), createdAt: Date.now() };
      list.push(newProd);
      save(KEYS.products, list);
      return newProd;
    },
    update(id, data) {
      const list = this.getAll().map(p => p.id === id ? { ...p, ...data } : p);
      save(KEYS.products, list);
    },
    delete(id) {
      const list = this.getAll().filter(p => p.id !== id);
      save(KEYS.products, list);
    },
    search(query) {
      const q = query.toLowerCase().trim();
      return this.getActive().filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (Categories.getById(p.category)?.name || '').toLowerCase().includes(q)
      );
    },
  };

  /* ── Settings API ── */
  const Settings = {
    get() { return { ...DEFAULT_SETTINGS, ...(load(KEYS.settings) || {}) }; },
    save(data) { save(KEYS.settings, { ...this.get(), ...data }); },
  };

  /* ── Auth API ── */
  const Auth = {
    get() { return load(KEYS.auth) || DEFAULT_AUTH; },
    check(username, password) {
      const auth = this.get();
      return auth.username === username && auth.password === password;
    },
    changePassword(newPassword) {
      const auth = this.get();
      save(KEYS.auth, { ...auth, password: newPassword });
    },
    setSession()    { sessionStorage.setItem('shaden_logged', '1'); },
    clearSession()  { sessionStorage.removeItem('shaden_logged'); },
    isLoggedIn()    { return sessionStorage.getItem('shaden_logged') === '1'; },
  };

  return { init, Categories, Products, Settings, Auth };
})();

/* Inicializar DB al cargar */
ShadenDB.init();
