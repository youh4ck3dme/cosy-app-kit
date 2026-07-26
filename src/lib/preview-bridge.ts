/**
 * Sandboxed preview bridge: storage polyfill, console/network relay,
 * and optional relative HTML nav interception (srcDoc mode only).
 */

export type PreviewBridgeOptions = {
  /** When true, fetch to external networks are blocked. */
  networkDisabled?: boolean;
  /**
   * When true (default), intercept relative *.html clicks and postMessage parent.
   * Set false for URL-based `/preview/:id/...` where the browser navigates natively.
   */
  interceptHtmlNav?: boolean;
};

export function buildPreviewBridgeScript(
  token: string,
  opts: PreviewBridgeOptions = {},
): string {
  const t = JSON.stringify(token);
  const netOff = opts.networkDisabled === true ? "true" : "false";
  const interceptNav = opts.interceptHtmlNav !== false ? "true" : "false";
  return `<script>(function(){
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
  var NET_OFF = ${netOff};
  var INTERCEPT_NAV = ${interceptNav};
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
    sendConsole('error', [e.message + ' @ ' + (e.filename||'') + ':' + (e.lineno||'')]);
  });
  window.addEventListener('unhandledrejection', function(e) {
    sendConsole('error', ['Unhandled: ' + (e.reason && e.reason.message || e.reason)]);
  });

  function capErr(err) {
    var s = '';
    try { s = err && err.message ? String(err.message) : String(err || ''); } catch (e) { s = 'error'; }
    return s.length > 160 ? s.slice(0, 157) + '...' : s;
  }
  function netStart(payload) {
    try { parent.postMessage(payload, '*'); } catch (e) {}
  }
  function netEnd(payload) {
    try { parent.postMessage(payload, '*'); } catch (e) {}
  }
  function resolveFetchInput(input, init) {
    var method = 'GET';
    var url = '';
    try {
      if (typeof input === 'string') {
        url = input;
        method = ((init && init.method) || 'GET').toUpperCase();
      } else if (input && typeof input === 'object') {
        url = input.url || String(input);
        method = ((init && init.method) || input.method || 'GET').toUpperCase();
      } else {
        url = String(input);
        method = ((init && init.method) || 'GET').toUpperCase();
      }
    } catch (e) {
      url = String(input);
      method = ((init && init.method) || 'GET').toUpperCase();
    }
    return { method: method, url: url };
  }

  var origFetch = window.fetch.bind(window);
  window.fetch = function() {
    var args = arguments;
    var input = args[0];
    var init = args[1] || {};
    var resolved = resolveFetchInput(input, init);
    var method = resolved.method;
    var url = resolved.url;
    var started = performance.now();
    var id = Math.random().toString(36).slice(2);
    netStart({ __builder_network: TOKEN, phase: 'start', id: id, method: method, url: url, type: 'fetch' });
    if (NET_OFF) {
      var blocked = new TypeError('Network disabled in preview');
      netEnd({ __builder_network: TOKEN, phase: 'end', id: id, method: method, url: url, type: 'fetch', status: 0, ok: false, ms: Math.round(performance.now() - started), error: capErr(blocked) });
      return Promise.reject(blocked);
    }
    return origFetch.apply(window, args).then(function(res) {
      netEnd({ __builder_network: TOKEN, phase: 'end', id: id, method: method, url: url, type: 'fetch', status: res.status, ok: !!res.ok, ms: Math.round(performance.now() - started) });
      return res;
    }).catch(function(err) {
      netEnd({ __builder_network: TOKEN, phase: 'end', id: id, method: method, url: url, type: 'fetch', status: 0, ok: false, ms: Math.round(performance.now() - started), error: capErr(err) });
      throw err;
    });
  };

  if (typeof XMLHttpRequest !== 'undefined') {
    var XHR = XMLHttpRequest;
    var origOpen = XHR.prototype.open;
    var origSend = XHR.prototype.send;
    XHR.prototype.open = function(method, url) {
      this.__builder_net = {
        method: String(method || 'GET').toUpperCase(),
        url: String(url == null ? '' : url),
        id: Math.random().toString(36).slice(2)
      };
      return origOpen.apply(this, arguments);
    };
    XHR.prototype.send = function() {
      var xhr = this;
      var meta = xhr.__builder_net || { method: 'GET', url: '', id: Math.random().toString(36).slice(2) };
      var started = performance.now();
      netStart({ __builder_network: TOKEN, phase: 'start', id: meta.id, method: meta.method, url: meta.url, type: 'xhr' });
      if (NET_OFF) {
        netEnd({ __builder_network: TOKEN, phase: 'end', id: meta.id, method: meta.method, url: meta.url, type: 'xhr', status: 0, ok: false, ms: Math.round(performance.now() - started), error: 'Network disabled in preview' });
        try { xhr.dispatchEvent(new Event('error')); } catch (e1) {}
        return;
      }
      var finished = false;
      function finish(status, ok, error) {
        if (finished) return;
        finished = true;
        netEnd({ __builder_network: TOKEN, phase: 'end', id: meta.id, method: meta.method, url: meta.url, type: 'xhr', status: status, ok: ok, ms: Math.round(performance.now() - started), error: error || undefined });
      }
      xhr.addEventListener('load', function() {
        var st = xhr.status || 0;
        finish(st, st >= 200 && st < 400, st === 0 ? 'XHR failed' : undefined);
      });
      xhr.addEventListener('error', function() {
        finish(0, false, 'XHR network error');
      });
      xhr.addEventListener('abort', function() {
        finish(0, false, 'XHR aborted');
      });
      return origSend.apply(xhr, arguments);
    };
  }

  if (INTERCEPT_NAV) {
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
      if (raw.charAt(0) === '#') return;
      var lower = raw.toLowerCase();
      if (lower.indexOf('mailto:') === 0 || lower.indexOf('tel:') === 0 || lower.indexOf('sms:') === 0) return;
      if (lower.indexOf('javascript:') === 0) return;
      if (/^https?:\\/\\//i.test(raw) || raw.indexOf('//') === 0) return;
      e.preventDefault();
      try { parent.postMessage({ __builder_navigate: TOKEN, href: raw }, '*'); } catch (err) {}
    }, true);
  }
})();</script>`;
}
