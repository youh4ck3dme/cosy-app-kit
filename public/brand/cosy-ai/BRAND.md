# COSY.AI — Brand Identity (Production)

**Product:** Visual Code Engine · Next-gen AI Web Builder  
**Lockup:** `COSY.AI` + micro-label `VISUAL CODE ENGINE`

## Concepts (SVG)

| # | Name | File | Use |
|---|------|------|-----|
| 1 | Spatial AST Node Mark | `concept-1-spatial-ast-lockup.svg` | Primary header / marketing lockup |
| 2 | Precision Viewport Monogram | `concept-2-viewport-monogram.svg`, `favicon.svg` | PWA / browser favicon / app icon |
| 3 | Minimalist Mono Emblem | `concept-3-mono-emblem.svg` | Print, GitHub, docs, high-contrast |

## Design tokens (Tailwind v4)

Mapped in `src/styles.css` `@theme inline`:

| Token | Hex | Utility |
|-------|-----|---------|
| brand-obsidian | `#0A0A0C` | `bg-brand-obsidian` |
| brand-zinc | `#18181B` | `bg-brand-zinc` |
| brand-border | `#27272A` | `border-brand-border` |
| brand-muted | `#71717A` | `text-brand-muted` |
| brand-indigo | `#6366F1` | `text-brand-indigo` |
| brand-cyan | `#38BDF8` | `text-brand-cyan` |
| brand-purple | `#818CF8` | `text-brand-purple` |
| font-brand | Inter / SF Pro | `font-brand` |

## React

```tsx
import { CosyLogo } from "@/components/brand/CosyLogo";

// Header lockup
<CosyLogo size={30} showWordmark showSubtitle={false} />

// Mark only (avatar / chrome)
<CosyLogo size={28} showWordmark={false} />

// Favicon-style monogram
<CosyLogo variant="monogram" showWordmark={false} size={32} />
```

## Theme switcher

App theme cycle: `system → light → dark → cosy → system`  
`cosy` applies Obsidian + Hyper-Blue skin (`html.dark.theme-cosy`).

## Favicon

- Primary: `/favicon.svg` (Concept 2 monogram)
- Mirror: `/brand/cosy-ai/favicon.svg`
