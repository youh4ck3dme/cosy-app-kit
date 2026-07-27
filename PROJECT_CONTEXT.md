# 🏛️ PROJECT_CONTEXT.md — Next-Gen AI Web Builder Architecture

> **Master AI Knowledge Base & Technical Blueprint**  
> _Authoritative architectural specification for developers, autonomous AI agents, and LLM integrations._

---

## 1. Executive Summary & Vision

### 1.1 Project Overview

**Next-Gen AI Web Builder** (`cosy-app-kit`) is an enterprise-grade visual web construction engine designed for rapid, low-latency layout generation, real-time code transpilation, and collaborative UI editing. It solves the critical bottleneck of traditional web build systems: slow AI generation loops, fixed non-responsive Figma imports, high LLM token consumption on minor updates, and fragile iframe previews.

### 1.2 Core Product Capabilities

- **Figma & Vision -> AST Pipeline**: Ingests Figma REST API JSON payloads and visual layout screenshots (via Mistral Pixtral Vision `pixtral-12b-2409`), converting them into a clean, normalized Intermediate Representation (`RawNode` AST).
- **Semantic Intent Engine**: Classifies component hierarchy into deterministic intents (`FormIntent`, `NavigationIntent`, `StaticIntent`), automatically injecting interactive state management (`useState`), event handlers (`onChange`, `onSubmit`), and clean Tailwind CSS code.
- **Isolated Live Canvas Sandbox**: Uses an out-of-main-thread `iframe` sandbox with `postMessage` RPC protocol, running Babel Standalone in-memory transpilation with a strict 3000ms Execution Timeout Guard against infinite loop freezes.
- **Multi-Framework Project Export**: Packages generated React smart components into production-ready downloadable `.zip` project archives targeting **Vite + React + Tailwind + TypeScript** and **Next.js App Router** structures.
- **Sealed Plugin Host**: Runs 3rd party developer plugins in isolated Web Workers with explicit permission enforcement (`read_document`, `write_document`, `network_request`) and worker circuit-breaking.
- **Multiplayer Real-time CRDT**: Enables multi-user concurrent visual canvas editing utilizing Yjs CRDT structures over WebSockets.
- **Spatial AI Context Inspector & Mobile Auto-Fixer**: Reduces LLM prompt token consumption by 80% through scoped sub-tree extraction (`extractScopedContext`) and automatically converts non-responsive fixed Figma pixel widths (`w-[1200px]`) into responsive Tailwind primitives (`w-full max-w-6xl flex-wrap`).

---

## 2. Tech Stack & Dependencies

| Layer                         | Technologies & Libraries                                 | Architectural Role                                                                               |
| :---------------------------- | :------------------------------------------------------- | :----------------------------------------------------------------------------------------------- |
| **Core Framework**            | React 18.3+, TypeScript (Strict Mode), TanStack Start    | Modern UI component lifecycle, type-safe server functions (`createServerFn`).                    |
| **Styling & Design System**   | Tailwind CSS v3.4+, Vanilla CSS Variables                | Curated dark mode design system, AMOLED 412x915 mobile viewport styling, glassmorphism.          |
| **AI Integration**            | Mistral API (`@ai-sdk/mistral`, `pixtral-12b-2409`)      | **Exclusive AI Provider** for visual AST extraction, code generation, and intent classification. |
| **Dynamic Sandbox**           | `@babel/standalone` v7+, HTML5 `iframe`, PostMessage RPC | Safe in-browser React transpilation without main thread blocking.                                |
| **Data Export**               | `JSZip` v3.10+                                           | Client-side archive compression into downloadable `.zip` project structures.                     |
| **Persistence & Database**    | Supabase (PostgreSQL, Row Level Security, Version Graph) | Immutable AST snapshot history, version rollback, and document persistence.                      |
| **Multiplayer CRDT**          | `Yjs`, `y-websocket`                                     | Conflict-free replicated data types for real-time multiplayer AST editing.                       |
| **Validation & Self-Healing** | `Zod` v3.24+                                             | Strict schema validation with automatic corrupted payload recovery (`ASTAutoHealer`).            |
| **Test Runner & Tooling**     | `Vitest` v4.1+, `happy-dom` v20+                         | Fast unit testing, DOM component simulation, and 100% green CI gate enforcement.                 |

---

## 3. Core AST Data Schema (`src/lib/builder/semantic-intent/types.ts`)

### 3.1 Domain Type Definitions

```typescript
import { z } from "zod";

export type NodeType = "input" | "button" | "text" | "box" | "list";
export type InputType = "text" | "email" | "password" | "number";
export type ActionType = "submit" | "cancel" | "navigate";
export type IntentType = "FormIntent" | "NavigationIntent" | "StaticIntent";

export interface RawNode {
  id: string;
  type: NodeType;
  label?: string;
  text?: string;
  inputType?: InputType;
  name?: string;
  action?: ActionType;
  children?: RawNode[];
  className?: string;
  meta?: Record<string, string | number | boolean | null>;
}

export interface SmartNode extends RawNode {
  stateKey?: string;
  isInteractive?: boolean;
  eventHandlers?: {
    onChange?: boolean;
    onClick?: boolean;
    onSubmit?: boolean;
  };
}

export interface EngineResult {
  componentName: string;
  code: string;
  intent: IntentType;
  css?: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  fills?: Array<{
    type: string;
    visible?: boolean;
    opacity?: number;
    color?: { r: number; g: number; b: number; a: number };
  }>;
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
}
```

### 3.2 Zod Schema & Self-Healing Engine (`ASTAutoHealer`)

```typescript
export const RawNodeSchema: z.ZodType<RawNode> = z.lazy(
  () =>
    z.object({
      id: z.string(),
      type: z.enum(["input", "button", "text", "box", "list"]),
      label: z.string().optional(),
      text: z.string().optional(),
      inputType: z.enum(["text", "email", "password", "number"]).optional(),
      name: z.string().optional(),
      action: z.enum(["submit", "cancel", "navigate"]).optional(),
      className: z.string().optional(),
      children: z.array(RawNodeSchema).optional(),
      meta: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional(),
    }) as z.ZodType<RawNode>,
);

export class ASTAutoHealer {
  /**
   * Sanitizes and auto-heals corrupted AST data without crashing the application.
   */
  public static sanitizeAndHeal(data: unknown): RawNode[] {
    if (!Array.isArray(data)) {
      console.warn(
        "[ASTHealer] Expected array of nodes, received invalid payload. Healing to empty root.",
      );
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
        meta: { healingApplied: true, originalError: JSON.stringify(parsed.error.issues) },
      };
    });
  }
}
```

---

## 4. Core Subsystem Architectures & Engines

### Blueprint A: Figma & HTML AST Import Adapter Engine (`FigmaAdapterEngine`)

- **Location**: `src/lib/builder/semantic-intent/FigmaAdapterEngine.ts`
- **Responsibility**: Ingests Figma REST API JSON representations and raw HTML strings, mapping layout properties into `RawNode` AST objects.
- **Conversion Pipeline**:
  - AutoLayout `layoutMode === "HORIZONTAL"` -> `flex flex-row`.
  - AutoLayout `layoutMode === "VERTICAL"` -> `flex flex-col`.
  - `itemSpacing` -> `gap-{pixels}`.
  - `paddingLeft/Right/Top/Bottom` -> `px-{n} py-{n}`.
  - `cornerRadius` -> `rounded-{size}`.
- **Semantic Intent Classifier**: Inspects node naming conventions (`nameLower.includes("btn")`, `nameLower.includes("field")`) and tags intent nodes for downstream state binding.
- **HTTP Rate-Limit Handling**: Implements an **Exponential Backoff Loop** targeting Figma HTTP `429` status codes (`this.baseDelayMs * Math.pow(2, attempt)`).

### Blueprint C: Isolated Live Canvas Sandbox (`CanvasSandboxManager`)

- **Location**: `src/lib/builder/sandbox/canvasSandbox.ts` & `src/components/builder/LiveCanvasPreview.tsx`
- **Responsibility**: Creates a secure, isolated `iframe` sandbox using `sandbox="allow-scripts allow-same-origin"`.
- **RPC Protocol**:
  1. `SANDBOX_READY`: Emitted by child `iframe` upon initial script load.
  2. `RENDER_CODE`: Parent sends code and optional CSS payload.
  3. `RENDER_SUCCESS`: Child confirms successful Babel compilation and DOM mount.
  4. `RUNTIME_ERROR`: Child captures unhandled React render errors and transmits message + stacktrace.
  5. `EXECUTION_TIMEOUT`: Parent triggers error state if child fails to report back within 3000ms.

### Blueprint D: Supabase Persistence & Immutable Version Graph (`DocumentPersistenceService`)

- **Location**: `src/lib/builder/persistence/documentPersistence.ts`
- **Database Schema**:
  - `builder_documents`: Stores document ID, title, owner ID, current version ID, timestamps.
  - `builder_document_versions`: Immutable table storing document ID, version number, raw AST JSON (`jsonb`), generated code, detected intent, and commit message.
- **RLS Policies**: Restricts document mutation strictly to authenticated user IDs (`auth.uid() = owner_id`).

### Blueprint E: Multi-Framework Project Exporter (`ZipExporterEngine`)

- **Location**: `src/lib/builder/export/zipExporter.ts`
- **Responsibility**: Client-side bundling of visual builder code into standalone, runnable software projects via `JSZip`.
- **Generated Package Layout (Vite Target)**:
  - `package.json`: Configured with React 18, Tailwind CSS, Lucide icons, and TypeScript.
  - `vite.config.ts`: React Vite plugin configuration.
  - `index.html`: Dark-themed root html shell.
  - `src/main.tsx`: React DOM root mounting entry point.
  - `src/index.css`: Tailwind directive imports (`@tailwind base; @tailwind components; @tailwind utilities;`).
  - `src/{ComponentName}.tsx`: Clean React smart component generated by the Semantic Intent Engine.

### Blueprint M: Sealed Plugin Host Engine (`SealedPluginHost`)

- **Location**: `src/lib/builder/plugins/sealedPluginHost.ts`
- **Responsibility**: Safely executes 3rd-party developer plugins inside an isolated `WebWorker`.
- **Permission Enforcement**: Guards API access based on declared `PluginManifest.permissions`. Unauthorised calls to mutate documents without `write_document` permission throw security access exceptions.
- **Circuit Breaker**: Terminates frozen worker processes exceeding 2000ms execution time.

### Blueprint R: Real-Time CRDT Multiplayer Engine (`CRDTMultiplayerEngine`)

- **Location**: `src/lib/builder/multiplayer/crdtEngine.ts`
- **Responsibility**: Manages shared AST state over WebSockets using `Y.Doc` and `y-websocket`. Operates conflict-free resolution when multiple developers manipulate the canvas concurrently.

### Bonus / Super Feature: Spatial AI Context Inspector & Mobile Auto-Fixer (`AISpatialContextEngine`)

- **Location**: `src/lib/builder/semantic-intent/AISpatialContextEngine.ts`
- **Functions**:
  1. `extractScopedContext(targetNodeId, fullAST)`: Resolves node path and returns isolated Sub-AST JSON context, reducing LLM prompt payload sizes by up to 80%.
  2. `autoFixMobileResponsive(nodes)`: Automatically detects fixed Figma pixel classes (`w-[1440px]`) and rewrites them into fluid, responsive Tailwind primitives (`w-full max-w-6xl flex-wrap`).
  3. `applyASTDelta(fullAST, updatedNode)`: Surgically splices modified nodes back into the master AST tree without breaking sibling hierarchy.

---

## 5. Master Orchestrator (`AIWebBuilderEngine`)

The `AIWebBuilderEngine` class acts as the centralized coordinator connecting all sub-systems together into a single unified pipeline:

```
┌────────────────────────┐
│  Figma API / Vision    │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐     ┌────────────────────────────────────────┐
│ FigmaAdapterEngine /   ├────►│ AISpatialContextEngine                 │
│ Mistral Vision Model   │     │ (autoFixMobileResponsive)              │
└────────────────────────┘     └───────────────────┬────────────────────┘
                                                   │
                                                   ▼
┌────────────────────────┐     ┌────────────────────────────────────────┐
│  ASTAutoHealer         ├────►│ SemanticIntentEngine                   │
│  (Sanitizes RawNode[]) │     │ (Detector -> Injector -> CodeEmitter)  │
└────────────────────────┘     └───────────────────┬────────────────────┘
                                                   │
                                                   ▼
┌────────────────────────┐     ┌────────────────────────────────────────┐
│ LiveCanvasPreview      │◄────┤ DocumentPersistenceService &           │
│ (CanvasSandboxManager) │     │ CRDTMultiplayerEngine                  │
└───────────┬────────────┘     └───────────────────┬────────────────────┘
            │                                      │
            └──────────────────┬───────────────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │  ZipExporterEngine    │
                   │  (.zip Download UI)   │
                   └───────────────────────┘
```

---

## 6. Testing Strategy & Security Matrix

### 6.1 Test Execution Suite (`bun run test:unit`)

The project maintains **100% green test passing criteria (63 test files, 373 unit tests)** executed via Vitest and `happy-dom`:

- **AST Auto-Healing Tests** (`types.test.ts`): Verifies corrupted JSON input payload handling and fallback generation.
- **Intent Detection & Emission Tests** (`detector.test.ts`, `emitter.test.ts`, `smoke.test.ts`): Verifies state generation logic and layout intent classification in under **4ms**.
- **Sandbox RPC Tests** (`canvasSandbox.test.ts`): Tests iframe mounting, RPC handshake, and timeout execution boundaries.
- **Project Export Tests** (`zipExporter.test.ts`): Asserts valid JSZip Blob generation and archive contents.

### 6.2 Security & Isolation Matrix

| Threat Vector                           | Defense Mechanism                                                                                     | Enforcement Point              |
| :-------------------------------------- | :---------------------------------------------------------------------------------------------------- | :----------------------------- |
| **Malicious Code Injection in Preview** | HTML5 `iframe` Sandbox with restricted attributes (`sandbox="allow-scripts allow-same-origin"`).      | `CanvasSandboxManager`         |
| **Infinite Loop / Thread Lock**         | Parent-enforced 3000ms `EXECUTION_TIMEOUT` timer clears postMessage listeners and notifies user.      | `CanvasSandboxManager`         |
| **3rd-Party Plugin Exploitation**       | WebWorker execution boundary + explicit permission array verification (`PluginManifest.permissions`). | `SealedPluginHost`             |
| **Unauthorized DB Data Mutation**       | Supabase Row Level Security (RLS) policies (`auth.uid() = owner_id`).                                 | `DocumentPersistenceService`   |
| **API Secret Exposure**                 | Strict server function execution (`createServerFn`) for Mistral API keys; no client leaks.            | `mistralVisionModel.server.ts` |
