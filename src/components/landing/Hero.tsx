import { Link } from "@tanstack/react-router";
import { Monitor, Smartphone, Tablet, MessageSquare } from "lucide-react";
import { CosyLogo } from "@/components/brand/CosyLogo";

export function Hero() {
  return (
    <section
      data-testid="landing-hero"
      className="relative z-10 mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:px-10 sm:pt-24"
    >
      <div className="animate-in-fade mb-8 flex justify-center">
        <CosyLogo size={48} showWordmark showSubtitle />
      </div>
      <h1 className="animate-in-fade font-brand text-4xl font-extrabold tracking-tighter sm:text-6xl">
        <span className="text-gradient-accent">Visual code</span>
        <br />
        at light speed.
      </h1>
      <p
        className="animate-in-fade mx-auto mt-5 max-w-lg text-sm text-muted-foreground sm:text-base"
        style={{ animationDelay: "0.05s" }}
      >
        Enterprise visual web engine — Figma, screenshots & ideas → production React/Tailwind. Live
        canvas, spatial AI edits, Mistral-powered.
      </p>
      <div
        className="animate-in-fade mt-8 flex flex-wrap items-center justify-center gap-3"
        style={{ animationDelay: "0.1s" }}
      >
        <Link
          to="/chat"
          className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold leading-11 text-primary-foreground"
        >
          Open COSY.AI
        </Link>
        <Link
          to="/templates"
          className="min-h-11 rounded-full border border-border-subtle px-5 text-sm leading-11 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          Browse templates
        </Link>
      </div>

      {/* Decorative chat → canvas mockup — illustrates the flow, carries no unique info. */}
      <div
        aria-hidden
        className="animate-in-scale glass shadow-elevated mx-auto mt-14 max-w-2xl rounded-2xl border border-border-subtle p-3 text-left sm:p-4"
        style={{ animationDelay: "0.16s" }}
      >
        <div className="flex items-center gap-1.5 border-b border-border-subtle pb-2.5">
          <span className="h-2 w-2 rounded-full bg-destructive/70" />
          <span className="h-2 w-2 rounded-full bg-brand-cyan/70" />
          <span className="h-2 w-2 rounded-full bg-brand-indigo/60" />
          <span className="ml-2 font-mono text-[10px] text-muted-foreground">preview.html</span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.3fr]">
          <div className="rounded-lg border border-border-subtle bg-surface-1/60 p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground/70">
              <MessageSquare className="h-3 w-3" />
              <span className="font-mono text-[10px] uppercase tracking-wider">Chat</span>
            </div>
            <div className="mt-2 font-mono text-[11px] text-foreground/90">
              <span className="animate-typing">Build a pricing page, 3 tiers</span>
              <span className="animate-pulse">▌</span>
            </div>
          </div>
          <div className="rounded-lg border border-border-subtle bg-panel p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                Canvas
              </span>
              <div className="flex items-center gap-1 rounded-md border border-border-subtle bg-surface-1/70 p-0.5">
                <Monitor className="h-3 w-3 text-foreground" />
                <Tablet className="h-3 w-3 text-muted-foreground/60" />
                <Smartphone className="h-3 w-3 text-muted-foreground/60" />
              </div>
            </div>
            <div className="stagger mt-2 grid grid-cols-3 gap-1.5 text-center">
              {(["Starter", "Pro", "Team"] as const).map((tier, i) => (
                <div
                  key={tier}
                  className={
                    i === 1
                      ? "rounded-md border border-accent-primary/40 bg-surface-2 p-1.5"
                      : "rounded-md border border-border-subtle bg-surface-1/50 p-1.5"
                  }
                >
                  <div className="font-mono text-[10px] font-medium">{tier}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
