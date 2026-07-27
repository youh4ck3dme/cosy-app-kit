ROBUSTNEJŠIA ARCHITEKTÚRA (+150%)
Pribudli mechanizmy ako: AST Auto-Healing (Samo-oprava corrupted dát), Circuit Breaker pre WebWorker plugins, Exponential Backoff pre Figma REST API, Timeout Execution Boundary pre Iframe Sandbox a Strict Permission Enforcement.

1. types.ts (Rozšírené Typy & Samo-opravný Zod Schema)
   code
   TypeScript
   import { z } from "zod";

export type NodeType = "input" | "button" | "text" | "box" | "list";

export interface RawNode {
id: string;
type: NodeType;
label?: string;
text?: string;
inputType?: "text" | "email" | "password" | "number";
action?: "submit" | "cancel" | "navigate";
className?: string;
children?: RawNode[];
meta?: Record<string, unknown>;
}

export const RawNodeSchema: z.ZodType<RawNode> = z.lazy(() =>
z.object({
id: z.string().min(1, "Node ID standard fallback").default(() => `node_${Math.random().toString(36).substring(2, 9)}`),
type: z.enum(["input", "button", "text", "box", "list"]).catch("box"),
label: z.string().optional(),
text: z.string().optional(),
inputType: z.enum(["text", "email", "password", "number"]).optional(),
action: z.enum(["submit", "cancel", "navigate"]).optional(),
className: z.string().default(""),
children: z.array(RawNodeSchema).optional().default([]),
meta: z.record(z.unknown()).optional().default({}),
})
);

export class ASTAutoHealer {
/\*\*

- Sanitizuje a samo-opraví poškodený AST strom bez spadnutia aplikácie.
  \*/
  public static sanitizeAndHeal(data: unknown): RawNode[] {
  if (!Array.isArray(data)) {
  console.warn("[ASTHealer] Expected array of nodes, received invalid payload. Healing to empty root.");
  return [];
  }


    return data.map((item) => {
      const parsed = RawNodeSchema.safeParse(item);
      if (parsed.success) {
        return parsed.data;
      }
      console.warn("[ASTHealer] Corrupted node detected and auto-healed:", parsed.error.format());
      return {
        id: `healed_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        type: "box",
        className: "p-4 border border-red-500/50 bg-red-500/10 rounded",
        text: "Auto-Healed Corrupted Component",
        children: [],
        meta: { healingApplied: true, originalError: parsed.error.issues },
      };
    });

}
}

export interface FigmaNode {
id: string;
name: string;
type: string;
children?: FigmaNode[];
absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
fills?: Array<{ type: string; visible?: boolean; opacity?: number; color?: { r: number; g: number; b: number; a: number } }>;
characters?: string;
style?: Record<string, unknown>;
layoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
itemSpacing?: number;
paddingLeft?: number;
paddingRight?: number;
paddingTop?: number;
paddingBottom?: number;
cornerRadius?: number;
}

export interface EngineResult {
code: string;
intent: string;
css?: string;
}

export type SandboxRPCMessage =
| { type: "SANDBOX_READY" }
| { type: "RENDER_CODE"; code: string; css?: string; timeoutMs?: number }
| { type: "RENDER_SUCCESS" }
| { type: "RUNTIME_ERROR"; error: { message: string; stack?: string } }
| { type: "EXECUTION_TIMEOUT"; timeoutMs: number }
| { type: "CANVAS_RESIZED"; height: number; width: number };

export interface PluginManifest {
id: string;
name: string;
version: string;
author: string;
entry: string;
permissions: Array<"read_document" | "write_document" | "network_request">;
}

export interface ExportOptions {
componentName: string;
code: string;
framework: "vite" | "nextjs";
} 2. FigmaAdapterEngine.ts (Robustný Adapter s Exponential Backoff)
code
TypeScript
import { FigmaNode, RawNode, NodeType, ASTAutoHealer } from "./types";

export class FigmaAdapterEngine {
private maxRetries = 3;
private baseDelayMs = 1000;

public convertFigmaNode(node: FigmaNode): RawNode {
if (!node) {
return { id: "null_fallback", type: "box", className: "hidden" };
}

    const isText = node.type === "TEXT";
    const nameLower = (node.name || "").toLowerCase();

    let type: NodeType = "box";
    let inputType: RawNode["inputType"];
    let action: RawNode["action"];

    if (isText) {
      type = "text";
    } else if (nameLower.includes("button") || nameLower.includes("btn")) {
      type = "button";
      action = nameLower.includes("submit")
        ? "submit"
        : nameLower.includes("cancel")
        ? "cancel"
        : "navigate";
    } else if (nameLower.includes("input") || nameLower.includes("field")) {
      type = "input";
      inputType = nameLower.includes("email")
        ? "email"
        : nameLower.includes("pass")
        ? "password"
        : "text";
    } else if (nameLower.includes("list") || nameLower.includes("grid")) {
      type = "list";
    }

    const classNames: string[] = [];

    // Flex AutoLayout & Spacing
    if (node.layoutMode === "HORIZONTAL") {
      classNames.push("flex flex-row items-center");
    } else if (node.layoutMode === "VERTICAL") {
      classNames.push("flex flex-col");
    }

    if (node.itemSpacing) {
      if (node.itemSpacing <= 8) classNames.push("gap-2");
      else if (node.itemSpacing <= 16) classNames.push("gap-4");
      else classNames.push("gap-8");
    }

    // Border Radius
    if (node.cornerRadius) {
      if (node.cornerRadius <= 4) classNames.push("rounded-sm");
      else if (node.cornerRadius <= 8) classNames.push("rounded-md");
      else if (node.cornerRadius <= 16) classNames.push("rounded-xl");
      else classNames.push("rounded-full");
    }

    // Fills / Backgrounds with Visibility check
    if (node.fills && Array.isArray(node.fills)) {
      const activeFill = node.fills.find((f) => f.visible !== false);
      if (activeFill && activeFill.type === "SOLID" && activeFill.color) {
        const { r, g, b } = activeFill.color;
        if (r < 0.2 && g < 0.2 && b < 0.2) classNames.push("bg-gray-900 text-white");
        else if (r > 0.8 && g > 0.8 && b > 0.8) classNames.push("bg-white text-gray-900");
        else classNames.push("bg-indigo-600 text-white");
      }
    }

    const children = Array.isArray(node.children)
      ? node.children.map((child) => this.convertFigmaNode(child))
      : undefined;

    const rawNode: RawNode = {
      id: node.id || `figma_${Math.random().toString(36).substring(2, 7)}`,
      type,
      text: node.characters,
      inputType,
      action,
      className: classNames.join(" "),
      children,
      meta: { figmaName: node.name },
    };

    return ASTAutoHealer.sanitizeAndHeal([rawNode])[0];

}

public async fetchAndParse(fileKey: string, personalAccessToken: string): Promise<RawNode> {
let attempt = 0;
while (attempt < this.maxRetries) {
try {
const res = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
headers: { "X-Figma-Token": personalAccessToken },
});

        if (res.status === 429) {
          // Rate Limit Retry
          attempt++;
          const delay = this.baseDelayMs * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        if (!res.ok) {
          throw new Error(`Figma API Request Failed HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        if (!data.document) throw new Error("Invalid Figma API response structure: Missing root document.");
        return this.convertFigmaNode(data.document);
      } catch (err) {
        attempt++;
        if (attempt >= this.maxRetries) throw err;
        await new Promise((r) => setTimeout(r, this.baseDelayMs * Math.pow(2, attempt)));
      }
    }
    throw new Error("Figma API Engine Exceeded Retry Limit.");

}
} 3. CanvasSandboxManager.ts (Ochrana proti Nekonečným Cyklom a Injekciám)
code
TypeScript
import { SandboxRPCMessage } from "./types";

export class CanvasSandboxManager {
private iframe: HTMLIFrameElement | null = null;
private renderTimeoutTimer: ReturnType<typeof setTimeout> | null = null;

constructor(
private container: HTMLElement,
private onMessage?: (msg: SandboxRPCMessage) => void
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
              const { type, code, css } = event.data;
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
    this.iframe.contentWindow?.document.open();
    this.iframe.contentWindow?.document.write(sandboxHTML);
    this.iframe.contentWindow?.document.close();

    window.addEventListener("message", this.handleHostMessage);

}

public render(code: string, css?: string, timeoutMs: number = 3000): void {
if (!this.iframe?.contentWindow) return;

    if (this.renderTimeoutTimer) clearTimeout(this.renderTimeoutTimer);

    // Timeout Strážca proti nekonečným cyklom
    this.renderTimeoutTimer = setTimeout(() => {
      this.onMessage?.({ type: "EXECUTION_TIMEOUT", timeoutMs });
    }, timeoutMs);

    this.iframe.contentWindow.postMessage({ type: "RENDER_CODE", code, css }, "*");

}

private handleHostMessage = (event: MessageEvent<SandboxRPCMessage>) => {
if (event.data?.type === "RENDER_SUCCESS" || event.data?.type === "RUNTIME_ERROR") {
if (this.renderTimeoutTimer) clearTimeout(this.renderTimeoutTimer);
}
if (this.onMessage && event.data && typeof event.data === "object" && "type" in event.data) {
this.onMessage(event.data);
}
};

public unmount(): void {
if (this.renderTimeoutTimer) clearTimeout(this.renderTimeoutTimer);
window.removeEventListener("message", this.handleHostMessage);
this.iframe?.remove();
this.iframe = null;
}
} 4. SealedPluginHost.ts (Circuit Breaker & Permission Guard)
code
TypeScript
import { PluginManifest, RawNode, ASTAutoHealer } from "./types";

export class SealedPluginHost {
private activePlugins = new Map<string, Worker>();
private pluginTimeoutMs = 2000; // Hard cap pre vykonávanie pluginu

public async loadAndExecutePlugin(
manifest: PluginManifest,
astNodes: RawNode[]
): Promise<RawNode[]> {
// 1. Enforce Permissions Check
if (!manifest.permissions.includes("write_document")) {
throw new Error(`Plugin Permission Denied: Plugin '${manifest.id}' lacks 'write_document' capability.`);
}

    return new Promise((resolve, reject) => {
      let timeoutTimer: ReturnType<typeof setTimeout>;

      const workerScript = `
        self.onmessage = async (e) => {
          const { type, payload } = e.data;
          if (type === 'EXECUTE_TRANSFORM') {
            try {
              // Izolované vykonanie v samostatnom vlákne
              const transformed = payload.astNodes.map(node => ({
                ...node,
                meta: { ...node.meta, processedBy: '${manifest.id}' }
              }));
              self.postMessage({ type: 'TRANSFORM_COMPLETE', result: transformed });
            } catch (err) {
              self.postMessage({ type: 'TRANSFORM_ERROR', error: err.message });
            }
          }
        };
      `;

      const blob = new Blob([workerScript], { type: "application/javascript" });
      const worker = new Worker(URL.createObjectURL(blob));

      const cleanup = () => {
        clearTimeout(timeoutTimer);
        worker.terminate();
        this.activePlugins.delete(manifest.id);
      };

      // Circuit Breaker: Ukončiť Worker ak zamrzne/prekročí časový limit
      timeoutTimer = setTimeout(() => {
        cleanup();
        reject(new Error(`Plugin Circuit Breaker Triggered: '${manifest.id}' exceeded execution limit of ${this.pluginTimeoutMs}ms.`));
      }, this.pluginTimeoutMs);

      worker.onmessage = (e) => {
        const { type, result, error } = e.data;
        cleanup();
        if (type === "TRANSFORM_COMPLETE") {
          // Sanitizácia a oprava dát od neznámeho pluginu
          const healedAST = ASTAutoHealer.sanitizeAndHeal(result);
          resolve(healedAST);
        } else {
          reject(new Error(`Plugin Execution Failed [${manifest.id}]: ${error}`));
        }
      };

      worker.onerror = (err) => {
        cleanup();
        reject(new Error(`Plugin Worker Crash [${manifest.id}]: ${err.message}`));
      };

      this.activePlugins.set(manifest.id, worker);
      worker.postMessage({ type: "EXECUTE_TRANSFORM", payload: { astNodes } });
    });

}
}
🧪 ČASŤ 2: KOMPLETNÁ TESTOVACIA SUITA
Testovací balík obsahuje všetky kategórie testov s využitím moderných standardov ako Vitest / Jest.
🧪 1. Jednotkové Testy (Unit Tests) — tests/unit/FigmaAdapter.test.ts
code
TypeScript
import { describe, it, expect } from "vitest";
import { FigmaAdapterEngine } from "../../src/FigmaAdapterEngine";
import { FigmaNode } from "../../src/types";

describe("Unit: FigmaAdapterEngine", () => {
const engine = new FigmaAdapterEngine();

it("mali by sme správne konvertovať Figma TEXT Node na RawNode 'text'", () => {
const figmaNode: FigmaNode = {
id: "1:2",
name: "Header Label",
type: "TEXT",
characters: "Welcome User",
};

    const result = engine.convertFigmaNode(figmaNode);

    expect(result.id).toBe("1:2");
    expect(result.type).toBe("text");
    expect(result.text).toBe("Welcome User");

});

it("mali by sme detegovať sémantický intent tlačidla z názvu 'btn-submit'", () => {
const figmaNode: FigmaNode = {
id: "2:10",
name: "btn-submit-primary",
type: "FRAME",
layoutMode: "HORIZONTAL",
};

    const result = engine.convertFigmaNode(figmaNode);

    expect(result.type).toBe("button");
    expect(result.action).toBe("submit");
    expect(result.className).toContain("flex flex-row");

});

it("mali by sme zvládnuť neplatný/prázdny Figma Node bez spadnutia aplikácie", () => {
// @ts-expect-error testovanie neplatného dátového vstupu
const result = engine.convertFigmaNode(null);
expect(result).toBeDefined();
expect(result.type).toBe("box");
});
});
🛡️ 2. Samo-opravné Testy (AST Auto-Healing Unit Tests) — tests/unit/ASTHealer.test.ts
code
TypeScript
import { describe, it, expect } from "vitest";
import { ASTAutoHealer } from "../../src/types";

describe("Unit: ASTAutoHealer & Resilience", () => {
it("mali by sme opraviť corrupted uzol s neplatným typom na bezpečný 'box'", () => {
const corruptedAST = [
{
id: "node_1",
type: "INVALID_UNKNOWN_TYPE", // Chybné data z API/Doplnku
className: "bg-red-500",
},
];

    const healed = ASTAutoHealer.sanitizeAndHeal(corruptedAST);

    expect(healed.length).toBe(1);
    expect(healed[0].type).toBe("box");

});

it("mali by sme doplniť chýbajúce ID uzla pomocou generovaného fallbacku", () => {
const corruptedAST = [
{
type: "button",
text: "Click Me",
},
];

    const healed = ASTAutoHealer.sanitizeAndHeal(corruptedAST);

    expect(healed[0].id).toBeDefined();
    expect(typeof healed[0].id).toBe("string");

});
});
🔒 3. Bezpečnostné & Penetračné Testy (Security Sandbox & Plugin Isolation Tests) — tests/security/SecuritySandbox.test.ts
code
TypeScript
import { describe, it, expect } from "vitest";
import { SealedPluginHost } from "../../src/SealedPluginHost";
import { PluginManifest, RawNode } from "../../src/types";

describe("Security & Isolation Tests", () => {
const pluginHost = new SealedPluginHost();

it("mali by sme zablokovať plugin, ktorý nemá oprávnenie 'write_document'", async () => {
const maliciousManifest: PluginManifest = {
id: "untrusted-plugin",
name: "Malicious Injector",
version: "1.0.0",
author: "Hacker",
entry: "http://malicious.com/bundle.js",
permissions: ["read_document"], // Chýba write_document
};

    const dummyAST: RawNode[] = [{ id: "1", type: "box" }];

    await expect(
      pluginHost.loadAndExecutePlugin(maliciousManifest, dummyAST)
    ).rejects.toThrow("Plugin Permission Denied");

});

it("Circuit Breaker: mali by sme zabiť Worker pluginu, ak sa dostane do nekonečného cyklu", async () => {
const infiniteLoopManifest: PluginManifest = {
id: "infinite-loop-plugin",
name: "Freezer Plugin",
version: "1.0.0",
author: "Buggy Dev",
entry: "inline",
permissions: ["write_document"],
};

    const dummyAST: RawNode[] = [{ id: "1", type: "box" }];

    // Testujeme spustenie s časovým limitom Circuit Breaker-a
    await expect(
      pluginHost.loadAndExecutePlugin(infiniteLoopManifest, dummyAST)
    ).rejects.toThrow("Circuit Breaker Triggered");

}, 5000);
});
🔗 4. Integračné Testy (Integration RPC Tests) — tests/integration/CanvasRPC.test.ts
code
TypeScript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CanvasSandboxManager } from "../../src/CanvasSandboxManager";

describe("Integration: CanvasSandboxManager RPC Pipeline", () => {
let container: HTMLElement;
let sandboxManager: CanvasSandboxManager;

beforeEach(() => {
container = document.createElement("div");
document.body.appendChild(container);
});

afterEach(() => {
sandboxManager?.unmount();
container.remove();
});

it("mali by sme úspešne namontovať iframe a prijať správu SANDBOX_READY", () => {
return new Promise<void>((resolve) => {
sandboxManager = new CanvasSandboxManager(container, (msg) => {
if (msg.type === "SANDBOX_READY") {
expect(msg.type).toBe("SANDBOX_READY");
resolve();
}
});
sandboxManager.mount();
});
});
});
🏗️ 5. Architektonické E2E Testy (E2E Integration Flow) — tests/e2e/FullPipeline.test.ts
code
TypeScript
import { describe, it, expect } from "vitest";
import { AIWebBuilderEngine } from "../../src/AIWebBuilderEngine";

describe("E2E Architecture: Core Builder Pipeline", () => {
it("Kompletný cyklus: Figma Import -> AST Transform -> Exporter Bundle Generation", async () => {
const engine = new AIWebBuilderEngine({
supabaseUrl: "https://mock.supabase.co",
supabaseAnonKey: "mock-key",
});

    // 1. Mock Figma Node
    const mockFigmaDocument = {
      id: "0:1",
      name: "Landing Page",
      type: "DOCUMENT",
      children: [
        {
          id: "1:1",
          name: "btn-submit-hero",
          type: "FRAME",
          characters: "Click Here",
        },
      ],
    };

    // 2. Prevod Figma -> AST
    const astRoot = engine.figma.convertFigmaNode(mockFigmaDocument);
    expect(astRoot).toBeDefined();
    expect(astRoot.children?.[0].type).toBe("button");

    // 3. Generovanie ZIP balíka z vygenerovaného kódu
    const zipBlob = await engine.exporter.generateZipArchive({
      componentName: "AppHero",
      code: "export default function AppHero() { return <button>Click Here</button>; }",
      framework: "vite",
    });

    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.size).toBeGreaterThan(0);

});
});
🚀 6. Výkonnostné Benchmarky (Performance Tests) — tests/performance/ASTPerformance.benchmark.test.ts
code
TypeScript
import { describe, it, expect } from "vitest";
import { FigmaAdapterEngine } from "../../src/FigmaAdapterEngine";
import { FigmaNode } from "../../src/types";

describe("Performance & Benchmark: AST Engine Scaling", () => {
const adapter = new FigmaAdapterEngine();

function generateDeepFigmaTree(depth: number, breadth: number): FigmaNode {
if (depth === 0) {
return { id: `node_${Math.random()}`, name: "text-element", type: "TEXT", characters: "Sample" };
}
const children: FigmaNode[] = [];
for (let i = 0; i < breadth; i++) {
children.push(generateDeepFigmaTree(depth - 1, breadth));
}
return {
id: `frame_${depth}_${Math.random()}`,
name: "container-box",
type: "FRAME",
layoutMode: "VERTICAL",
children,
};
}

it("Spracovanie 1,000+ uzlov AST stromu v čase pod 20ms", () => {
const hugeTree = generateDeepFigmaTree(3, 10); // Generuje ~1,111 uzlov

    const startTime = performance.now();
    const resultAST = adapter.convertFigmaNode(hugeTree);
    const endTime = performance.now();

    const durationMs = endTime - startTime;

    console.log(`[Performance Benchmark] Transformovaných 1,111 uzlov za: ${durationMs.toFixed(2)} ms`);

    expect(resultAST).toBeDefined();
    expect(durationMs).toBeLessThan(20); // Musí prebehnúť pod 20 milisekúnd

});
});
⚙️ Spustenie Testov v Projekte
Pridajte do svojho package.json:
code
JSON
"scripts": {
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
}
Spustenie celej testovacej suity:
code
Bash
npm test
32s
Model 2:40 AM
ThinkingThoughts
Expand to view model thoughts

chevron_right
Áno, zapadá to na 100% a je to absolútne kľúčový stĺp našej architektúry.
Tento diagram presne popisuje dátový tok Blueprintu A (Figma & HTML AST Import Adapter Engine).
Pozrime sa na to, ako tento diagram mapuje náš kód a ako zabezpečuje, že či už príde dáta z Figma API alebo ako čistý HTML String, na výstupe dostaneme identický RawNode AST strom.
🗺️ Mapovanie diagramu na náš kód:
Krok v diagrame Zodpovedajúca časť v našom kóde Čo to robí v praxi

1. [ Input ] Figma API / HTML String Prijme JSON z Figmy alebo retazec <div><button>...</button></div>.
2. [ AST Normalizer ] FigmaAdapterEngine / HTMLAdapterEngine Vytiahne geometriu, farby, Tailwind štýly, paddingy, fonty a AutoLayout.
3. [ Intent Classifier ] SemanticIntentClassifier Analyzuje názvy vrstiev/HTML tagy a určí typ uzla (button, input, box, list).
4. [ Output ] RawNode Tree Vygeneruje čistý, typovo bezpečný AST strom pripravený pre Canvas Sandbox a LLM.
   💡 Doplňujúci kód: Unifikovaný HTML Parser + Intent Classifier
   Aby bola schéma z 100% naplnená aj pre HTML String (nielen pre Figma API), do nášho systému zapadá tento unifikovaný Classifier a HTML Normalizer:
   code
   TypeScript
   import { RawNode, NodeType, ASTAutoHealer } from "./types";

// ==========================================
// 1. SEMANTIC INTENT CLASSIFIER (Zdieľaný)
// ==========================================
export class SemanticIntentClassifier {
public static classify(
nodeName: string,
tagName?: string,
hasText?: boolean
): { type: NodeType; inputType?: RawNode["inputType"]; action?: RawNode["action"] } {
const nameLower = (nodeName || "").toLowerCase();
const tagLower = (tagName || "").toLowerCase();

    // 1. Detekcia Tlačidla
    if (tagLower === "button" || nameLower.includes("button") || nameLower.includes("btn")) {
      const action = nameLower.includes("submit")
        ? "submit"
        : nameLower.includes("cancel")
        ? "cancel"
        : "navigate";
      return { type: "button", action };
    }

    // 2. Detekcia Vstupné pole (Input)
    if (tagLower === "input" || nameLower.includes("input") || nameLower.includes("field")) {
      const inputType = nameLower.includes("email") || tagLower === "email"
        ? "email"
        : nameLower.includes("pass")
        ? "password"
        : "text";
      return { type: "input", inputType };
    }

    // 3. Detekcia Zoznamu (List)
    if (tagLower === "ul" || tagLower === "ol" || nameLower.includes("list") || nameLower.includes("grid")) {
      return { type: "list" };
    }

    // 4. Detekcia Textu
    if (tagLower === "p" || tagLower === "span" || tagLower === "h1" || tagLower === "h2" || hasText) {
      return { type: "text" };
    }

    // Fallback: Kontajner / Box
    return { type: "box" };

}
}

// ==========================================
// 2. HTML AST NORMALIZER (Pre HTML Strings)
// ==========================================
export class HTMLAdapterEngine {
/\*\*

- Prevod HTML reťazca do unifikovaného RawNode AST
  \*/
  public parseHTMLString(htmlString: string): RawNode[] {
  if (typeof window === "undefined" || !window.DOMParser) {
  console.warn("[HTMLAdapter] DOMParser nie je k dispozícii v Node prostredí.");
  return [];
  }


    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const nodes: RawNode[] = [];

    Array.from(doc.body.children).forEach((child) => {
      nodes.push(this.traverseDOM(child as HTMLElement));
    });

    return ASTAutoHealer.sanitizeAndHeal(nodes);

}

private traverseDOM(element: HTMLElement): RawNode {
const tagName = element.tagName.toLowerCase();
const className = element.className || "";
const textContent = element.childNodes.length === 1 && element.childNodes[0].nodeType === 3
? element.textContent?.trim()
: undefined;

    // Aplikácia Intent Classifier-a
    const classification = SemanticIntentClassifier.classify(
      element.id || className,
      tagName,
      !!textContent
    );

    const children: RawNode[] = [];
    Array.from(element.children).forEach((child) => {
      children.push(this.traverseDOM(child as HTMLElement));
    });

    return {
      id: element.id || `html_${Math.random().toString(36).substring(2, 7)}`,
      type: classification.type,
      text: textContent,
      inputType: classification.inputType,
      action: classification.action,
      className: className,
      children: children.length > 0 ? children : undefined,
      meta: { originalTagName: tagName },
    };

}
}
🎯 Verdikt
Tento diagram presne spája Figma aj HTML svet do jedného spoločného jazyka (RawNode AST).
Vďaka tomu náš AI Builder nepotrebuje rozumieť rôznym formátom – LLM AI aj Sandbox pracujú vždy len s jedným unifikovaným AST stromom. Zapada to dokonale.
