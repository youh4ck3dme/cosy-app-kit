import { SKELETON_META_ATTR, SKELETON_SLOT_ATTR, type SemanticIntent } from "./types";

export type SkeletonInput = {
  brand: string;
  intent: SemanticIntent;
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared premium tokens — distinctive, not purple/indigo cliché. */
function sharedCss(): string {
  return `
:root {
  --bg: #0c1118;
  --bg-elev: #141b24;
  --surface: #1a2330;
  --border: #2a3648;
  --text: #e8eef6;
  --muted: #8b9bb0;
  --accent: #3d9a7a;
  --accent-2: #e8a54b;
  --danger: #e85d5d;
  --radius: 14px;
  --shadow: 0 18px 50px rgba(0,0,0,.35);
  --font: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  min-height: 100dvh;
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}
a { color: var(--accent); }
button, input, select, textarea {
  font: inherit;
  color: inherit;
}
button {
  cursor: pointer;
  border: 0;
  border-radius: 10px;
  min-height: 44px;
  min-width: 44px;
  padding: 0.65rem 1rem;
  background: var(--accent);
  color: #04140f;
  font-weight: 600;
}
button.secondary {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible {
  outline: 2px solid var(--accent-2);
  outline-offset: 2px;
}
.muted { color: var(--muted); }
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem 1.1rem;
  box-shadow: var(--shadow);
}
.empty {
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  text-align: center;
  color: var(--muted);
  background: rgba(255,255,255,.02);
}
.toast-host {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 50;
  display: grid;
  gap: 8px;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  box-shadow: var(--shadow);
}
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
`.trim();
}

function storageBoot(storageKey: string): string {
  return `
<script>
/* BUILD_HOOK:state — replace seed state + hydrate real domain model */
(function () {
  var KEY = ${JSON.stringify(storageKey)};
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { v: 1, items: [] };
      return JSON.parse(raw);
    } catch (e) { return { v: 1, items: [] }; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function toast(msg) {
    var host = document.querySelector("[${SKELETON_SLOT_ATTR}='toast-host']");
    if (!host) return;
    var el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function () { el.remove(); }, 3200);
  }
  window.__NF = { KEY: KEY, load: load, save: save, toast: toast, state: load() };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll("[data-nf-dialog].open").forEach(function (d) {
        d.classList.remove("open");
        d.setAttribute("hidden", "");
      });
    }
  });
})();
</script>`;
}

function wrap(
  brand: string,
  intent: SemanticIntent,
  title: string,
  extraCss: string,
  body: string,
  storageKey: string,
): string {
  return `<!DOCTYPE html>
<html lang="en" ${SKELETON_META_ATTR}="${intent}" data-nf-brand="${esc(brand)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
${sharedCss()}
${extraCss}
  </style>
</head>
<body>
${body}
<div class="toast-host" ${SKELETON_SLOT_ATTR}="toast-host" aria-live="polite"></div>
${storageBoot(storageKey)}
</body>
</html>`;
}

function renderBooking(brand: string): string {
  const b = esc(brand);
  const css = `
.app{max-width:960px;margin:0 auto;padding:12px 14px 88px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0 16px;border-bottom:1px solid var(--border);margin-bottom:16px}
.brand{font-weight:700;letter-spacing:-.02em}
.steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-bottom:16px}
.step{font-size:.72rem;text-align:center;padding:8px 4px;border-radius:999px;border:1px solid var(--border);color:var(--muted);background:var(--bg-elev)}
.step.is-active{color:#04140f;background:var(--accent);border-color:transparent;font-weight:700}
.layout{display:grid;gap:14px}
.grid-2{display:grid;gap:10px}
label{display:grid;gap:6px;font-size:.9rem}
input,select{min-height:44px;border-radius:10px;border:1px solid var(--border);background:var(--bg);padding:0 12px}
.slot-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.slot{min-height:44px;border-radius:10px;border:1px dashed var(--border);background:transparent;color:var(--muted);font-weight:500}
.panel-title{margin:0 0 8px;font-size:1rem}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
@media(min-width:768px){.layout{grid-template-columns:1.2fr .8fr;align-items:start}.step{font-size:.8rem;padding:10px 8px}}
`;
  const body = `
<div class="app">
  <header class="top">
    <div>
      <div class="brand" ${SKELETON_SLOT_ATTR}="brand">${b}</div>
      <div class="muted" style="font-size:.85rem">Book a service · product skeleton</div>
    </div>
    <button type="button" class="secondary" ${SKELETON_SLOT_ATTR}="theme-toggle" aria-label="Toggle theme">Theme</button>
  </header>
  <nav class="steps" aria-label="Booking steps" ${SKELETON_SLOT_ATTR}="booking-steps">
    <div class="step is-active" data-step="service">Service</div>
    <div class="step" data-step="date">Date</div>
    <div class="step" data-step="slot">Slot</div>
    <div class="step" data-step="form">Details</div>
    <div class="step" data-step="confirm">Confirm</div>
  </nav>
  <div class="layout">
    <section class="card" ${SKELETON_SLOT_ATTR}="booking-flow" aria-labelledby="flow-title">
      <h1 id="flow-title" class="panel-title">New booking</h1>
      <p class="muted" style="margin-top:0">Empty states ready — Build fills slot engine &amp; validation.</p>
      <div class="grid-2" style="margin-top:12px">
        <label>Service
          <select ${SKELETON_SLOT_ATTR}="service-select" aria-label="Service"><option value="">Select a service…</option></select>
        </label>
        <label>Date
          <input type="date" ${SKELETON_SLOT_ATTR}="date-input" aria-label="Date" />
        </label>
      </div>
      <div style="margin-top:14px">
        <div class="muted" style="margin-bottom:8px;font-size:.85rem">Available slots</div>
        <div class="slot-grid" ${SKELETON_SLOT_ATTR}="slot-grid">
          <!-- BUILD_HOOK:slot-engine -->
          <button type="button" class="slot" disabled>No slots yet</button>
          <button type="button" class="slot" disabled>—</button>
          <button type="button" class="slot" disabled>—</button>
        </div>
      </div>
      <div class="empty" style="margin-top:14px" ${SKELETON_SLOT_ATTR}="customer-form-empty">Customer form empty state — name, email, notes land here.</div>
      <div class="row" style="margin-top:14px">
        <button type="button" ${SKELETON_SLOT_ATTR}="primary-cta">Continue</button>
        <button type="button" class="secondary" ${SKELETON_SLOT_ATTR}="reset-cta">Reset</button>
      </div>
      <div class="empty" style="margin-top:14px" ${SKELETON_SLOT_ATTR}="confirm-empty">Confirmation card empty — booking ID + summary after submit.</div>
    </section>
    <aside class="card" ${SKELETON_SLOT_ATTR}="staff-ops" aria-labelledby="staff-title">
      <h2 id="staff-title" class="panel-title">Staff ops</h2>
      <div class="row" style="margin-bottom:10px">
        <button type="button" class="secondary" data-filter="all">All</button>
        <button type="button" class="secondary" data-filter="pending">Pending</button>
        <button type="button" class="secondary" data-filter="done">Done</button>
      </div>
      <div class="empty" ${SKELETON_SLOT_ATTR}="staff-list-empty">No bookings yet. Confirm / Complete / Cancel actions wire here.</div>
    </aside>
  </div>
  <section class="card" style="margin-top:14px" ${SKELETON_SLOT_ATTR}="cancel-self-serve" aria-labelledby="cancel-title">
    <h2 id="cancel-title" class="panel-title">Cancel by ID + email</h2>
    <div class="grid-2">
      <label>Booking ID<input type="text" ${SKELETON_SLOT_ATTR}="cancel-id" autocomplete="off" placeholder="e.g. BK-…" aria-label="Booking ID" /></label>
      <label>Email<input type="email" ${SKELETON_SLOT_ATTR}="cancel-email" autocomplete="email" placeholder="you@example.com" aria-label="Email" /></label>
    </div>
    <div class="row" style="margin-top:12px">
      <button type="button" class="secondary" ${SKELETON_SLOT_ATTR}="cancel-cta">Cancel booking</button>
    </div>
    <p class="muted" style="font-size:.85rem;margin-bottom:0">BUILD_HOOK:cancel — verify ID+email, free slot, toast success/error.</p>
  </section>
</div>
<script>
(function(){var c=document.querySelector("[${SKELETON_SLOT_ATTR}='primary-cta']");if(c)c.addEventListener("click",function(){window.__NF&&window.__NF.toast("Skeleton ready — Build will fill booking logic.");});})();
</script>`;
  return wrap(brand, "booking", `${brand} · Book`, css, body, "nf-skeleton-booking");
}

function renderLanding(brand: string): string {
  const b = esc(brand);
  const css = `
.wrap{max-width:1040px;margin:0 auto;padding:16px 16px 96px}
.nav{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:28px}
.logo{font-weight:800;letter-spacing:-.03em}
.nav-actions{display:flex;gap:8px;align-items:center}
.hero{display:grid;gap:18px;padding:28px 0 18px}
.hero h1{font-size:clamp(2rem,6vw,3.2rem);line-height:1.08;letter-spacing:-.04em;margin:0}
.hero p{margin:0;max-width:36rem;color:var(--muted);font-size:1.05rem}
.hero-cta{display:flex;flex-wrap:wrap;gap:10px}
.features{display:grid;gap:12px;margin:28px 0}
.feature h3{margin:0 0 6px;font-size:1rem}
.pricing{display:grid;gap:12px}
.price{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
.footer{margin-top:36px;padding-top:18px;border-top:1px solid var(--border);color:var(--muted);font-size:.9rem}
.menu-btn{display:inline-flex}
.mobile-nav{display:none;flex-direction:column;gap:8px;padding:12px 0}
.mobile-nav.open{display:flex}
@media(min-width:768px){
  .menu-btn{display:none}
  .features{grid-template-columns:repeat(3,minmax(0,1fr))}
  .pricing{grid-template-columns:repeat(3,minmax(0,1fr))}
  .hero{padding:48px 0 24px}
}
`;
  const body = `
<div class="wrap">
  <header class="nav">
    <div class="logo" ${SKELETON_SLOT_ATTR}="brand">${b}</div>
    <div class="nav-actions">
      <button type="button" class="secondary menu-btn" ${SKELETON_SLOT_ATTR}="nav-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu">Menu</button>
      <button type="button" class="secondary" ${SKELETON_SLOT_ATTR}="nav-login">Log in</button>
      <button type="button" ${SKELETON_SLOT_ATTR}="nav-cta">Get started</button>
    </div>
  </header>
  <div id="mobile-nav" class="mobile-nav" ${SKELETON_SLOT_ATTR}="mobile-nav" hidden>
    <a href="#features">Features</a>
    <a href="#pricing">Pricing</a>
    <a href="#cta">Contact</a>
  </div>
  <section class="hero" ${SKELETON_SLOT_ATTR}="hero">
    <h1>Ship a product people feel in three seconds.</h1>
    <p class="muted">Premium landing skeleton — hero, features, pricing teaser. Build fills copy, visuals, and real CTAs.</p>
    <div class="hero-cta">
      <button type="button" ${SKELETON_SLOT_ATTR}="primary-cta">Start free</button>
      <button type="button" class="secondary" ${SKELETON_SLOT_ATTR}="secondary-cta">See how it works</button>
    </div>
    <div class="empty" ${SKELETON_SLOT_ATTR}="hero-visual-empty">Hero visual / product mock empty state</div>
  </section>
  <section id="features" class="features" ${SKELETON_SLOT_ATTR}="features" aria-label="Features">
    <article class="card feature"><h3>Fast first paint</h3><p class="muted" style="margin:0">Empty-state cards ready for real benefits.</p></article>
    <article class="card feature"><h3>Mobile-first</h3><p class="muted" style="margin:0">Hamburger nav under 768px; desktop expands.</p></article>
    <article class="card feature"><h3>Accessible chrome</h3><p class="muted" style="margin:0">Labels, focus rings, 44px targets.</p></article>
  </section>
  <section id="pricing" class="pricing" ${SKELETON_SLOT_ATTR}="pricing" aria-label="Pricing">
    <article class="card"><div class="price"><strong>Starter</strong><span class="muted">$0</span></div><div class="empty" style="margin-top:12px">Tier features empty</div></article>
    <article class="card"><div class="price"><strong>Pro</strong><span class="muted">$29</span></div><div class="empty" style="margin-top:12px">Tier features empty</div></article>
    <article class="card"><div class="price"><strong>Team</strong><span class="muted">$79</span></div><div class="empty" style="margin-top:12px">Tier features empty</div></article>
  </section>
  <section id="cta" class="card" style="margin-top:18px" ${SKELETON_SLOT_ATTR}="footer-cta">
    <h2 style="margin:0 0 8px;font-size:1.15rem">Ready when you are</h2>
    <p class="muted">BUILD_HOOK:cta — wire form or checkout later.</p>
    <button type="button" ${SKELETON_SLOT_ATTR}="primary-cta-2">Join ${b}</button>
  </section>
  <footer class="footer" ${SKELETON_SLOT_ATTR}="footer">© ${b} · Instant product skeleton</footer>
</div>
<script>
(function(){
  var btn=document.querySelector("[${SKELETON_SLOT_ATTR}='nav-toggle']");
  var nav=document.getElementById("mobile-nav");
  if(btn&&nav){btn.addEventListener("click",function(){var open=nav.classList.toggle("open");nav.hidden=!open;btn.setAttribute("aria-expanded",open?"true":"false");});}
  var c=document.querySelector("[${SKELETON_SLOT_ATTR}='primary-cta']");
  if(c)c.addEventListener("click",function(){window.__NF&&window.__NF.toast("Landing skeleton live — Build will polish.");});
})();
</script>`;
  return wrap(brand, "landing", `${brand} · Landing`, css, body, "nf-skeleton-landing");
}

function renderDashboard(brand: string): string {
  const b = esc(brand);
  const css = `
.shell{min-height:100dvh}
.top{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);background:var(--bg-elev);position:sticky;top:0;z-index:5}
.brand{font-weight:700}
.side{display:none;padding:14px;border-right:1px solid var(--border);background:#0f151d}
.side a{display:block;padding:10px 12px;border-radius:10px;color:var(--text);text-decoration:none;margin-bottom:4px}
.side a:hover,.side a.is-active{background:var(--surface)}
main{padding:14px;display:grid;gap:12px}
.kpis{display:grid;gap:10px}
.kpi strong{display:block;font-size:1.4rem;letter-spacing:-.02em}
.chart{min-height:200px}
.toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
@media(min-width:768px){
  .shell{display:grid;grid-template-columns:220px 1fr}
  .top{grid-column:1/-1}
  .side{display:block}
  .menu-btn{display:none}
  .kpis{grid-template-columns:repeat(3,minmax(0,1fr))}
  main{padding:18px}
}
.side.mobile-open{display:block;position:fixed;inset:56px 0 auto 0;z-index:4;border-bottom:1px solid var(--border)}
`;
  const body = `
<div class="shell">
  <header class="top">
    <button type="button" class="secondary menu-btn" ${SKELETON_SLOT_ATTR}="nav-toggle" aria-expanded="false" aria-label="Open menu">☰</button>
    <div class="brand" ${SKELETON_SLOT_ATTR}="brand">${b}</div>
    <span class="muted" style="margin-left:auto;font-size:.85rem">Ops skeleton</span>
  </header>
  <aside class="side" id="side" ${SKELETON_SLOT_ATTR}="sidebar" aria-label="Sidebar">
    <a href="#" class="is-active">Dashboard</a>
    <a href="#">Reports</a>
    <a href="#">Team</a>
    <a href="#">Settings</a>
  </aside>
  <main>
    <div class="toolbar" ${SKELETON_SLOT_ATTR}="range-toggle" role="group" aria-label="Time range">
      <button type="button" class="secondary" data-range="week">Week</button>
      <button type="button" class="secondary" data-range="month">Month</button>
      <button type="button" class="secondary" data-range="year">Year</button>
    </div>
    <section class="kpis" ${SKELETON_SLOT_ATTR}="kpi-row" aria-label="KPIs">
      <article class="card kpi"><span class="muted">Revenue</span><strong>—</strong><div class="empty" style="margin-top:8px;padding:.6rem">KPI empty</div></article>
      <article class="card kpi"><span class="muted">Active users</span><strong>—</strong><div class="empty" style="margin-top:8px;padding:.6rem">KPI empty</div></article>
      <article class="card kpi"><span class="muted">Latency p95</span><strong>—</strong><div class="empty" style="margin-top:8px;padding:.6rem">KPI empty</div></article>
    </section>
    <section class="card chart" ${SKELETON_SLOT_ATTR}="chart-panel" aria-labelledby="chart-title">
      <h1 id="chart-title" style="margin:0 0 8px;font-size:1rem">Revenue</h1>
      <div class="empty" ${SKELETON_SLOT_ATTR}="chart-empty" style="min-height:160px;display:grid;place-items:center">
        Chart slot empty — BUILD_HOOK:chart Canvas 2D / SVG (no CDN)
      </div>
    </section>
    <section class="card" ${SKELETON_SLOT_ATTR}="activity" aria-labelledby="act-title">
      <h2 id="act-title" style="margin:0 0 8px;font-size:1rem">Recent activity</h2>
      <div class="empty" ${SKELETON_SLOT_ATTR}="activity-empty">No events yet. Staff/operator feed wires here.</div>
    </section>
  </main>
</div>
<script>
(function(){
  var btn=document.querySelector("[${SKELETON_SLOT_ATTR}='nav-toggle']");
  var side=document.getElementById("side");
  if(btn&&side){btn.addEventListener("click",function(){var open=side.classList.toggle("mobile-open");btn.setAttribute("aria-expanded",open?"true":"false");});}
  window.__NF&&window.__NF.toast("Dashboard skeleton ready.");
})();
</script>`;
  return wrap(brand, "dashboard", `${brand} · Dashboard`, css, body, "nf-skeleton-dashboard");
}

function renderCrud(brand: string): string {
  const b = esc(brand);
  const css = `
.app{max-width:1000px;margin:0 auto;padding:12px 14px 88px}
.top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:14px}
.brand{font-weight:700}
.filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
input[type="search"],select{min-height:44px;border-radius:10px;border:1px solid var(--border);background:var(--bg);padding:0 12px;min-width:min(100%,220px)}
table{width:100%;border-collapse:collapse;font-size:.92rem}
th,td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--border)}
th{color:var(--muted);font-weight:600;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}
.drawer{position:fixed;inset:auto 0 0 0;background:var(--bg-elev);border-top:1px solid var(--border);padding:16px;transform:translateY(110%);transition:transform .2s ease;z-index:20;max-height:80dvh;overflow:auto}
.drawer.open{transform:translateY(0)}
.drawer[hidden]{display:none}
.backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:15}
.backdrop[hidden]{display:none}
label{display:grid;gap:6px;margin-bottom:10px}
input,textarea{min-height:44px;border-radius:10px;border:1px solid var(--border);background:var(--bg);padding:0 12px}
textarea{min-height:88px;padding:10px 12px;resize:vertical}
@media(min-width:768px){.drawer{left:auto;width:400px;inset:0 0 0 auto;border-top:0;border-left:1px solid var(--border);transform:translateX(105%)}.drawer.open{transform:translateX(0)}}
`;
  const body = `
<div class="app">
  <header class="top">
    <div>
      <div class="brand" ${SKELETON_SLOT_ATTR}="brand">${b}</div>
      <div class="muted" style="font-size:.85rem">Records · product skeleton</div>
    </div>
    <button type="button" ${SKELETON_SLOT_ATTR}="create-cta">New record</button>
  </header>
  <div class="filters" ${SKELETON_SLOT_ATTR}="filters">
    <input type="search" ${SKELETON_SLOT_ATTR}="search" placeholder="Search…" aria-label="Search records" />
    <select ${SKELETON_SLOT_ATTR}="status-filter" aria-label="Status filter">
      <option value="all">All statuses</option>
      <option value="active">Active</option>
      <option value="archived">Archived</option>
    </select>
  </div>
  <section class="card" ${SKELETON_SLOT_ATTR}="list-panel" aria-labelledby="list-title">
    <h1 id="list-title" style="margin:0 0 8px;font-size:1rem">All records</h1>
    <div class="empty" ${SKELETON_SLOT_ATTR}="list-empty">
      No records yet. BUILD_HOOK:list — render rows from localStorage; never inject HTML from state.
    </div>
    <div ${SKELETON_SLOT_ATTR}="table-host" hidden>
      <table>
        <thead><tr><th>Name</th><th>Status</th><th>Updated</th><th></th></tr></thead>
        <tbody ${SKELETON_SLOT_ATTR}="table-body"></tbody>
      </table>
    </div>
  </section>
  <section class="card" style="margin-top:12px" ${SKELETON_SLOT_ATTR}="undo-panel" aria-labelledby="undo-title">
    <h2 id="undo-title" style="margin:0 0 6px;font-size:1rem">Self-serve undo</h2>
    <p class="muted" style="margin:0">BUILD_HOOK:undo — restore last deleted record (secondary path / D6).</p>
    <button type="button" class="secondary" style="margin-top:10px" ${SKELETON_SLOT_ATTR}="undo-cta" disabled>Undo last delete</button>
  </section>
</div>
<div class="backdrop" ${SKELETON_SLOT_ATTR}="drawer-backdrop" hidden></div>
<div class="drawer" data-nf-dialog ${SKELETON_SLOT_ATTR}="create-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" hidden>
  <h2 id="drawer-title" style="margin-top:0">Create record</h2>
  <label>Name<input type="text" ${SKELETON_SLOT_ATTR}="field-name" aria-label="Name" /></label>
  <label>Notes<textarea ${SKELETON_SLOT_ATTR}="field-notes" aria-label="Notes"></textarea></label>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button type="button" ${SKELETON_SLOT_ATTR}="save-cta">Save</button>
    <button type="button" class="secondary" ${SKELETON_SLOT_ATTR}="close-drawer">Close</button>
  </div>
</div>
<script>
(function(){
  var openBtn=document.querySelector("[${SKELETON_SLOT_ATTR}='create-cta']");
  var drawer=document.querySelector("[${SKELETON_SLOT_ATTR}='create-drawer']");
  var backdrop=document.querySelector("[${SKELETON_SLOT_ATTR}='drawer-backdrop']");
  var closeBtn=document.querySelector("[${SKELETON_SLOT_ATTR}='close-drawer']");
  function open(){if(!drawer)return;drawer.hidden=false;drawer.classList.add("open");if(backdrop){backdrop.hidden=false;}}
  function close(){if(!drawer)return;drawer.classList.remove("open");drawer.hidden=true;if(backdrop){backdrop.hidden=true;}}
  if(openBtn)openBtn.addEventListener("click",open);
  if(closeBtn)closeBtn.addEventListener("click",close);
  if(backdrop)backdrop.addEventListener("click",close);
  var save=document.querySelector("[${SKELETON_SLOT_ATTR}='save-cta']");
  if(save)save.addEventListener("click",function(){window.__NF&&window.__NF.toast("CRUD skeleton — wire create/update/delete next.");});
})();
</script>`;
  return wrap(brand, "crud", `${brand} · Records`, css, body, "nf-skeleton-crud");
}

function renderWaitlist(brand: string): string {
  const b = esc(brand);
  const css = `
body{background:
  radial-gradient(1200px 600px at 10% -10%, rgba(61,154,122,.22), transparent 55%),
  radial-gradient(900px 500px at 90% 10%, rgba(232,165,75,.12), transparent 50%),
  var(--bg)}
.wrap{min-height:100dvh;display:grid;place-items:center;padding:24px 16px 96px}
.panel{width:min(520px,100%);text-align:center}
.logo{font-weight:800;letter-spacing:-.03em;margin-bottom:18px}
h1{font-size:clamp(1.8rem,5vw,2.6rem);letter-spacing:-.04em;line-height:1.1;margin:0 0 12px}
.lead{color:var(--muted);margin:0 0 22px}
form{display:grid;gap:10px;text-align:left}
label{display:grid;gap:6px;font-size:.9rem}
input[type="email"]{min-height:48px;border-radius:12px;border:1px solid var(--border);background:rgba(0,0,0,.25);padding:0 14px;width:100%}
.err{color:var(--danger);font-size:.85rem;min-height:1.2em}
.proof{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:22px}
.proof .card{padding:.75rem;font-size:.8rem;color:var(--muted)}
@media(max-width:420px){.proof{grid-template-columns:1fr}}
`;
  const body = `
<div class="wrap">
  <div class="panel card" ${SKELETON_SLOT_ATTR}="waitlist-panel" style="box-shadow:var(--shadow)">
    <div class="logo" ${SKELETON_SLOT_ATTR}="brand">${b}</div>
    <h1>Get early access</h1>
    <p class="lead">Atmospheric waitlist skeleton — one sentence value prop, email capture, social proof row.</p>
    <form ${SKELETON_SLOT_ATTR}="waitlist-form" novalidate>
      <label>Email
        <input type="email" name="email" ${SKELETON_SLOT_ATTR}="email" autocomplete="email" placeholder="you@company.com" required aria-describedby="email-err" />
      </label>
      <div class="err" id="email-err" ${SKELETON_SLOT_ATTR}="email-error" role="alert"></div>
      <button type="submit" ${SKELETON_SLOT_ATTR}="join-cta" style="width:100%">Join the waitlist</button>
    </form>
    <div class="empty" style="margin-top:16px" ${SKELETON_SLOT_ATTR}="success-empty">Success state empty — show position / confirmation after join.</div>
    <div class="proof" ${SKELETON_SLOT_ATTR}="social-proof" aria-label="Social proof">
      <div class="card empty">Logo / quote</div>
      <div class="card empty">Logo / quote</div>
      <div class="card empty">Logo / quote</div>
    </div>
  </div>
</div>
<script>
(function(){
  var form=document.querySelector("[${SKELETON_SLOT_ATTR}='waitlist-form']");
  var input=document.querySelector("[${SKELETON_SLOT_ATTR}='email']");
  var err=document.querySelector("[${SKELETON_SLOT_ATTR}='email-error']");
  if(!form||!input)return;
  form.addEventListener("submit",function(e){
    e.preventDefault();
    var v=(input.value||"").trim();
    if(!v || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)){
      if(err)err.textContent="Enter a valid email.";
      input.focus();
      return;
    }
    if(err)err.textContent="";
    var st=window.__NF&&window.__NF.load?window.__NF.load():{v:1,items:[]};
    st.items=st.items||[];
    st.items.push({email:v,at:Date.now()});
    if(window.__NF&&window.__NF.save)window.__NF.save(st);
    if(window.__NF&&window.__NF.toast)window.__NF.toast("You're on the list (skeleton).");
    input.value="";
  });
})();
</script>`;
  return wrap(brand, "waitlist", `${brand} · Waitlist`, css, body, "nf-skeleton-waitlist");
}

const RENDERERS: Record<SemanticIntent, (brand: string) => string> = {
  booking: renderBooking,
  landing: renderLanding,
  dashboard: renderDashboard,
  crud: renderCrud,
  waitlist: renderWaitlist,
};

/**
 * Generate premium single-file product skeleton HTML for a detected intent.
 */
export function renderProductSkeleton(input: SkeletonInput): string {
  const brand = (input.brand || "Forge App").trim().slice(0, 48) || "Forge App";
  return RENDERERS[input.intent](brand);
}

/** Stable markers every skeleton must expose for Build hooks / tests. */
export const REQUIRED_SKELETON_MARKERS = [
  SKELETON_META_ATTR,
  SKELETON_SLOT_ATTR,
  "BUILD_HOOK",
  'name="viewport"',
  "toast-host",
  "localStorage",
] as const;
