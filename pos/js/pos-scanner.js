/* =============================================
   SHADEN POS — Módulo de Escáner de Barras
   Compatible con lectores USB/BT (actúan como
   teclado: escriben el código + Enter)
   ============================================= */

const BarcodeScanner = (() => {

  /* ─── Estado del buffer ─── */
  let _buffer     = '';
  let _lastKey    = 0;
  let _mode       = 'pos';       // 'pos' | 'stock'
  let _stockCb    = null;        // callback para modo stock
  const MAX_GAP   = 80;          // ms entre teclas del lector (lectores son rápidos)
  const MIN_LEN   = 4;           // largo mínimo para considerar un código

  /* ─── Indicador visual ─── */
  function _flashIndicator(ok) {
    const el = document.getElementById('scanner-indicator');
    if (!el) return;
    el.classList.remove('flash-ok', 'flash-err');
    void el.offsetWidth; // reflow
    el.classList.add(ok ? 'flash-ok' : 'flash-err');
  }

  /* ─── Listener global de teclado ─── */
  function _onKeyDown(e) {
    // Ignorar si el foco está en un input de texto normal
    // Excepto los inputs dedicados de escaneo
    const tag = document.activeElement?.tagName;
    const scanInputIds = ['scanner-input', 'rr-scanner-input', 'inventory-scanner-input'];
    const isTyping = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
                     && !scanInputIds.includes(document.activeElement?.id);
    if (isTyping) return;

    const now = Date.now();

    if (e.key === 'Enter') {
      if (_buffer.length >= MIN_LEN) {
        const code = _buffer.trim();
        _buffer = '';
        _lastKey = 0;
        _handleCode(code);
      } else {
        _buffer = '';
      }
      return;
    }

    // Si pasó mucho tiempo desde la última tecla → reiniciar buffer
    if (now - _lastKey > MAX_GAP && _buffer.length > 0) {
      _buffer = '';
    }

    // Solo caracteres imprimibles (barras generan dígitos + letras)
    if (e.key.length === 1) {
      _buffer += e.key;
      _lastKey = now;
    }
  }

  /* ─── Procesa el código capturado ─── */
  async function _handleCode(code) {
    console.log('[Scanner] Código capturado:', code);

    if (_mode === 'stock' && typeof _stockCb === 'function') {
      // Modo inventario: el callback maneja el código
      _stockCb(code);
      return;
    }

    if (_mode === 'registro' && typeof _stockCb === 'function') {
      // Modo registro rápido: el callback maneja el código
      _stockCb(code);
      return;
    }

    if (_mode === 'productos' && typeof _stockCb === 'function') {
      _stockCb(code);
      return;
    }

    // Modo POS: buscar producto y agregar al carrito
    _flashIndicator(false); // empieza rojo mientras busca

    try {
      // Primero buscar en cache local (más rápido)
      let prod = State.products.find(p => p.barcode && p.barcode === code);

      // Si no está en cache → consultar Supabase
      if (!prod) {
        prod = await ShadenDB.Products.getByBarcode(code);
        // Si encontró, actualizar cache
        if (prod) State.products = State.products.map(p => p.id === prod.id ? prod : p);
      }

      if (!prod) {
        Toast.error(`Código <b>${code}</b> no registrado`);
        _flashIndicator(false);
        return;
      }

      // Agregar al carrito
      addToCart(prod.id);
      _flashIndicator(true);

    } catch (err) {
      console.error('[Scanner] Error:', err);
      Toast.error('Error al buscar código');
      _flashIndicator(false);
    }
  }
  /* ─── Escáner desde input dedicado (en POS) ─── */
  function _bindDedicatedInput() {
    const inp = document.getElementById('scanner-input');
    if (!inp || inp.dataset.scanInit) return;
    inp.dataset.scanInit = '1';

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const code = inp.value.trim();
        inp.value = '';
        if (code.length >= MIN_LEN) _handleCode(code);
      }
    });

    // En móvil o cuando el usuario escribe manualmente
    inp.addEventListener('change', () => {
      const code = inp.value.trim();
      inp.value = '';
      if (code.length >= MIN_LEN) _handleCode(code);
    });
  }

  /* ─── API pública ─── */
  function init() {
    document.addEventListener('keydown', _onKeyDown);
    _bindDedicatedInput();
    console.log('[Scanner] Módulo iniciado — modo:', _mode);
  }

  function setMode(mode, stockCallback) {
    _mode    = mode;
    _stockCb = stockCallback || null;
    _buffer  = '';
    console.log('[Scanner] Modo cambiado a:', mode);
  }

  function getMode() { return _mode; }

  /* ─── Generar EAN-13 (para asignar a productos nuevos) ─── */
  function generateEAN13() {
    // Prefijo 200 (uso interno) + 9 dígitos random + dígito de control
    const digits = [2, 0, 0];
    for (let i = 0; i < 9; i++) digits.push(Math.floor(Math.random() * 10));
    // Calcular dígito de control
    let sum = 0;
    digits.forEach((d, i) => { sum += i % 2 === 0 ? d : d * 3; });
    const check = (10 - (sum % 10)) % 10;
    digits.push(check);
    return digits.join('');
  }

  return { init, setMode, getMode, generateEAN13 };
})();

/* ─── Función global para admin.js también ─── */
function generateEAN13() {
  return BarcodeScanner.generateEAN13();
}
