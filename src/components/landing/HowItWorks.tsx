import { MessageSquare, Code2, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STEPS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: MessageSquare,
    title: "Chat",
    body: "Describe what you want in plain language — Mistral drives the build.",
  },
  {
    icon: Code2,
    title: "Canvas",
    body: "Watch it render live on desktop, tablet, and mobile, with console and network debugging built in.",
  },
  {
    icon: Share2,
    title: "Share",
    body: "Publish a public link or embed, or keep iterating with one-tap polish.",
  },
];

export function HowItWorks() {
  return (
    <section
      className="relative z-10 mx-auto max-w-4xl px-4 py-16 sm:px-10"
      aria-labelledby="how-heading"
    >
      <h2 id="how-heading" className="text-center text-lg font-semibold">
        How it works
      </h2>
      <ol className="stagger mt-8 grid list-none gap-4 p-0 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="glass shadow-elevated rounded-2xl border border-border-subtle p-5"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary/15 text-accent-primary">
                <step.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                Step {i + 1}
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
