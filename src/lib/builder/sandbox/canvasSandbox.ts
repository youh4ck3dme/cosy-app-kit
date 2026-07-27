import type { SandboxRPCMessage } from "../semantic-intent/types";

export class CanvasSandboxManager {
  private iframe: HTMLIFrameElement | null = null;
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
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { margin: 0; padding: 0; background: transparent; font-family: sans-serif; overflow-x: hidden; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script>
            let currentRoot = null;

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
                  const renderFn = new Function('React', 'ReactDOM', 'module', 'exports', transformed);
                  renderFn(React, ReactDOM, module, exports);

                  const Component = module.exports.default || module.exports;
                  const rootEl = document.getElementById('root');

                  if (!currentRoot) {
                    currentRoot = ReactDOM.createRoot(rootEl);
                  }

                  currentRoot.render(React.createElement(Component));
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

    this.container.appendChild(this.iframe);
    if (this.iframe.contentWindow) {
      this.iframe.contentWindow.document.open();
      this.iframe.contentWindow.document.write(sandboxHTML);
      this.iframe.contentWindow.document.close();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("message", this.handleHostMessage);
    }
  }

  public render(code: string, css?: string, timeoutMs: number = 3000): void {
    if (!this.iframe) return;

    if (this.renderTimeoutTimer) clearTimeout(this.renderTimeoutTimer);

    // Execution Timeout Boundary against infinite loops
    this.renderTimeoutTimer = setTimeout(() => {
      this.onMessage?.({ type: "EXECUTION_TIMEOUT", timeoutMs });
    }, timeoutMs);

    if (this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({ type: "RENDER_CODE", code, css }, "*");
    }
  }

  public destroy(): void {
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
    if (data?.type === "RENDER_SUCCESS" || data?.type === "RUNTIME_ERROR") {
      if (this.renderTimeoutTimer) clearTimeout(this.renderTimeoutTimer);
    }
    if (data?.type) {
      this.onMessage?.(data);
    }
  };
}
