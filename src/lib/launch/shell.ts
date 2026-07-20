import type { LaunchBlueprint } from "./schema";
import { PAGE_PATHS, type PageId } from "./schema";

export type SharedShell = {
  headerHtml: string;
  footerHtml: string;
  cssVars: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Deterministic header/footer + CSS vars from blueprint (no LLM). */
export function generateSharedShell(blueprint: LaunchBlueprint): SharedShell {
  const { brand, project, nav } = blueprint;
  const name = escapeHtml(project.name);
  const tagline = project.tagline ? escapeHtml(project.tagline) : "";

  const cssVars = `:root {
  --brand-primary: ${brand.primary};
  --brand-accent: ${brand.accent};
  --brand-bg: ${brand.background};
  --brand-font: ${brand.font};
}`;

  const links = nav
    .map((item) => {
      const href = escapeHtml(item.href);
      const label = escapeHtml(item.label);
      return `<a class="site-nav__link" href="${href}">${label}</a>`;
    })
    .join("\n        ");

  const headerHtml = `<header class="site-header" data-launch-shell="header">
  <div class="site-header__inner">
    <a class="site-logo" href="${PAGE_PATHS.home}">${name}</a>
    <button type="button" class="site-nav-toggle" aria-label="Menu" aria-expanded="false" data-nav-toggle>☰</button>
    <nav class="site-nav" data-site-nav aria-label="Main">
      ${links}
    </nav>
  </div>
</header>
<script>
(function(){
  var btn=document.querySelector('[data-nav-toggle]');
  var nav=document.querySelector('[data-site-nav]');
  if(!btn||!nav) return;
  btn.addEventListener('click',function(){
    var open=nav.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();
</script>`;

  const footerHtml = `<footer class="site-footer" data-launch-shell="footer">
  <div class="site-footer__inner">
    <strong>${name}</strong>
    ${tagline ? `<p class="site-footer__tag">${tagline}</p>` : ""}
    <p class="site-footer__copy">© ${new Date().getFullYear()} ${name}</p>
  </div>
</footer>`;

  return { headerHtml, footerHtml, cssVars };
}

/** Base CSS shared by placeholder pages (workers may expand). */
export function shellBaseStyles(shell: SharedShell): string {
  return `${shell.cssVars}
*{box-sizing:border-box}
body{margin:0;font-family:var(--brand-font);background:var(--brand-bg);color:var(--brand-primary);line-height:1.5}
.site-header{border-bottom:1px solid color-mix(in srgb,var(--brand-primary) 12%,transparent);background:color-mix(in srgb,var(--brand-bg) 92%,#fff)}
.site-header__inner{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1rem;max-width:1100px;margin:0 auto}
.site-logo{font-weight:700;text-decoration:none;color:var(--brand-primary)}
.site-nav{display:none;flex-direction:column;gap:.5rem;position:absolute;left:0;right:0;top:3.25rem;background:var(--brand-bg);padding:1rem;border-bottom:1px solid color-mix(in srgb,var(--brand-primary) 12%,transparent);z-index:20}
.site-nav.is-open{display:flex}
.site-nav__link{color:var(--brand-primary);text-decoration:none;padding:.5rem 0;min-height:44px}
.site-nav-toggle{border:1px solid color-mix(in srgb,var(--brand-primary) 25%,transparent);background:transparent;border-radius:8px;min-width:44px;min-height:44px;font-size:1.1rem}
@media (min-width:768px){
  .site-nav-toggle{display:none}
  .site-nav{display:flex;flex-direction:row;position:static;padding:0;border:0;gap:1.25rem}
}
.site-footer{margin-top:3rem;padding:2rem 1rem;border-top:1px solid color-mix(in srgb,var(--brand-primary) 12%,transparent);font-size:.9rem}
.site-footer__inner{max-width:1100px;margin:0 auto}
.site-main{max-width:1100px;margin:0 auto;padding:1.25rem 1rem 2rem}
.site-banner-error{background:#fef2f2;color:#991b1b;padding:.75rem 1rem;border-radius:8px;margin-bottom:1rem}
@media (min-width:768px){.site-main{padding:2rem 1.5rem 3rem}}`;
}

export function placeholderPageHtml(
  pageId: PageId,
  blueprint: LaunchBlueprint,
  shell: SharedShell,
  reason: string,
): string {
  const slice = blueprint.pages[pageId];
  const title = escapeHtml(slice.title);
  const name = escapeHtml(blueprint.project.name);
  const sections = slice.sections
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("\n");
  return `<!DOCTYPE html>
<html lang="${escapeHtml(blueprint.project.locale ?? "sk")}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title} · ${name}</title>
  <style>
${shellBaseStyles(shell)}
  </style>
</head>
<body>
${shell.headerHtml}
<main class="site-main">
  <div class="site-banner-error" role="alert">Page generation fallback: ${escapeHtml(reason.slice(0, 200))}</div>
  <h1>${title}</h1>
  ${slice.headline ? `<p>${escapeHtml(slice.headline)}</p>` : ""}
  <ul>
${sections}
  </ul>
</main>
${shell.footerHtml}
</body>
</html>`;
}
