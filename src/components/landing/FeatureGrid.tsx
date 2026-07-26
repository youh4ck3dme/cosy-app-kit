import { Monitor, Code2, Terminal, Wand2, Undo2, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURES: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Monitor,
    title: "Live device preview",
    body: "Desktop, tablet, and mobile frames with zoom, right next to the chat.",
  },
  {
    icon: Code2,
    title: "Code + diff view",
    body: "A full editor plus model-vs-local diffs, so you always see what changed.",
  },
  {
    icon: Terminal,
    title: "Console & network",
    body: "Live console output and network requests from your own sandboxed preview.",
  },
  {
    icon: Wand2,
    title: "One-tap polish",
    body: "Mobile-first, theme, accessibility, visual system, export, background — one click each.",
  },
  {
    icon: Undo2,
    title: "Version history",
    body: "Every edit is a version you can rewind, with a real diff against the last save.",
  },
  {
    icon: Share2,
    title: "Share & templates",
    body: "Publish a public artifact with an embed link, or start from the template gallery.",
  },
];

export function FeatureGrid() {
  return (
    <section
      className="bg-grid-pattern bg-grid-fade relative z-10 border-y border-border-subtle py-16"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-10">
        <h2 id="features-heading" className="text-center text-lg font-semibold">
          Everything the canvas already does
        </h2>
        <div className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="glass shadow-elevated rounded-2xl border border-border-subtle p-5 transition-colors hover:border-accent-primary/35"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary/15 text-accent-primary">
                <f.icon className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
