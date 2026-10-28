/* =============================================
   SHADEN POS — Módulo de Escáner de Barras
   Compatible con lectores USB/BT (actúan como
   teclado: escriben el código + Enter)
   Incluye soporte de audio Web Audio API y
   detección inteligente de ráfagas.
   ============================================= */

const BarcodeScanner = (() => {

  /* ─── Audio Beep (Web Audio API - Cero lag, sin dependencias) ─── */
  let _audioCtx = null;
  function _getAudioCtx() {
    if (!_audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) _audioCtx = new AudioContext();
    }
    if (_audioCtx && _audioCtx.state === 'suspended') {
      _audioCtx.resume();
    }
    return _audioCtx;
  }

  function playBeep(type = 'success') {
    try {
      const ctx = _getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'success') {
        // Tono agudo y limpio (1850Hz) de confirmación
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1850, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else {
        // Tono doble de error / no encontrado (320Hz -> 240Hz)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.setValueAtTime(240, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch (e) {
      // Audio bloqueado o no soportado, continuar en silencio
    }
  }

  /* ─── Estado del buffer ─── */
  let _buffer     = '';
  let _lastKey    = 0;
  let _firstKey   = 0;
  let _mode       = 'pos';       // 'pos' | 'stock' | 'registro' | 'productos'
  let _stockCb    = null;        // callback para modos de inventario/registro
  const MAX_GAP   = 65;          // ms máximo entre teclas para considerar ráfaga de escáner
  const MIN_LEN   = 3;           // largo mínimo para considerar un código

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
    const active = document.activeElement;
    const tag = active?.tagName;
    const activeId = active?.id || '';

    // Inputs donde JAMÁS se debe interceptar (textareas, notas, inputs de modales ajenos)
    const isSensitiveInput = tag === 'TEXTAREA' ||
      (tag === 'INPUT' && !['scanner-input', 'pos-search', 'rr-scanner-input', 'inventory-scanner-input'].includes(activeId));

    const now = Date.now();

    // Manejo de ENTER
    if (e.key === 'Enter') {
      const isBurst = _buffer.length >= MIN_LEN && ((now - _lastKey) < 120 || (_lastKey - _firstKey) < (_buffer.length * 80));

      if (isBurst) {
        e.preventDefault();
        const code = _buffer.trim();
        _buffer = '';
        _lastKey = 0;
        _firstKey = 0;

        // Si estaba en pos-search, limpiar el input para que no quede el código pegado
        if (activeId === 'pos-search' && active) {
          active.value = '';
          if (typeof renderPOSProducts === 'function') renderPOSProducts('');
        }

        _handleCode(code);
        return;
      }

      _buffer = '';
      _lastKey = 0;
      _firstKey = 0;
      return;
    }

    // Si está en un input sensible que no es el buscador ni el scanner, no acumular buffer
    if (isSensitiveInput) {
      _buffer = '';
      return;
    }

    // Si pasó demasiado tiempo desde la última tecla y no es una ráfaga -> reiniciar
    if (now - _lastKey > MAX_GAP && _buffer.length > 0) {
      _buffer = '';
    }

    // Acumular caracteres imprimibles
    if (e.key && e.key.length === 1) {
      if (_buffer.length === 0) _firstKey = now;
      _buffer += e.key;
      _lastKey = now;
    }
  }

  /* ─── Procesa el código capturado ─── */
  async function _handleCode(code) {
    code = (code || '').trim();
    if (!code) return;
    console.log('[Scanner] Código detectado:', code);

    // Callbacks dedicados para modos especiales (inventario, registro rápido, etc.)
    if ((_mode === 'stock' || _mode === 'registro' || _mode === 'productos') && typeof _stockCb === 'function') {
      _stockCb(code);
      return;
    }

    // Modo POS: buscar producto y agregar al carrito
    try {
      // 1. Buscar en memoria local primero (ultra rápido)
      let prod = State.products.find(p => p.barcode && String(p.barcode).trim() === code);

      // Si no encontró por barcode directo, verificar por ID exacto
      if (!prod) {
        prod = State.products.find(p => String(p.id).trim() === code);
      }

      // 2. Si no está en cache, consultar a Supabase
      if (!prod && typeof ShadenDB !== 'undefined' && ShadenDB.Products?.getByBarcode) {
        prod = await ShadenDB.Products.getByBarcode(code);
        if (prod && !State.products.some(p => p.id === prod.id)) {
          State.products.push(prod);
        }
      }

      if (!prod) {
        playBeep('error');
        _flashIndicator(false);
        Toast.error(`Código <b>${code}</b> no encontrado`);
        return;
      }

      // Validar stock antes de agregar
      const currentQty = State.stock[prod.id] ?? 999;
      const inCart = State.cart.find(i => i.product_id === prod.id)?.quantity || 0;
      if (inCart >= currentQty) {
        playBeep('error');
        _flashIndicator(false);
        Toast.info(`No hay más stock disponible de <b>${prod.name}</b> (Stock: ${currentQty})`);
        return;
      }

      // Agregar con éxito
      addToCart(prod.id);
      playBeep('success');
      _flashIndicator(true);

    } catch (err) {
      console.error('[Scanner] Error:', err);
      playBeep('error');
      _flashIndicator(false);
      Toast.error('Error al procesar código');
    }
  }

  /* ─── Escáner desde input dedicado (en barra superior del POS) ─── */
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

    inp.addEventListener('change', () => {
      const code = inp.value.trim();
      inp.value = '';
      if (code.length >= MIN_LEN) _handleCode(code);
    });
  }

  /* ─── API pública ─── */
  function init() {
    document.removeEventListener('keydown', _onKeyDown);
    document.addEventListener('keydown', _onKeyDown);
    _bindDedicatedInput();
    console.log('[Scanner] Módulo de escáner avanzado activo — modo:', _mode);
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
    const digits = [2, 0, 0];
    for (let i = 0; i < 9; i++) digits.push(Math.floor(Math.random() * 10));
    let sum = 0;
    digits.forEach((d, i) => { sum += i % 2 === 0 ? d : d * 3; });
    const check = (10 - (sum % 10)) % 10;
    digits.push(check);
    return digits.join('');
  }

  return { init, setMode, getMode, generateEAN13, handleCode: _handleCode, playBeep };
})();

/* ─── Funciones globales auxiliares ─── */
function generateEAN13() {
  return BarcodeScanner.generateEAN13();
}

