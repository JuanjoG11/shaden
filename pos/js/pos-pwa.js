/* =============================================
   SHADEN POS — Módulo PWA & Experiencia de Escritorio
   Gestión de instalación, offline indicator,
   fullscreen y control de Service Worker.
   ============================================= */

const ShadenPWA = (() => {
  let _deferredPrompt = null;

  /* ── 1. REGISTRO SERVICE WORKER ── */
  function initServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
        console.log('[PWA] Service Worker registrado con éxito, scope:', reg.scope);

        // Detectar si hay una actualización pendiente
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (typeof Toast !== 'undefined') {
                Toast.info('Nueva versión del POS disponible. Recargando…');
              }
              setTimeout(() => window.location.reload(), 1500);
            }
          });
        });
      } catch (err) {
        console.warn('[PWA] Error registrando Service Worker:', err);
      }
    });
  }

  /* ── 2. INSTALACIÓN COMO APP DE ESCRITORIO (PC) ── */
  function initInstallPrompt() {
    const installBtn = document.getElementById('pwa-install-btn');

    // Detectar si ya está corriendo en modo standalone (App nativa)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      if (installBtn) installBtn.style.display = 'none';
      document.body.classList.add('pwa-standalone');
      console.log('[PWA] Ejecutándose como App nativa de escritorio');
      return;
    } else {
      if (installBtn) installBtn.style.display = 'inline-flex';
    }

    // Escuchar el evento del navegador que permite instalar la app
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      _deferredPrompt = e;
      if (installBtn) {
        installBtn.style.display = 'inline-flex';
        installBtn.classList.add('pulse');
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        // Caso 1: El navegador ya tiene el diálogo nativo listo
        if (_deferredPrompt) {
          _deferredPrompt.prompt();
          const { outcome } = await _deferredPrompt.userChoice;
          console.log('[PWA] Resultado de instalación:', outcome);

          if (outcome === 'accepted') {
            installBtn.style.display = 'none';
            if (typeof Toast !== 'undefined') {
              Toast.success('¡Instalando Shaden POS en tu PC!');
            }
          }
          _deferredPrompt = null;
          return;
        }

        // Caso 2: Abrir modal guiado con diagnóstico automático
        openInstallGuideModal();
      });
    }

    // Evento disparado cuando la app ya fue instalada
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App instalada con éxito en el sistema');
      if (installBtn) installBtn.style.display = 'none';
      if (typeof Toast !== 'undefined') {
        Toast.success('Shaden POS instalado correctamente');
      }
    });
  }

  function openInstallGuideModal() {
    const content = document.getElementById('pwa-modal-content');
    if (!content) return;

    const isFileProto = window.location.protocol === 'file:';

    if (isFileProto) {
      content.innerHTML = `
        <div style="text-align:center;margin-bottom:16px">
          <div style="width:58px;height:58px;border-radius:50%;background:rgba(212,169,106,.15);color:var(--gold-dark);display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 12px">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h4 style="margin:0 0 6px;color:var(--text);font-size:1.05rem">Abierto desde archivo local (file://)</h4>
          <p style="font-size:.82rem;color:var(--text2);line-height:1.45;margin:0">
            Los navegadores (Chrome y Edge) <b>bloquean la instalación de PWAs</b> cuando se abre el archivo con doble clic (ruta <code style="background:var(--cream-mid);padding:2px 5px;border-radius:4px">file:///...</code>). Requieren protocolo <b>HTTP / HTTPS</b>.
          </p>
        </div>

        <div style="background:var(--cream-light);border:1px solid var(--cream-dark);border-radius:10px;padding:14px;font-size:.82rem;line-height:1.5;color:var(--text);margin-bottom:12px">
          <b style="color:var(--brown);display:block;margin-bottom:6px"><i class="fa-solid fa-circle-check" style="color:var(--green);margin-right:4px"></i> Cómo activarlo en tu PC:</b>
          <div style="margin-bottom:6px"><b>Opción A (En tu web o GitHub):</b> Sube los cambios con <code style="background:#fff;padding:2px 4px;border-radius:3px">git push</code>. Al abrir tu enlace web en Chrome o Edge, el navegador mostrará el icono de instalar en 1 clic.</div>
          <div><b>Opción B (Localmente):</b> Ábrelo con la extensión <b>Live Server</b> de VS Code o ejecuta en la consola: <code style="background:#fff;padding:2px 4px;border-radius:3px">npx serve</code>.</div>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div style="text-align:center;margin-bottom:16px">
          <div style="width:58px;height:58px;border-radius:50%;background:rgba(39,160,106,.12);color:var(--green);display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto 12px">
            <i class="fa-solid fa-desktop"></i>
          </div>
          <h4 style="margin:0 0 6px;color:var(--text);font-size:1.1rem">Instalar en Google Chrome o Microsoft Edge</h4>
          <p style="font-size:.82rem;color:var(--text2);line-height:1.45;margin:0">
            Sigue uno de estos dos pasos rápidos para anclarlo a tu escritorio de Windows:
          </p>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;font-size:.83rem">
          <div style="display:flex;gap:12px;align-items:flex-start;background:var(--cream-light);padding:12px 14px;border-radius:10px;border:1px solid var(--cream-mid)">
            <span style="font-weight:800;color:var(--gold-dark);font-size:1.2rem;line-height:1">1</span>
            <div>
              <b>Desde la barra de direcciones superior:</b><br/>
              Haz clic en el icono de <i class="fa-solid fa-download"></i> o <i class="fa-solid fa-display"></i> que aparece al lado derecho de la barra de URL y presiona <b>"Instalar"</b>.
            </div>
          </div>

          <div style="display:flex;gap:12px;align-items:flex-start;background:var(--cream-light);padding:12px 14px;border-radius:10px;border:1px solid var(--cream-mid)">
            <span style="font-weight:800;color:var(--gold-dark);font-size:1.2rem;line-height:1">2</span>
            <div>
              <b>Desde el menú de tres puntos (⋮):</b><br/>
              Ve a <b>Menú ⋮</b> → <b>Aplicaciones</b> (o Guardar y compartir) → <b>"Instalar Shaden POS…"</b>.
            </div>
          </div>
        </div>
      `;
    }

    if (typeof openModal === 'function') openModal('pwa-install-modal');
  }

  /* ── 3. ESTADO DE RED EN VIVO (ONLINE / OFFLINE) ── */
  function initNetworkStatus() {
    const statusEl = document.getElementById('pwa-net-status');

    function updateNetwork() {
      const isOnline = navigator.onLine;
      if (!statusEl) return;

      if (isOnline) {
        statusEl.className = 'pwa-net-status online';
        statusEl.innerHTML = '<span class="net-dot"></span><span>En línea</span>';
        statusEl.title = 'Conectado a la base de datos en tiempo real';
      } else {
        statusEl.className = 'pwa-net-status offline';
        statusEl.innerHTML = '<span class="net-dot"></span><span>Modo Offline</span>';
        statusEl.title = 'Sin conexión a internet. La app sigue operativa con datos locales.';
        if (typeof Toast !== 'undefined') {
          Toast.info('Modo Offline: la app sigue abierta sin conexión');
        }
      }
    }

    window.addEventListener('online', () => {
      updateNetwork();
      if (typeof Toast !== 'undefined') Toast.success('Conexión reestablecida con éxito');
    });

    window.addEventListener('offline', updateNetwork);
    updateNetwork();
  }

  /* ── 4. MODO PANTALLA COMPLETA (FULLSCREEN) ── */
  function initFullscreen() {
    const btn = document.getElementById('btn-fullscreen');
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        btn.innerHTML = '<i class="fa-solid fa-compress"></i>';
        btn.title = 'Salir de pantalla completa';
      } else {
        document.exitFullscreen().catch(() => {});
        btn.innerHTML = '<i class="fa-solid fa-expand"></i>';
        btn.title = 'Pantalla completa';
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (btn) {
        btn.innerHTML = document.fullscreenElement
          ? '<i class="fa-solid fa-compress"></i>'
          : '<i class="fa-solid fa-expand"></i>';
      }
    });
  }

  /* ── INIT PWA ── */
  function init() {
    initServiceWorker();
    initInstallPrompt();
    initNetworkStatus();
    initFullscreen();
  }

  return { init };
})();

// Auto-inicio
document.addEventListener('DOMContentLoaded', ShadenPWA.init);
