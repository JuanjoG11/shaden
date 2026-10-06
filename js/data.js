/* =============================================
   SHADEN — Data Layer (Supabase)
   ============================================= */

const ShadenDB = (() => {

  /* ── Auth local (credenciales en sessionStorage, no en Supabase) ── */
  const DEFAULT_AUTH = { username: 'admin', password: 'shaden2026' };
  const AUTH_KEY     = 'shaden_auth';

  function getAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || DEFAULT_AUTH; }
    catch { return DEFAULT_AUTH; }
  }
  function saveAuth(data) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  }

  /* ── Helper: lanza error legible ── */
  function check(error, context) {
    if (error) {
      console.error(`ShadenDB [${context}]:`, error.message);
      throw new Error(error.message);
    }
  }

  /* ══════════════════════════════
     CATEGORIES
  ══════════════════════════════ */
  const Categories = {

    async getAll() {
      const { data, error } = await db
        .from('categories')
        .select('*')
        .order('name');
      check(error, 'Categories.getAll');
      return data || [];
    },

    async getById(id) {
      const { data, error } = await db
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return null;
      return data;
    },

    async add(cat) {
      const id = cat.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
      const { data, error } = await db
        .from('categories')
        .insert({ id, name: cat.name, icon: cat.icon || 'fa-solid fa-tag' })
        .select()
        .single();
      check(error, 'Categories.add');
      return data;
    },

    async update(id, payload) {
      const { error } = await db
        .from('categories')
        .update({ name: payload.name, icon: payload.icon })
        .eq('id', id);
      check(error, 'Categories.update');
    },

    async delete(id) {
      const { error } = await db
        .from('categories')
        .delete()
        .eq('id', id);
      check(error, 'Categories.delete');
    },
  };

  /* ══════════════════════════════
     PRODUCTS
  ══════════════════════════════ */
  const Products = {

    async getAll() {
      const { data, error } = await db
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      check(error, 'Products.getAll');
      return data || [];
    },

    async getActive() {
      const { data, error } = await db
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      check(error, 'Products.getActive');
      return data || [];
    },

    async getById(id) {
      const { data, error } = await db
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return null;
      return data;
    },

    async getByCategory(catId) {
      const { data, error } = await db
        .from('products')
        .select('*')
        .eq('category', catId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      check(error, 'Products.getByCategory');
      return data || [];
    },

    async add(product) {
      const id = 'p' + Date.now() + Math.random().toString(36).slice(2, 6);
      const { data, error } = await db
        .from('products')
        .insert({
          id,
          name:        product.name,
          category:    product.category,
          price:       product.price || null,
          description: product.description || '',
          image:       product.image || '',
          badge:       product.badge || '',
          status:      product.status || 'active',
        })
        .select()
        .single();
      check(error, 'Products.add');
      return data;
    },

    async update(id, product) {
      const { error } = await db
        .from('products')
        .update({
          name:        product.name,
          category:    product.category,
          price:       product.price || null,
          description: product.description || '',
          image:       product.image || '',
          badge:       product.badge || '',
          status:      product.status || 'active',
        })
        .eq('id', id);
      check(error, 'Products.update');
    },

    async delete(id) {
      const { error } = await db
        .from('products')
        .delete()
        .eq('id', id);
      check(error, 'Products.delete');
    },

    async search(query) {
      const q = query.toLowerCase().trim();
      const { data, error } = await db
        .from('products')
        .select('*')
        .eq('status', 'active')
        .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
        .order('created_at', { ascending: false });
      check(error, 'Products.search');
      return data || [];
    },
  };

  /* ══════════════════════════════
     SETTINGS
  ══════════════════════════════ */
  const Settings = {

    _defaults: {
      store_name: 'Shaden',
      tagline:    'Tienda de Variedades',
      phone:      '573042468500',
      address:    'Cra 27 #72-03, Cuba, Pereira',
      instagram:  '@shaden_variedades',
      discount:   10,
      about:      'En Shaden encontrarás todo lo que necesitas.',
    },

    async get() {
      const { data, error } = await db
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (error || !data) return this._defaults;
      // Normalizar nombres de campo a camelCase para el resto del código
      return {
        storeName:  data.store_name,
        tagline:    data.tagline,
        phone:      data.phone,
        address:    data.address,
        instagram:  data.instagram,
        discount:   data.discount,
        about:      data.about,
      };
    },

    async save(payload) {
      const { error } = await db
        .from('settings')
        .upsert({
          id:         1,
          store_name: payload.storeName,
          tagline:    payload.tagline,
          phone:      payload.phone,
          address:    payload.address,
          instagram:  payload.instagram,
          discount:   payload.discount,
          about:      payload.about,
        });
      check(error, 'Settings.save');
    },
  };

  /* ══════════════════════════════
     AUTH (local — no Supabase Auth)
  ══════════════════════════════ */
  const Auth = {
    get()                    { return getAuth(); },
    check(username, password){ const a = getAuth(); return a.username === username && a.password === password; },
    changePassword(newPass)  { saveAuth({ ...getAuth(), password: newPass }); },
    setSession()             { sessionStorage.setItem('shaden_logged', '1'); },
    clearSession()           { sessionStorage.removeItem('shaden_logged'); },
    isLoggedIn()             { return sessionStorage.getItem('shaden_logged') === '1'; },
  };

  return { Categories, Products, Settings, Auth };
})();
