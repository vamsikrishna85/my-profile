/* =========================================================
   Resume viewer — view-only PDF modal (PDF.js, lazy-loaded)

   • PDF.js and this viewer's stylesheet load only on first open.
   • Pages render to <canvas> on demand as they scroll into view.
   • No download / print / save / share controls are provided.

   Limitation: this is a client-side experience, not protection.
   A PDF served publicly from GitHub Pages can still be fetched
   by anyone using browser dev tools or the network tab.
   ========================================================= */
(function () {
  'use strict';

  var PDF_FILE = 'Vamsikrishna_Gollapudi_Resume.pdf';
  var PDFJS_VERSION = '4.10.38';
  var PDFJS_SOURCES = [
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@' + PDFJS_VERSION + '/build/',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VERSION + '/'
  ];

  var ACTUAL = 96 / 72;                 // CSS px per PDF point at 100 %
  var MIN_SCALE = ACTUAL * 0.25;
  var MAX_SCALE = ACTUAL * 4;
  var AUTO_CAP = ACTUAL * 1.25;         // default view never exceeds 125 %
  var STEP = 1.2;
  var PAGE_GAP = 16;

  var scriptSrc = (document.currentScript && document.currentScript.src) || document.baseURI;
  var cssHref = new URL('pdf-viewer.css', scriptSrc).href;
  var pdfHref = new URL(PDF_FILE, document.baseURI).href;
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var pdfjsPromise = null, cssPromise = null;
  var ui = null;            // DOM references, built once
  var opener = null;        // element to restore focus to
  var session = 0;          // increments on each open; stale async work checks it
  var doc = null, loadingTask = null;
  var pages = [];           // { el, canvas, w, h, page, task, renderedAt }
  var scale = 1, mode = 'auto';
  var observer = null, rerenderTimer = 0, scrollRaf = 0;
  var pinch = null;
  var fakeFullscreen = false;

  /* ---------------- Lazy loaders ---------------- */
  function loadCss() {
    if (cssPromise) return cssPromise;
    cssPromise = new Promise(function (resolve) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssHref;
      link.onload = resolve;
      link.onerror = resolve; // never block opening on CSS
      document.head.appendChild(link);
    });
    return cssPromise;
  }

  function loadPdfjs() {
    if (pdfjsPromise) return pdfjsPromise;
    var i = 0;
    function attempt() {
      var base = PDFJS_SOURCES[i];
      return import(base + 'pdf.min.mjs').then(function (lib) {
        lib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';
        return lib;
      }, function (err) {
        i += 1;
        if (i < PDFJS_SOURCES.length) return attempt();
        throw err;
      });
    }
    pdfjsPromise = attempt().catch(function (err) {
      pdfjsPromise = null; // allow Retry to try again
      throw err;
    });
    return pdfjsPromise;
  }

  /* ---------------- Markup ---------------- */
  function icon(paths) {
    return '<svg class="pv-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + paths + '</svg>';
  }
  var ICONS = {
    minus: icon('<path d="M5 12h14"/>'),
    plus: icon('<path d="M12 5v14M5 12h14"/>'),
    fit: icon('<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>'),
    reset: icon('<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>'),
    expand: icon('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    shrink: icon('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
    close: icon('<path d="M6 6l12 12M18 6 6 18"/>'),
    alert: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>')
  };

  function build() {
    if (ui) return ui;
    var d = document.createElement('dialog');
    d.className = 'pv-dialog';
    d.setAttribute('aria-labelledby', 'pv-title');
    d.setAttribute('aria-describedby', 'pv-desc');
    d.innerHTML =
      '<div class="pv-shell">' +
        '<header class="pv-bar">' +
          '<div class="pv-heading">' +
            '<h2 class="pv-title" id="pv-title">Resume</h2>' +
            '<span class="pv-page" aria-live="off"><span class="pv-page-label">Page</span> <span data-pv="page">–</span> / <span data-pv="total">–</span></span>' +
          '</div>' +
          '<p class="pv-sr" id="pv-desc">View-only document. Use the arrow keys to scroll, plus and minus to zoom, and Escape to close.</p>' +
          '<div class="pv-actions">' +
            '<button type="button" class="pv-btn" data-pv="fs" aria-label="Enter fullscreen" aria-pressed="false">' + ICONS.expand + '</button>' +
            '<button type="button" class="pv-btn" data-pv="close" aria-label="Close resume viewer">' + ICONS.close + '</button>' +
          '</div>' +
        '</header>' +
        '<div class="pv-scroller" data-pv="scroller" tabindex="0" role="region" aria-label="Resume pages">' +
          '<div class="pv-pages" data-pv="pages"></div>' +
          '<div class="pv-status" data-pv="status" role="status" aria-live="polite"></div>' +
        '</div>' +
        '<div class="pv-zoombar" role="toolbar" aria-label="Zoom controls">' +
          '<button type="button" class="pv-btn" data-pv="out" aria-label="Zoom out">' + ICONS.minus + '</button>' +
          '<output class="pv-zoom" data-pv="zoom" aria-live="polite" aria-label="Zoom level">100%</output>' +
          '<button type="button" class="pv-btn" data-pv="in" aria-label="Zoom in">' + ICONS.plus + '</button>' +
          '<span class="pv-sep" aria-hidden="true"></span>' +
          '<button type="button" class="pv-btn" data-pv="fit" aria-label="Fit to width" title="Fit to width">' + ICONS.fit + '</button>' +
          '<button type="button" class="pv-btn" data-pv="reset" aria-label="Reset zoom" title="Reset zoom">' + ICONS.reset + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(d);

    var q = function (k) { return d.querySelector('[data-pv="' + k + '"]'); };
    ui = {
      dialog: d, scroller: q('scroller'), pages: q('pages'), status: q('status'),
      page: q('page'), total: q('total'), zoom: q('zoom'),
      zin: q('in'), zout: q('out'), fit: q('fit'), reset: q('reset'), fs: q('fs'), close: q('close')
    };

    ui.close.addEventListener('click', close);
    ui.zin.addEventListener('click', function () { zoomBy(STEP); });
    ui.zout.addEventListener('click', function () { zoomBy(1 / STEP); });
    ui.fit.addEventListener('click', function () { setMode('fit'); });
    ui.reset.addEventListener('click', function () { setMode('auto'); });
    ui.fs.addEventListener('click', toggleFullscreen);

    d.addEventListener('cancel', function (e) { e.preventDefault(); close(); }); // Escape
    d.addEventListener('keydown', onKeydown);
    d.addEventListener('click', function (e) { if (e.target === d) close(); }); // backdrop
    d.addEventListener('contextmenu', function (e) { if (e.target.tagName === 'CANVAS') e.preventDefault(); });
    d.addEventListener('dragstart', function (e) { e.preventDefault(); });

    ui.scroller.addEventListener('scroll', onScroll, { passive: true });
    ui.scroller.addEventListener('wheel', onWheel, { passive: false });
    ui.scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    ui.scroller.addEventListener('touchmove', onTouchMove, { passive: false });
    ui.scroller.addEventListener('touchend', onTouchEnd);
    ui.scroller.addEventListener('touchcancel', onTouchEnd);
    return ui;
  }

  /* ---------------- Open / close ---------------- */
  function open(trigger) {
    if (ui && ui.dialog.open) return;
    opener = trigger || document.activeElement;
    session += 1;
    var mySession = session;

    loadCss().then(function () {
      if (mySession !== session) return;
      build();
      lockScroll(true);
      ui.dialog.classList.remove('pv-closing');
      ui.dialog.showModal();
      ui.scroller.focus({ preventScroll: true });
      window.addEventListener('resize', onResize);
      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);
      load(mySession);
    });
  }

  function close() {
    if (!ui || !ui.dialog.open) return;
    session += 1; // invalidates in-flight loads/renders
    teardown();
    if (isFullscreen()) exitFullscreen();
    setFakeFullscreen(false);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange);

    var finish = function () {
      ui.dialog.classList.remove('pv-closing');
      if (ui.dialog.open) ui.dialog.close();
      lockScroll(false);
      if (opener && document.contains(opener) && opener.focus) opener.focus({ preventScroll: true });
      opener = null;
    };
    if (reduceMotion.matches) { finish(); return; }
    ui.dialog.classList.add('pv-closing');
    setTimeout(finish, 160);
  }

  function lockScroll(on) {
    var root = document.documentElement;
    if (on) {
      var sbw = window.innerWidth - root.clientWidth;
      root.style.setProperty('--pv-sbw', Math.max(0, sbw) + 'px');
      root.classList.add('pv-lock');
    } else {
      root.classList.remove('pv-lock');
      root.style.removeProperty('--pv-sbw');
    }
  }

  /* ---------------- Loading ---------------- */
  function setStatus(kind, message) {
    var s = ui.status;
    s.className = 'pv-status' + (kind ? ' is-' + kind : '');
    if (kind === 'loading') {
      s.innerHTML = '<span class="pv-spinner" aria-hidden="true"></span><span>' + message + '</span>';
    } else if (kind === 'error') {
      s.innerHTML = '<span class="pv-error-ic">' + ICONS.alert + '</span>' +
        '<p class="pv-error-text">' + message + '</p>' +
        '<button type="button" class="btn btn-primary btn-sm" data-pv="retry">Try again</button>';
      s.querySelector('[data-pv="retry"]').addEventListener('click', function () {
        session += 1;
        load(session);
      });
    } else {
      s.innerHTML = '';
    }
  }

  function load(mySession) {
    teardown();
    setControls(false);
    setStatus('loading', 'Loading resume…');
    ui.page.textContent = '–';
    ui.total.textContent = '–';

    loadPdfjs().then(function (lib) {
      if (mySession !== session) return null;
      loadingTask = lib.getDocument({ url: pdfHref, isEvalSupported: false });
      return loadingTask.promise;
    }).then(function (pdf) {
      if (!pdf) return null;
      if (mySession !== session) { pdf.destroy(); return null; }
      doc = pdf;
      var jobs = [];
      for (var n = 1; n <= pdf.numPages; n++) jobs.push(pdf.getPage(n));
      return Promise.all(jobs);
    }).then(function (list) {
      if (!list || mySession !== session) return;
      layoutPages(list);
      setStatus(null);
      setControls(true);
    }).catch(function (err) {
      if (mySession !== session) return;
      var offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      var missing = err && (err.name === 'MissingPDFException' || /404|Missing PDF/i.test(String(err.message)));
      setStatus('error', offline
        ? 'You appear to be offline. Check your connection and try again.'
        : missing
          ? 'The resume could not be found. Please try again later.'
          : 'The resume could not be loaded. Please try again.');
      ui.status.querySelector('[data-pv="retry"]').focus();
      if (window.console) console.warn('[pdf-viewer]', err);
    });
  }

  function layoutPages(list) {
    var frag = document.createDocumentFragment();
    pages = list.map(function (page, i) {
      var vp = page.getViewport({ scale: 1 });
      var el = document.createElement('div');
      el.className = 'pv-sheet';
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', 'Resume page ' + (i + 1) + ' of ' + list.length);
      el.dataset.index = String(i);
      var canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.draggable = false;
      el.appendChild(canvas);
      frag.appendChild(el);
      return { el: el, canvas: canvas, w: vp.width, h: vp.height, page: page, task: null, renderedAt: 0 };
    });
    ui.pages.appendChild(frag);
    ui.total.textContent = String(pages.length);
    ui.page.textContent = '1';

    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var p = pages[+en.target.dataset.index];
        if (!p) return;
        p.visible = en.isIntersecting;
        if (en.isIntersecting) renderPage(p);
      });
    }, { root: ui.scroller, rootMargin: '800px 0px' });
    pages.forEach(function (p) { observer.observe(p.el); });

    mode = 'auto';
    applyScale(computeModeScale('auto'), false);
    ui.scroller.scrollTop = 0;
  }

  function teardown() {
    clearTimeout(rerenderTimer);
    if (observer) { observer.disconnect(); observer = null; }
    pages.forEach(function (p) {
      if (p.task) { try { p.task.cancel(); } catch (e) { /* noop */ } }
      p.canvas.width = 0; p.canvas.height = 0; // release bitmap memory (iOS)
    });
    pages = [];
    if (ui) ui.pages.textContent = '';
    if (loadingTask) { loadingTask.destroy(); loadingTask = null; }
    if (doc) { doc.destroy(); doc = null; }
  }

  function setControls(enabled) {
    [ui.zin, ui.zout, ui.fit, ui.reset].forEach(function (b) { b.disabled = !enabled; });
  }

  /* ---------------- Rendering ---------------- */
  function renderPage(p) {
    if (p.renderedAt === scale && !p.task) return;
    if (p.task) { try { p.task.cancel(); } catch (e) { /* noop */ } }
    var target = scale;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cssW = p.w * target, cssH = p.h * target;
    // Keep canvases under ~16.7M pixels (iOS Safari canvas limit)
    var maxPx = 16000000;
    if (cssW * cssH * dpr * dpr > maxPx) dpr = Math.sqrt(maxPx / (cssW * cssH));

    var viewport = p.page.getViewport({ scale: target * dpr });
    var canvas = document.createElement('canvas'); // render off-screen, swap when done (no flicker)
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.setAttribute('aria-hidden', 'true');
    canvas.draggable = false;

    var task = p.page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport: viewport });
    p.task = task;
    task.promise.then(function () {
      if (p.task !== task) return;
      p.task = null;
      p.renderedAt = target;
      p.el.replaceChild(canvas, p.canvas);
      p.canvas.width = 0; p.canvas.height = 0;
      p.canvas = canvas;
      p.el.classList.add('is-ready');
    }, function () {
      if (p.task === task) p.task = null;
      canvas.width = 0; canvas.height = 0; // cancelled or failed
    });
  }

  function availableWidth() {
    var cs = getComputedStyle(ui.pages);
    return ui.scroller.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }

  function computeModeScale(m) {
    if (!pages.length) return ACTUAL;
    var widest = Math.max.apply(null, pages.map(function (p) { return p.w; }));
    var fit = Math.max(MIN_SCALE, availableWidth() / widest);
    return m === 'fit' ? Math.min(fit, MAX_SCALE) : Math.min(fit, AUTO_CAP);
  }

  function applyScale(next, keepAnchor) {
    next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    var sc = ui.scroller;
    var anchorY = 0, anchorX = 0;
    if (keepAnchor && sc.scrollHeight) {
      anchorY = (sc.scrollTop + sc.clientHeight / 2) / sc.scrollHeight;
      anchorX = sc.scrollWidth > sc.clientWidth ? (sc.scrollLeft + sc.clientWidth / 2) / sc.scrollWidth : 0.5;
    }
    scale = next;
    pages.forEach(function (p) {
      p.el.style.width = Math.round(p.w * scale) + 'px';
      p.el.style.height = Math.round(p.h * scale) + 'px';
    });
    ui.pages.style.setProperty('--pv-gap', PAGE_GAP + 'px');
    if (keepAnchor) {
      sc.scrollTop = anchorY * sc.scrollHeight - sc.clientHeight / 2;
      sc.scrollLeft = anchorX * sc.scrollWidth - sc.clientWidth / 2;
    }
    var pct = Math.round((scale / ACTUAL) * 100);
    ui.zoom.textContent = pct + '%';
    ui.zin.disabled = scale >= MAX_SCALE - 1e-6;
    ui.zout.disabled = scale <= MIN_SCALE + 1e-6;
    ui.fit.setAttribute('aria-pressed', String(mode === 'fit'));

    // Existing bitmaps stretch immediately; re-render sharp ones after zooming settles.
    clearTimeout(rerenderTimer);
    rerenderTimer = setTimeout(function () {
      pages.forEach(function (p) { if (p.visible) renderPage(p); });
    }, 140);
    updatePageIndicator();
  }

  function setMode(m) {
    if (!pages.length) return;
    mode = m;
    applyScale(computeModeScale(m), true);
  }

  function zoomBy(factor) {
    if (!pages.length) return;
    mode = 'manual';
    applyScale(scale * factor, true);
  }

  /* ---------------- Events ---------------- */
  function onResize() {
    if (mode !== 'manual' && pages.length) applyScale(computeModeScale(mode), true);
  }

  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(function () { scrollRaf = 0; updatePageIndicator(); });
  }

  function updatePageIndicator() {
    if (!pages.length) return;
    var probe = ui.scroller.scrollTop + ui.scroller.clientHeight * 0.4;
    var current = 1;
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].el.offsetTop <= probe) current = i + 1; else break;
    }
    if (ui.scroller.scrollTop + ui.scroller.clientHeight >= ui.scroller.scrollHeight - 2) current = pages.length;
    ui.page.textContent = String(current);
  }

  function onWheel(e) {
    if (!(e.ctrlKey || e.metaKey) || !pages.length) return; // trackpad pinch / ctrl+wheel
    e.preventDefault();
    mode = 'manual';
    applyScale(scale * Math.exp(-e.deltaY * 0.01), true);
  }

  function distance(t) {
    var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
  function onTouchStart(e) {
    if (e.touches.length !== 2 || !pages.length) return;
    var r = ui.pages.getBoundingClientRect();
    pinch = {
      d0: distance(e.touches), s0: scale, ratio: 1,
      ox: (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left,
      oy: (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top
    };
    ui.pages.style.transformOrigin = pinch.ox + 'px ' + pinch.oy + 'px';
  }
  function onTouchMove(e) {
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    var target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.s0 * distance(e.touches) / pinch.d0));
    pinch.ratio = target / pinch.s0;
    ui.pages.style.transform = 'scale(' + pinch.ratio + ')';
  }
  function onTouchEnd() {
    if (!pinch) return;
    var next = pinch.s0 * pinch.ratio;
    pinch = null;
    ui.pages.style.transform = '';
    ui.pages.style.transformOrigin = '';
    mode = 'manual';
    applyScale(next, true);
  }

  function onKeydown(e) {
    var mod = e.ctrlKey || e.metaKey;
    var key = e.key;
    if (mod && (key === 'p' || key === 'P' || key === 's' || key === 'S')) { e.preventDefault(); return; }
    if (key === 'Tab') { trapFocus(e); return; }
    if (e.altKey || e.target.tagName === 'BUTTON' && (key === ' ' || key === 'Enter')) return;
    if (key === '+' || key === '=') { e.preventDefault(); zoomBy(STEP); }
    else if (key === '-' || key === '_') { e.preventDefault(); zoomBy(1 / STEP); }
    else if (key === '0' && !mod) { e.preventDefault(); setMode('auto'); }
  }

  function trapFocus(e) {
    var items = Array.prototype.filter.call(
      ui.dialog.querySelectorAll('button, [tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.offsetParent !== null; }
    );
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------------- Fullscreen ---------------- */
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function exitFullscreen() {
    var fn = document.exitFullscreen || document.webkitExitFullscreen;
    if (fn) { try { var r = fn.call(document); if (r && r.catch) r.catch(function () {}); } catch (e) { /* noop */ } }
  }
  function toggleFullscreen() {
    var d = ui.dialog;
    var req = d.requestFullscreen || d.webkitRequestFullscreen;
    var native = req && (document.fullscreenEnabled || document.webkitFullscreenEnabled);
    if (isFullscreen()) { exitFullscreen(); return; }
    if (fakeFullscreen) { setFakeFullscreen(false); return; }
    if (native) {
      try {
        var r = req.call(d);
        if (r && r.catch) r.catch(function () { setFakeFullscreen(true); });
      } catch (e) { setFakeFullscreen(true); }
    } else {
      setFakeFullscreen(true); // iPhone Safari: expand to the full viewport instead
    }
  }
  function setFakeFullscreen(on) {
    fakeFullscreen = on;
    if (ui) ui.dialog.classList.toggle('pv-expanded', on);
    syncFullscreenButton(on || isFullscreen());
  }
  function onFullscreenChange() { syncFullscreenButton(isFullscreen() || fakeFullscreen); }
  function syncFullscreenButton(on) {
    if (!ui) return;
    ui.fs.setAttribute('aria-pressed', String(on));
    ui.fs.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Enter fullscreen');
    ui.fs.innerHTML = on ? ICONS.shrink : ICONS.expand;
    setTimeout(onResize, 60);
  }

  /* ---------------- Triggers ---------------- */
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest && e.target.closest('[data-pdf-viewer]');
    if (!trigger) return;
    e.preventDefault();
    // Close the mobile nav menu if the trigger lives inside it
    var nav = document.getElementById('nav-links');
    var toggle = document.getElementById('nav-toggle');
    if (nav && toggle && nav.contains(trigger) && nav.classList.contains('open')) toggle.click();
    open(trigger);
  });

  // Warm up PDF.js when the user shows intent (hover / focus), without blocking first paint.
  var warmed = false;
  function warm(e) {
    if (warmed || !(e.target.closest && e.target.closest('[data-pdf-viewer]'))) return;
    warmed = true;
    loadCss();
    loadPdfjs().catch(function () { /* surfaced on open */ });
  }
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('focusin', warm);
})();
