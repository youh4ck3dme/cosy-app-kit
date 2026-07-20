/**
 * Sandboxed srcDoc preview bridge: storage polyfill, console/network relay,
 * and relative HTML nav interception (postMessage → parent swaps srcDoc).
 */

export function buildPreviewBridgeScript(token: string): string {
  const t = JSON.stringify(token);
  return `<script>(function(){
  /* In-memory Storage for sandboxed srcdoc (no allow-same-origin). Must run first. */
  function makeMemoryStorage() {
    var map = Object.create(null);
    var keys = [];
    function rekey() { keys = Object.keys(map); }
    return {
      get length() { return keys.length; },
      key: function(i) { return keys[i] != null ? keys[i] : null; },
      getItem: function(k) { k = String(k); return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
      setItem: function(k, v) { k = String(k); if (!Object.prototype.hasOwnProperty.call(map, k)) { map[k] = String(v); rekey(); } else { map[k] = String(v); } },
      removeItem: function(k) { k = String(k); if (Object.prototype.hasOwnProperty.call(map, k)) { delete map[k]; rekey(); } },
      clear: function() { map = Object.create(null); keys = []; }
    };
  }
  function needsStoragePolyfill() {
    try {
      var x = '__builder_ls__';
      window.localStorage.setItem(x, '1');
      window.localStorage.removeItem(x);
      return false;
    } catch (e) { return true; }
  }
  if (needsStoragePolyfill()) {
    var ls = makeMemoryStorage();
    var ss = makeMemoryStorage();
    try {
      Object.defineProperty(window, 'localStorage', { configurable: true, enumerable: true, value: ls });
      Object.defineProperty(window, 'sessionStorage', { configurable: true, enumerable: true, value: ss });
    } catch (e2) {
      try { window.localStorage = ls; window.sessionStorage = ss; } catch (e3) {}
    }
  }

  var TOKEN = ${t};
  var sendConsole = function(level, args) {
    try { parent.postMessage({ __builder_console: TOKEN, level: level, args: args.map(function(a) {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch(e) { return String(a); }
    }) }, '*'); } catch(e) {}
  };
  ['log','warn','error'].forEach(function(l) {
    var orig = console[l];
    console[l] = function(){ sendConsole(l, [].slice.call(arguments)); orig.apply(console, arguments); };
  });
  window.addEventListener('error', function(e) {
    sendConsole('error', [e.message + ' @ ' + (e.filename||'') + ':' + e.lineno]);
  });
  window.addEventListener('unhandledrejection', function(e) {
    sendConsole('error', ['Unhandled: ' + (e.reason && e.reason.message || e.reason)]);
  });
  var origFetch = window.fetch.bind(window);
  window.fetch = function() {
    var args = arguments;
    var input = args[0];
    var init = args[1] || {};
    var method = (init.method || 'GET').toUpperCase();
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    var started = performance.now();
    var id = Math.random().toString(36).slice(2);
    try { parent.postMessage({ __builder_network: TOKEN, phase: 'start', id: id, method: method, url: url }, '*'); } catch(e) {}
    return origFetch.apply(window, args).then(function(res) {
      try { parent.postMessage({ __builder_network: TOKEN, phase: 'end', id: id, method: method, url: url, status: res.status, ms: Math.round(performance.now() - started) }, '*'); } catch(e) {}
      return res;
    }).catch(function(err) {
      try { parent.postMessage({ __builder_network: TOKEN, phase: 'end', id: id, method: method, url: url, status: 0, ms: Math.round(performance.now() - started) }, '*'); } catch(e) {}
      throw err;
    });
  };

  /* Multi-file preview: intercept relative *.html navigations so parent can swap srcDoc. */
  document.addEventListener('click', function(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var el = e.target;
    while (el && el.nodeType === 1 && el.tagName !== 'A') el = el.parentElement;
    if (!el || el.tagName !== 'A') return;
    var raw = el.getAttribute('href');
    if (raw == null) return;
    raw = String(raw).trim();
    if (!raw) return;
    var target = (el.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return;
    /* Same-page hash — let the browser scroll. */
    if (raw.charAt(0) === '#') return;
    var lower = raw.toLowerCase();
    if (lower.indexOf('mailto:') === 0 || lower.indexOf('tel:') === 0 || lower.indexOf('sms:') === 0) return;
    if (lower.indexOf('javascript:') === 0) return;
    if (/^https?:\\/\\//i.test(raw) || raw.indexOf('//') === 0) return;
    e.preventDefault();
    try { parent.postMessage({ __builder_navigate: TOKEN, href: raw }, '*'); } catch (err) {}
  }, true);
})();</script>`;
}
