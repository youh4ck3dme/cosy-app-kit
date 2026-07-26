# FAQ

## Is this a Next.js app?

No. It is **TanStack Start** on Vite + React 19.

## Is the Builder Kernel the same as the artifact Canvas in the UI?

No. The product artifact canvas (`src/components/app-shell/Canvas.tsx` and related) previews chat artifacts. The Builder Kernel is a headless document engine under `src/lib/builder/`. A design Canvas that consumes the kernel is **Not yet implemented** (RPC types only).

## Can I install marketplace plugins?

No marketplace product is implemented. Kernel plugins and the Plugin SDK are library foundations only.

## Why are there two plugin systems?

- `src/lib/builder/plugins` — registers capabilities into the kernel.
- `src/lib/plugin-sdk` — isolated manifest/lifecycle foundation.

A bridge is **Not yet implemented**.

## Which AI providers are supported for product chat?

**Mistral only** (`MISTRAL_API_KEY`). No OpenAI / Lovable AI Gateway / Gemini for product chat per project policy.

## Does merge to main deploy production?

No. Lovable Publish is required. See [product/deploy.md](./product/deploy.md).

## Where is the license?

No `LICENSE` file is present. See [LICENSE_GUIDE.md](./LICENSE_GUIDE.md).

## Is observability shipped?

Kernel Observatory (v0.4.6) is a **Future milestone**. See [OBSERVABILITY.md](./OBSERVABILITY.md).

## Package name vs product name?

`package.json` name is `tanstack_start_ts`. The GitHub product repository is `cosy-app-kit`. Documentation refers to both honestly.
