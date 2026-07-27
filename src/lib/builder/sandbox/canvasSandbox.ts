import type { SandboxRPCMessage } from "../semantic-intent/types";

export class CanvasSandboxManager {
  private iframe: HTMLIFrameElement | null = null;
  private renderDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private renderTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private container: HTMLElement,
    private onMessage?: (msg: SandboxRPCMessage) => void,
  ) {}

  public mount(): void {
    this.iframe = document.createElement("iframe");
    this.iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
    this.iframe.style.width = "100%";
    this.iframe.style.height = "100%";
    this.iframe.style.border = "none";

    const sandboxHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script src="https://unpkg.com/lucide-react@0.460.0/dist/umd/lucide-react.min.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { margin: 0; padding: 0; background: transparent; font-family: sans-serif; overflow-x: hidden; }
            [data-node-id] { cursor: pointer; transition: outline 0.12s ease, box-shadow 0.12s ease; }
            [data-node-id].sandbox-hover {
              outline: 2px solid rgba(99, 102, 241, 0.55);
              outline-offset: 2px;
              box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
            }
            [data-node-id].sandbox-selected {
              outline: 2px solid rgba(16, 185, 129, 0.85);
              outline-offset: 2px;
              box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
            }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script>
            // Module Resolver Bridge for CommonJS/ESM imports in Babel-transpiled code
            window.process = { env: { NODE_ENV: 'production' } };

            var moduleRegistry = {
              'react': typeof React !== 'undefined' ? React : {},
              'react-dom': typeof ReactDOM !== 'undefined' ? ReactDOM : {},
              'react/jsx-runtime': typeof React !== 'undefined' ? {
                jsx: React.createElement,
                jsxs: React.createElement,
                Fragment: React.Fragment
              } : {},
              'lucide-react': window['lucide-react'] || window.LucideReact || {}
            };

            window.customRequire = function(moduleName) {
              if (moduleRegistry[moduleName]) {
                return moduleRegistry[moduleName];
              }
              console.warn('[SandboxResolver] Module not explicitly mapped, returning empty proxy:', moduleName);
              return new Proxy({}, { get: function() { return function() { return null; }; } });
            };

            var currentRoot = null;
            var selectedEl = null;
            var selectionBound = false;

            function findNodeEl(target) {
              if (!target || !target.closest) return null;
              return target.closest('[data-node-id]');
            }

            function clearHover() {
              document.querySelectorAll('.sandbox-hover').forEach(function(el) {
                el.classList.remove('sandbox-hover');
              });
            }

            function bindSelection() {
              if (selectionBound) return;
              selectionBound = true;
              document.addEventListener('mousemove', function(e) {
                clearHover();
                var el = findNodeEl(e.target);
                if (el && el !== selectedEl) el.classList.add('sandbox-hover');
              }, true);
              document.addEventListener('mouseleave', clearHover, true);
              document.addEventListener('click', function(e) {
                var el = findNodeEl(e.target);
                if (!el) return;
                e.preventDefault();
                e.stopPropagation();
                if (selectedEl) selectedEl.classList.remove('sandbox-selected');
                selectedEl = el;
                selectedEl.classList.add('sandbox-selected');
                clearHover();
                var nodeId = el.getAttribute('data-node-id');
                if (nodeId) {
                  window.parent.postMessage({ type: 'NODE_SELECTED', nodeId: nodeId }, '*');
                }
              }, true);
            }

            window.addEventListener('message', async (event) => {
              const { type, code, css } = event.data || {};
              if (type === 'RENDER_CODE') {
                try {
                  if (css) {
                    let styleTag = document.getElementById('custom-css');
                    if (!styleTag) {
                      styleTag = document.createElement('style');
                      styleTag.id = 'custom-css';
                      document.head.appendChild(styleTag);
                    }
                    styleTag.innerHTML = css;
                  }

                  const transformed = Babel.transform(code, {
                    presets: ['react', 'env'],
                    filename: 'component.tsx'
                  }).code;

                  const exports = {};
                  const module = { exports };
                  const renderFn = new Function(
                    'React',
                    'ReactDOM',
                    'require',
                    'module',
                    'exports',
                    transformed
                  );
                  renderFn(React, ReactDOM, window.customRequire, module, exports);

                  const Component = module.exports.default || module.exports;
                  const rootEl = document.getElementById('root');

                  if (!currentRoot) {
                    currentRoot = ReactDOM.createRoot(rootEl);
                  }

                  selectedEl = null;
                  currentRoot.render(React.createElement(Component));
                  bindSelection();
                  window.parent.postMessage({ type: 'RENDER_SUCCESS' }, '*');
                } catch (err) {
                  window.parent.postMessage({
                    type: 'RUNTIME_ERROR',
                    error: { message: err.message, stack: err.stack }
                  }, '*');
                }
              }
            });
            window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
          </script>
        </body>
      </html>
    `;

    // srcdoc is more reliable than document.write across jsdom/happy-dom
    this.iframe.srcdoc = sandboxHTML;
    this.container.appendChild(this.iframe);

    if (typeof window !== "undefined") {
      window.addEventListener("message", this.handleHostMessage);
    }
  }

  /**
   * Debounced render (100ms) to prevent Babel lockup on high-frequency AST edits.
   */
  public render(code: string, css?: string, timeoutMs: number = 3000): void {
    if (!this.iframe) return;

    if (this.renderDebounceTimer) {
      clearTimeout(this.renderDebounceTimer);
    }

    this.renderDebounceTimer = setTimeout(() => {
      if (this.renderTimeoutTimer) clearTimeout(this.renderTimeoutTimer);

      // Execution Timeout Boundary against infinite loops
      this.renderTimeoutTimer = setTimeout(() => {
        this.onMessage?.({ type: "EXECUTION_TIMEOUT", timeoutMs });
      }, timeoutMs);

      const win = this.iframe?.contentWindow;
      if (win) {
        win.postMessage({ type: "RENDER_CODE", code, css }, "*");
      }
    }, 100);
  }

  public destroy(): void {
    this.unmount();
  }

  /** Alias used by hardening tests / callers expecting unmount(). */
  public unmount(): void {
    if (this.renderDebounceTimer) clearTimeout(this.renderDebounceTimer);
    if (this.renderTimeoutTimer) clearTimeout(this.renderTimeoutTimer);
    if (typeof window !== "undefined") {
      window.removeEventListener("message", this.handleHostMessage);
    }
    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
  }

  private handleHostMessage = (event: MessageEvent<SandboxRPCMessage>) => {
    const data = event.data;
    if (!data || typeof data !== "object" || !("type" in data)) return;

    if (data.type === "RENDER_SUCCESS" || data.type === "RUNTIME_ERROR") {
      if (this.renderTimeoutTimer) clearTimeout(this.renderTimeoutTimer);
    }
    this.onMessage?.(data);
  };
}
