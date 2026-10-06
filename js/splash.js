/* =============================================
   SHADEN — Splash Screen
   ============================================= */

(function () {
  const splash    = document.getElementById('splash');
  const logoWrap  = splash.querySelector('.splash-logo-wrap');
  const loader    = splash.querySelector('.splash-loader');

  // Bloquear scroll
  document.body.classList.add('splash-active');

  /* ── Secuencia ── */
  //  0ms  → empieza
  // 200ms → el logo cae con rebote
  // 800ms → aparece el loader de puntos
  //  ~1.6s → el splash desaparece, la página entra

  // 1. Pequeña pausa para que los fonts carguen, luego cae el logo
  setTimeout(() => {
    logoWrap.classList.add('drop-in');
  }, 180);

  // 2. Mostrar loader después de que el logo aterrizó
  setTimeout(() => {
    loader.style.opacity = '1';
  }, 900);

  // 3. Esperar a que la página esté lista Y al tiempo mínimo del splash
  const MIN_DURATION = 2000; // ms mínimos que se muestra el splash
  const startTime    = Date.now();

  function hideSplash() {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, MIN_DURATION - elapsed);

    setTimeout(() => {
      // Ocultar loader
      loader.style.opacity = '0';

      // Fade out del splash
      splash.classList.add('fade-out');

      splash.addEventListener('animationend', () => {
        splash.style.display = 'none';
        document.body.classList.remove('splash-active');
        document.body.classList.add('page-ready');
      }, { once: true });
    }, remaining);
  }

  // Disparar cuando DOM + recursos estén listos
  if (document.readyState === 'complete') {
    hideSplash();
  } else {
    window.addEventListener('load', hideSplash, { once: true });
    // Seguro: si load tarda más de 4s, mostrar igual
    setTimeout(hideSplash, 4000);
  }

})();
