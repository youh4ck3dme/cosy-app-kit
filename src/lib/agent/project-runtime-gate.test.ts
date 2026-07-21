import { describe, expect, it } from "vitest";
import {
  analyzeProjectRuntime,
  isMultiPageProject,
  type ProjectFile,
} from "./project-runtime-gate";

const goodFleet: ProjectFile[] = [
  {
    path: "index.html",
    content: `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="stylesheet" href="./styles.css">
    </head><body>
      <nav><a href="index.html">Dash</a><a href="vehicles.html">Vehicles</a></nav>
      <main><p id="totalVehicles">0</p></main>
      <script src="./app.js"></script>
    </body></html>`,
  },
  {
    path: "vehicles.html",
    content: `<!DOCTYPE html><html><head>
      <link rel="stylesheet" href="./styles.css">
    </head><body>
      <nav><a href="index.html">Dash</a><a href="vehicles.html">Vehicles</a></nav>
      <div id="vehiclesList"></div>
      <script src="./app.js"></script>
    </body></html>`,
  },
  {
    path: "styles.css",
    content: `body{font-family:sans-serif}.app-status{padding:.5rem}`,
  },
  {
    path: "app.js",
    content: `
const defaultState = { vehicles: [{ id: 1, name: "Truck 1", status: "Available" }] };
function cloneDefaultState() { return structuredClone(defaultState); }
function loadState() {
  try {
    const raw = localStorage.getItem("k");
    return raw ? JSON.parse(raw) : cloneDefaultState();
  } catch (e) { return cloneDefaultState(); }
}
function resetState() {
  state = cloneDefaultState();
  saveState(state);
  refreshCurrentPage();
  return state;
}
let state = loadState();
function updateDashboard() {
  if (!document.getElementById("totalVehicles")) return;
  document.getElementById("totalVehicles").textContent = String(state.vehicles.length);
}
function updateVehiclesList() {
  const root = document.getElementById("vehiclesList");
  if (!root) return;
  while (root.firstChild) root.removeChild(root.firstChild);
  state.vehicles.forEach((v) => {
    const d = document.createElement("div");
    d.textContent = v.name;
    const b = document.createElement("button");
    b.dataset.action = "set-maintenance";
    b.dataset.id = String(v.id);
    b.textContent = "Set to Maintenance";
    d.appendChild(b);
    root.appendChild(d);
  });
}
function refreshCurrentPage() {
  updateDashboard();
  updateVehiclesList();
}
function saveState(s) {
  try { localStorage.setItem("k", JSON.stringify(s)); } catch (e) {}
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const btn = t.closest("[data-action]");
  if (!btn) return;
});
window.addEventListener("DOMContentLoaded", () => {
  state = loadState();
  refreshCurrentPage();
});
`,
  },
  {
    path: "README.md",
    content: "# FleetOps\nLocal multi-page app. No external CDN.",
  },
];

describe("analyzeProjectRuntime", () => {
  it("scores good multi-page package high", () => {
    const r = analyzeProjectRuntime(goodFleet);
    expect(r.hardFails).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.htmlPages.length).toBe(2);
    expect(r.externalUrlCount).toBe(0);
  });

  it("flags dead links", () => {
    const r = analyzeProjectRuntime([
      {
        path: "index.html",
        content: `<a href="missing.html">x</a><script src="./app.js"></script>`,
      },
      { path: "app.js", content: "console.log(1)" },
    ]);
    expect(r.hardFails.some((f) => f.startsWith("dead_link:"))).toBe(true);
    expect(r.ok).toBe(false);
  });

  it("flags alert and inline onclick", () => {
    const r = analyzeProjectRuntime([
      {
        path: "index.html",
        content: `<button onclick="go()">x</button><script src="app.js"></script>`,
      },
      {
        path: "vehicles.html",
        content: `<a href="index.html">home</a><script src="app.js"></script>`,
      },
      { path: "app.js", content: `function go(){ alert("no"); }` },
    ]);
    expect(r.hardFails.some((f) => f.startsWith("alert_call"))).toBe(true);
    expect(r.hardFails.some((f) => f.startsWith("inline_onclick"))).toBe(true);
  });

  it("flags FleetOps syntax corruption and defaultState leak", () => {
    const r = analyzeProjectRuntime([
      { path: "index.html", content: `<script src="app.js"></script>` },
      { path: "vehicles.html", content: `<script src="app.js"></script>` },
      {
        path: "app.js",
        content: `
const defaultState = { a: 1 };
function loadState(){ return defaultState; }
function assign(){ const availableVehicles = [];n    if (availableVehicles.length > 0) {} }
`,
      },
    ]);
    expect(r.hardFails.some((f) => f.includes("js_stray_n_before_if"))).toBe(true);
    expect(r.hardFails.some((f) => f.includes("returns_default_state"))).toBe(true);
    expect(r.hardFails.some((f) => f.includes("no_structured_clone"))).toBe(true);
  });

  it("flags missing app.js when referenced", () => {
    const r = analyzeProjectRuntime([
      { path: "index.html", content: `<script src="./app.js"></script>` },
      { path: "about.html", content: `<script src="./app.js"></script>` },
    ]);
    expect(r.hardFails).toContain("missing_app_js");
  });

  it("counts external URLs", () => {
    const r = analyzeProjectRuntime([
      {
        path: "index.html",
        content: `<script src="https://cdn.example.com/x.js"></script><link href="about.html">`,
      },
      { path: "about.html", content: `<a href="index.html">h</a>` },
    ]);
    expect(r.externalUrlCount).toBeGreaterThan(0);
    expect(r.softFails.some((f) => f.startsWith("external_urls"))).toBe(true);
  });
});

describe("isMultiPageProject", () => {
  it("detects multi html", () => {
    expect(isMultiPageProject(goodFleet)).toBe(true);
    expect(isMultiPageProject([{ path: "index.html", content: "x" }])).toBe(false);
  });
});
